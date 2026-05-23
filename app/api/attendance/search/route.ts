import { NextResponse } from "next/server";

import { requireSession } from "@/app/lib/auth";
import { attendeeScopeWhere } from "@/app/lib/attendance-scope";
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

export async function GET(req: Request) {
  const session = await requireSession();
  if (session.role === "BATCH_REP" && !session.batchId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("q")?.trim() ?? "";
  if (raw.length < 2) {
    return NextResponse.json({ attendees: [] });
  }

  const scope = attendeeScopeWhere(session);
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
    take: 25,
    orderBy: [{ fullName: "asc" }],
  });

  return NextResponse.json({ attendees: byPhone });
}
