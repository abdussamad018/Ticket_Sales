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

  return (
    <div className="mx-auto w-full max-w-3xl px-0 py-0">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-100">
        <div className="text-lg font-semibold">আপনার রেজিস্ট্রেশন সম্পূর্ণ হয়েছে।</div>
        <div className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
          তারিখ ও সময়: {bnDate(participant.createdAt)}
        </div>
      </section>

      <div className="mt-6 grid gap-4">
        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">ব্যাচ</div>
              <div className="text-base font-semibold">{participant.batch.code}</div>
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              এন্ট্রি করেছেন:{" "}
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {participant.createdBy?.name ?? participant.createdBy?.email ?? "—"}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-base font-semibold">টিকিট সারাংশ</div>
          <div className="mt-3 grid gap-2">
            {ticketLines.map((t) => (
              <div
                key={t.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/5 px-4 py-3 text-sm dark:border-white/10"
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
            <div className="rounded-xl bg-black/5 px-4 py-2 font-semibold dark:bg-white/10">
              মোট: {bnNum(totalAmount)} টাকা
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-base font-semibold">আপনার এন্ট্রি করা তথ্য</div>
          <div className="mt-3 grid gap-3">
            {participant.attendees.map((a, idx) => (
              <div
                key={a.id}
                className="rounded-2xl border border-black/5 p-4 dark:border-white/10"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {labelType(a.type)} #{bnNum(idx + 1)}
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    {a.ticket ? a.ticket.name : "—"}
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
            <div className="mt-4 rounded-2xl border border-black/5 p-4 dark:border-white/10">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">মন্তব্য</div>
              <div className="mt-1 text-sm">{participant.notes}</div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <a
              href="/participants/new"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-black/10 bg-white px-5 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
            >
              নতুন এন্ট্রি যোগ করুন
            </a>
            <a
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              ড্যাশবোর্ডে যান
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

