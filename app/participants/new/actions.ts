"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { generateUniqueCheckInCode } from "@/app/lib/check-in-code";

const sizeSchema = z.enum(["XS", "S", "M", "L", "XL", "XXL", "XXXL"]);
type TshirtSize = z.infer<typeof sizeSchema>;

const baseSchema = z.object({
  batchId: z.string().min(1),
  notes: z.string().optional(),
});

function getText(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function participantFormError(message: string): never {
  redirect("/participants/new?error=" + encodeURIComponent(message));
}

export async function createParticipantAction(formData: FormData) {
  const session = await requireSession();

  if (session.role === "BATCH_REP") {
    const setting = await prisma.systemSetting.findUnique({ where: { id: "singleton" } });
    const open = setting?.registrationOpen ?? true;
    if (!open) participantFormError("Close Registration");
  }

  const parsed = baseSchema.safeParse({
    batchId: formData.get("batchId"),
    notes: getText(formData, "notes"),
  });

  if (!parsed.success) {
    participantFormError("Please fill the form correctly.");
  }

  const batchId = parsed.data.batchId;
  if (session.role === "BATCH_REP" && session.batchId && batchId !== session.batchId) {
    participantFormError("You can only add participants for your batch.");
  }

  const tickets = await prisma.ticket.findMany({ where: { isActive: true } });
  if (tickets.length === 0) participantFormError("No active tickets found.");

  const attendees: Array<{
    type: "ADULT" | "CHILD" | "INFANT";
    fullName: string | null;
    phone: string | null;
    tshirt: TshirtSize | null;
    ticketId: string;
  }> = [];

  let adultCount = 0;
  let childCount = 0;
  let infantCount = 0;

  for (const t of tickets) {
    const raw = getText(formData, `ticketCount_${t.id}`);
    const count = Math.max(0, Math.min(20, Number.parseInt(raw || "0", 10) || 0));
    if (count <= 0) continue;

    for (let i = 0; i < count; i++) {
      const keyBase = `attendee_${t.id}_${i}`;
      const name = getText(formData, `${keyBase}_fullName`).trim();
      const phone = getText(formData, `${keyBase}_phone`).trim();
      const tshirtRaw = getText(formData, `${keyBase}_tshirt`).trim();
      const tshirtParsed = tshirtRaw ? sizeSchema.safeParse(tshirtRaw) : null;
      if (t.hasTshirt && !tshirtRaw) {
        participantFormError(`T-shirt size is required for ticket "${t.name}".`);
      }
      if (t.hasTshirt && (!tshirtParsed || !tshirtParsed.success)) {
        participantFormError(`Please select a valid T-shirt size for ticket "${t.name}".`);
      }
      const tshirt = t.hasTshirt && tshirtParsed && tshirtParsed.success ? tshirtParsed.data : null;

      if (t.attendeeType === "ADULT") {
        if (!name) participantFormError(`Adult name is required for ticket "${t.name}".`);
        adultCount += 1;
      } else if (t.attendeeType === "CHILD") {
        childCount += 1;
      } else {
        infantCount += 1;
      }

      attendees.push({
        type: t.attendeeType,
        fullName: name || null,
        phone: t.attendeeType === "ADULT" ? phone || null : null,
        tshirt,
        ticketId: t.id,
      });
    }
  }

  if (attendees.length === 0) participantFormError("Select at least one ticket.");

  const attendeesWithCodes: Array<{
    type: "ADULT" | "CHILD" | "INFANT";
    fullName: string | null;
    phone: string | null;
    tshirt: TshirtSize | null;
    ticketId: string;
    checkInCode: string;
  }> = [];

  for (const a of attendees) {
    const checkInCode = await generateUniqueCheckInCode(async (c) => {
      const hit = await prisma.attendee.findUnique({ where: { checkInCode: c }, select: { id: true } });
      return !!hit;
    });
    attendeesWithCodes.push({ ...a, checkInCode });
  }

  const created = await prisma.participant.create({
    data: {
      batchId,
      adultCount,
      childCount,
      infantCount,
      totalChildrenAttending: childCount,
      notes: parsed.data.notes?.trim() || null,
      createdById: session.userId,
      attendees: {
        create: attendeesWithCodes as unknown as Array<{
          type: "ADULT" | "CHILD" | "INFANT";
          fullName: string | null;
          phone: string | null;
          tshirt: TshirtSize | null;
          ticketId: string;
          checkInCode: string;
        }>,
      },
    },
  });

  redirect(`/participants/new/confirm?id=${encodeURIComponent(created.id)}`);
}

