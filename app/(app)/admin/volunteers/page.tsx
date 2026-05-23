import Link from "next/link";

import { createVolunteerAction, setVolunteerActiveAction } from "@/app/admin/volunteers/actions";
import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { SubmitButton } from "@/app/ui/SubmitButton";

export default async function AdminVolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSuperAdmin();
  const { error } = await searchParams;

  const volunteers = await prisma.user.findMany({
    where: { role: "VOLUNTEER" },
    orderBy: { email: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Volunteers</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Gate check-in only — QR scan on /attendance, no other access.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex h-10 w-fit items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
        >
          Back to admin
        </Link>
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
          <h2 className="text-base font-semibold">Add volunteer</h2>
          <form action={createVolunteerAction} className="mt-4 space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="name">
                Name (optional)
              </label>
              <input
                id="name"
                name="name"
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="Gate volunteer"
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
                placeholder="volunteer21@kmlhsaa.com"
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
                minLength={6}
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="••••••••"
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
          <h2 className="text-base font-semibold">All volunteers ({volunteers.length})</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Active</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {volunteers.map((u) => (
                  <tr key={u.id} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-4 font-medium">{u.email}</td>
                    <td className="py-2 pr-4">{u.name ?? "—"}</td>
                    <td className="py-2 pr-4">{u.isActive ? "Yes" : "No"}</td>
                    <td className="py-2 pr-4">
                      <form action={setVolunteerActiveAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="isActive" value={u.isActive ? "false" : "true"} />
                        <button
                          type="submit"
                          className="text-sm underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {volunteers.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No volunteers yet. Run seed or add above.</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
