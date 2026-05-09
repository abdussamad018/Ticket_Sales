"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

function rosterError(sportId: string, batchId: string | undefined, message: string): never {
  const qs = batchId ? `?batchId=${encodeURIComponent(batchId)}&error=` : "?error=";
  redirect(`/sports/${sportId}${qs}${encodeURIComponent(message)}`);
}

const entryFields = z.object({
  fullName: z.string().trim().min(1, "Name is required.").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

const createSchema = entryFields.extend({
  sportId: z.string().min(1),
  batchId: z.string().min(1),
});

export async function createSportRosterEntryAction(formData: FormData) {
  const session = await requireSession();

  const parsed = createSchema.safeParse({
    sportId: formData.get("sportId"),
    batchId: formData.get("batchId"),
    fullName: formData.get("fullName"),
    phone: (formData.get("phone") as string | null) ?? "",
    notes: (formData.get("notes") as string | null) ?? "",
  });
  if (!parsed.success) {
    const sid = (formData.get("sportId") as string) || "";
    const bid = (formData.get("batchId") as string) || undefined;
    rosterError(sid, bid, parsed.error.issues[0]?.message ?? "Invalid data.");
  }

  const { sportId, batchId, fullName, phone, notes } = parsed.data;

  if (session.role === "BATCH_REP") {
    if (!session.batchId || batchId !== session.batchId) {
      rosterError(sportId, session.batchId ?? undefined, "You can only add players for your batch.");
    }
  }

  const sport = await prisma.sport.findUnique({ where: { id: sportId } });
  if (!sport) rosterError(sportId, batchId, "Sport not found.");

  if (session.role === "BATCH_REP" && !sport.dataEntryOpen) {
    rosterError(sportId, batchId, "Data entry is closed for this sport.");
  }

  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) rosterError(sportId, batchId, "Batch not found.");

  try {
    await prisma.$transaction(async (tx) => {
      const count = await tx.sportRosterEntry.count({
        where: { sportId, batchId },
      });
      if (count >= sport.maxPlayersPerBatch) {
        throw new Error("CAP");
      }
      await tx.sportRosterEntry.create({
        data: {
          sportId,
          batchId,
          createdById: session.userId,
          fullName,
          phone: phone?.trim() || null,
          notes: notes?.trim() || null,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "CAP") {
      rosterError(sportId, batchId, `This batch already has the maximum (${sport.maxPlayersPerBatch}) players for this sport.`);
    }
    rosterError(sportId, batchId, "Could not add player.");
  }

  const q = session.role === "SUPER_ADMIN" ? `?batchId=${encodeURIComponent(batchId)}` : "";
  redirect(`/sports/${sportId}${q}`);
}

const updateSchema = entryFields.extend({
  entryId: z.string().min(1),
  sportId: z.string().min(1),
  batchId: z.string().min(1),
});

export async function updateSportRosterEntryAction(formData: FormData) {
  const session = await requireSession();

  const parsed = updateSchema.safeParse({
    entryId: formData.get("entryId"),
    sportId: formData.get("sportId"),
    batchId: formData.get("batchId"),
    fullName: formData.get("fullName"),
    phone: (formData.get("phone") as string | null) ?? "",
    notes: (formData.get("notes") as string | null) ?? "",
  });
  if (!parsed.success) {
    const sid = (formData.get("sportId") as string) || "";
    const bid = (formData.get("batchId") as string) || undefined;
    rosterError(sid, bid, parsed.error.issues[0]?.message ?? "Invalid data.");
  }

  const { entryId, sportId, batchId, fullName, phone, notes } = parsed.data;

  const entry = await prisma.sportRosterEntry.findUnique({
    where: { id: entryId },
    include: { sport: true },
  });
  if (!entry || entry.sportId !== sportId) {
    rosterError(sportId, batchId, "Entry not found.");
  }

  if (session.role === "BATCH_REP") {
    if (!session.batchId || entry.batchId !== session.batchId || batchId !== session.batchId) {
      rosterError(sportId, session.batchId ?? undefined, "You can only edit your batch's players.");
    }
    if (!entry.sport.dataEntryOpen) {
      rosterError(sportId, batchId, "Data entry is closed for this sport.");
    }
  }

  if (session.role === "SUPER_ADMIN" && entry.batchId !== batchId) {
    rosterError(sportId, batchId, "Batch mismatch.");
  }

  try {
    await prisma.sportRosterEntry.update({
      where: { id: entryId },
      data: {
        fullName,
        phone: phone?.trim() || null,
        notes: notes?.trim() || null,
      },
    });
  } catch {
    rosterError(sportId, batchId, "Could not update player.");
  }

  const q = session.role === "SUPER_ADMIN" ? `?batchId=${encodeURIComponent(batchId)}` : "";
  redirect(`/sports/${sportId}${q}`);
}

const deleteSchema = z.object({
  entryId: z.string().min(1),
  sportId: z.string().min(1),
  batchId: z.string().min(1),
});

export async function deleteSportRosterEntryAction(formData: FormData) {
  const session = await requireSession();

  const parsed = deleteSchema.safeParse({
    entryId: formData.get("entryId"),
    sportId: formData.get("sportId"),
    batchId: formData.get("batchId"),
  });
  if (!parsed.success) {
    const sid = (formData.get("sportId") as string) || "";
    const bid = (formData.get("batchId") as string) || undefined;
    rosterError(sid, bid, "Invalid request.");
  }

  const { entryId, sportId, batchId } = parsed.data;

  const entry = await prisma.sportRosterEntry.findUnique({
    where: { id: entryId },
    include: { sport: true },
  });
  if (!entry || entry.sportId !== sportId) {
    rosterError(sportId, batchId, "Entry not found.");
  }

  if (session.role === "BATCH_REP") {
    if (!session.batchId || entry.batchId !== session.batchId) {
      rosterError(sportId, session.batchId ?? undefined, "You can only delete your batch's players.");
    }
    if (!entry.sport.dataEntryOpen) {
      rosterError(sportId, batchId, "Data entry is closed for this sport.");
    }
  }

  if (session.role === "SUPER_ADMIN" && entry.batchId !== batchId) {
    rosterError(sportId, batchId, "Batch mismatch.");
  }

  try {
    await prisma.sportRosterEntry.delete({ where: { id: entryId } });
  } catch {
    rosterError(sportId, batchId, "Could not delete player.");
  }

  const q = session.role === "SUPER_ADMIN" ? `?batchId=${encodeURIComponent(batchId)}` : "";
  redirect(`/sports/${sportId}${q}`);
}
