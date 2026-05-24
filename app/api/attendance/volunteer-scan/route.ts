import { NextResponse } from "next/server";
import { z } from "zod";

import { parseCheckInCodeFromScan } from "@/app/lib/attendance-qr";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const bodySchema = z.object({
  scan: z.string().min(1).max(2000),
});

function brief(
  name: string,
  batchCode: string,
  checkedInAt: Date,
) {
  return {
    fullName: name,
    batchCode,
    checkedInAt: checkedInAt.toISOString(),
  };
}

/** Volunteer gate: scan QR → find attendee globally → check in (one request). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "VOLUNTEER") {
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

  const code = parseCheckInCodeFromScan(parsed.data.scan);
  if (!code) {
    return NextResponse.json({
      status: "invalid",
      message: "Invalid QR code.",
    });
  }

  const attendee = await prisma.attendee.findFirst({
    where: { checkInCode: code },
    select: {
      id: true,
      fullName: true,
      checkedInAt: true,
      participant: { select: { batch: { select: { code: true } } } },
    },
  });

  if (!attendee) {
    return NextResponse.json({
      status: "not_found",
      message: "No attendee found for this QR code.",
    });
  }

  const name = attendee.fullName?.trim() || "Attendee";
  const batchCode = attendee.participant.batch.code;

  if (attendee.checkedInAt) {
    return NextResponse.json({
      status: "already_checked_in",
      message: "Already checked in",
      detail: `${name} · Batch ${batchCode}`,
      attendee: brief(name, batchCode, attendee.checkedInAt),
    });
  }

  const now = new Date();
  const updated = await prisma.attendee.updateMany({
    where: { id: attendee.id, checkedInAt: null },
    data: {
      checkedInAt: now,
      checkedInById: session.userId,
    },
  });

  if (updated.count === 0) {
    const again = await prisma.attendee.findUnique({
      where: { id: attendee.id },
      select: { checkedInAt: true },
    });
    return NextResponse.json({
      status: "already_checked_in",
      message: "Already checked in",
      detail: `${name} · Batch ${batchCode}`,
      attendee: brief(name, batchCode, again?.checkedInAt ?? now),
    });
  }

  return NextResponse.json({
    status: "checked_in",
    message: "Check-in successful",
    detail: `${name} · Batch ${batchCode}`,
    attendee: brief(name, batchCode, now),
  });
}
