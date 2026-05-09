import Link from "next/link";

import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { createSportAction } from "@/app/admin/sports/actions";
import { SubmitButton } from "@/app/ui/SubmitButton";

export default async function AdminSportsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSuperAdmin();
  const { error } = await searchParams;

  const sports = await prisma.sport.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const field =
    "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-white/30";
  const label = "text-sm font-medium text-zinc-800 dark:text-zinc-100";

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sports</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Define games, per-batch player limits, data-entry status, and guidance notes for batch reps.
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

      <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="text-base font-semibold">Add sport</h2>
        <form action={createSportAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label className={label} htmlFor="sport-name">
              Name
            </label>
            <input id="sport-name" name="name" required className={field} placeholder="e.g. Football" />
          </div>
          <div className="space-y-1">
            <label className={label} htmlFor="sport-code">
              Code (unique)
            </label>
            <input id="sport-code" name="code" required className={field} placeholder="e.g. FOOTBALL" />
          </div>
          <div className="space-y-1">
            <label className={label} htmlFor="sport-max">
              Max players per batch
            </label>
            <input id="sport-max" name="maxPlayersPerBatch" type="number" min={1} max={9999} defaultValue={11} required className={field} />
          </div>
          <div className="space-y-1">
            <label className={label} htmlFor="sport-sort">
              Sort order
            </label>
            <input id="sport-sort" name="sortOrder" type="number" min={0} defaultValue={0} className={field} />
          </div>
          <div className="space-y-1">
            <label className={label} htmlFor="sport-entry">
              Data entry
            </label>
            <select id="sport-entry" name="dataEntryOpen" className={field} defaultValue="open">
              <option value="open">Open (batch reps can edit rosters)</option>
              <option value="closed">Closed (batch reps blocked)</option>
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className={label} htmlFor="sport-note">
              Note (optional, multiline)
            </label>
            <textarea
              id="sport-note"
              name="note"
              rows={4}
              className={`${field} min-h-[6rem] py-2`}
              placeholder="e.g. 5–10 years: Primary school; 10–13 years: High school"
            />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton
              pendingText="Saving…"
              className="h-11 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              Create sport
            </SubmitButton>
          </div>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold">All sports</h2>
        {sports.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">No sports yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-zinc-950">
            {sports.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {s.code} · max {s.maxPlayersPerBatch}/batch · sort {s.sortOrder} ·{" "}
                    {s.dataEntryOpen ? "entry open" : "entry closed"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/sports/${s.id}`}
                    className="inline-flex h-10 items-center rounded-xl border border-black/10 px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                  >
                    View roster
                  </Link>
                  <Link
                    href={`/admin/sports/${s.id}`}
                    className="inline-flex h-10 items-center rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
