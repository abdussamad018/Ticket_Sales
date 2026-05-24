import { NextResponse } from "next/server";
import { z } from "zod";

import { parseCheckInCodeFromScan } from "@/app/lib/attendance-qr";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const bodySchema = z.object({
  scan: z.string().min(1).max(2000),
});

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
      attendee: {
        fullName: name,
        batchCode,
        checkedInAt: attendee.checkedInAt.toISOString(),
      },
    });
  }

  const now = new Date();
  await prisma.attendee.update({
    where: { id: attendee.id },
    data: {
      checkedInAt: now,
      checkedInById: session.userId,
    },
  });

  return NextResponse.json({
    status: "checked_in",
    message: "Check-in successful",
    detail: `${name} · Batch ${batchCode}`,
    attendee: {
      fullName: name,
      batchCode,
      checkedInAt: now.toISOString(),
    },
  });
}
