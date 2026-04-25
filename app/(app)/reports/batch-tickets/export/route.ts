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

export async function GET() {
  const session = await requireSession();

  if (session.role === "BATCH_REP" && !session.batchId) {
    return new Response("Forbidden", { status: 403 });
  }

  const batches = await prisma.batch.findMany({
    where: session.role === "SUPER_ADMIN" ? {} : { id: session.batchId! },
    orderBy: { code: "asc" },
    select: { id: true, code: true },
  });

  const tickets = await prisma.ticket.findMany({
    where: { isActive: true },
    orderBy: [{ attendeeType: "asc" }, { price: "asc" }, { name: "asc" }],
    select: { id: true, code: true, name: true },
  });

  const sold = await prisma.attendee.findMany({
    where:
      session.role === "SUPER_ADMIN"
        ? {}
        : { participant: { batchId: session.batchId! } },
    select: { ticketId: true, participant: { select: { batchId: true } } },
  });

  const grid = new Map<string, Map<string, number>>();
  for (const s of sold) {
    const m = grid.get(s.participant.batchId) ?? new Map<string, number>();
    m.set(s.ticketId, (m.get(s.ticketId) ?? 0) + 1);
    grid.set(s.participant.batchId, m);
  }

  const rows: Array<Record<string, unknown>> = [];

  for (const b of batches) {
    const m = grid.get(b.id) ?? new Map<string, number>();
    const row: Record<string, unknown> = { batch: b.code };
    for (const t of tickets) {
      row[t.code] = m.get(t.id) ?? 0;
    }
    row.total = tickets.reduce((s, t) => s + (m.get(t.id) ?? 0), 0);
    rows.push(row);
  }

  const csv = toCsv(rows);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="batch_tickets.csv"`,
    },
  });
}

