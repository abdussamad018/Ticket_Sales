"use client";

import { useMemo, useState } from "react";

type BatchOption = { id: string; code: string };
type TicketOption = { id: string; code: string; name: string; price: number };

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
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [infantCount, setInfantCount] = useState(0);

  const ticketByCode = useMemo(() => {
    const m = new Map<string, TicketOption>();
    for (const t of tickets) m.set(t.code.toUpperCase(), t);
    return m;
  }, [tickets]);

  const adultTicket = ticketByCode.get("ADULT");
  const childTicket = ticketByCode.get("CHILD");
  const infantTicket = ticketByCode.get("INFANT");

  const canNext = adultCount + childCount + infantCount > 0;

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="text-base font-semibold">1) Select tickets</h2>
        <div className="mt-4">
          <CounterRow title="Adults" subtitle="12 years and above" value={adultCount} onChange={setAdultCount} />
          <CounterRow title="Children" subtitle="2–11 years" value={childCount} onChange={setChildCount} />
          <CounterRow title="Infant" subtitle="Below 2 years" value={infantCount} onChange={setInfantCount} />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Ticket mapping: Adult={adultTicket?.price ?? "-"}, Child={childTicket?.price ?? "-"}, Infant=
            {infantTicket?.price ?? "-"}
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

            <input type="hidden" name="adultCount" value={adultCount} />
            <input type="hidden" name="childCount" value={childCount} />
            <input type="hidden" name="infantCount" value={infantCount} />

            {Array.from({ length: adultCount }).map((_, i) => (
              <div key={`adult_${i}`} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                <div className="text-sm font-semibold">Adult #{i + 1}</div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm font-medium" htmlFor={`adultFullName_${i}`}>
                      Name
                    </label>
                    <input
                      id={`adultFullName_${i}`}
                      name={`adultFullName_${i}`}
                      required
                      className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                      placeholder="Adult name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor={`adultPhone_${i}`}>
                      Phone (optional)
                    </label>
                    <input
                      id={`adultPhone_${i}`}
                      name={`adultPhone_${i}`}
                      className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor={`adultTshirt_${i}`}>
                      T-shirt size
                    </label>
                    <select
                      id={`adultTshirt_${i}`}
                      name={`adultTshirt_${i}`}
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
                  </div>
                </div>
              </div>
            ))}

            {Array.from({ length: childCount }).map((_, i) => (
              <div key={`child_${i}`} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                <div className="text-sm font-semibold">Child #{i + 1}</div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm font-medium" htmlFor={`childFullName_${i}`}>
                      Name (optional)
                    </label>
                    <input
                      id={`childFullName_${i}`}
                      name={`childFullName_${i}`}
                      className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                      placeholder="Child name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor={`childTshirt_${i}`}>
                      T-shirt size (optional)
                    </label>
                    <select
                      id={`childTshirt_${i}`}
                      name={`childTshirt_${i}`}
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
                  </div>
                </div>
              </div>
            ))}

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

