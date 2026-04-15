"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const schema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().max(100).optional().or(z.literal("")),
});

export async function createBatchAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = schema.safeParse({
    code: formData.get("code"),
    name: (formData.get("name") as string | null) ?? undefined,
  });
  if (!parsed.success) return { ok: false as const, error: "Invalid batch data." };

  await prisma.batch.create({
    data: {
      code: parsed.data.code,
      name: parsed.data.name || null,
    },
  });

  redirect("/admin/batches");
}

