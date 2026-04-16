"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function deleteParticipantAction(formData: FormData) {
  const session = await requireSession();

  const idParsed = z.string().min(1).safeParse(formData.get("id"));
  if (!idParsed.success) {
    redirect("/participants?error=" + encodeURIComponent("Invalid request."));
  }

  const participant = await prisma.participant.findUnique({
    where: { id: idParsed.data },
    select: { batchId: true },
  });
  if (!participant) {
    redirect("/participants?error=" + encodeURIComponent("Participant not found."));
  }

  if (session.role === "BATCH_REP") {
    if (!session.batchId || participant.batchId !== session.batchId) {
      redirect("/participants?error=" + encodeURIComponent("You cannot delete this participant."));
    }
  }

  await prisma.participant.delete({ where: { id: idParsed.data } });

  redirect("/participants");
}
