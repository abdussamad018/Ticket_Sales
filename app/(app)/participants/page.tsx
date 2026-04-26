import type { AttendeeType } from "@prisma/client";
import Link from "next/link";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { DeleteParticipantButton } from "./delete-participant-button";
import { BatchCombobox } from "@/app/ui/BatchCombobox";

function sumParticipantAmount(
  attendees: Array<{ ticket: { price: number } }>,
) {
  return attendees.reduce((s, a) => s + a.ticket.price, 0);
}

function firstAdultFromAttendees(
  attendees: Array<{ type: AttendeeType; fullName: string | null; phone: string | null; createdAt: Date }>,
) {
  const adults = attendees
    .filter((a) => a.type === "ADULT")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const first = adults[0];
  const name = first?.fullName?.trim() || null;
  const phone = first?.phone?.trim() || null;
  return { name, phone };
}

export default async function ParticipantsListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; batchId?: string; phone?: string }>;
}) {
  const session = await requireSession();
  const { error, batchId: batchIdFilter, phone: phoneParam } = await searchParams;
  const phoneSearch = phoneParam?.trim() ?? "";

  const isAdmin = session.role === "SUPER_ADMIN";

  const batchesForFilter = isAdmin
    ? await prisma.batch.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true } })
    : [];

  const batchFilterActive =
    isAdmin && batchIdFilter && batchesForFilter.some((b) => b.id === batchIdFilter);

  const baseListWhere = isAdmin
    ? batchFilterActive
      ? { batchId: batchIdFilter }
      : {}
    : { batchId: session.batchId! };

  const listWhere =
    phoneSearch.length > 0
      ? {
          ...baseListWhere,
          attendees: {
            some: {
              phone: { contains: phoneSearch, mode: "insensitive" as const },
            },
          },
        }
      : baseListWhere;

  const participants =
    session.role === "BATCH_REP" && !session.batchId
      ? []
      : await prisma.participant.findMany({
          where: listWhere,
          include: {
            batch: { select: { code: true } },
            createdBy: { select: { email: true, name: true } },
            attendees: {
              orderBy: { createdAt: "asc" },
              include: { ticket: { select: { price: true, name: true } } },
            },
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

  const filterActive = batchFilterActive || phoneSearch.length > 0;

  function exportHref() {
    const qs = new URLSearchParams();
    if (isAdmin && batchFilterActive && batchIdFilter) qs.set("batchId", batchIdFilter);
    if (phoneSearch.length > 0) qs.set("phone", phoneSearch);
    const q = qs.toString();
    return q ? `/participants/export?${q}` : "/participants/export";
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

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <a
          href={exportHref()}
          className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
        >
          Export CSV
        </a>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      {isAdmin ? (
        <form
          method="get"
          className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
        >
          {batchesForFilter.length > 0 ? (
            <BatchCombobox
              batches={batchesForFilter}
              name="batchId"
              label="Filter by batch"
              defaultBatchId={batchIdFilter}
              allowAll
            />
          ) : null}
          <div className="flex min-w-[200px] flex-1 flex-col gap-1 sm:max-w-xs">
            <label htmlFor="phone-filter" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Search by phone
            </label>
            <input
              id="phone-filter"
              name="phone"
              type="search"
              defaultValue={phoneSearch}
              placeholder="e.g. 01712…"
              autoComplete="off"
              className="h-11 rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:bg-zinc-950 dark:focus:ring-white/20"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Apply
          </button>
          {filterActive ? (
            <Link
              href="/participants"
              className="inline-flex h-11 items-center rounded-xl border border-black/10 px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
            >
              Clear filters
            </Link>
          ) : null}
        </form>
      ) : session.role === "BATCH_REP" && session.batchId ? (
        <form
          method="get"
          className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
        >
          <div className="flex min-w-[200px] flex-1 flex-col gap-1 sm:max-w-xs">
            <label htmlFor="phone-filter-rep" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Search by phone
            </label>
            <input
              id="phone-filter-rep"
              name="phone"
              type="search"
              defaultValue={phoneSearch}
              placeholder="e.g. 01712…"
              autoComplete="off"
              className="h-11 rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:bg-zinc-950 dark:focus:ring-white/20"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Apply
          </button>
          {phoneSearch.length > 0 ? (
            <Link
              href="/participants"
              className="inline-flex h-11 items-center rounded-xl border border-black/10 px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
            >
              Clear filters
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
          {filterActive
            ? "No participant entries match these filters."
            : "No participant entries yet."}
        </p>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-zinc-950">
            <span className="text-zinc-600 dark:text-zinc-400">Total ticket amount (this list): </span>
            <span className="font-semibold tabular-nums">{totalAmount}</span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Created</th>
                  {isAdmin ? <th className="px-4 py-3">Batch</th> : null}
                  {isAdmin ? <th className="px-4 py-3">Entered by</th> : null}
                  <th className="px-4 py-3">First adult</th>
                  <th className="px-4 py-3">Phone</th>
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
                  const firstAdult = firstAdultFromAttendees(p.attendees);
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
                      <td className="max-w-[180px] px-4 py-3">
                        <div className="truncate" title={firstAdult.name ?? undefined}>
                          {firstAdult.name ?? "—"}
                        </div>
                      </td>
                      <td className="max-w-[140px] px-4 py-3">
                        <div className="truncate font-mono text-xs tabular-nums" title={firstAdult.phone ?? undefined}>
                          {firstAdult.phone ?? "—"}
                        </div>
                      </td>
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
