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

  if (isAdmin && batchId) {
    const exists = await prisma.batch.findUnique({ where: { id: batchId }, select: { id: true } });
    if (!exists) {
      const csv = toCsv([]);
      return new Response(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="participants.csv"`,
        },
      });
    }
  }

  const participants = await prisma.participant.findMany({
    where,
    include: {
      batch: { select: { code: true } },
      createdBy: { select: { email: true } },
      attendees: {
        include: {
          ticket: { select: { code: true, name: true, price: true, attendeeType: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: Array<Record<string, unknown>> = [];
  for (const p of participants) {
    for (const a of p.attendees) {
      rows.push({
        participantId: p.id,
        participantCreatedAt: p.createdAt.toISOString(),
        batch: p.batch.code,
        enteredBy: p.createdBy.email,
        attendeeType: a.type,
        fullName: a.fullName ?? "",
        phone: a.phone ?? "",
        tshirt: a.tshirt ?? "",
        ticketCode: a.ticket.code,
        ticketName: a.ticket.name,
        ticketType: a.ticket.attendeeType,
        ticketPrice: a.ticket.price,
      });
    }
  }

  const csv = toCsv(rows);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="participants.csv"`,
    },
  });
}

