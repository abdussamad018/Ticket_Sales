import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { PrintButton } from "./PrintButton";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

function sizeTotal(map: Map<string, number>) {
  let total = 0;
  for (const v of map.values()) total += v;
  return total;
}

export default async function ReportsPrintPage() {
  const session = await requireSession();

  const scopeWhere =
    session.role === "SUPER_ADMIN"
      ? {}
      : session.role === "BATCH_REP" && session.batchId
        ? { id: session.batchId }
        : { id: { in: [] as string[] } };

  const batches = await prisma.batch.findMany({
    where: scopeWhere,
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  const entries = await prisma.participant.findMany({
    where:
      session.role === "SUPER_ADMIN"
        ? {}
        : session.role === "BATCH_REP" && session.batchId
          ? { batchId: session.batchId }
          : { id: { in: [] as string[] } },
    select: {
      batchId: true,
      attendees: { select: { tshirt: true } },
    },
  });

  const byBatchAttendeeCount = new Map<string, number>();
  const tshirtByBatch = new Map<string, Map<string, number>>();

  for (const e of entries) {
    byBatchAttendeeCount.set(
      e.batchId,
      (byBatchAttendeeCount.get(e.batchId) ?? 0) + e.attendees.length,
    );

    const m = tshirtByBatch.get(e.batchId) ?? new Map<string, number>();
    for (const a of e.attendees) {
      if (!a.tshirt) continue;
      m.set(a.tshirt, (m.get(a.tshirt) ?? 0) + 1);
    }
    tshirtByBatch.set(e.batchId, m);
  }

  const today = new Date();

  return (
    <div className="mx-auto w-full max-w-5xl px-0 py-0">
      <style>{`
@media print {
  .no-print { display: none !important; }
  body { background: white !important; }
}
      `}</style>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Print report</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Batch-wise attendee count and T-shirt requirement summary.
          </p>
        </div>
        <div className="flex gap-2">
          <PrintButton
            className="h-10 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Print
          </PrintButton>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-sm dark:border-white/10 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-medium">Alumni Event — Batch-wise T-shirt requirement</div>
          <div className="text-zinc-600 dark:text-zinc-400">
            Generated: {today.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {batches.map((b) => {
          const m = tshirtByBatch.get(b.id) ?? new Map<string, number>();
          const total = sizeTotal(m);
          const attendeeCount = byBatchAttendeeCount.get(b.id) ?? 0;

          return (
            <section
              key={b.id}
              className="break-inside-avoid rounded-2xl border border-black/15 bg-white dark:border-white/15 dark:bg-zinc-950"
            >
              <div className="grid grid-cols-[96px_1fr]">
                <div className="flex items-center justify-center border-r border-black/15 px-3 py-6 text-lg font-semibold dark:border-white/15">
                  {b.code}
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">T-shirt sizes</div>
                      {b.name ? (
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">{b.name}</div>
                      ) : null}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      Attendees: <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{attendeeCount}</span>
                    </div>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[360px] border-collapse text-sm">
                      <thead>
                        <tr className="text-zinc-600 dark:text-zinc-400">
                          <th className="border border-black/20 px-3 py-2 text-left font-medium dark:border-white/15">
                            Size
                          </th>
                          <th className="border border-black/20 px-3 py-2 text-left font-medium dark:border-white/15">
                            Qty
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {SIZES.map((s) => {
                          const qty = (m.get(s) ?? 0) as number;
                          return (
                            <tr key={s}>
                              <td className="border border-black/20 px-3 py-2 font-medium dark:border-white/15">
                                {s}
                              </td>
                              <td className="border border-black/20 px-3 py-2 tabular-nums dark:border-white/15">
                                {qty}
                              </td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td className="border border-black/20 px-3 py-2 text-right font-semibold dark:border-white/15">
                            Total
                          </td>
                          <td className="border border-black/20 px-3 py-2 font-semibold tabular-nums dark:border-white/15">
                            {total}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        {batches.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
            No batches found for your account.
          </div>
        ) : null}
      </div>
    </div>
  );
}

