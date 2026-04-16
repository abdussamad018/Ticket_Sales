import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

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

export async function GET() {
  const session = await requireSession();

  if (session.role === "BATCH_REP" && !session.batchId) {
    return new Response("Forbidden", { status: 403 });
  }

  const batches = await prisma.batch.findMany({
    where:
      session.role === "SUPER_ADMIN"
        ? {}
        : { id: session.batchId! },
    orderBy: { code: "asc" },
    select: { id: true, code: true },
  });

  const entries = await prisma.participant.findMany({
    where:
      session.role === "SUPER_ADMIN"
        ? {}
        : { batchId: session.batchId! },
    select: { batchId: true, attendees: { select: { tshirt: true } } },
  });

  const byBatch = new Map<string, Map<string, number>>();
  for (const e of entries) {
    const m = byBatch.get(e.batchId) ?? new Map<string, number>();
    for (const a of e.attendees) {
      if (!a.tshirt) continue;
      m.set(a.tshirt, (m.get(a.tshirt) ?? 0) + 1);
    }
    byBatch.set(e.batchId, m);
  }

  const rows: Array<Record<string, unknown>> = [];
  for (const b of batches) {
    const m = byBatch.get(b.id) ?? new Map<string, number>();
    for (const s of SIZES) {
      rows.push({ batch: b.code, size: s, qty: m.get(s) ?? 0 });
    }
    rows.push({
      batch: b.code,
      size: "TOTAL",
      qty: Array.from(m.values()).reduce((x, y) => x + y, 0),
    });
  }

  const csv = toCsv(rows);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="tshirts.csv"`,
    },
  });
}

