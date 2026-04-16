import Link from "next/link";

import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { setRegistrationAction } from "@/app/admin/settings/actions";
import { SubmitButton } from "@/app/ui/SubmitButton";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSuperAdmin();
  const { error } = await searchParams;

  const setting = await prisma.systemSetting.findUnique({ where: { id: "singleton" } });
  const open = setting?.registrationOpen ?? true;

  return (
    <div className="mx-auto w-full max-w-4xl px-0 py-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Control system-wide switches.</p>
        </div>
        <Link
          href="/admin"
          className="inline-flex h-10 w-fit items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/10"
        >
          Back to admin
        </Link>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Participant registration</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              When closed, batch representatives will see “Close Registration” and cannot submit new entries.
            </p>
          </div>
          <div
            className={`inline-flex h-9 items-center rounded-full px-3 text-sm font-medium ${
              open
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200"
            }`}
          >
            {open ? "Open" : "Closed"}
          </div>
        </div>

        <form action={setRegistrationAction} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="registrationOpen">
              Status
            </label>
            <select
              id="registrationOpen"
              name="registrationOpen"
              defaultValue={open ? "open" : "closed"}
              className="h-11 min-w-[12rem] rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-white/30 dark:[color-scheme:dark]"
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <SubmitButton
            pendingText="Saving…"
            className="h-11 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Save
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}

