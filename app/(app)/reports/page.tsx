import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export default async function ReportsPage() {
  const session = await requireSession();

  const whereBatch =
    session.role === "BATCH_REP" && session.batchId ? { batchId: session.batchId } : {};

  const batches = await prisma.batch.findMany({
    where:
      session.role === "BATCH_REP" && session.batchId ? { id: session.batchId } : {},
    orderBy: { code: "asc" },
  });

  const batchMap = new Map(batches.map((b) => [b.id, b]));

  const entries = await prisma.participant.findMany({
    where: whereBatch,
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

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {session.role === "BATCH_REP" ? "Showing only your batch." : "Showing all batches."}
        </p>
      </div>

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

