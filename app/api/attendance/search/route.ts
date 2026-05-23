import { NextResponse } from "next/server";

import { requireSession } from "@/app/lib/auth";
import { assertBatchAccess, attendeeScopeWhereWithBatch } from "@/app/lib/attendance-scope";
import { parseCheckInCodeFromScan } from "@/app/lib/attendance-qr";
import { normalizePhoneQuery } from "@/app/lib/check-in-code";
import { prisma } from "@/app/lib/prisma";

const attendeeSelect = {
  id: true,
  fullName: true,
  type: true,
  phone: true,
  tshirt: true,
  checkInCode: true,
  checkedInAt: true,
  ticket: { select: { name: true, code: true } },
  participant: {
    select: {
      id: true,
      batch: { select: { code: true, name: true } },
    },
  },
} as const;

const BATCH_LIST_LIMIT = 1000;

export async function GET(req: Request) {
  const session = await requireSession();
  if (session.role === "BATCH_REP" && !session.batchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("q")?.trim() ?? "";
  const batchIdParam = url.searchParams.get("batchId")?.trim() || undefined;

  const isVolunteer = session.role === "VOLUNTEER";

  const effectiveBatchId = isVolunteer
    ? undefined
    : session.role === "BATCH_REP"
      ? session.batchId!
      : batchIdParam;

  if (effectiveBatchId && !assertBatchAccess(session, effectiveBatchId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scope = isVolunteer ? {} : attendeeScopeWhereWithBatch(session, effectiveBatchId);

  if (isVolunteer && raw.length === 0) {
    return NextResponse.json({ error: "Scan a QR code.", attendees: [] }, { status: 400 });
  }

  if (session.role === "SUPER_ADMIN" && !effectiveBatchId) {
    return NextResponse.json(
      { error: "Select a batch first.", attendees: [] },
      { status: 400 },
    );
  }

  if (raw.length === 0) {
    const allInBatch = await prisma.attendee.findMany({
      where: scope,
      select: attendeeSelect,
      orderBy: [{ fullName: "asc" }],
      take: BATCH_LIST_LIMIT,
    });
    return NextResponse.json({ attendees: allInBatch });
  }

  if (raw.length < 2) {
    return NextResponse.json({ attendees: [] });
  }

  const fromQr = parseCheckInCodeFromScan(raw);
  if (fromQr) {
    const byCode = await prisma.attendee.findMany({
      where: { ...scope, checkInCode: fromQr },
      select: attendeeSelect,
      take: 25,
    });
    if (byCode.length > 0) {
      return NextResponse.json({ attendees: byCode });
    }
  }

  const codeQuery = raw.toUpperCase().replace(/\s/g, "");

  if (/^[A-Z0-9]{6,10}$/.test(codeQuery)) {
    const byCode = await prisma.attendee.findMany({
      where: { ...scope, checkInCode: codeQuery },
      select: attendeeSelect,
      take: 25,
    });
    if (byCode.length > 0) {
      return NextResponse.json({ attendees: byCode });
    }
  }

  const phone = normalizePhoneQuery(raw);
  if (phone.length < 4) {
    return NextResponse.json({ attendees: [] });
  }

  const byPhone = await prisma.attendee.findMany({
    where: {
      ...scope,
      phone: { contains: phone, mode: "insensitive" },
    },
    select: attendeeSelect,
    take: 100,
    orderBy: [{ fullName: "asc" }],
  });

  return NextResponse.json({ attendees: byPhone });
}
