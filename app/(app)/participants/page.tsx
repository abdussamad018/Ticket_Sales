import Link from "next/link";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { DeleteParticipantButton } from "./delete-participant-button";

function sumParticipantAmount(
  attendees: Array<{ ticket: { price: number } }>,
) {
  return attendees.reduce((s, a) => s + a.ticket.price, 0);
}

export default async function ParticipantsListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; batchId?: string }>;
}) {
  const session = await requireSession();
  const { error, batchId: batchIdFilter } = await searchParams;

  const isAdmin = session.role === "SUPER_ADMIN";

  const batchesForFilter = isAdmin
    ? await prisma.batch.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true } })
    : [];

  const batchFilterActive =
    isAdmin && batchIdFilter && batchesForFilter.some((b) => b.id === batchIdFilter);

  const listWhere = isAdmin
    ? batchFilterActive
      ? { batchId: batchIdFilter }
      : {}
    : { batchId: session.batchId! };

  const participants =
    session.role === "BATCH_REP" && !session.batchId
      ? []
      : await prisma.participant.findMany({
          where: listWhere,
          include: {
            batch: { select: { code: true } },
            createdBy: { select: { email: true, name: true } },
            attendees: { include: { ticket: { select: { price: true, name: true } } } },
          },
          orderBy: { createdAt: "desc" },
        });

  const totalAmount = participants.reduce((s, p) => s + sumParticipantAmount(p.attendees), 0);

  function detailHref(participantId: string) {
    if (isAdmin && batchFilterActive && batchIdFilter) {
      return `/participants/${participantId}?batchId=${encodeURIComponent(batchIdFilter)}`;
    }
    return `/participants/${participantId}`;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Participants</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isAdmin
              ? "All batches — filter, open details, or delete any entry."
              : session.batchId
                ? "Entries for your batch only — view details or delete registrations."
                : "Your account is not linked to a batch. Contact an administrator."}
          </p>
        </div>
        <Link
          href="/participants/new"
          className="inline-flex h-10 shrink-0 items-center rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          Add participant
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

      {isAdmin && batchesForFilter.length > 0 ? (
        <form
          method="get"
          className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
        >
          <div className="space-y-1">
            <label htmlFor="batchId" className="text-sm font-medium">
              Filter by batch
            </label>
            <select
              id="batchId"
              name="batchId"
              defaultValue={batchIdFilter ?? ""}
              className="h-11 min-w-[12rem] rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            >
              <option value="">All batches</option>
              {batchesForFilter.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Apply
          </button>
          {batchFilterActive ? (
            <Link
              href="/participants"
              className="inline-flex h-11 items-center rounded-xl border border-black/10 px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
            >
              Clear filter
            </Link>
          ) : null}
        </form>
      ) : null}

      {session.role === "BATCH_REP" && !session.batchId ? (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Once a batch is assigned to your account, participant lists will appear here.
        </p>
      ) : participants.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          {batchFilterActive ? "No participant entries for this batch." : "No participant entries yet."}
        </p>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-zinc-950">
            <span className="text-zinc-600 dark:text-zinc-400">Total ticket amount (this list): </span>
            <span className="font-semibold tabular-nums">{totalAmount}</span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Created</th>
                  {isAdmin ? <th className="px-4 py-3">Batch</th> : null}
                  {isAdmin ? <th className="px-4 py-3">Entered by</th> : null}
                  <th className="px-4 py-3">Attendees</th>
                  <th className="px-4 py-3">Counts (A/C/I)</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment proof</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const amount = sumParticipantAmount(p.attendees);
                  const label = `${p.batch.code} · ${p.createdAt.toISOString().slice(0, 10)}`;
                  return (
                    <tr key={p.id} className="border-t border-black/5 dark:border-white/10">
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                        {p.createdAt.toLocaleString()}
                      </td>
                      {isAdmin ? (
                        <td className="px-4 py-3 font-medium">{p.batch.code}</td>
                      ) : null}
                      {isAdmin ? (
                        <td className="px-4 py-3">
                          <div className="max-w-[200px] truncate" title={p.createdBy.email}>
                            {p.createdBy.name ? `${p.createdBy.name} · ` : null}
                            {p.createdBy.email}
                          </div>
                        </td>
                      ) : null}
                      <td className="px-4 py-3 tabular-nums">{p.attendees.length}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {p.adultCount}/{p.childCount}/{p.infantCount}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">{amount}</td>
                      <td className="px-4 py-3">
                        {p.paymentScreenshotUrl ? (
                          <a
                            href={p.paymentScreenshotUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
                          >
                            Open
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={detailHref(p.id)}
                            className="inline-flex h-9 items-center rounded-lg border border-black/15 px-3 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                          >
                            View
                          </Link>
                          <DeleteParticipantButton participantId={p.id} label={label} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
