import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

function sumTicketAmount(attendees: Array<{ ticket: { price: number } }>) {
  return attendees.reduce((s, a) => s + a.ticket.price, 0);
}

export default async function ParticipantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ batchId?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const { batchId: listBatchFilter } = await searchParams;

  const participant = await prisma.participant.findUnique({
    where: { id },
    include: {
      batch: { select: { id: true, code: true, name: true } },
      createdBy: { select: { email: true, name: true, role: true } },
      attendees: {
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
        include: {
          ticket: { select: { code: true, name: true, price: true, attendeeType: true } },
        },
      },
    },
  });

  if (!participant) notFound();

  if (session.role === "BATCH_REP") {
    if (!session.batchId || participant.batchId !== session.batchId) notFound();
  }

  const listHref =
    session.role === "SUPER_ADMIN" && listBatchFilter
      ? `/participants?batchId=${encodeURIComponent(listBatchFilter)}`
      : "/participants";

  const total = sumTicketAmount(participant.attendees);

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={listHref}
          className="inline-flex w-fit items-center text-sm text-zinc-600 underline underline-offset-4 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Back to participants
        </Link>
      </div>

      <div className="mt-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Registration details</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Batch <span className="font-medium text-zinc-900 dark:text-zinc-100">{participant.batch.code}</span>
          {participant.batch.name ? ` · ${participant.batch.name}` : null}
        </p>
      </div>

      <dl className="mt-6 grid gap-3 rounded-2xl border border-black/10 bg-white p-5 text-sm dark:border-white/10 dark:bg-zinc-950 sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Created</dt>
          <dd className="mt-0.5 font-medium">{participant.createdAt.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Entered by</dt>
          <dd className="mt-0.5 font-medium">
            {participant.createdBy.name ? `${participant.createdBy.name} · ` : null}
            {participant.createdBy.email}
            <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
              ({participant.createdBy.role})
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Adults / children / infants</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            {participant.adultCount} / {participant.childCount} / {participant.infantCount}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Total ticket amount</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{total}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Children attending (recorded)</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{participant.totalChildrenAttending}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Payment proof</dt>
          <dd className="mt-0.5">
            {participant.paymentScreenshotUrl ? (
              <a
                href={participant.paymentScreenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-blue-600 underline underline-offset-2 dark:text-blue-400"
              >
                Open link
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        {participant.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-zinc-500 dark:text-zinc-400">Notes</dt>
            <dd className="mt-0.5 whitespace-pre-wrap font-medium">{participant.notes}</dd>
          </div>
        ) : null}
      </dl>

      <section className="mt-8">
        <h2 className="text-base font-semibold">Attendees</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Per-person ticket assignment and contact details captured at registration.
        </p>

        {participant.attendees.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No attendee rows.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Full name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">T-shirt</th>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Price</th>
                </tr>
              </thead>
              <tbody>
                {participant.attendees.map((a) => (
                  <tr key={a.id} className="border-t border-black/5 dark:border-white/10">
                    <td className="px-4 py-3 font-medium">{a.type}</td>
                    <td className="px-4 py-3">{a.fullName ?? "—"}</td>
                    <td className="px-4 py-3">{a.phone ?? "—"}</td>
                    <td className="px-4 py-3">{a.tshirt ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.ticket.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {a.ticket.code} · {a.ticket.attendeeType}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{a.ticket.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
