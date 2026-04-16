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

function sumTicketAmount(attendees: Array<{ ticket: { price: number } }>) {
  return attendees.reduce((s, a) => s + a.ticket.price, 0);
}

export async function GET(req: Request) {
  const session = await requireSession();

  const url = new URL(req.url);
  const batchId = url.searchParams.get("batchId") || undefined;

  const isAdmin = session.role === "SUPER_ADMIN";

  if (session.role === "BATCH_REP" && !session.batchId) {
    return new Response("Forbidden", { status: 403 });
  }

  const where =
    session.role === "SUPER_ADMIN"
      ? batchId
        ? { batchId }
        : {}
      : { batchId: session.batchId! };

  // If admin passed unknown batchId, return empty CSV
  if (isAdmin && batchId) {
    const exists = await prisma.batch.findUnique({ where: { id: batchId }, select: { id: true } });
    if (!exists) {
      const csv = toCsv([]);
      return new Response(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="sales.csv"`,
        },
      });
    }
  }

  const participants = await prisma.participant.findMany({
    where,
    include: {
      batch: { select: { code: true } },
      createdBy: { select: { email: true } },
      attendees: { include: { ticket: { select: { price: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = participants.map((p) => ({
    createdAt: p.createdAt.toISOString(),
    batch: p.batch.code,
    enteredBy: p.createdBy.email,
    ticketsSold: p.attendees.length,
    amount: sumTicketAmount(p.attendees),
  }));

  const csv = toCsv(rows);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="sales.csv"`,
    },
  });
}

