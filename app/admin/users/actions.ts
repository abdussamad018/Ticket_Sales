"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { hashPassword, requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const schema = z.object({
  name: z.string().max(80).optional().or(z.literal("")),
  email: z.string().email(),
  password: z.string().min(6),
  batchId: z.string().min(1),
});

export async function createBatchRepAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = schema.safeParse({
    name: (formData.get("name") as string | null) ?? undefined,
    email: formData.get("email"),
    password: formData.get("password"),
    batchId: formData.get("batchId"),
  });
  if (!parsed.success) return { ok: false as const, error: "Invalid user data." };

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.create({
    data: {
      name: parsed.data.name || null,
      email: parsed.data.email,
      passwordHash,
      role: "BATCH_REP",
      batchId: parsed.data.batchId,
    },
  });

  redirect("/admin/users");
}

