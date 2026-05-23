import { NextResponse } from "next/server";

import { requireSession } from "@/app/lib/auth";
import { attendeeScopeWhere } from "@/app/lib/attendance-scope";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const session = await requireSession();
  if (session.role === "BATCH_REP" && !session.batchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scope = attendeeScopeWhere(session);

  const [total, checkedIn] = await Promise.all([
    prisma.attendee.count({ where: scope }),
    prisma.attendee.count({ where: { ...scope, checkedInAt: { not: null } } }),
  ]);

  return NextResponse.json({ total, checkedIn, pending: total - checkedIn });
}
