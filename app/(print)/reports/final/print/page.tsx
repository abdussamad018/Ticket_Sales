import type { Prisma } from "@prisma/client";

import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { PrintButton } from "@/app/(print)/reports/print/PrintButton";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

function participantScopeWhere(session: {
  role: string;
  batchId: string | null;
}): Prisma.ParticipantWhereInput {
  if (session.role === "SUPER_ADMIN") return {};
  if (session.role === "BATCH_REP" && session.batchId) return { batchId: session.batchId };
  return { id: { in: [] } };
}

export default async function FinalReportPrintPage() {
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
      select: { id: true, name: true },
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

  const today = new Date();

  return (
    <div className="w-full">
      <style>{`
@media print {
  .no-print { display: none !important; }
  body { background: white !important; }
}
@page {
  size: landscape;
  margin: 10mm;
}
      `}</style>

      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Final report (print)</h1>
          <p className="text-sm text-zinc-600">
            100% same format — Batch, ticket breakdown, T-shirt sizes, and payment summary.
          </p>
        </div>
        <PrintButton className="h-10 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90">
          Print
        </PrintButton>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-medium">Alumni Event — Final report</div>
          <div className="text-zinc-600">Generated: {today.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white p-3">
        <table className="w-full min-w-[1200px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-black/5">
              <th rowSpan={2} className="border border-black/20 px-2 py-2 text-left font-semibold">
                Batch
              </th>
              <th colSpan={tickets.length + 1} className="border border-black/20 px-2 py-2 text-center font-semibold">
                Attendee
              </th>
              <th colSpan={SIZES.length} className="border border-black/20 px-2 py-2 text-center font-semibold">
                T-shirt
              </th>
              <th colSpan={3} className="border border-black/20 px-2 py-2 text-center font-semibold">
                Payment
              </th>
            </tr>
            <tr className="bg-black/5">
              {tickets.map((t) => (
                <th key={t.id} className="border border-black/20 px-2 py-2 text-left font-medium whitespace-nowrap">
                  {t.name}
                </th>
              ))}
              <th className="border border-black/20 px-2 py-2 text-left font-medium">Total</th>
              {SIZES.map((s) => (
                <th key={s} className="border border-black/20 px-2 py-2 text-left font-medium">
                  {s}
                </th>
              ))}
              <th className="border border-black/20 px-2 py-2 text-left font-medium whitespace-nowrap">
                Total Ticket Sales
              </th>
              <th className="border border-black/20 px-2 py-2 text-left font-medium">Paid</th>
              <th className="border border-black/20 px-2 py-2 text-left font-medium">Due</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.batchId}>
                <td className="border border-black/20 px-2 py-2 font-semibold whitespace-nowrap">{r.batchCode}</td>
                {r.values.map((v, i) => (
                  <td key={`${r.batchId}_${ticketIds[i]}`} className="border border-black/20 px-2 py-2 tabular-nums">
                    {v}
                  </td>
                ))}
                <td className="border border-black/20 px-2 py-2 font-semibold tabular-nums">{r.attendeeTotal}</td>
                {SIZES.map((s) => (
                  <td key={`${r.batchId}_${s}`} className="border border-black/20 px-2 py-2 tabular-nums">
                    {r.sizes.get(s) ?? 0}
                  </td>
                ))}
                <td className="border border-black/20 px-2 py-2 tabular-nums">{r.sales.toLocaleString()}</td>
                <td className="border border-black/20 px-2 py-2 tabular-nums">{r.paid.toLocaleString()}</td>
                <td className="border border-black/20 px-2 py-2 tabular-nums">{r.due.toLocaleString()}</td>
              </tr>
            ))}
            {rows.length > 0 ? (
              <tr className="bg-black/5">
                <td className="border border-black/20 px-2 py-2 font-semibold">Grand total</td>
                {grandTicketTotals.map((v, i) => (
                  <td key={`gt_${ticketIds[i]}`} className="border border-black/20 px-2 py-2 font-semibold tabular-nums">
                    {v}
                  </td>
                ))}
                <td className="border border-black/20 px-2 py-2 font-semibold tabular-nums">{grandAttendeeTotal}</td>
                {SIZES.map((s) => (
                  <td key={`gt_${s}`} className="border border-black/20 px-2 py-2 font-semibold tabular-nums">
                    {grandSizeTotals.get(s) ?? 0}
                  </td>
                ))}
                <td className="border border-black/20 px-2 py-2 font-semibold tabular-nums">{grandSales.toLocaleString()}</td>
                <td className="border border-black/20 px-2 py-2 font-semibold tabular-nums">{grandPaid.toLocaleString()}</td>
                <td className="border border-black/20 px-2 py-2 font-semibold tabular-nums">{grandDue.toLocaleString()}</td>
              </tr>
            ) : null}
            {rows.length === 0 ? (
              <tr>
                <td className="border border-black/20 px-2 py-6 text-center text-zinc-600" colSpan={1 + tickets.length + 1 + SIZES.length + 3}>
                  No data found for your account scope.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

