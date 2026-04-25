import type { Prisma } from "@prisma/client";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

function participantScopeWhere(session: {
  role: string;
  batchId: string | null;
}): Prisma.ParticipantWhereInput {
  if (session.role === "SUPER_ADMIN") return {};
  if (session.role === "BATCH_REP" && session.batchId) return { batchId: session.batchId };
  return { id: { in: [] } };
}

export default async function BatchTicketsReportPage() {
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
    select: { id: true, code: true },
  });

  const batchCodeById = new Map(batches.map((b) => [b.id, b.code]));

  const tickets = await prisma.ticket.findMany({
    where: { isActive: true },
    orderBy: [{ attendeeType: "asc" }, { price: "asc" }, { name: "asc" }],
    select: { id: true, code: true, name: true },
  });

  const ticketById = new Map(tickets.map((t) => [t.id, t]));

  // Count from Attendee table (each attendee = one sold ticket).
  const sold = await prisma.attendee.findMany({
    where: { participant: scope },
    select: { ticketId: true, participant: { select: { batchId: true } } },
  });

  const grid = new Map<string, Map<string, number>>(); // batchId -> ticketId -> qty
  for (const s of sold) {
    const batchId = s.participant.batchId;
    const tId = s.ticketId;
    const m = grid.get(batchId) ?? new Map<string, number>();
    m.set(tId, (m.get(tId) ?? 0) + 1);
    grid.set(batchId, m);
  }

  const rows = batches.map((b) => {
    const m = grid.get(b.id) ?? new Map<string, number>();
    const values = tickets.map((t) => m.get(t.id) ?? 0);
    const total = values.reduce((a, c) => a + c, 0);
    return { batchId: b.id, batchCode: b.code, values, total };
  });

  const grandTotals = tickets.map((t) =>
    rows.reduce((sum, r) => sum + (grid.get(r.batchId)?.get(t.id) ?? 0), 0),
  );
  const grandTotalAll = grandTotals.reduce((a, c) => a + c, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Batch-wise ticket sales
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {session.role === "BATCH_REP"
              ? "Showing only your batch."
              : "Showing all batches."}
          </p>
        </div>

        <a
          href="/reports/batch-tickets/export"
          className="inline-flex h-10 shrink-0 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
        >
          Export CSV
        </a>
      </div>

      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-zinc-600 dark:text-zinc-400">
              <tr>
                <th className="py-2 pr-4">Batch</th>
                {tickets.map((t) => (
                  <th key={t.id} className="py-2 pr-4 whitespace-nowrap">
                    <div className="font-medium text-zinc-800 dark:text-zinc-200">
                      {t.name}
                    </div>
                    <div className="text-xs">{t.code}</div>
                  </th>
                ))}
                <th className="py-2 pr-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.batchId} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-2 pr-4 font-medium whitespace-nowrap">
                    {batchCodeById.get(r.batchId) ?? r.batchCode}
                  </td>
                  {r.values.map((v, i) => (
                    <td key={`${r.batchId}_${tickets[i].id}`} className="py-2 pr-4 tabular-nums">
                      {v}
                    </td>
                  ))}
                  <td className="py-2 pr-4 font-semibold tabular-nums">
                    {r.total}
                  </td>
                </tr>
              ))}

              <tr className="border-t border-black/10 dark:border-white/20">
                <td className="py-2 pr-4 font-semibold">Grand total</td>
                {grandTotals.map((v, i) => (
                  <td key={`gt_${tickets[i].id}`} className="py-2 pr-4 font-semibold tabular-nums">
                    {v}
                  </td>
                ))}
                <td className="py-2 pr-4 font-semibold tabular-nums">
                  {grandTotalAll}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

