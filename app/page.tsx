import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Alumni Event</h1>
            <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
              Participant entry, ticket sales tracking, and T-shirt size reporting — with role-based access
              for Super Admin & Batch Representatives.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-black/10 px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              href="/login"
            >
              Sign in
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
            <div className="text-sm font-semibold">Batch Representative</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>Participant data entry only for own batch</li>
              <li>See ticket count and T-shirt sizes for own batch</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
            <div className="text-sm font-semibold">Super Admin</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>Participant data entry for all batches</li>
              <li>Create/manage batch reps and ticket types</li>
              <li>Batch-wise and overall reports</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
