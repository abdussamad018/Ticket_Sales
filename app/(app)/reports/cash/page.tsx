import Link from "next/link";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { LoadingLinkButton } from "@/app/ui/LoadingLinkButton";

function sumTicketAmount(attendees: Array<{ ticket: { price: number } | null }>) {
  return attendees.reduce((s, a) => s + (a.ticket?.price ?? 0), 0);
}

export default async function CashReportPage() {
  const session = await requireSession();

  if (session.role === "BATCH_REP" && !session.batchId) {
    return (
      <div className="mx-auto w-full max-w-6xl px-0 py-0">
        <h1 className="text-2xl font-semibold tracking-tight">Cash &amp; due</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Your account has no batch assigned. Ask a super admin to link your batch.
        </p>
      </div>
    );
  }

  if (session.role === "BATCH_REP" && session.batchId) {
    const [batch, participants, settledAgg, settlements] = await Promise.all([
      prisma.batch.findUnique({
        where: { id: session.batchId },
        select: { code: true, name: true },
      }),
      prisma.participant.findMany({
        where: { batchId: session.batchId },
        select: { attendees: { select: { ticket: { select: { price: true } } } } },
      }),
      prisma.batchCashSettlement.aggregate({
        where: { batchId: session.batchId },
        _sum: { amountBdt: true },
      }),
      prisma.batchCashSettlement.findMany({
        where: { batchId: session.batchId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { recordedBy: { select: { email: true, name: true } } },
      }),
    ]);

    const totalSales = participants.reduce((s, p) => s + sumTicketAmount(p.attendees), 0);
    const settled = settledAgg._sum.amountBdt ?? 0;
    const rawDue = totalSales - settled;

    return (
      <div className="mx-auto w-full max-w-6xl px-0 py-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Cash &amp; due</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Batch <span className="font-medium">{batch?.code ?? "—"}</span>
              {batch?.name ? <span> — {batch.name}</span> : null}
            </p>
          </div>
          <LoadingLinkButton
            href="/reports"
            pendingText="Loading…"
            className="inline-flex h-10 w-fit items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
          >
            Back to reports
          </LoadingLinkButton>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Ticket sales (BDT)</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{totalSales.toLocaleString()}</div>
            <p className="mt-2 text-xs text-zinc-500">From all registrations in your batch</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Paid to admin (BDT)</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{settled.toLocaleString()}</div>
            <p className="mt-2 text-xs text-zinc-500">Sum of cash entries recorded by super admin</p>
          </div>
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/25">
            <div className="text-xs font-medium text-amber-900/80 dark:text-amber-100/80">Due (BDT)</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-amber-950 dark:text-amber-50">
              {Math.max(0, rawDue).toLocaleString()}
            </div>
            {rawDue < 0 ? (
              <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-100/80">
                Recorded cash exceeds calculated ticket sales by {Math.abs(rawDue).toLocaleString()} BDT — please
                confirm with admin.
              </p>
            ) : (
              <p className="mt-2 text-xs text-amber-900/70 dark:text-amber-100/70">Sales minus paid to admin</p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">Cash handover history</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Latest 50 entries for your batch.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left dark:border-white/10">
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium tabular-nums">Amount</th>
                  <th className="py-2 pr-4 font-medium">Recorded by</th>
                  <th className="py-2 pr-4 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                    <td className="py-2 pr-4 whitespace-nowrap tabular-nums text-zinc-600 dark:text-zinc-400">
                      {s.createdAt.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 tabular-nums font-medium">{s.amountBdt.toLocaleString()}</td>
                    <td className="py-2 pr-4">{s.recordedBy.name ?? s.recordedBy.email}</td>
                    <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{s.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {settlements.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No cash entries yet for this batch.</p>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  // SUPER_ADMIN — read-only overview (recording is under Admin → Cash)
  const batches = await prisma.batch.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true } });
  const batchIds = batches.map((b) => b.id);

  const [participants, settledRows] = await Promise.all([
    batchIds.length
      ? prisma.participant.findMany({
          where: { batchId: { in: batchIds } },
          select: { batchId: true, attendees: { select: { ticket: { select: { price: true } } } } },
        })
      : Promise.resolve([]),
    batchIds.length
      ? prisma.batchCashSettlement.groupBy({
          by: ["batchId"],
          where: { batchId: { in: batchIds } },
          _sum: { amountBdt: true },
        })
      : Promise.resolve([]),
  ]);

  const salesBy = new Map<string, number>();
  for (const p of participants) {
    const prev = salesBy.get(p.batchId) ?? 0;
    salesBy.set(p.batchId, prev + sumTicketAmount(p.attendees));
  }
  const settledBy = new Map(settledRows.map((r) => [r.batchId, r._sum.amountBdt ?? 0] as const));

  const rows = batches.map((b) => {
    const sales = salesBy.get(b.id) ?? 0;
    const settled = settledBy.get(b.id) ?? 0;
    return { ...b, sales, settled, due: sales - settled };
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cash &amp; due (all batches)</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Read-only summary. To record cash received, use{" "}
            <Link href="/admin/cash-settlements" className="font-medium underline underline-offset-4">
              Admin → Batch cash
            </Link>
            .
          </p>
        </div>
        <LoadingLinkButton
          href="/reports"
          pendingText="Loading…"
          className="inline-flex h-10 w-fit items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
        >
          Back to reports
        </LoadingLinkButton>
      </div>

      <section className="mt-8 overflow-x-auto rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left dark:border-white/10">
              <th className="py-2 pr-4 font-medium">Batch</th>
              <th className="py-2 pr-4 font-medium tabular-nums">Sales</th>
              <th className="py-2 pr-4 font-medium tabular-nums">Paid</th>
              <th className="py-2 pr-4 font-medium tabular-nums">Due</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className="py-2 pr-4 font-medium">{r.code}</td>
                <td className="py-2 pr-4 tabular-nums">{r.sales.toLocaleString()}</td>
                <td className="py-2 pr-4 tabular-nums">{r.settled.toLocaleString()}</td>
                <td className="py-2 pr-4 tabular-nums">
                  <span className={r.due > 0 ? "text-amber-700 dark:text-amber-300" : ""}>
                    {Math.max(0, r.due).toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
