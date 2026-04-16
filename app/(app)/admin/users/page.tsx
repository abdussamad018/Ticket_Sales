import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { createBatchRepAction } from "@/app/admin/users/actions";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSuperAdmin();

  const { error } = await searchParams;
  const [batches, reps] = await Promise.all([
    prisma.batch.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    prisma.user.findMany({
      where: { role: "BATCH_REP" },
      include: { batch: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Batch Representatives</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Add multiple reps per batch.</p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">Add Batch Rep</h2>
          <form action={createBatchRepAction} className="mt-4 space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="batchId">
                Batch
              </label>
              <select
                id="batchId"
                name="batchId"
                required
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="name">
                Name (optional)
              </label>
              <input
                id="name"
                name="name"
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="Rep name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="rep@email.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="••••••••"
              />
            </div>

            <button className="h-11 w-full rounded-xl bg-black px-5 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
              Create
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950 lg:col-span-2">
          <h2 className="text-base font-semibold">All Batch Reps</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Batch</th>
                  <th className="py-2 pr-4">Active</th>
                </tr>
              </thead>
              <tbody>
                {reps.map((u) => (
                  <tr key={u.id} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-4 font-medium">{u.email}</td>
                    <td className="py-2 pr-4">{u.name ?? "-"}</td>
                    <td className="py-2 pr-4">{u.batch?.code ?? "-"}</td>
                    <td className="py-2 pr-4">{u.isActive ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

