import { NextResponse } from "next/server";
import { z } from "zod";

import { parseCheckInCodeFromScan } from "@/app/lib/attendance-qr";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const bodySchema = z
  .object({
    /** Parsed check-in code (fast path from scanner). */
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{6,10}$/)
      .optional(),
    /** Raw QR text (JSON, URL, or plain code). */
    scan: z.string().min(1).max(2000).optional(),
  })
  .refine((d) => d.code || d.scan, { message: "code or scan required" });

const attendeeSelect = {
  id: true,
  fullName: true,
  checkedInAt: true,
  participant: { select: { batch: { select: { code: true } } } },
} as const;

function brief(name: string, batchCode: string, checkedInAt: Date) {
  return {
    fullName: name,
    batchCode,
    checkedInAt: checkedInAt.toISOString(),
  };
}

const noStore = { headers: { "Cache-Control": "no-store" } };

/** Volunteer gate: scan QR → find attendee globally → check in (one request). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "VOLUNTEER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, ...noStore });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, ...noStore });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, ...noStore });
  }

  const code =
    parsed.data.code ??
    (parsed.data.scan ? parseCheckInCodeFromScan(parsed.data.scan) : null);

  if (!code) {
    return NextResponse.json(
      { status: "invalid", message: "Invalid QR code." },
      noStore,
    );
  }

  const attendee = await prisma.attendee.findUnique({
    where: { checkInCode: code },
    select: attendeeSelect,
  });

  if (!attendee) {
    return NextResponse.json(
      {
        status: "not_found",
        message: "No attendee found for this QR code.",
      },
      noStore,
    );
  }

  const name = attendee.fullName?.trim() || "Attendee";
  const batchCode = attendee.participant.batch.code;

  if (attendee.checkedInAt) {
    return NextResponse.json(
      {
        status: "already_checked_in",
        message: "Already checked in",
        detail: `${name} · Batch ${batchCode}`,
        attendee: brief(name, batchCode, attendee.checkedInAt),
      },
      noStore,
    );
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
    return NextResponse.json(
      {
        status: "already_checked_in",
        message: "Already checked in",
        detail: `${name} · Batch ${batchCode}`,
      },
      noStore,
    );
  }

  return NextResponse.json(
    {
      status: "checked_in",
      message: "Check-in successful",
      detail: `${name} · Batch ${batchCode}`,
      attendee: brief(name, batchCode, now),
    },
    noStore,
  );
}
