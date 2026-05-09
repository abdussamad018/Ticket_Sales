import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { BatchCombobox } from "@/app/ui/BatchCombobox";
import { SubmitButton } from "@/app/ui/SubmitButton";
import { createSportRosterEntryAction, updateSportRosterEntryAction } from "@/app/sports/roster-actions";
import { DeleteRosterEntryButton } from "../delete-roster-entry-button";

export default async function SportRosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ sportId: string }>;
  searchParams: Promise<{ batchId?: string; error?: string }>;
}) {
  const session = await requireSession();
  const { sportId } = await params;
  const { batchId: batchIdParam, error } = await searchParams;

  const sport = await prisma.sport.findUnique({ where: { id: sportId } });
  if (!sport) notFound();

  const isAdmin = session.role === "SUPER_ADMIN";
  const batches =
    isAdmin
      ? await prisma.batch.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true } })
      : [];

  const batchFilterActive =
    isAdmin && batchIdParam && batches.some((b) => b.id === batchIdParam);

  const effectiveBatchId = isAdmin
    ? batchFilterActive
      ? batchIdParam!
      : null
    : session.batchId;

  const repBlocked = session.role === "BATCH_REP" && !sport.dataEntryOpen;
  const repNoBatch = session.role === "BATCH_REP" && !session.batchId;

  const entries =
    effectiveBatchId != null
      ? await prisma.sportRosterEntry.findMany({
          where: { sportId, batchId: effectiveBatchId },
          include: { batch: { select: { code: true } }, createdBy: { select: { email: true, name: true } } },
          orderBy: { createdAt: "asc" },
        })
      : [];

  const count = entries.length;
  const atCap = effectiveBatchId != null && count >= sport.maxPlayersPerBatch;
  const canRepMutate = session.role === "BATCH_REP" && sport.dataEntryOpen && !repNoBatch;
  const canAdminMutate = isAdmin && effectiveBatchId != null;
  const canMutate = canRepMutate || canAdminMutate;

  const inputClass =
    "h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-white/30";

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/sports"
              className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Sports roster
            </Link>
            <span className="text-sm text-zinc-400">/</span>
            <h1 className="text-2xl font-semibold tracking-tight">{sport.name}</h1>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Code {sport.code} — up to {sport.maxPlayersPerBatch} players per batch
            {effectiveBatchId ? (
              <>
                {" "}
                · <span className="font-medium text-zinc-800 dark:text-zinc-200">{count}</span> /{" "}
                {sport.maxPlayersPerBatch} in this batch
              </>
            ) : null}
          </p>
        </div>
        {isAdmin ? (
          <Link
            href={`/admin/sports/${sport.id}`}
            className="inline-flex h-10 w-fit items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
          >
            Edit sport (admin)
          </Link>
        ) : null}
      </div>

      {sport.note?.trim() ? (
        <div className="mt-6 rounded-2xl border border-black/10 bg-amber-50/80 p-4 text-sm text-zinc-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-100">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-900/80 dark:text-amber-200/90">
            Instructions / labels
          </div>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed">{sport.note.trim()}</pre>
        </div>
      ) : null}

      {repNoBatch ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          Your account is not linked to a batch. Contact an administrator.
        </p>
      ) : null}

      {repBlocked ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          Data entry is closed for this sport. You can view the list but cannot add, edit, or delete players. Contact a
          super admin if a correction is needed.
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      {isAdmin ? (
        <form
          method="get"
          className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
        >
          <BatchCombobox
            batches={batches}
            name="batchId"
            label="Batch for roster"
            defaultBatchId={batchFilterActive ? batchIdParam : undefined}
            allowAll={false}
            placeholder="Type batch code (e.g. 2014)"
          />
          <button
            type="submit"
            className="h-11 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            View roster
          </button>
          {batchFilterActive ? (
            <Link
              href={`/sports/${sport.id}`}
              className="inline-flex h-11 items-center rounded-xl border border-black/10 px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
            >
              Change batch
            </Link>
          ) : null}
        </form>
      ) : null}

      {isAdmin && !batchFilterActive ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Choose a batch above to view or edit that batch&apos;s roster for this sport.
        </p>
      ) : null}

      {effectiveBatchId != null && !repNoBatch ? (
        <>
          <div className="mt-8 flex flex-col gap-4">
            {entries.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">No players yet for this batch.</p>
            ) : (
              entries.map((e) => (
                <div
                  key={e.id}
                  className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <form action={updateSportRosterEntryAction} className="grid flex-1 gap-3 sm:grid-cols-3">
                      <input type="hidden" name="entryId" value={e.id} />
                      <input type="hidden" name="sportId" value={sport.id} />
                      <input type="hidden" name="batchId" value={effectiveBatchId} />
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Full name</label>
                        <input
                          name="fullName"
                          defaultValue={e.fullName}
                          disabled={!canMutate}
                          className={inputClass}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Phone</label>
                        <input name="phone" defaultValue={e.phone ?? ""} disabled={!canMutate} className={inputClass} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Notes</label>
                        <input name="notes" defaultValue={e.notes ?? ""} disabled={!canMutate} className={inputClass} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
                        {canMutate ? (
                          <SubmitButton
                            pendingText="Saving…"
                            className="h-10 rounded-xl border border-black/15 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/15 dark:bg-zinc-900 dark:hover:bg-white/10"
                          >
                            Save changes
                          </SubmitButton>
                        ) : null}
                      </div>
                    </form>
                    <div className="flex shrink-0 flex-col gap-2 border-t border-black/5 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0 dark:border-white/10">
                      {isAdmin ? (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">Batch: {e.batch.code}</div>
                      ) : null}
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Added by: {e.createdBy.name?.trim() || e.createdBy.email}
                      </div>
                      <DeleteRosterEntryButton
                        entryId={e.id}
                        sportId={sport.id}
                        batchId={effectiveBatchId}
                        label={e.fullName}
                        disabled={!canMutate}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {canMutate && !atCap ? (
            <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
              <h2 className="text-base font-semibold">Add player</h2>
              <form action={createSportRosterEntryAction} className="mt-4 flex max-w-xl flex-col gap-3">
                <input type="hidden" name="sportId" value={sport.id} />
                <input type="hidden" name="batchId" value={effectiveBatchId} />
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="new-fullName">
                    Full name
                  </label>
                  <input id="new-fullName" name="fullName" required className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="new-phone">
                    Phone (optional)
                  </label>
                  <input id="new-phone" name="phone" className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="new-notes">
                    Notes (optional)
                  </label>
                  <input id="new-notes" name="notes" className={inputClass} />
                </div>
                <SubmitButton
                  pendingText="Adding…"
                  className="h-11 w-fit rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                >
                  Add player
                </SubmitButton>
              </form>
            </section>
          ) : canMutate && atCap ? (
            <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
              This batch has reached the maximum of {sport.maxPlayersPerBatch} players for this sport.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
