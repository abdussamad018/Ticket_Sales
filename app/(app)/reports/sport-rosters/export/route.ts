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
  const sportId = url.searchParams.get("sportId") || undefined;

  const isAdmin = session.role === "SUPER_ADMIN";

  if (isAdmin && batchId) {
    const exists = await prisma.batch.findUnique({ where: { id: batchId }, select: { id: true } });
    if (!exists) {
      return csvResponse([], "sport-rosters");
    }
  }

  if (sportId) {
    const exists = await prisma.sport.findUnique({ where: { id: sportId }, select: { id: true } });
    if (!exists) {
      return csvResponse([], "sport-rosters");
    }
  }

  let rosterWhere: Prisma.SportRosterEntryWhereInput;
  if (session.role === "SUPER_ADMIN") {
    rosterWhere = {
      ...(batchId ? { batchId } : {}),
      ...(sportId ? { sportId } : {}),
    };
  } else if (session.batchId) {
    rosterWhere = {
      batchId: session.batchId,
      ...(sportId ? { sportId } : {}),
    };
  } else {
    rosterWhere = { id: { in: [] } };
  }

  const entries = await prisma.sportRosterEntry.findMany({
    where: rosterWhere,
    select: {
      fullName: true,
      phone: true,
      notes: true,
      createdAt: true,
      batch: { select: { code: true, name: true } },
      sport: { select: { name: true, code: true, sortOrder: true } },
      createdBy: { select: { email: true, name: true } },
    },
    orderBy: [
      { batch: { code: "asc" } },
      { sport: { sortOrder: "asc" } },
      { sport: { name: "asc" } },
      { fullName: "asc" },
    ],
  });

  const rows = entries.map((e) => ({
    batch: e.batch.code,
    batchName: e.batch.name ?? "",
    sport: e.sport.name,
    sportCode: e.sport.code,
    player: e.fullName,
    phone: e.phone ?? "",
    notes: e.notes ?? "",
    addedAt: e.createdAt.toISOString(),
    enteredBy: e.createdBy.name?.trim() || e.createdBy.email,
  }));

  let filename = "sport-rosters";
  if (sportId && entries[0]) filename += `-${safeFilenamePart(entries[0].sport.code)}`;
  else if (sportId) {
    const sport = await prisma.sport.findUnique({
      where: { id: sportId },
      select: { code: true },
    });
    if (sport) filename += `-${safeFilenamePart(sport.code)}`;
  }
  if (batchId && entries[0]) filename += `-${safeFilenamePart(entries[0].batch.code)}`;
  else if (batchId) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { code: true },
    });
    if (batch) filename += `-${safeFilenamePart(batch.code)}`;
  }

  return csvResponse(rows, filename);
}

function csvResponse(rows: Array<Record<string, unknown>>, filenameBase: string) {
  const csv = toCsv(rows);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filenameBase}.csv"`,
    },
  });
}
