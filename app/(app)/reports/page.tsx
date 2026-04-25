import { requireSession } from "@/app/lib/auth";
import { LoadingLinkButton } from "@/app/ui/LoadingLinkButton";

export default async function ReportsPage() {
  const session = await requireSession();

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {session.role === "BATCH_REP" && session.batchId
              ? "Choose a report for your batch."
              : session.role === "BATCH_REP"
                ? "Your account has no batch assigned — reports are empty until an admin links your batch."
                : "Choose a report. Admin can filter by batch inside each report."}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm font-semibold">T-shirt</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Size breakdown, totals, and printable committee report.
          </div>
          <div className="mt-4 flex gap-2">
            <LoadingLinkButton
              href="/reports/tshirts"
              pendingText="Opening…"
              className="inline-flex h-10 items-center rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              Open
            </LoadingLinkButton>
            <LoadingLinkButton
              href="/reports/print"
              pendingText="Opening…"
              className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
            >
              Print
            </LoadingLinkButton>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm font-semibold">Sales</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Batch-wise sales history, totals, and representative totals.
          </div>
          <div className="mt-4">
            <LoadingLinkButton
              href="/reports/sales"
              pendingText="Opening…"
              className="inline-flex h-10 items-center rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              Open
            </LoadingLinkButton>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm font-semibold">Batch → tickets</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            For each batch, see how many of each ticket was sold.
          </div>
          <div className="mt-4">
            <LoadingLinkButton
              href="/reports/batch-tickets"
              pendingText="Opening…"
              className="inline-flex h-10 items-center rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              Open
            </LoadingLinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
