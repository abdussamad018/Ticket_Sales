import type { Prisma } from "@prisma/client";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { BatchCombobox } from "@/app/ui/BatchCombobox";

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

export default async function SalesReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string }>;
}) {
  const session = await requireSession();
  const { batchId } = await searchParams;

  const isAdmin = session.role === "SUPER_ADMIN";

  const batchesForFilter = isAdmin
    ? await prisma.batch.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true } })
    : [];

  const batchFilterActive = isAdmin && !!batchId && batchesForFilter.some((b) => b.id === batchId);

  const scope = participantScopeWhere(session);
  const scopedWhere: Prisma.ParticipantWhereInput = isAdmin
    ? batchFilterActive
      ? { ...scope, batchId }
      : scope
    : scope;

  const salesParticipants = await prisma.participant.findMany({
    where: scopedWhere,
    include: {
      batch: { select: { id: true, code: true } },
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

  const salesGrandTotal = salesParticipants.reduce((s, p) => s + sumTicketAmount(p.attendees), 0);

  // Admin: createdBy-wise totals (optionally within a batch filter)
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

  if (isAdmin) {
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
  }

  const repSalesSorted = Array.from(repSalesRows.values()).sort((a, b) => b.totalAmount - a.totalAmount);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const todayParticipants = salesParticipants.filter((p) => p.createdAt >= todayStart);
  const weekParticipants = salesParticipants.filter((p) => p.createdAt >= weekStart);

  const todayTickets = todayParticipants.reduce((s, p) => s + p.attendees.length, 0);
  const weekTickets = weekParticipants.reduce((s, p) => s + p.attendees.length, 0);
  const todayAmount = todayParticipants.reduce((s, p) => s + sumTicketAmount(p.attendees), 0);
  const weekAmount = weekParticipants.reduce((s, p) => s + sumTicketAmount(p.attendees), 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sales reports</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {session.role === "BATCH_REP" ? "Showing only your batch." : "Showing all batches."}
          </p>
        </div>
        <a
          href={batchFilterActive ? `/reports/sales/export?batchId=${encodeURIComponent(batchId!)}` : "/reports/sales/export"}
          className="inline-flex h-10 shrink-0 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
        >
          Export CSV
        </a>
      </div>

      {isAdmin ? (
        <form
          method="get"
          className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
        >
          <BatchCombobox
            batches={batchesForFilter}
            name="batchId"
            label="Filter by batch"
            defaultBatchId={batchId}
            allowAll
          />
          <button
            type="submit"
            className="h-11 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Apply
          </button>
          {batchFilterActive ? (
            <a
              href="/reports/sales"
              className="inline-flex h-11 items-center rounded-xl border border-black/10 px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
            >
              Clear
            </a>
          ) : null}
        </form>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Today (tickets)</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{todayTickets}</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Today (amount)</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{todayAmount}</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Last 7 days (tickets)</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{weekTickets}</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Last 7 days (amount)</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{weekAmount}</div>
        </div>
      </section>

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
                        <td className="py-2 pr-4 font-medium tabular-nums">{sumTicketAmount(p.attendees)}</td>
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
        <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">Batch-wise sales (registrations)</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {batchFilterActive ? "Showing selected batch only." : "Showing all batches."}
          </p>

          {salesParticipants.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No registrations yet.</p>
          ) : (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-zinc-600 dark:text-zinc-400">
                    <tr>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Batch</th>
                      <th className="py-2 pr-4">Entered by</th>
                      <th className="py-2 pr-4">Tickets sold</th>
                      <th className="py-2 pr-4">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesParticipants.map((p) => (
                      <tr key={p.id} className="border-t border-black/5 dark:border-white/10">
                        <td className="py-2 pr-4 whitespace-nowrap">{p.createdAt.toLocaleString()}</td>
                        <td className="py-2 pr-4 font-medium">{p.batch.code}</td>
                        <td className="py-2 pr-4">
                          <div className="max-w-[220px] truncate" title={p.createdBy.email}>
                            {p.createdBy.email}
                          </div>
                        </td>
                        <td className="py-2 pr-4 tabular-nums">{p.attendees.length}</td>
                        <td className="py-2 pr-4 font-medium tabular-nums">{sumTicketAmount(p.attendees)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 rounded-xl border border-black/10 px-4 py-3 text-sm dark:border-white/10">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Total amount {batchFilterActive ? "(filtered)" : "(all batches)"}:{" "}
                </span>
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
            Totals grouped by the user who submitted each registration.
          </p>
          {repSalesSorted.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No registrations yet.</p>
          ) : (
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
                        <div className="max-w-[240px] font-medium">
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
          )}
        </section>
      ) : null}
    </div>
  );
}

