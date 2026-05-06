import type { Prisma } from "@prisma/client";

import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { LoadingLinkButton } from "@/app/ui/LoadingLinkButton";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

function participantScopeWhere(session: {
  role: string;
  batchId: string | null;
}): Prisma.ParticipantWhereInput {
  if (session.role === "SUPER_ADMIN") return {};
  if (session.role === "BATCH_REP" && session.batchId) return { batchId: session.batchId };
  return { id: { in: [] } };
}

export default async function FinalReportPage() {
  const session = await requireSuperAdmin();
  const scope = participantScopeWhere(session);

  const [batches, tickets, attendees, cashAgg] = await Promise.all([
    prisma.batch.findMany({
      where:
        session.role === "SUPER_ADMIN"
          ? {}
          : session.role === "BATCH_REP" && session.batchId
            ? { id: session.batchId }
            : { id: { in: [] as string[] } },
      orderBy: { code: "asc" },
      select: { id: true, code: true },
    }),
    prisma.ticket.findMany({
      where: { isActive: true },
      orderBy: [{ attendeeType: "asc" }, { price: "asc" }, { name: "asc" }],
      select: { id: true, name: true, price: true },
    }),
    prisma.attendee.findMany({
      where: { participant: scope },
      select: {
        ticketId: true,
        tshirt: true,
        participant: { select: { batchId: true } },
        ticket: { select: { price: true } },
      },
    }),
    prisma.batchCashSettlement.groupBy({
      by: ["batchId"],
      where:
        session.role === "SUPER_ADMIN"
          ? {}
          : session.role === "BATCH_REP" && session.batchId
            ? { batchId: session.batchId }
            : { batchId: { in: [] as string[] } },
      _sum: { amountBdt: true },
    }),
  ]);

  const ticketIds = tickets.map((t) => t.id);
  const ticketIdx = new Map(ticketIds.map((id, i) => [id, i]));

  const paidByBatch = new Map(cashAgg.map((r) => [r.batchId, r._sum.amountBdt ?? 0] as const));

  const gridTickets = new Map<string, number[]>(); // batchId -> qty per ticket
  const gridSizes = new Map<string, Map<string, number>>(); // batchId -> size -> qty
  const totalSalesByBatch = new Map<string, number>(); // batchId -> BDT

  for (const a of attendees) {
    const batchId = a.participant.batchId;

    const arr = gridTickets.get(batchId) ?? Array.from({ length: ticketIds.length }, () => 0);
    const i = ticketIdx.get(a.ticketId);
    if (typeof i === "number") arr[i] += 1;
    gridTickets.set(batchId, arr);

    if (a.tshirt) {
      const m = gridSizes.get(batchId) ?? new Map<string, number>();
      m.set(a.tshirt, (m.get(a.tshirt) ?? 0) + 1);
      gridSizes.set(batchId, m);
    }

    totalSalesByBatch.set(batchId, (totalSalesByBatch.get(batchId) ?? 0) + (a.ticket?.price ?? 0));
  }

  const rows = batches.map((b) => {
    const values = gridTickets.get(b.id) ?? Array.from({ length: ticketIds.length }, () => 0);
    const attendeeTotal = values.reduce((s, x) => s + x, 0);
    const sizes = gridSizes.get(b.id) ?? new Map<string, number>();
    const sales = totalSalesByBatch.get(b.id) ?? 0;
    const paid = paidByBatch.get(b.id) ?? 0;
    const due = Math.max(0, sales - paid);
    return { batchId: b.id, batchCode: b.code, values, attendeeTotal, sizes, sales, paid, due };
  });

  const grandTicketTotals = ticketIds.map((_, i) => rows.reduce((s, r) => s + (r.values[i] ?? 0), 0));
  const grandAttendeeTotal = rows.reduce((s, r) => s + r.attendeeTotal, 0);
  const grandSizeTotals = new Map<string, number>();
  for (const r of rows) {
    for (const size of SIZES) {
      grandSizeTotals.set(size, (grandSizeTotals.get(size) ?? 0) + (r.sizes.get(size) ?? 0));
    }
  }
  const grandSales = rows.reduce((s, r) => s + r.sales, 0);
  const grandPaid = rows.reduce((s, r) => s + r.paid, 0);
  const grandDue = rows.reduce((s, r) => s + r.due, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Final report</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Ticket-wise sales, attendee totals, T-shirt sizes, and cash settlement summary.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LoadingLinkButton
            href="/reports/final/print"
            pendingText="Opening…"
            className="inline-flex h-10 shrink-0 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
          >
            Print
          </LoadingLinkButton>
          <a
            href="/reports/final/export"
            className="inline-flex h-10 shrink-0 items-center rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Export Excel
          </a>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse text-sm">
            <thead>
              <tr className="bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
                <th rowSpan={2} className="border border-black/10 px-3 py-2 text-left font-semibold dark:border-white/10">
                  Batch
                </th>
                <th colSpan={tickets.length + 1} className="border border-black/10 px-3 py-2 text-center font-semibold dark:border-white/10">
                  Attendee
                </th>
                <th colSpan={SIZES.length} className="border border-black/10 px-3 py-2 text-center font-semibold dark:border-white/10">
                  T-shirt
                </th>
                <th colSpan={3} className="border border-black/10 px-3 py-2 text-center font-semibold dark:border-white/10">
                  Payment
                </th>
              </tr>
              <tr className="bg-black/5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">
                {tickets.map((t) => (
                  <th key={t.id} className="border border-black/10 px-3 py-2 text-left font-medium dark:border-white/10 whitespace-nowrap">
                    {t.name}
                  </th>
                ))}
                <th className="border border-black/10 px-3 py-2 text-left font-medium dark:border-white/10 whitespace-nowrap">
                  Total
                </th>
                {SIZES.map((s) => (
                  <th key={s} className="border border-black/10 px-3 py-2 text-left font-medium dark:border-white/10">
                    {s}
                  </th>
                ))}
                <th className="border border-black/10 px-3 py-2 text-left font-medium dark:border-white/10 whitespace-nowrap">
                  Total Ticket Sales
                </th>
                <th className="border border-black/10 px-3 py-2 text-left font-medium dark:border-white/10">
                  Paid
                </th>
                <th className="border border-black/10 px-3 py-2 text-left font-medium dark:border-white/10">
                  Due
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.batchId} className="hover:bg-black/5 dark:hover:bg-white/5">
                  <td className="border border-black/10 px-3 py-2 font-semibold dark:border-white/10 whitespace-nowrap">
                    {r.batchCode}
                  </td>
                  {r.values.map((v, i) => (
                    <td key={`${r.batchId}_${ticketIds[i]}`} className="border border-black/10 px-3 py-2 tabular-nums dark:border-white/10">
                      {v}
                    </td>
                  ))}
                  <td className="border border-black/10 px-3 py-2 font-semibold tabular-nums dark:border-white/10">
                    {r.attendeeTotal}
                  </td>
                  {SIZES.map((s) => (
                    <td key={`${r.batchId}_${s}`} className="border border-black/10 px-3 py-2 tabular-nums dark:border-white/10">
                      {r.sizes.get(s) ?? 0}
                    </td>
                  ))}
                  <td className="border border-black/10 px-3 py-2 tabular-nums dark:border-white/10">
                    {r.sales.toLocaleString()}
                  </td>
                  <td className="border border-black/10 px-3 py-2 tabular-nums dark:border-white/10">
                    {r.paid.toLocaleString()}
                  </td>
                  <td className="border border-black/10 px-3 py-2 tabular-nums dark:border-white/10">
                    {r.due.toLocaleString()}
                  </td>
                </tr>
              ))}

              {rows.length > 0 ? (
                <tr className="bg-black/5 dark:bg-white/10">
                  <td className="border border-black/10 px-3 py-2 font-semibold dark:border-white/10">
                    Grand total
                  </td>
                  {grandTicketTotals.map((v, i) => (
                    <td
                      key={`gt_${ticketIds[i]}`}
                      className="border border-black/10 px-3 py-2 font-semibold tabular-nums dark:border-white/10"
                    >
                      {v}
                    </td>
                  ))}
                  <td className="border border-black/10 px-3 py-2 font-semibold tabular-nums dark:border-white/10">
                    {grandAttendeeTotal}
                  </td>
                  {SIZES.map((s) => (
                    <td
                      key={`gt_${s}`}
                      className="border border-black/10 px-3 py-2 font-semibold tabular-nums dark:border-white/10"
                    >
                      {grandSizeTotals.get(s) ?? 0}
                    </td>
                  ))}
                  <td className="border border-black/10 px-3 py-2 font-semibold tabular-nums dark:border-white/10">
                    {grandSales.toLocaleString()}
                  </td>
                  <td className="border border-black/10 px-3 py-2 font-semibold tabular-nums dark:border-white/10">
                    {grandPaid.toLocaleString()}
                  </td>
                  <td className="border border-black/10 px-3 py-2 font-semibold tabular-nums dark:border-white/10">
                    {grandDue.toLocaleString()}
                  </td>
                </tr>
              ) : null}

              {rows.length === 0 ? (
                <tr>
                  <td className="border border-black/10 px-3 py-6 text-center text-zinc-600 dark:border-white/10 dark:text-zinc-400" colSpan={1 + tickets.length + 1 + SIZES.length + 3}>
                    No data found for your account scope.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

