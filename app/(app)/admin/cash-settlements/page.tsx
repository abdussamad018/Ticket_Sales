import Link from "next/link";

import { BatchSearchCombobox } from "@/app/admin/cash-settlements/BatchSearchCombobox";
import { DeleteSettlementForm } from "@/app/admin/cash-settlements/DeleteSettlementForm";
import { recordBatchCashSettlementAction } from "@/app/admin/cash-settlements/actions";
import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { SubmitButton } from "@/app/ui/SubmitButton";

function sumTicketAmount(attendees: Array<{ ticket: { price: number } | null }>) {
  return attendees.reduce((s, a) => s + (a.ticket?.price ?? 0), 0);
}

export default async function AdminCashSettlementsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; deleted?: string }>;
}) {
  const session = await requireSuperAdmin();
  const { error, saved, deleted } = await searchParams;
  const showSaved = saved === "1";
  const showDeleted = deleted === "1";

  const [batches, settlements] = await Promise.all([
    prisma.batch.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.batchCashSettlement.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        batch: { select: { code: true } },
        recordedBy: { select: { email: true, name: true } },
      },
    }),
  ]);

  const batchIds = batches.map((b) => b.id);
  const [salesByBatch, settledByBatch] = await Promise.all([
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

  const salesTotals = new Map<string, number>();
  for (const p of salesByBatch) {
    const prev = salesTotals.get(p.batchId) ?? 0;
    salesTotals.set(p.batchId, prev + sumTicketAmount(p.attendees));
  }

  const settledTotals = new Map(
    settledByBatch.map((r) => [r.batchId, r._sum.amountBdt ?? 0] as const),
  );

  const batchSummary = batches.map((b) => {
    const sales = salesTotals.get(b.id) ?? 0;
    const settled = settledTotals.get(b.id) ?? 0;
    return { ...b, sales, settled, due: sales - settled };
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Batch cash (ticket sales)</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Record cash received from a batch. Batch reps see running totals and due on the Cash report.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex h-10 w-fit items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
        >
          Back to admin
        </Link>
      </div>

      {showSaved ? (
        <div
          role="status"
          className="mt-4 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-100 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="font-medium">Settlement saved successfully.</span>
          <Link
            href="/admin/cash-settlements"
            className="shrink-0 text-xs font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-white"
          >
            Dismiss
          </Link>
        </div>
      ) : null}

      {showDeleted ? (
        <div
          role="status"
          className="mt-4 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-100 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="font-medium">Settlement deleted.</span>
          <Link
            href="/admin/cash-settlements"
            className="shrink-0 text-xs font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-white"
          >
            Dismiss
          </Link>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="text-base font-semibold">Record a settlement</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Amount is BDT (same unit as ticket prices). Creates a new row — existing data is never modified.
        </p>

        <form action={recordBatchCashSettlementAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <BatchSearchCombobox batches={batches} inputName="batchId" id="batchId" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="amountBdt">
              Amount (BDT)
            </label>
            <input
              id="amountBdt"
              name="amountBdt"
              type="number"
              min={1}
              step={1}
              required
              className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-white/30 dark:[color-scheme:dark]"
              placeholder="e.g. 50000"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="note">
              Note (optional)
            </label>
            <input
              id="note"
              name="note"
              type="text"
              className="h-11 w-full max-w-2xl rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-white/30 dark:[color-scheme:dark]"
              placeholder="Receipt / meeting reference"
            />
          </div>

          <div className="sm:col-span-2">
            <SubmitButton
              pendingText="Saving…"
              className="h-11 rounded-xl bg-black px-5 text-sm text-white hover:bg-black/90 disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              Save settlement
            </SubmitButton>
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="text-base font-semibold">Per-batch snapshot</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Sales = sum of ticket prices for all participants in that batch. Settled = sum of cash entries below.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left dark:border-white/10">
                <th className="py-2 pr-4 font-medium">Batch</th>
                <th className="py-2 pr-4 font-medium tabular-nums">Sales</th>
                <th className="py-2 pr-4 font-medium tabular-nums">Settled</th>
                <th className="py-2 pr-4 font-medium tabular-nums">Due</th>
              </tr>
            </thead>
            <tbody>
              {batchSummary.map((row) => (
                <tr key={row.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="py-2 pr-4 font-medium">{row.code}</td>
                  <td className="py-2 pr-4 tabular-nums">{row.sales.toLocaleString()}</td>
                  <td className="py-2 pr-4 tabular-nums">{row.settled.toLocaleString()}</td>
                  <td className="py-2 pr-4 tabular-nums">
                    <span className={row.due > 0 ? "text-amber-700 dark:text-amber-300" : ""}>
                      {row.due.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="text-base font-semibold">Recent settlements</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Last 100 entries (newest first).</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left dark:border-white/10">
                <th className="py-2 pr-4 font-medium">When</th>
                <th className="py-2 pr-4 font-medium">Batch</th>
                <th className="py-2 pr-4 font-medium tabular-nums">Amount</th>
                <th className="py-2 pr-4 font-medium">Recorded by</th>
                <th className="py-2 pr-4 font-medium">Note</th>
                <th className="py-2 pr-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="py-2 pr-4 whitespace-nowrap tabular-nums text-zinc-600 dark:text-zinc-400">
                    {s.createdAt.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 font-medium">{s.batch.code}</td>
                  <td className="py-2 pr-4 tabular-nums">{s.amountBdt.toLocaleString()}</td>
                  <td className="py-2 pr-4">
                    {s.recordedBy.name ?? s.recordedBy.email}
                    {s.recordedById === session.userId ? (
                      <span className="ml-1 text-xs text-zinc-500">(you)</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{s.note ?? "—"}</td>
                  <td className="py-2 pl-2 text-right align-middle">
                    <DeleteSettlementForm
                      settlementId={s.id}
                      batchCode={s.batch.code}
                      amountBdt={s.amountBdt}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {settlements.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No settlements yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
