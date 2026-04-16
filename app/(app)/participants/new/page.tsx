import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { createParticipantAction } from "@/app/participants/new/actions";
import { ParticipantWizard } from "@/app/participants/new/ParticipantWizard";

export default async function NewParticipantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const { error } = await searchParams;

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
          First select tickets, then fill attendee information.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        <form action={createParticipantAction}>
          <ParticipantWizard
            batches={batches.map((b) => ({ id: b.id, code: b.code }))}
            tickets={tickets.map((t) => ({
              id: t.id,
              code: t.code,
              name: t.name,
              price: t.price,
              attendeeType: t.attendeeType,
              hasTshirt: t.hasTshirt,
            }))}
            batchLocked={session.role === "BATCH_REP"}
            defaultBatchId={session.batchId ?? undefined}
          />
        </form>
      </div>
    </div>
  );
}

