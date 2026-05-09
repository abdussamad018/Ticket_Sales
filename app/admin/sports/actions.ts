"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const codeSchema = z
  .string()
  .trim()
  .min(1, "Code is required.")
  .max(40)
  .regex(/^[a-zA-Z0-9_-]+$/, "Code: letters, numbers, hyphen, underscore only.");

function sportFormError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const sortOrderField = z.preprocess(
  (v) => {
    const n = Number.parseInt(String(v ?? "0"), 10);
    return Number.isFinite(n) ? n : 0;
  },
  z.number().int().min(0).max(99999),
);

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  code: codeSchema,
  maxPlayersPerBatch: z.coerce.number().int().min(1).max(9999),
  sortOrder: sortOrderField,
  dataEntryOpen: z.enum(["open", "closed"]).optional().default("open"),
  note: z.string().max(20000).optional().or(z.literal("")),
});

export async function createSportAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    maxPlayersPerBatch: formData.get("maxPlayersPerBatch"),
    sortOrder: formData.get("sortOrder") || "0",
    dataEntryOpen: formData.get("dataEntryOpen") ?? "open",
    note: (formData.get("note") as string | null) ?? "",
  });
  if (!parsed.success) {
    sportFormError("/admin/sports", parsed.error.issues[0]?.message ?? "Invalid data.");
  }

  const code = parsed.data.code.toUpperCase();
  try {
    await prisma.sport.create({
      data: {
        name: parsed.data.name,
        code,
        maxPlayersPerBatch: parsed.data.maxPlayersPerBatch,
        sortOrder: parsed.data.sortOrder,
        dataEntryOpen: parsed.data.dataEntryOpen === "open",
        note: parsed.data.note?.trim() || null,
      },
    });
  } catch {
    sportFormError("/admin/sports", "Could not save (duplicate code or database error).");
  }

  redirect("/admin/sports");
}

const updateSchema = createSchema.extend({
  id: z.string().min(1),
});

export async function updateSportAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    code: formData.get("code"),
    maxPlayersPerBatch: formData.get("maxPlayersPerBatch"),
    sortOrder: formData.get("sortOrder") || "0",
    dataEntryOpen: formData.get("dataEntryOpen") ?? "open",
    note: (formData.get("note") as string | null) ?? "",
  });
  if (!parsed.success) {
    const id = (formData.get("id") as string | null) ?? "";
    sportFormError(`/admin/sports/${id}`, parsed.error.issues[0]?.message ?? "Invalid data.");
  }

  const code = parsed.data.code.toUpperCase();
  try {
    await prisma.sport.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        code,
        maxPlayersPerBatch: parsed.data.maxPlayersPerBatch,
        sortOrder: parsed.data.sortOrder,
        dataEntryOpen: parsed.data.dataEntryOpen === "open",
        note: parsed.data.note?.trim() || null,
      },
    });
  } catch {
    sportFormError(`/admin/sports/${parsed.data.id}`, "Could not save (duplicate code or database error).");
  }

  redirect(`/admin/sports/${parsed.data.id}`);
}

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function deleteSportAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = deleteSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) sportFormError("/admin/sports", "Invalid sport.");

  try {
    await prisma.sport.delete({ where: { id: parsed.data.id } });
  } catch {
    sportFormError("/admin/sports", "Could not delete sport.");
  }

  redirect("/admin/sports");
}
