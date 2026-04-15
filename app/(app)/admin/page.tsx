import Link from "next/link";

import { requireSuperAdmin } from "@/app/lib/auth";

export default async function AdminHomePage() {
  await requireSuperAdmin();

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Manage batch representatives, tickets, and system data.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
          href="/admin/tickets"
        >
          <div className="text-sm font-semibold">Tickets</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create multiple ticket types with prices
          </div>
        </Link>

        <Link
          className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
          href="/admin/users"
        >
          <div className="text-sm font-semibold">Batch Representatives</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Add multiple reps per batch
          </div>
        </Link>

        <Link
          className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
          href="/admin/batches"
        >
          <div className="text-sm font-semibold">Batches</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Create & activate batches</div>
        </Link>
      </div>
    </div>
  );
}

