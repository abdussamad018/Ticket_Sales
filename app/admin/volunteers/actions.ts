"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { hashPassword, requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const schema = z.object({
  name: z.string().max(80).optional().or(z.literal("")),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function createVolunteerAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = schema.safeParse({
    name: (formData.get("name") as string | null) ?? undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect("/admin/volunteers?error=" + encodeURIComponent("Invalid volunteer data."));
  }

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name || `Volunteer`,
        email: parsed.data.email,
        passwordHash,
        role: "VOLUNTEER",
        batchId: null,
      },
    });
  } catch {
    redirect("/admin/volunteers?error=" + encodeURIComponent("Email already in use."));
  }

  redirect("/admin/volunteers");
}

export async function setVolunteerActiveAction(formData: FormData) {
  await requireSuperAdmin();

  const userId = formData.get("userId");
  const isActive = formData.get("isActive") === "true";

  if (typeof userId !== "string" || !userId) {
    redirect("/admin/volunteers?error=" + encodeURIComponent("Invalid request."));
  }

  await prisma.user.updateMany({
    where: { id: userId, role: "VOLUNTEER" },
    data: { isActive },
  });

  redirect("/admin/volunteers");
}
