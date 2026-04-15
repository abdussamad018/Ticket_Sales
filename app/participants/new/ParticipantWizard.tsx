"use client";

import { useMemo, useState } from "react";

type BatchOption = { id: string; code: string };
type TicketOption = {
  id: string;
  code: string;
  name: string;
  price: number;
  attendeeType: "ADULT" | "CHILD" | "INFANT";
  hasTshirt: boolean;
};

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
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-lg leading-none hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
          aria-label={`Decrease ${title}`}
        >
          –
        </button>
        <div className="w-8 text-center text-sm font-semibold tabular-nums">{value}</div>
        <button
          type="button"
          onClick={() => onChange(Math.min(20, value + 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-lg leading-none hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
          aria-label={`Increase ${title}`}
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
    if (firstAdult) init[firstAdult.id] = 1;
    return init;
  });

  const totalSelected = useMemo(
    () => Object.values(counts).reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0),
    [counts],
  );
  const canNext = totalSelected > 0;

  const selectedSummary = useMemo(() => {
    const parts: string[] = [];
    for (const t of ticketsSorted) {
      const c = counts[t.id] ?? 0;
      if (c > 0) parts.push(`${t.name}×${c}=${t.price}*${c}`);
    }
    return parts.join(", ");
  }, [counts, ticketsSorted]);

  function subtitleFor(type: TicketOption["attendeeType"]) {
    if (type === "ADULT") return "12 years and above";
    if (type === "CHILD") return "2–11 years";
    return "Below 2 years";
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
        <h2 className="text-base font-semibold">1) Select tickets</h2>
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
            {selectedSummary || "Select at least one ticket."}
          </div>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep(2)}
            className="h-10 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Next
          </button>
        </div>
      </section>

      {step === 2 ? (
        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">2) Attendee information</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Fill details for each Adult and Child. Child name is optional.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
            >
              Back
            </button>
          </div>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="batchId">
                  Batch
                </label>
                {batchLocked ? (
                  <input type="hidden" name="batchId" value={defaultBatchId ?? batches[0]?.id ?? ""} />
                ) : null}
                <select
                  id="batchId"
                  name="batchId"
                  required
                  defaultValue={defaultBatchId ?? batches[0]?.id}
                  disabled={batchLocked}
                  className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 disabled:opacity-60 dark:border-white/10 dark:focus:border-white/30"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="paymentScreenshotUrl">
                  Payment screenshot URL
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
              <input key={t.id} type="hidden" name={`ticketCount_${t.id}`} value={counts[t.id] ?? 0} />
            ))}

            {ticketsSorted
              .filter((t) => (counts[t.id] ?? 0) > 0)
              .flatMap((t) =>
                Array.from({ length: counts[t.id] ?? 0 }, (_, i) => i).map((i) => {
                  const title =
                    t.attendeeType === "ADULT"
                      ? `${t.name} (Adult) #${i + 1}`
                      : t.attendeeType === "CHILD"
                        ? `${t.name} (Child) #${i + 1}`
                        : `${t.name} (Infant) #${i + 1}`;
                  const keyBase = `attendee_${t.id}_${i}`;

                  return (
                    <div key={`${t.id}_${i}`} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                      <div className="text-sm font-semibold">{title}</div>

                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-sm font-medium" htmlFor={`${keyBase}_fullName`}>
                            Name{t.attendeeType === "ADULT" ? "" : " (optional)"}
                          </label>
                          <input
                            id={`${keyBase}_fullName`}
                            name={`${keyBase}_fullName`}
                            required={t.attendeeType === "ADULT"}
                            className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                            placeholder="Name"
                          />
                        </div>

                        {t.attendeeType === "ADULT" ? (
                          <div className="space-y-1">
                            <label className="text-sm font-medium" htmlFor={`${keyBase}_phone`}>
                              Phone (optional)
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
                          <label className="text-sm font-medium" htmlFor={`${keyBase}_tshirt`}>
                            T-shirt size (optional)
                          </label>
                          {t.hasTshirt ? (
                            <select
                              id={`${keyBase}_tshirt`}
                              name={`${keyBase}_tshirt`}
                              className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                              defaultValue=""
                            >
                              <option value="">Select...</option>
                              {["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex h-11 items-center rounded-xl border border-black/10 bg-black/5 px-3 text-sm text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300">
                              Not applicable for this ticket
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }),
              )}

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="notes">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                className="min-h-24 w-full resize-y rounded-xl border border-black/10 bg-transparent px-3 py-2 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="Any extra info…"
              />
            </div>

            <div className="flex justify-end">
              <button className="h-11 rounded-xl bg-black px-5 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
                Save entry
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

