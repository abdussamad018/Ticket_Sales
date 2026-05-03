"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const schema = z.object({
  batchId: z.string().min(1),
  amountBdt: z.coerce.number().int().positive().max(1_000_000_000),
  note: z.string().max(2000).optional(),
});

function errRedirect(message: string): never {
  redirect("/admin/cash-settlements?error=" + encodeURIComponent(message));
}

export async function recordBatchCashSettlementAction(formData: FormData) {
  const session = await requireSuperAdmin();

  const noteRaw = formData.get("note");
  const parsed = schema.safeParse({
    batchId: formData.get("batchId"),
    amountBdt: formData.get("amountBdt"),
    note: typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim() : undefined,
  });
  if (!parsed.success) errRedirect("Invalid batch or amount.");

  const batch = await prisma.batch.findUnique({
    where: { id: parsed.data.batchId },
    select: { id: true },
  });
  if (!batch) errRedirect("Batch not found.");

  await prisma.batchCashSettlement.create({
    data: {
      batchId: parsed.data.batchId,
      amountBdt: parsed.data.amountBdt,
      note: parsed.data.note ?? null,
      recordedById: session.userId,
    },
  });

  redirect("/admin/cash-settlements");
}
