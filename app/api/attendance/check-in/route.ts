import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/app/lib/auth";
import { attendeeScopeWhere } from "@/app/lib/attendance-scope";
import { prisma } from "@/app/lib/prisma";

const bodySchema = z.object({
  attendeeIds: z.array(z.string().min(1)).min(1).max(50),
});

export async function POST(req: Request) {
  const session = await requireSession();
  if (session.role === "BATCH_REP" && !session.batchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const scope = attendeeScopeWhere(session);
  const now = new Date();

  const result = await prisma.attendee.updateMany({
    where: {
      ...scope,
      id: { in: parsed.data.attendeeIds },
      checkedInAt: null,
    },
    data: {
      checkedInAt: now,
      checkedInById: session.userId,
    },
  });

  return NextResponse.json({ updated: result.count, checkedInAt: now.toISOString() });
}
