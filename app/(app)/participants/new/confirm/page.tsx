import { redirect } from "next/navigation";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

function bnNum(n: number): string {
  return n.toLocaleString("bn-BD");
}

function bnDate(d: Date): string {
  return new Intl.DateTimeFormat("bn-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(d);
}

function labelType(t: "ADULT" | "CHILD" | "INFANT") {
  if (t === "ADULT") return "প্রাপ্তবয়স্ক";
  if (t === "CHILD") return "শিশু (৫–১২)";
  return "শিশু (০–৫)";
}

export default async function ConfirmRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await requireSession();
  const { id } = await searchParams;

  if (!id) redirect("/participants/new?error=" + encodeURIComponent("Invalid confirmation link."));

  const participant = await prisma.participant.findUnique({
    where: { id },
    include: {
      batch: true,
      createdBy: true,
      attendees: {
        include: { ticket: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!participant) {
    redirect("/participants/new?error=" + encodeURIComponent("Entry not found."));
  }

  // Access control:
  // - Super admin can view any entry.
  // - Batch rep can only view entries for their batch.
  if (session.role === "BATCH_REP") {
    if (!session.batchId || participant.batchId !== session.batchId) {
      redirect("/participants/new?error=" + encodeURIComponent("Unauthorized."));
    }
  }

  const totalAmount = participant.attendees.reduce((sum, a) => sum + (a.ticket?.price ?? 0), 0);

  const ticketLines = (() => {
    const m = new Map<string, { name: string; price: number; count: number }>();
    for (const a of participant.attendees) {
      if (!a.ticket) continue;
      const key = a.ticket.code;
      const prev = m.get(key);
      if (prev) prev.count += 1;
      else m.set(key, { name: a.ticket.name, price: a.ticket.price, count: 1 });
    }
    return Array.from(m.values()).map((x) => ({
      ...x,
      lineTotal: x.price * x.count,
    }));
  })();

  const totalTickets = participant.attendees.length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <section className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-emerald-50 to-white p-5 text-emerald-950 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-emerald-950/20 dark:to-zinc-950 dark:text-emerald-50 sm:p-6">
        <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-emerald-200/40 blur-2xl dark:bg-emerald-500/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-500/10" />
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm ring-1 ring-white/40 dark:bg-emerald-500 dark:ring-white/10">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="text-xl font-semibold tracking-tight">আপনাকে অভিনন্দন</div>
            <div className="mt-0.5 text-sm text-emerald-900/80 dark:text-emerald-100/80">
              আপনার রেজিস্ট্রেশন সম্পূর্ণ হয়েছে।
            </div>
            <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
              <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-white/60 px-3 py-1.5 dark:border-emerald-900/40 dark:bg-white/5">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 7V3m8 4V3M4 11h16" />
                  <path d="M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
                </svg>
                <span className="font-medium">তারিখ ও সময়</span>
                <span className="text-emerald-950 dark:text-emerald-50">{bnDate(participant.createdAt)}</span>
              </span>
              <span className="text-xs text-emerald-900/70 dark:text-emerald-100/70">(Asia/Dhaka)</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 via-white to-white p-5 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/20 dark:via-zinc-950 dark:to-zinc-950 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm ring-1 ring-white/40 dark:bg-emerald-500 dark:ring-white/10">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold">আপনার এন্ট্রি করা তথ্য</div>
              <div className="text-xs text-emerald-900/70 dark:text-emerald-100/70">
                টিকিট অনুযায়ী অংশগ্রহণকারীর তথ্য
              </div>
            </div>
          </div>
          <div className="hidden text-xs text-emerald-900/70 dark:text-emerald-100/70 sm:block">
            মোট: <span className="font-semibold">{bnNum(totalTickets)}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {participant.attendees.map((a, idx) => (
            <div
              key={a.id}
              className="rounded-2xl border border-emerald-200/60 bg-white p-4 shadow-sm dark:border-emerald-900/30 dark:bg-zinc-950"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100">
                    {labelType(a.type)} #{bnNum(idx + 1)}
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{a.ticket ? a.ticket.name : "—"}</span>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">নাম</div>
                  <div className="text-sm font-medium">{a.fullName || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">মোবাইল</div>
                  <div className="text-sm font-medium">{a.phone || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">টি-শার্ট সাইজ</div>
                  <div className="text-sm font-medium">{a.tshirt || "—"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {participant.notes ? (
          <div className="mt-4 rounded-2xl border border-emerald-200/60 bg-white p-4 dark:border-emerald-900/30 dark:bg-zinc-950">
            <div className="text-xs text-zinc-600 dark:text-zinc-400">মন্তব্য</div>
            <div className="mt-1 text-sm">{participant.notes}</div>
          </div>
        ) : null}
      </section>

      <div className="mt-6 grid gap-4">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black/5 text-zinc-800 dark:bg-white/10 dark:text-zinc-200">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2 2 7l10 5 10-5-10-5Z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">ব্যাচ</div>
                <div className="truncate text-base font-semibold">{participant.batch.code}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black/5 text-zinc-800 dark:bg-white/10 dark:text-zinc-200">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 7h18" />
                  <path d="M5 7v14h14V7" />
                  <path d="M9 11h6" />
                  <path d="M9 15h6" />
                  <path d="M7 7l2-3h6l2 3" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">মোট টিকিট</div>
                <div className="truncate text-base font-semibold">{bnNum(totalTickets)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black/5 text-zinc-800 dark:bg-white/10 dark:text-zinc-200">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9 10h6" />
                  <path d="M9 14h6" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">মোট পরিমাণ</div>
                <div className="truncate text-base font-semibold">{bnNum(totalAmount)} টাকা</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              এন্ট্রি করেছেন:{" "}
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {participant.createdBy?.name ?? participant.createdBy?.email ?? "—"}
              </span>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              রেফারেন্স আইডি: <span className="font-mono">{participant.id}</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-black/5 text-zinc-800 dark:bg-white/10 dark:text-zinc-200">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9a2 2 0 0 1 2-2h2a2 2 0 0 0 2-2 1 1 0 0 1 1-1h0a1 1 0 0 1 1 1 2 2 0 0 0 2 2h2a2 2 0 0 1 2 2v1a2 2 0 0 0 2 2 1 1 0 0 1 1 1v0a1 1 0 0 1-1 1 2 2 0 0 0-2 2v1a2 2 0 0 1-2 2h-2a2 2 0 0 0-2 2 1 1 0 0 1-1 1h0a1 1 0 0 1-1-1 2 2 0 0 0-2-2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2 1 1 0 0 1-1-1v0a1 1 0 0 1 1-1 2 2 0 0 0 2-2V9Z" />
                  <path d="M9 12h6" />
                </svg>
              </div>
              <div>
                <div className="text-base font-semibold">টিকিট সারাংশ</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">ধরন অনুযায়ী মোট হিসাব</div>
              </div>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              মোট আইটেম: <span className="font-semibold">{bnNum(ticketLines.length)}</span>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            {ticketLines.map((t) => (
              <div
                key={t.name}
                className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="font-medium">{t.name}</div>
                <div className="text-zinc-600 dark:text-zinc-400">
                  {bnNum(t.price)} × {bnNum(t.count)} ={" "}
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {bnNum(t.lineTotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end text-sm">
            <div className="rounded-2xl border border-black/10 bg-black/5 px-4 py-2 font-semibold dark:border-white/10 dark:bg-white/10">
              সর্বমোট: {bnNum(totalAmount)} টাকা
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

