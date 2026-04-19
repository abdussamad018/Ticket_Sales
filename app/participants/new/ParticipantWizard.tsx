"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/app/ui/SubmitButton";

type BatchOption = { id: string; code: string };
type TicketOption = {
  id: string;
  code: string;
  name: string;
  price: number;
  attendeeType: "ADULT" | "CHILD" | "INFANT";
  hasTshirt: boolean;
};

/** Display order for reunion tickets (Alumni first, then spouse, then children). */
const TICKET_CODE_ORDER = [
  "ALUMNI",
  "GUEST",
  "KID_05_12",
  "KID_00_05",
] as const;

function ticketDisplayOrder(code: string): number {
  const i = (TICKET_CODE_ORDER as readonly string[]).indexOf(code);
  return i === -1 ? 1000 : i;
}

function bnNum(n: number): string {
  return n.toLocaleString("bn-BD");
}

function CounterRow({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/5 py-4 last:border-b-0 dark:border-white/10">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {subtitle}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-lg leading-none hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
          aria-label={`${title} কমান`}
        >
          –
        </button>
        <div className="w-8 text-center text-sm font-semibold tabular-nums">
          {value}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(20, value + 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-lg leading-none hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
          aria-label={`${title} বাড়ান`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function ParticipantWizard({
  batches,
  tickets,
  batchLocked,
  defaultBatchId,
}: {
  batches: BatchOption[];
  tickets: TicketOption[];
  batchLocked: boolean;
  defaultBatchId?: string;
}) {
  const [step, setStep] = useState<1 | 2>(1);

  const ticketsSorted = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const byCode = ticketDisplayOrder(a.code) - ticketDisplayOrder(b.code);
      if (byCode !== 0) return byCode;
      const typeOrder = (t: TicketOption["attendeeType"]) =>
        t === "ADULT" ? 0 : t === "CHILD" ? 1 : 2;
      const byType = typeOrder(a.attendeeType) - typeOrder(b.attendeeType);
      if (byType !== 0) return byType;
      const byPrice = a.price - b.price;
      if (byPrice !== 0) return byPrice;
      return a.name.localeCompare(b.name);
    });
  }, [tickets]);

  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    // Default: first ADULT ticket = 1 (common path)
    const firstAdult = ticketsSorted.find((t) => t.attendeeType === "ADULT");
    if (firstAdult) init[firstAdult.id] = 0; // Initialize with 0 to allow selecting 0 tickets
    return init;
  });

  const totalSelected = useMemo(
    () =>
      Object.values(counts).reduce(
        (sum, v) => sum + (Number.isFinite(v) ? v : 0),
        0,
      ),
    [counts],
  );
  const canNext = totalSelected > 0;

  const { selectedSummaryText, selectedTotal } = useMemo(() => {
    const parts: string[] = [];
    let total = 0;
    for (const t of ticketsSorted) {
      const c = counts[t.id] ?? 0;
      if (c <= 0) continue;
      const line = t.price * c;
      total += line;
      parts.push(
        `${t.name} × ${bnNum(c)} = ${bnNum(t.price)} × ${bnNum(c)} = ${bnNum(line)}`,
      );
    }
    return {
      selectedSummaryText: parts.join(" · "),
      selectedTotal: total,
    };
  }, [counts, ticketsSorted]);

  function subtitleFor(type: TicketOption["attendeeType"]) {
    if (type === "ADULT") return "";
    if (type === "CHILD") return "";
    return "";
  }

  function setCount(ticketId: string, next: number) {
    setCounts((prev) => {
      const v = Math.max(0, Math.min(20, next));
      if (v === 0) {
        const nextCounts = { ...prev };
        delete nextCounts[ticketId];
        return nextCounts;
      }
      return { ...prev, [ticketId]: v };
    });
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="text-base font-semibold">1) টিকিট নির্বাচন করুন</h2>
        <div className="mt-4">
          {ticketsSorted.map((t) => (
            <CounterRow
              key={t.id}
              title={t.name}
              subtitle={subtitleFor(t.attendeeType)}
              value={counts[t.id] ?? 0}
              onChange={(n) => setCount(t.id, n)}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {!selectedSummaryText ? (
              "অন্তত একটি টিকিট বাছাই করুন।"
            ) : (
              <>
                <span>{selectedSummaryText}</span>
                <span className="mt-1 block font-semibold text-zinc-700 dark:text-zinc-200">
                  মোট: {bnNum(selectedTotal)} টাকা
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep(2)}
            className="h-10 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            পরবর্তী
          </button>
        </div>
      </section>

      {step === 2 ? (
        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">
                2) অংশগ্রহণকারীদের তথ্য
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              প্রত্যেক প্রাপ্তবয়স্ক ও শিশুর বিবরণ পূরণ করুন। শিশুর নাম ঐচ্ছিক।
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
            >
              পিছনে
            </button>
          </div>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="batchId">
                  ব্যাচ
                </label>
                {batchLocked ? (
                  <input
                    type="hidden"
                    name="batchId"
                    value={defaultBatchId ?? batches[0]?.id ?? ""}
                  />
                ) : null}
                <select
                  id="batchId"
                  name="batchId"
                  required
                  defaultValue={defaultBatchId ?? batches[0]?.id}
                  disabled={batchLocked}
                  className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-zinc-900 outline-none focus:border-black/30 disabled:opacity-60 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-white/30 dark:[color-scheme:dark]"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  className="text-sm font-medium"
                  htmlFor="paymentScreenshotUrl"
                >
                  পরিশোধের স্ক্রিনশটের লিংক (URL)
                </label>
                <input
                  id="paymentScreenshotUrl"
                  name="paymentScreenshotUrl"
                  type="url"
                  className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                  placeholder="/uploads/payments/..."
                />
              </div>
            </div>

            {ticketsSorted.map((t) => (
              <input
                key={t.id}
                type="hidden"
                name={`ticketCount_${t.id}`}
                value={counts[t.id] ?? 0}
              />
            ))}

            {ticketsSorted
              .filter((t) => (counts[t.id] ?? 0) > 0)
              .flatMap((t) =>
                Array.from({ length: counts[t.id] ?? 0 }, (_, i) => i).map(
                  (i) => {
                    const title =
                      t.attendeeType === "ADULT"
                        ? `${t.name} (প্রাপ্তবয়স্ক) #${bnNum(i + 1)}`
                        : t.attendeeType === "CHILD"
                          ? `${t.name} (শিশু) #${bnNum(i + 1)}`
                          : `${t.name} (শিশু — ০–৫) #${bnNum(i + 1)}`;
                    const keyBase = `attendee_${t.id}_${i}`;

                    return (
                      <div
                        key={`${t.id}_${i}`}
                        className="rounded-2xl border border-black/10 p-4 dark:border-white/10"
                      >
                        <div className="text-sm font-semibold">{title}</div>

                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1 sm:col-span-2">
                            <label
                              className="text-sm font-medium"
                              htmlFor={`${keyBase}_fullName`}
                            >
                              নাম
                              {t.attendeeType === "ADULT"
                                ? ""
                                : " (ঐচ্ছিক)"}
                            </label>
                            <input
                              id={`${keyBase}_fullName`}
                              name={`${keyBase}_fullName`}
                              required={t.attendeeType === "ADULT"}
                              className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                              placeholder="পূর্ণ নাম"
                            />
                          </div>

                          {t.attendeeType === "ADULT" ? (
                            <div className="space-y-1">
                              <label
                                className="text-sm font-medium"
                                htmlFor={`${keyBase}_phone`}
                              >
                                মোবাইল (ঐচ্ছিক)
                              </label>
                              <input
                                id={`${keyBase}_phone`}
                                name={`${keyBase}_phone`}
                                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                                placeholder="01XXXXXXXXX"
                              />
                            </div>
                          ) : null}

                          <div className="space-y-1">
                            <label
                              className="text-sm font-medium"
                              htmlFor={`${keyBase}_tshirt`}
                            >
                              টি-শার্ট সাইজ (ঐচ্ছিক)
                            </label>
                            {t.hasTshirt ? (
                              <select
                                id={`${keyBase}_tshirt`}
                                name={`${keyBase}_tshirt`}
                                className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-zinc-900 outline-none focus:border-black/30 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-white/30 dark:[color-scheme:dark]"
                                defaultValue=""
                              >
                                <option value="">নির্বাচন করুন…</option>
                                {["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map(
                                  (s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ),
                                )}
                              </select>
                            ) : (
                              <div className="flex h-11 items-center rounded-xl border border-black/10 bg-black/5 px-3 text-sm text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300">
                                এই টিকিটের জন্য প্রযোজ্য নয়
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  },
                ),
              )}

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="notes">
                মন্তব্য (ঐচ্ছিক)
              </label>
              <textarea
                id="notes"
                name="notes"
                className="min-h-24 w-full resize-y rounded-xl border border-black/10 bg-transparent px-3 py-2 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="অতিরিক্ত তথ্য থাকলে লিখুন…"
              />
            </div>

            <div className="flex justify-end">
              <SubmitButton
                pendingText="সংরক্ষণ হচ্ছে…"
                className="h-11 rounded-xl bg-black px-5 text-white hover:bg-black/90 disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-white/90"
              >
                সংরক্ষণ করুন
              </SubmitButton>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
