import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/app/lib/auth";
import { attendeeScopeWhere } from "@/app/lib/attendance-scope";
import { prisma } from "@/app/lib/prisma";

const bodySchema = z.object({
  attendeeIds: z.array(z.string().min(1)).min(1).max(50),
});

const attendeeBriefSelect = {
  id: true,
  fullName: true,
  checkedInAt: true,
  participant: { select: { batch: { select: { code: true } } } },
} as const;

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

  const targets = await prisma.attendee.findMany({
    where: {
      ...scope,
      id: { in: parsed.data.attendeeIds },
    },
    select: attendeeBriefSelect,
  });

  if (targets.length === 0) {
    return NextResponse.json({ error: "Attendee not found." }, { status: 404 });
  }

  const alreadyCheckedIn = targets.filter((t) => t.checkedInAt);
  const pendingIds = targets.filter((t) => !t.checkedInAt).map((t) => t.id);

  if (pendingIds.length === 0) {
    return NextResponse.json({
      updated: 0,
      status: "already_checked_in" as const,
      attendees: alreadyCheckedIn.map(formatBrief),
    });
  }

  const result = await prisma.attendee.updateMany({
    where: {
      ...scope,
      id: { in: pendingIds },
      checkedInAt: null,
    },
    data: {
      checkedInAt: now,
      checkedInById: session.userId,
    },
  });

  const checkedIn = await prisma.attendee.findMany({
    where: { id: { in: pendingIds } },
    select: attendeeBriefSelect,
  });

  return NextResponse.json({
    updated: result.count,
    status: result.count > 0 ? ("checked_in" as const) : ("already_checked_in" as const),
    checkedInAt: now.toISOString(),
    attendees: checkedIn.map(formatBrief),
  });
}

function formatBrief(a: {
  id: string;
  fullName: string | null;
  checkedInAt: Date | null;
  participant: { batch: { code: string } };
}) {
  return {
    id: a.id,
    fullName: a.fullName,
    batchCode: a.participant.batch.code,
    checkedInAt: a.checkedInAt?.toISOString() ?? null,
  };
}
