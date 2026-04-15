"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const schema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(60),
  price: z.coerce.number().int().min(0).max(10_000_000),
  attendeeType: z.enum(["ADULT", "CHILD", "INFANT"]),
  hasTshirt: z.coerce.boolean().default(true),
});

export async function createTicketAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = schema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    price: formData.get("price"),
    attendeeType: formData.get("attendeeType"),
    hasTshirt: formData.get("hasTshirt"),
  });
  if (!parsed.success) return { ok: false as const, error: "Invalid ticket data." };

  await prisma.ticket.create({
    data: {
      code: parsed.data.code.toUpperCase(),
      name: parsed.data.name,
      price: parsed.data.price,
      attendeeType: parsed.data.attendeeType,
      hasTshirt: parsed.data.hasTshirt,
    },
  });

  redirect("/admin/tickets");
}

