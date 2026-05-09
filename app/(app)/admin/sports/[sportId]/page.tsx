import Link from "next/link";
import { notFound } from "next/navigation";

import { updateSportAction } from "@/app/admin/sports/actions";
import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { SubmitButton } from "@/app/ui/SubmitButton";
import { DeleteSportButton } from "../delete-sport-button";

export default async function AdminSportEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ sportId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSuperAdmin();
  const { sportId } = await params;
  const { error } = await searchParams;

  const sport = await prisma.sport.findUnique({ where: { id: sportId } });
  if (!sport) notFound();

  const field =
    "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-white/30";
  const label = "text-sm font-medium text-zinc-800 dark:text-zinc-100";

  return (
    <div className="mx-auto w-full max-w-4xl px-0 py-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Edit sport</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{sport.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/sports"
            className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
          >
            All sports
          </Link>
          <Link
            href={`/sports/${sport.id}`}
            className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
          >
            Roster page
          </Link>
        </div>
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
        <form action={updateSportAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={sport.id} />
          <div className="space-y-1 sm:col-span-2">
            <label className={label} htmlFor="edit-name">
              Name
            </label>
            <input id="edit-name" name="name" required className={field} defaultValue={sport.name} />
          </div>
          <div className="space-y-1">
            <label className={label} htmlFor="edit-code">
              Code
            </label>
            <input id="edit-code" name="code" required className={field} defaultValue={sport.code} />
          </div>
          <div className="space-y-1">
            <label className={label} htmlFor="edit-max">
              Max players per batch
            </label>
            <input
              id="edit-max"
              name="maxPlayersPerBatch"
              type="number"
              min={1}
              max={9999}
              required
              className={field}
              defaultValue={sport.maxPlayersPerBatch}
            />
          </div>
          <div className="space-y-1">
            <label className={label} htmlFor="edit-sort">
              Sort order
            </label>
            <input id="edit-sort" name="sortOrder" type="number" min={0} className={field} defaultValue={sport.sortOrder} />
          </div>
          <div className="space-y-1">
            <label className={label} htmlFor="edit-entry">
              Data entry
            </label>
            <select
              id="edit-entry"
              name="dataEntryOpen"
              className={field}
              defaultValue={sport.dataEntryOpen ? "open" : "closed"}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className={label} htmlFor="edit-note">
              Note (optional)
            </label>
            <textarea id="edit-note" name="note" rows={5} className={`${field} min-h-[7rem] py-2`} defaultValue={sport.note ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton
              pendingText="Saving…"
              className="h-11 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              Save changes
            </SubmitButton>
          </div>
        </form>
      </section>

      <section className="mt-10 rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/50 dark:bg-red-950/20">
        <h2 className="text-base font-semibold text-red-900 dark:text-red-200">Delete sport</h2>
        <p className="mt-2 text-sm text-red-800/90 dark:text-red-200/90">
          This removes the sport and all roster rows for every batch (cascade). Ticket registrations are not affected.
        </p>
        <div className="mt-4">
          <DeleteSportButton sportId={sport.id} sportName={sport.name} />
        </div>
      </section>
    </div>
  );
}
