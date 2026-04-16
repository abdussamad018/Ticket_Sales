import Link from "next/link";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex h-10 items-center rounded-xl px-3 text-sm text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
    >
      {label}
    </Link>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { batch: true },
  });

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-20 w-full border-b border-black/10 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
              Alumni Event
            </Link>
          </div>

          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">
              <span className="max-w-[160px] truncate sm:max-w-[240px]">{me?.email ?? "User"}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {me?.role === "BATCH_REP" && me.batch ? `(${me.batch.code})` : `(${me?.role ?? session.role})`}
              </span>
            </summary>

            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950">
              <div className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                Signed in as
                <div className="mt-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {me?.email}
                </div>
              </div>
              <div className="h-px bg-black/5 dark:bg-white/10" />
              <form action="/api/auth/logout" method="post" className="p-2">
                <button className="flex h-10 w-full items-center justify-center rounded-xl bg-black text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
                  Logout
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-4 px-4 py-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="rounded-2xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-950">
            <div className="px-2 pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Navigation
            </div>
            <nav className="flex flex-col gap-1">
              <NavLink href="/dashboard" label="Dashboard" />
              <NavLink href="/participants" label="Participants" />
              <NavLink href="/participants/new" label="Add participant" />
              <NavLink href="/reports" label="Reports" />
              {session.role === "SUPER_ADMIN" ? <NavLink href="/admin" label="Admin" /> : null}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
            >
              Dashboard
            </Link>
            <Link
              href="/participants"
              className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
            >
              Participants
            </Link>
            <Link
              href="/participants/new"
              className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
            >
              Add participant
            </Link>
            <Link
              href="/reports"
              className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
            >
              Reports
            </Link>
            {session.role === "SUPER_ADMIN" ? (
              <Link
                href="/admin"
                className="inline-flex h-10 items-center rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              >
                Admin
              </Link>
            ) : null}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}

