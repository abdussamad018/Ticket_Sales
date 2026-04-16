"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const schema = z.object({
  registrationOpen: z.enum(["open", "closed"]),
});

export async function setRegistrationAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = schema.safeParse({
    registrationOpen: formData.get("registrationOpen"),
  });
  if (!parsed.success) redirect("/admin/settings?error=" + encodeURIComponent("Invalid request."));

  await prisma.systemSetting.upsert({
    where: { id: "singleton" },
    update: { registrationOpen: parsed.data.registrationOpen === "open" },
    create: { id: "singleton", registrationOpen: parsed.data.registrationOpen === "open" },
  });

  redirect("/admin/settings");
}

