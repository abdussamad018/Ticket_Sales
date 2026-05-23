import type { Prisma } from "@prisma/client";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, "\"\"")}"`;
  return s;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
}

function safeFilenamePart(s: string) {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "export";
}

export async function GET(req: Request) {
  const session = await requireSession();

  if (session.role === "BATCH_REP" && !session.batchId) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const batchId = url.searchParams.get("batchId") || undefined;
  const isAdmin = session.role === "SUPER_ADMIN";

  if (isAdmin && batchId) {
    const exists = await prisma.batch.findUnique({ where: { id: batchId }, select: { id: true } });
    if (!exists) {
      return csvResponse([], "attendance");
    }
  }

  const participantWhere: Prisma.ParticipantWhereInput =
    session.role === "SUPER_ADMIN"
      ? batchId
        ? { batchId }
        : {}
      : { batchId: session.batchId! };

  const entries = await prisma.attendee.findMany({
    where: { participant: participantWhere },
    select: {
      fullName: true,
      type: true,
      phone: true,
      tshirt: true,
      checkInCode: true,
      checkedInAt: true,
      participant: { select: { batch: { select: { code: true, name: true } } } },
      ticket: { select: { name: true, code: true } },
      checkedInBy: { select: { email: true, name: true } },
    },
    orderBy: [
      { participant: { batch: { code: "asc" } } },
      { fullName: "asc" },
    ],
  });

  const rows = entries.map((e) => ({
    batch: e.participant.batch.code,
    batchName: e.participant.batch.name ?? "",
    name: e.fullName ?? "",
    type: e.type,
    phone: e.phone ?? "",
    tshirt: e.tshirt ?? "",
    ticket: e.ticket.name,
    ticketCode: e.ticket.code,
    checkInCode: e.checkInCode ?? "",
    checkedInAt: e.checkedInAt?.toISOString() ?? "",
    checkedInBy: e.checkedInBy?.name?.trim() || e.checkedInBy?.email || "",
  }));

  let filename = "attendance";
  if (batchId && entries[0]) filename += `-${safeFilenamePart(entries[0].participant.batch.code)}`;
  else if (batchId) {
    const batch = await prisma.batch.findUnique({ where: { id: batchId }, select: { code: true } });
    if (batch) filename += `-${safeFilenamePart(batch.code)}`;
  }

  return csvResponse(rows, filename);
}

function csvResponse(rows: Array<Record<string, unknown>>, filenameBase: string) {
  return new Response(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filenameBase}.csv"`,
    },
  });
}
