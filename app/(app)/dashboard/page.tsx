import type { Prisma } from "@prisma/client";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { LoadingLinkButton } from "@/app/ui/LoadingLinkButton";

function participantScopeWhere(session: {
  role: string;
  batchId: string | null;
}): Prisma.ParticipantWhereInput {
  if (session.role === "SUPER_ADMIN") return {};
  if (session.role === "BATCH_REP" && session.batchId) return { batchId: session.batchId };
  return { id: { in: [] } };
}

function sumTicketAmount(attendees: Array<{ ticket: { price: number } }>) {
  return attendees.reduce((s, a) => s + a.ticket.price, 0);
}

export default async function DashboardPage() {
  const session = await requireSession();
  const scope = participantScopeWhere(session);

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { batch: true },
  });

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const [
    totalParticipants,
    ticketGroups,
    activeBatchesCount,
    weekParticipantsForPulse,
  ] = await Promise.all([
    prisma.participant.count({ where: scope }),
    prisma.attendee.groupBy({
      by: ["ticketId"],
      where: { participant: scope },
      _count: { _all: true },
    }),
    session.role === "SUPER_ADMIN"
      ? prisma.batch.count({ where: { isActive: true } })
      : Promise.resolve(0),
    prisma.participant.findMany({
      where: { ...scope, createdAt: { gte: weekStart } },
      select: {
        createdAt: true,
        attendees: { select: { ticket: { select: { price: true } } } },
      },
    }),
  ]);

  const ticketIds = ticketGroups.map((g) => g.ticketId);
  const ticketsMeta =
    ticketIds.length > 0
      ? await prisma.ticket.findMany({
          where: { id: { in: ticketIds } },
          select: { id: true, code: true, name: true, price: true },
        })
      : [];
  const ticketById = new Map(ticketsMeta.map((t) => [t.id, t]));

  let totalTickets = 0;
  let totalSales = 0;
  const ticketRows = ticketGroups
    .map((g) => {
      const t = ticketById.get(g.ticketId);
      const count = g._count._all;
      const price = t?.price ?? 0;
      totalTickets += count;
      totalSales += price * count;
      return {
        ticketId: g.ticketId,
        code: t?.code ?? g.ticketId,
        name: t?.name ?? "Unknown ticket",
        price,
        count,
        subtotal: price * count,
      };
    })
    .sort((a, b) => b.count - a.count);

  let todayTickets = 0;
  let todayAmount = 0;
  let weekTickets = 0;
  let weekAmount = 0;
  for (const p of weekParticipantsForPulse) {
    const n = p.attendees.length;
    const amt = sumTicketAmount(p.attendees);
    weekTickets += n;
    weekAmount += amt;
    if (p.createdAt >= todayStart) {
      todayTickets += n;
      todayAmount += amt;
    }
  }

  let batchLeaderboard: { batchId: string; code: string; count: number }[] = [];
  if (session.role === "SUPER_ADMIN") {
    const attendeesByBatch = await prisma.attendee.findMany({
      where: { participant: participantScopeWhere(session) },
      select: {
        participant: { select: { batchId: true, batch: { select: { code: true } } } },
      },
    });
    const ticketCountByBatch = new Map<string, { code: string; count: number }>();
    for (const row of attendeesByBatch) {
      const batchId = row.participant.batchId;
      const code = row.participant.batch?.code ?? batchId;
      const prev = ticketCountByBatch.get(batchId);
      if (prev) prev.count += 1;
      else ticketCountByBatch.set(batchId, { code, count: 1 });
    }
    batchLeaderboard = Array.from(ticketCountByBatch.entries())
      .map(([batchId, v]) => ({ batchId, code: v.code, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  const scopeLabel =
    session.role === "SUPER_ADMIN" ? "All batches" : me?.batch?.code ? `Batch ${me.batch.code}` : "Your batch";

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Welcome <span className="font-medium">{me?.email}</span>
            {me?.role === "BATCH_REP" && me.batch ? (
              <>
                {" "}
                • Batch: <span className="font-medium">{me.batch.code}</span>
              </>
            ) : null}
            <span className="block text-xs text-zinc-500 dark:text-zinc-500">Overview: {scopeLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <LoadingLinkButton
            className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
            href="/participants"
            pendingText="Loading…"
          >
            Participants
          </LoadingLinkButton>
          <LoadingLinkButton
            className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
            href="/participants/new"
            pendingText="Loading…"
          >
            Add participant
          </LoadingLinkButton>
          <LoadingLinkButton
            className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
            href="/reports"
            pendingText="Loading…"
          >
            Reports
          </LoadingLinkButton>
          {session.role === "SUPER_ADMIN" ? (
            <LoadingLinkButton
              className="inline-flex h-10 items-center rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              href="/admin"
              pendingText="Loading…"
            >
              Admin
            </LoadingLinkButton>
          ) : null}
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Total registrations</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{totalParticipants.toLocaleString()}</div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">Participant records in scope</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Tickets sold (attendees)</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{totalTickets.toLocaleString()}</div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">Sum of ticket rows across registrations</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Total sales</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{totalSales.toLocaleString()}</div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">BDT (sum of ticket prices × counts)</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Active batches</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {session.role === "SUPER_ADMIN" ? activeBatchesCount.toLocaleString() : "—"}
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            {session.role === "SUPER_ADMIN" ? "Batches marked active" : "Super Admin only"}
          </p>
        </div>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Today (tickets)</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{todayTickets.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Today (amount)</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{todayAmount.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Last 7 days (tickets)</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{weekTickets.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Last 7 days (amount)</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{weekAmount.toLocaleString()}</div>
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">Tickets by type</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Headcount and revenue per ticket ({scopeLabel.toLowerCase()})
              </p>
            </div>
            <LoadingLinkButton
              className="text-sm underline underline-offset-4"
              href="/reports/batch-tickets"
              pendingText="Loading…"
            >
              Batch ticket report
            </LoadingLinkButton>
          </div>
          {ticketRows.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No ticket rows yet in this scope.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead className="text-zinc-600 dark:text-zinc-400">
                  <tr>
                    <th className="py-2 pr-4">Ticket</th>
                    <th className="py-2 pr-4">Code</th>
                    <th className="py-2 pr-4 text-right">Unit (BDT)</th>
                    <th className="py-2 pr-4 text-right">Qty</th>
                    <th className="py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketRows.map((row) => (
                    <tr key={row.ticketId} className="border-t border-black/5 dark:border-white/10">
                      <td className="py-2 pr-4">{row.name}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{row.code}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{row.price.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{row.count.toLocaleString()}</td>
                      <td className="py-2 text-right font-medium tabular-nums">{row.subtotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-black/10 font-semibold dark:border-white/10">
                    <td className="py-3 pr-4" colSpan={3}>
                      Total
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">{totalTickets.toLocaleString()}</td>
                    <td className="py-3 text-right tabular-nums">{totalSales.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">Quick links</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Jump to lists, exports, and detailed sales breakdowns.
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            <li>
              <LoadingLinkButton className="underline underline-offset-4" href="/participants" pendingText="Loading…">
                Participant list
              </LoadingLinkButton>
            </li>
            <li>
              <LoadingLinkButton
                className="underline underline-offset-4"
                href="/participants/new"
                pendingText="Loading…"
              >
                New registration
              </LoadingLinkButton>
            </li>
            <li>
              <LoadingLinkButton className="underline underline-offset-4" href="/reports/sales" pendingText="Loading…">
                Sales report (by rep & history)
              </LoadingLinkButton>
            </li>
            <li>
              <LoadingLinkButton className="underline underline-offset-4" href="/reports/tshirts" pendingText="Loading…">
                T-shirt sizes
              </LoadingLinkButton>
            </li>
            {session.role === "SUPER_ADMIN" ? (
              <li>
                <LoadingLinkButton className="underline underline-offset-4" href="/admin/batches" pendingText="Loading…">
                  Manage batches
                </LoadingLinkButton>
              </li>
            ) : null}
          </ul>
        </section>
      </div>

      {session.role === "SUPER_ADMIN" && batchLeaderboard.length > 0 ? (
        <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">Tickets sold (attendees) by batch (top 10)</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Batches with the most attendee rows (each row is one ticket sold). Use Sales report to filter one batch.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="py-2 pr-4">Batch</th>
                  <th className="py-2 text-right">Tickets sold</th>
                </tr>
              </thead>
              <tbody>
                {batchLeaderboard.map((row) => (
                  <tr key={row.batchId} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-4 font-medium">{row.code}</td>
                    <td className="py-2 text-right tabular-nums">{row.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {session.role === "BATCH_REP" && !session.batchId ? (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          Your account is not linked to a batch. Ask a super admin to assign you to a batch so scoped stats and
          registrations work.
        </div>
      ) : null}
    </div>
  );
}
