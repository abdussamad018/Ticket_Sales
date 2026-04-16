import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { PrintButton } from "./PrintButton";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

function sizeTotal(map: Map<string, number>) {
  let total = 0;
  for (const v of map.values()) total += v;
  return total;
}

export default async function ReportsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string }>;
}) {
  const session = await requireSession();
  const { batchId } = await searchParams;

  const batchScopeWhere =
    session.role === "SUPER_ADMIN"
      ? {}
      : session.role === "BATCH_REP" && session.batchId
        ? { id: session.batchId }
        : { id: { in: [] as string[] } };

  const batchesAll = await prisma.batch.findMany({
    where: batchScopeWhere,
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  const isAdmin = session.role === "SUPER_ADMIN";
  const batchFilterActive = isAdmin && !!batchId && batchesAll.some((b) => b.id === batchId);

  const batches = batchFilterActive ? batchesAll.filter((b) => b.id === batchId) : batchesAll;

  const participantWhere =
    session.role === "SUPER_ADMIN"
      ? batchFilterActive
        ? { batchId }
        : {}
      : session.role === "BATCH_REP" && session.batchId
        ? { batchId: session.batchId }
        : { id: { in: [] as string[] } };

  const entries = await prisma.participant.findMany({
    where: participantWhere,
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
    <div className="w-full">
      <style>{`
@media print {
  .no-print { display: none !important; }
  body { background: white !important; }
}
      `}</style>

      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Print report</h1>
          <p className="text-sm text-zinc-600">
            Batch-wise attendee count and T-shirt requirement summary.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          {isAdmin && batchesAll.length > 0 ? (
            <form method="get" className="flex items-end gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600" htmlFor="batchId">
                  Batch
                </label>
                <select
                  id="batchId"
                  name="batchId"
                  defaultValue={batchId ?? ""}
                  className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30"
                >
                  <option value="">All batches</option>
                  {batchesAll.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5"
              >
                Apply
              </button>
            </form>
          ) : null}

          <PrintButton className="h-10 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90">
            Print
          </PrintButton>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-medium">
            Alumni Event — Batch-wise T-shirt requirement
            {batchFilterActive ? (
              <span className="ml-2 font-normal text-zinc-600">
                (Filtered)
              </span>
            ) : null}
          </div>
          <div className="text-zinc-600">Generated: {today.toLocaleString()}</div>
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
              className="break-inside-avoid rounded-2xl border border-black/15 bg-white"
            >
              <div className="grid grid-cols-[96px_1fr]">
                <div className="flex items-center justify-center border-r border-black/15 px-3 py-6 text-lg font-semibold">
                  {b.code}
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">T-shirt sizes</div>
                      {b.name ? <div className="text-xs text-zinc-600">{b.name}</div> : null}
                    </div>
                    <div className="text-xs text-zinc-600">
                      Attendees:{" "}
                      <span className="font-semibold tabular-nums text-zinc-900">
                        {attendeeCount}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[360px] border-collapse text-sm">
                      <thead>
                        <tr className="text-zinc-600">
                          <th className="border border-black/20 px-3 py-2 text-left font-medium">
                            Size
                          </th>
                          <th className="border border-black/20 px-3 py-2 text-left font-medium">
                            Qty
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {SIZES.map((s) => {
                          const qty = m.get(s) ?? 0;
                          return (
                            <tr key={s}>
                              <td className="border border-black/20 px-3 py-2 font-medium">{s}</td>
                              <td className="border border-black/20 px-3 py-2 tabular-nums">
                                {qty}
                              </td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td className="border border-black/20 px-3 py-2 text-right font-semibold">
                            Total
                          </td>
                          <td className="border border-black/20 px-3 py-2 font-semibold tabular-nums">
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
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-zinc-600">
            No batches found for your account.
          </div>
        ) : null}
      </div>
    </div>
  );
}

