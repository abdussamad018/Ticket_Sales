"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import type { TshirtSize } from "@prisma/client";
import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const schema = z.object({
  batchId: z.string().min(1),
  ticketId: z.string().min(1),
  ticketQty: z.coerce.number().int().min(1).max(20).default(1),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  tshirt: z.enum(["XS", "S", "M", "L", "XL", "XXL", "XXXL"]).optional().or(z.literal("")),
  paymentScreenshotUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export async function createParticipantAction(formData: FormData) {
  const session = await requireSession();

  const parsed = schema.safeParse({
    batchId: formData.get("batchId"),
    ticketId: formData.get("ticketId"),
    ticketQty: formData.get("ticketQty"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? undefined,
    email: (formData.get("email") as string | null) ?? undefined,
    gender: (formData.get("gender") as string | null) ?? undefined,
    tshirt: (formData.get("tshirt") as string | null) ?? undefined,
    paymentScreenshotUrl: (formData.get("paymentScreenshotUrl") as string | null) ?? undefined,
    notes: (formData.get("notes") as string | null) ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false as const, error: "Please fill the form correctly." };
  }

  const batchId = parsed.data.batchId;
  if (session.role === "BATCH_REP" && session.batchId && batchId !== session.batchId) {
    return { ok: false as const, error: "You can only add participants for your batch." };
  }

  await prisma.participant.create({
    data: {
      batchId,
      ticketId: parsed.data.ticketId,
      ticketQty: parsed.data.ticketQty,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      gender: parsed.data.gender || null,
      tshirt: parsed.data.tshirt ? (parsed.data.tshirt as TshirtSize) : null,
      paymentScreenshotUrl: parsed.data.paymentScreenshotUrl || null,
      notes: parsed.data.notes || null,
      createdById: session.userId,
    },
  });

  redirect("/dashboard");
}

