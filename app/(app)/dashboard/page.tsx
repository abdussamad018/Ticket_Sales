import Link from "next/link";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export default async function DashboardPage() {
  const session = await requireSession();
  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { batch: true },
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Welcome <span className="font-medium">{me?.email}</span>{" "}
            {me?.role === "BATCH_REP" && me.batch ? (
              <>
                • Batch: <span className="font-medium">{me.batch.code}</span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
            href="/participants/new"
          >
            Add participant
          </Link>
          <Link
            className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
            href="/reports"
          >
            Reports
          </Link>
          {session.role === "SUPER_ADMIN" ? (
            <Link
              className="inline-flex h-10 items-center rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              href="/admin"
            >
              Admin
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Your role</div>
          <div className="mt-1 text-lg font-semibold">{session.role}</div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Quick actions</div>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link className="underline underline-offset-4" href="/participants/new">
              Create participant entry
            </Link>
            <Link className="underline underline-offset-4" href="/reports">
              View reports
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Next</div>
          <div className="mt-1 text-sm">
            You can now do participant entry and see reports. Next we’ll add participant list, edit, and richer sales reports.
          </div>
        </div>
      </div>
    </div>
  );
}

