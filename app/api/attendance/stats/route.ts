import { NextResponse } from "next/server";

import { requireSession } from "@/app/lib/auth";
import { assertBatchAccess, attendeeScopeWhereWithBatch } from "@/app/lib/attendance-scope";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: Request) {
  const session = await requireSession();
  if (session.role === "BATCH_REP" && !session.batchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const batchIdParam = url.searchParams.get("batchId")?.trim() || undefined;
  const effectiveBatchId =
    session.role === "BATCH_REP" ? session.batchId! : batchIdParam;

  if (effectiveBatchId && !assertBatchAccess(session, effectiveBatchId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scope = attendeeScopeWhereWithBatch(session, effectiveBatchId);

  let total = 0;
  let checkedIn = 0;
  try {
    [total, checkedIn] = await Promise.all([
      prisma.attendee.count({ where: scope }),
      prisma.attendee.count({ where: { ...scope, checkedInAt: { not: null } } }),
    ]);
  } catch {
    return NextResponse.json({ total: 0, checkedIn: 0, pending: 0 });
  }

  return NextResponse.json({ total, checkedIn, pending: total - checkedIn });
}
