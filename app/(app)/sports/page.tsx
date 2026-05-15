import Link from "next/link";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export default async function SportsListPage() {
  await requireSession();

  const sports = await prisma.sport.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sports roster</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Per-game player lists by batch — separate from{" "}
          <Link href="/participants" className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100">
            event registration (participants)
          </Link>
          .{" "}
          <Link
            href="/reports/sport-rosters/print"
            className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Printable report (all sports, by batch)
          </Link>
        </p>
      </div>

      {sports.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
          No sports are configured yet. A super admin can add them under Admin → Sports.
        </p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {sports.map((s) => (
            <li key={s.id}>
              <Link
                href={`/sports/${s.id}`}
                className="flex flex-col rounded-2xl border border-black/10 bg-white p-4 hover:bg-black/[0.03] dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{s.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.dataEntryOpen
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {s.dataEntryOpen ? "Data entry open" : "Data entry closed"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Code: {s.code}</div>
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Up to {s.maxPlayersPerBatch} players per batch
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
