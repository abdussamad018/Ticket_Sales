import type { Prisma } from "@prisma/client";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { LoadingLinkButton } from "@/app/ui/LoadingLinkButton";

function sumTicketAmount(attendees: Array<{ ticket: { price: number } }>) {
  return attendees.reduce((s, a) => s + a.ticket.price, 0);
}

function participantScopeWhere(session: {
  role: string;
  batchId: string | null;
}): Prisma.ParticipantWhereInput {
  if (session.role === "SUPER_ADMIN") return {};
  if (session.role === "BATCH_REP" && session.batchId) return { batchId: session.batchId };
  return { id: { in: [] } };
}

export default async function ReportsPage() {
  const session = await requireSession();
  const scope = participantScopeWhere(session);

  const batches = await prisma.batch.findMany({
    where:
      session.role === "SUPER_ADMIN"
        ? {}
        : session.role === "BATCH_REP" && session.batchId
          ? { id: session.batchId }
          : { id: { in: [] as string[] } },
    orderBy: { code: "asc" },
  });

  const batchMap = new Map(batches.map((b) => [b.id, b]));

  const entries = await prisma.participant.findMany({
    where: scope,
    select: {
      batchId: true,
      attendees: { select: { tshirt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const byBatchCount = new Map<string, number>();
  const tshirtAllCount = new Map<string, number>();
  const tshirtByBatchCount = new Map<string, Map<string, number>>();

  for (const e of entries) {
    byBatchCount.set(e.batchId, (byBatchCount.get(e.batchId) ?? 0) + e.attendees.length);

    for (const a of e.attendees) {
      if (!a.tshirt) continue;
      tshirtAllCount.set(a.tshirt, (tshirtAllCount.get(a.tshirt) ?? 0) + 1);

      const batchM = tshirtByBatchCount.get(e.batchId) ?? new Map<string, number>();
      batchM.set(a.tshirt, (batchM.get(a.tshirt) ?? 0) + 1);
      tshirtByBatchCount.set(e.batchId, batchM);
    }
  }

  const byBatch = Array.from(byBatchCount.entries()).map(([batchId, count]) => ({
    batchId,
    count,
  }));

  const tshirtAll = Array.from(tshirtAllCount.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tshirt, count]) => ({ tshirt, count }));

  const tshirtByBatch = Array.from(tshirtByBatchCount.entries())
    .flatMap(([batchId, map]) =>
      Array.from(map.entries()).map(([tshirt, count]) => ({ batchId, tshirt, count })),
    )
    .sort((x, y) => (batchMap.get(x.batchId)?.code ?? "").localeCompare(batchMap.get(y.batchId)?.code ?? ""));

  const salesParticipants = await prisma.participant.findMany({
    where: scope,
    include: {
      batch: { select: { code: true } },
      createdBy: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          batch: { select: { code: true } },
        },
      },
      attendees: { include: { ticket: { select: { price: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const repSalesRows = new Map<
    string,
    {
      id: string;
      email: string;
      name: string | null;
      role: string;
      homeBatchCode: string | null;
      registrationCount: number;
      ticketCount: number;
      totalAmount: number;
    }
  >();

  for (const p of salesParticipants) {
    const u = p.createdBy;
    const prev = repSalesRows.get(u.id) ?? {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      homeBatchCode: u.batch?.code ?? null,
      registrationCount: 0,
      ticketCount: 0,
      totalAmount: 0,
    };
    prev.registrationCount += 1;
    prev.ticketCount += p.attendees.length;
    prev.totalAmount += sumTicketAmount(p.attendees);
    repSalesRows.set(u.id, prev);
  }

  const repSalesSorted = Array.from(repSalesRows.values()).sort((a, b) => b.totalAmount - a.totalAmount);

  const salesGrandTotal = salesParticipants.reduce((s, p) => s + sumTicketAmount(p.attendees), 0);
  const isAdmin = session.role === "SUPER_ADMIN";

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {session.role === "BATCH_REP" && session.batchId
              ? "Showing only your batch."
              : session.role === "BATCH_REP"
                ? "Your account has no batch assigned — reports are empty until an admin links your batch."
                : "Showing all batches."}
          </p>
        </div>

        <LoadingLinkButton
          href="/reports/print"
          pendingText="Opening…"
          className="inline-flex h-10 shrink-0 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
        >
          Print (Batch T-shirt)
        </LoadingLinkButton>
      </div>

      {session.role === "BATCH_REP" && session.batchId ? (
        <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">Ticket sales history (your batch)</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Each row is one registration. Amount is the sum of selected ticket prices for that entry.
          </p>
          {salesParticipants.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No sales yet.</p>
          ) : (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-zinc-600 dark:text-zinc-400">
                    <tr>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Tickets sold</th>
                      <th className="py-2 pr-4">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesParticipants.map((p) => (
                      <tr key={p.id} className="border-t border-black/5 dark:border-white/10">
                        <td className="py-2 pr-4 whitespace-nowrap">{p.createdAt.toLocaleString()}</td>
                        <td className="py-2 pr-4 tabular-nums">{p.attendees.length}</td>
                        <td className="py-2 pr-4 font-medium tabular-nums">
                          {sumTicketAmount(p.attendees)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 rounded-xl border border-black/10 px-4 py-3 text-sm dark:border-white/10">
                <span className="text-zinc-600 dark:text-zinc-400">Total amount (your batch): </span>
                <span className="font-semibold tabular-nums">{salesGrandTotal}</span>
              </div>
            </>
          )}
        </section>
      ) : null}

      {isAdmin ? (
        <section className="mt-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">Ticket sales by representative</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Totals grouped by the user who submitted each registration (batch reps and others).
          </p>
          {repSalesSorted.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No registrations yet.</p>
          ) : (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-zinc-600 dark:text-zinc-400">
                    <tr>
                      <th className="py-2 pr-4">Representative</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 pr-4">Home batch</th>
                      <th className="py-2 pr-4">Registrations</th>
                      <th className="py-2 pr-4">Tickets sold</th>
                      <th className="py-2 pr-4">Total amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repSalesSorted.map((row) => (
                      <tr key={row.id} className="border-t border-black/5 dark:border-white/10">
                        <td className="py-2 pr-4">
                          <div className="max-w-[220px] font-medium">
                            <div className="truncate" title={row.email}>
                              {row.email}
                            </div>
                            {row.name ? (
                              <div className="truncate text-xs font-normal text-zinc-600 dark:text-zinc-400">
                                {row.name}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-2 pr-4">{row.role}</td>
                        <td className="py-2 pr-4">{row.homeBatchCode ?? "—"}</td>
                        <td className="py-2 pr-4 tabular-nums">{row.registrationCount}</td>
                        <td className="py-2 pr-4 tabular-nums">{row.ticketCount}</td>
                        <td className="py-2 pr-4 font-medium tabular-nums">{row.totalAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 rounded-xl border border-black/10 px-4 py-3 text-sm dark:border-white/10">
                <span className="text-zinc-600 dark:text-zinc-400">Platform total (all batches): </span>
                <span className="font-semibold tabular-nums">{salesGrandTotal}</span>
              </div>
            </>
          )}
        </section>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">Batch → participants count</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="py-2 pr-4">Batch</th>
                  <th className="py-2 pr-4">Participants</th>
                </tr>
              </thead>
              <tbody>
                {byBatch
                  .sort((a, b) =>
                    (batchMap.get(a.batchId)?.code ?? "").localeCompare(
                      batchMap.get(b.batchId)?.code ?? "",
                    ),
                  )
                  .map((row) => (
                    <tr key={row.batchId} className="border-t border-black/5 dark:border-white/10">
                      <td className="py-2 pr-4 font-medium">
                        {batchMap.get(row.batchId)?.code ?? row.batchId}
                      </td>
                      <td className="py-2 pr-4">{row.count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">All T-shirt sizes total</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="py-2 pr-4">Size</th>
                  <th className="py-2 pr-4">Qty</th>
                </tr>
              </thead>
              <tbody>
                {tshirtAll.map((row) => (
                  <tr key={row.tshirt} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-4 font-medium">{row.tshirt}</td>
                    <td className="py-2 pr-4">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="text-base font-semibold">Batch → T-shirt size breakdown</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-600 dark:text-zinc-400">
              <tr>
                <th className="py-2 pr-4">Batch</th>
                <th className="py-2 pr-4">Size</th>
                <th className="py-2 pr-4">Qty</th>
              </tr>
            </thead>
            <tbody>
              {tshirtByBatch.map((row) => (
                <tr
                  key={`${row.batchId}_${row.tshirt}`}
                  className="border-t border-black/5 dark:border-white/10"
                >
                  <td className="py-2 pr-4 font-medium">
                    {batchMap.get(row.batchId)?.code ?? row.batchId}
                  </td>
                  <td className="py-2 pr-4">{row.tshirt}</td>
                  <td className="py-2 pr-4">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
