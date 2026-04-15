import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { createParticipantAction } from "@/app/participants/new/actions";

export default async function NewParticipantPage() {
  const session = await requireSession();

  const batches =
    session.role === "BATCH_REP" && session.batchId
      ? await prisma.batch.findMany({ where: { id: session.batchId }, orderBy: { code: "asc" } })
      : await prisma.batch.findMany({ where: { isActive: true }, orderBy: { code: "asc" } });

  const tickets = await prisma.ticket.findMany({ where: { isActive: true }, orderBy: { price: "asc" } });

  return (
    <div className="mx-auto w-full max-w-3xl px-0 py-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Add participant</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          First select ticket & upload payment screenshot, then fill participant info.
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">1) Payment screenshot</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Upload a screenshot and copy the URL into the form below.
          </p>
          <div className="mt-3">
            <form
              action="/api/uploads/payment"
              method="post"
              encType="multipart/form-data"
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <input type="file" name="file" accept="image/*" required className="block w-full text-sm" />
              <button className="h-10 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
                Upload
              </button>
            </form>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
              After upload, you’ll get a JSON response containing the file URL.
            </p>
          </div>
        </section>

        <form
          action={createParticipantAction}
          className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950"
        >
          <h2 className="text-base font-semibold">2) Participant info</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="batchId">
                Batch
              </label>
              <select
                id="batchId"
                name="batchId"
                required
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="ticketId">
                Ticket type
              </label>
              <select
                id="ticketId"
                name="ticketId"
                required
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              >
                {tickets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code}) - {t.price}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="ticketQty">
                Ticket quantity
              </label>
              <input
                id="ticketQty"
                name="ticketQty"
                type="number"
                min={1}
                max={20}
                defaultValue={1}
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              />
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

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="fullName">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                required
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="Participant name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="phone">
                Phone (optional)
              </label>
              <input
                id="phone"
                name="phone"
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="01XXXXXXXXX"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="email">
                Email (optional)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="name@email.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="gender">
                Gender (optional)
              </label>
              <input
                id="gender"
                name="gender"
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="Male/Female/..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="tshirt">
                T-shirt size (optional)
              </label>
              <select
                id="tshirt"
                name="tshirt"
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

            <div className="space-y-1 sm:col-span-2">
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
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button className="h-11 rounded-xl bg-black px-5 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
              Save participant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

