"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

function checkboxOn(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

const ticketFieldsSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(60),
  price: z.coerce.number().int().min(0).max(10_000_000),
  attendeeType: z.enum(["ADULT", "CHILD", "INFANT"]),
  hasTshirt: z.boolean(),
});

const updateTicketSchema = ticketFieldsSchema.extend({
  id: z.string().min(1),
  isActive: z.boolean(),
});

export async function createTicketAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = ticketFieldsSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    price: formData.get("price"),
    attendeeType: formData.get("attendeeType"),
    hasTshirt: checkboxOn(formData, "hasTshirt"),
  });
  if (!parsed.success) {
    redirect("/admin/tickets?error=" + encodeURIComponent("Invalid ticket data."));
  }

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

export async function updateTicketAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = updateTicketSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    name: formData.get("name"),
    price: formData.get("price"),
    attendeeType: formData.get("attendeeType"),
    hasTshirt: checkboxOn(formData, "hasTshirt"),
    isActive: checkboxOn(formData, "isActive"),
  });
  if (!parsed.success) redirect("/admin/tickets?error=" + encodeURIComponent("Invalid ticket data."));

  const codeUpper = parsed.data.code.toUpperCase();
  const codeTaken = await prisma.ticket.findFirst({
    where: { code: codeUpper, NOT: { id: parsed.data.id } },
    select: { id: true },
  });
  if (codeTaken) {
    redirect("/admin/tickets?error=" + encodeURIComponent("That code is already used by another ticket."));
  }

  await prisma.ticket.update({
    where: { id: parsed.data.id },
    data: {
      code: codeUpper,
      name: parsed.data.name,
      price: parsed.data.price,
      attendeeType: parsed.data.attendeeType,
      hasTshirt: parsed.data.hasTshirt,
      isActive: parsed.data.isActive,
    },
  });

  redirect("/admin/tickets");
}

export async function deleteTicketAction(formData: FormData) {
  await requireSuperAdmin();

  const idRaw = formData.get("id");
  const idParsed = z.string().min(1).safeParse(idRaw);
  if (!idParsed.success) redirect("/admin/tickets?error=" + encodeURIComponent("Invalid request."));

  const id = idParsed.data;
  const linked = await prisma.attendee.count({ where: { ticketId: id } });
  if (linked > 0) {
    redirect(
      "/admin/tickets?error=" +
        encodeURIComponent("This ticket is linked to attendees and cannot be deleted."),
    );
  }

  await prisma.ticket.delete({ where: { id } });

  redirect("/admin/tickets");
}
