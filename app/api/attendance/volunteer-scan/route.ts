import { NextResponse } from "next/server";
import { z } from "zod";

import { parseCheckInCodeFromScan } from "@/app/lib/attendance-qr";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const bodySchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{6,10}$/)
      .optional(),
    scan: z.string().min(1).max(2000).optional(),
  })
  .refine((d) => d.code || d.scan, { message: "code or scan required" });

const noStore = { headers: { "Cache-Control": "no-store" } };

type CheckInRow = { fullName: string | null; batchCode: string };

/** Volunteer gate — optimized: one DB round-trip on successful check-in. */
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
    return NextResponse.json({ status: "invalid", message: "Invalid QR code." }, noStore);
  }

  const now = new Date();

  // Happy path: single UPDATE … RETURNING (most gate scans).
  const checkedIn = await prisma.$queryRaw<CheckInRow[]>`
    UPDATE "Attendee" AS a
    SET "checkedInAt" = ${now}, "checkedInById" = ${session.userId}
    FROM "Participant" AS p
    INNER JOIN "Batch" AS b ON b.id = p."batchId"
    WHERE a."participantId" = p.id
      AND a."checkInCode" = ${code}
      AND a."checkedInAt" IS NULL
    RETURNING a."fullName" AS "fullName", b.code AS "batchCode"
  `;

  if (checkedIn.length > 0) {
    const row = checkedIn[0];
    const name = row.fullName?.trim() || "Attendee";
    return NextResponse.json(
      {
        status: "checked_in",
        message: "Check-in successful",
        detail: `${name} · Batch ${row.batchCode}`,
      },
      noStore,
    );
  }

  const attendee = await prisma.attendee.findUnique({
    where: { checkInCode: code },
    select: {
      fullName: true,
      checkedInAt: true,
      participant: { select: { batch: { select: { code: true } } } },
    },
  });

  if (!attendee) {
    return NextResponse.json(
      { status: "not_found", message: "No attendee found for this QR code." },
      noStore,
    );
  }

  const name = attendee.fullName?.trim() || "Attendee";
  const batchCode = attendee.participant.batch.code;

  return NextResponse.json(
    {
      status: "already_checked_in",
      message: "Already checked in",
      detail: `${name} · Batch ${batchCode}`,
    },
    noStore,
  );
}
