import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export default async function ReportsPage() {
  const session = await requireSession();

  const whereBatch =
    session.role === "BATCH_REP" && session.batchId ? { batchId: session.batchId } : {};

  const byBatch = await prisma.participant.groupBy({
    by: ["batchId"],
    where: whereBatch,
    _count: { _all: true },
  });

  const batches = await prisma.batch.findMany({
    where:
      session.role === "BATCH_REP" && session.batchId ? { id: session.batchId } : {},
    orderBy: { code: "asc" },
  });

  const batchMap = new Map(batches.map((b) => [b.id, b]));

  const tshirtByBatch = await prisma.participant.groupBy({
    by: ["batchId", "tshirt"],
    where: { ...whereBatch, tshirt: { not: null } },
    _count: { _all: true },
    orderBy: [{ batchId: "asc" }],
  });

  const tshirtAll = await prisma.participant.groupBy({
    by: ["tshirt"],
    where: { ...whereBatch, tshirt: { not: null } },
    _count: { _all: true },
    orderBy: [{ tshirt: "asc" }],
  });

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
                      <td className="py-2 pr-4">{row._count._all}</td>
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
                  <tr key={row.tshirt ?? "NULL"} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-4 font-medium">{row.tshirt}</td>
                    <td className="py-2 pr-4">{row._count._all}</td>
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
                  key={`${row.batchId}_${row.tshirt ?? "NULL"}`}
                  className="border-t border-black/5 dark:border-white/10"
                >
                  <td className="py-2 pr-4 font-medium">
                    {batchMap.get(row.batchId)?.code ?? row.batchId}
                  </td>
                  <td className="py-2 pr-4">{row.tshirt}</td>
                  <td className="py-2 pr-4">{row._count._all}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

