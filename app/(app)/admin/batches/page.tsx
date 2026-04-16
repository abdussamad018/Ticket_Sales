import type { Batch } from "@prisma/client";

import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { createBatchAction } from "@/app/admin/batches/actions";
import { SubmitButton } from "@/app/ui/SubmitButton";

export default async function AdminBatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSuperAdmin();

  const { error } = await searchParams;
  const batches: Batch[] = await prisma.batch.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Batches</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Create and manage batches.</p>
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
          <h2 className="text-base font-semibold">Add batch</h2>
          <form action={createBatchAction} className="mt-4 space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="code">
                Batch code
              </label>
              <input
                id="code"
                name="code"
                required
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="2014"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="name">
                Name (optional)
              </label>
              <input
                id="name"
                name="name"
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="CSE 2014"
              />
            </div>
            <SubmitButton
              pendingText="Creating…"
              className="h-11 w-full rounded-xl bg-black px-5 text-white hover:bg-black/90 disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              Create
            </SubmitButton>
          </form>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950 lg:col-span-2">
          <h2 className="text-base font-semibold">All batches</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Active</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-4 font-medium">{b.code}</td>
                    <td className="py-2 pr-4">{b.name ?? "-"}</td>
                    <td className="py-2 pr-4">{b.isActive ? "Yes" : "No"}</td>
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

