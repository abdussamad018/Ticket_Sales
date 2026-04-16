import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { createTicketAction, updateTicketAction } from "@/app/admin/tickets/actions";
import { DeleteTicketButton } from "./delete-ticket-button";
import { SubmitButton } from "@/app/ui/SubmitButton";

const inputClass =
  "h-9 w-full min-w-0 rounded-lg border border-black/10 bg-transparent px-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSuperAdmin();

  const { error } = await searchParams;
  const tickets = await prisma.ticket.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto w-full max-w-6xl px-0 py-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Create and manage ticket types.</p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">Add ticket</h2>
          <form action={createTicketAction} className="mt-4 space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="code">
                Code
              </label>
              <input
                id="code"
                name="code"
                required
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="ADULT"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="Adult"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="attendeeType">
                Type
              </label>
              <select
                id="attendeeType"
                name="attendeeType"
                required
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                defaultValue="ADULT"
              >
                <option value="ADULT">Adult</option>
                <option value="CHILD">Child</option>
                <option value="INFANT">Infant</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="hasTshirt"
                defaultChecked
                className="h-4 w-4 rounded border-black/20 dark:border-white/20"
              />
              Has T-shirt
            </label>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="price">
                Price
              </label>
              <input
                id="price"
                name="price"
                type="number"
                min={0}
                required
                className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
                placeholder="1000"
              />
            </div>
            <SubmitButton
              pendingText="Creating…"
              className="h-11 w-full rounded-xl bg-black px-5 text-white hover:bg-black/90 disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              Create
            </SubmitButton>
          </form>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950 lg:col-span-2">
          <h2 className="text-base font-semibold">All tickets</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">T-shirt</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Active</th>
                  <th className="py-2 pr-0">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-t border-black/5 dark:border-white/10">
                    <td colSpan={7} className="p-0">
                      <div className="flex flex-col gap-3 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
                        <form
                          action={updateTicketAction}
                          className="flex flex-1 flex-wrap items-end gap-x-2 gap-y-2"
                        >
                          <input type="hidden" name="id" value={t.id} />
                          <input
                            name="code"
                            required
                            defaultValue={t.code}
                            className={`${inputClass} w-full sm:w-24`}
                            title="Code"
                          />
                          <input
                            name="name"
                            required
                            defaultValue={t.name}
                            className={`${inputClass} min-w-[8rem] flex-1 sm:min-w-[10rem]`}
                            title="Name"
                          />
                          <select
                            name="attendeeType"
                            required
                            defaultValue={t.attendeeType}
                            className={`${inputClass} w-full sm:w-[7.5rem]`}
                          >
                            <option value="ADULT">Adult</option>
                            <option value="CHILD">Child</option>
                            <option value="INFANT">Infant</option>
                          </select>
                          <label className="flex h-9 shrink-0 items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              name="hasTshirt"
                              defaultChecked={t.hasTshirt}
                              className="h-4 w-4 rounded border-black/20 dark:border-white/20"
                            />
                            T-shirt
                          </label>
                          <input
                            name="price"
                            type="number"
                            min={0}
                            required
                            defaultValue={t.price}
                            className={`${inputClass} w-full sm:w-24`}
                          />
                          <label className="flex h-9 shrink-0 items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              name="isActive"
                              defaultChecked={t.isActive}
                              className="h-4 w-4 rounded border-black/20 dark:border-white/20"
                            />
                            Active
                          </label>
                          <SubmitButton
                            pendingText="Saving…"
                            className="h-9 shrink-0 rounded-lg bg-black px-4 text-sm text-white hover:bg-black/90 disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-white/90"
                          >
                            Save
                          </SubmitButton>
                        </form>
                        <DeleteTicketButton ticketId={t.id} ticketLabel={t.code} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
