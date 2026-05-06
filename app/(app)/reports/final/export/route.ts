import ExcelJS from "exceljs";

import { requireSuperAdmin } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

export async function GET() {
  await requireSuperAdmin();

  const [batches, tickets, attendees, cashAgg] = await Promise.all([
    prisma.batch.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true },
    }),
    prisma.ticket.findMany({
      where: { isActive: true },
      orderBy: [{ attendeeType: "asc" }, { price: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.attendee.findMany({
      select: {
        ticketId: true,
        tshirt: true,
        participant: { select: { batchId: true } },
        ticket: { select: { price: true } },
      },
    }),
    prisma.batchCashSettlement.groupBy({
      by: ["batchId"],
      _sum: { amountBdt: true },
    }),
  ]);

  const ticketIds = tickets.map((t) => t.id);
  const ticketIdx = new Map(ticketIds.map((id, i) => [id, i]));
  const paidByBatch = new Map(cashAgg.map((r) => [r.batchId, r._sum.amountBdt ?? 0] as const));

  const gridTickets = new Map<string, number[]>(); // batchId -> qty per ticket
  const gridSizes = new Map<string, Map<string, number>>(); // batchId -> size -> qty
  const totalSalesByBatch = new Map<string, number>(); // batchId -> BDT

  for (const a of attendees) {
    const batchId = a.participant.batchId;

    const arr = gridTickets.get(batchId) ?? Array.from({ length: ticketIds.length }, () => 0);
    const i = ticketIdx.get(a.ticketId);
    if (typeof i === "number") arr[i] += 1;
    gridTickets.set(batchId, arr);

    if (a.tshirt) {
      const m = gridSizes.get(batchId) ?? new Map<string, number>();
      m.set(a.tshirt, (m.get(a.tshirt) ?? 0) + 1);
      gridSizes.set(batchId, m);
    }

    totalSalesByBatch.set(batchId, (totalSalesByBatch.get(batchId) ?? 0) + (a.ticket?.price ?? 0));
  }

  const rows = batches.map((b) => {
    const values = gridTickets.get(b.id) ?? Array.from({ length: ticketIds.length }, () => 0);
    const attendeeTotal = values.reduce((s, x) => s + x, 0);
    const sizes = gridSizes.get(b.id) ?? new Map<string, number>();
    const sales = totalSalesByBatch.get(b.id) ?? 0;
    const paid = paidByBatch.get(b.id) ?? 0;
    const due = Math.max(0, sales - paid);
    return { batchId: b.id, batchCode: b.code, values, attendeeTotal, sizes, sales, paid, due };
  });

  const grandTicketTotals = ticketIds.map((_, i) => rows.reduce((s, r) => s + (r.values[i] ?? 0), 0));
  const grandAttendeeTotal = rows.reduce((s, r) => s + r.attendeeTotal, 0);
  const grandSizeTotals = new Map<string, number>();
  for (const r of rows) {
    for (const size of SIZES) {
      grandSizeTotals.set(size, (grandSizeTotals.get(size) ?? 0) + (r.sizes.get(size) ?? 0));
    }
  }
  const grandSales = rows.reduce((s, r) => s + r.sales, 0);
  const grandPaid = rows.reduce((s, r) => s + r.paid, 0);
  const grandDue = rows.reduce((s, r) => s + r.due, 0);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Final Report", {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  const colCount = 1 + ticketIds.length + 1 + SIZES.length + 3;
  ws.columns = Array.from({ length: colCount }, () => ({ width: 16 }));
  ws.getColumn(1).width = 10; // Batch

  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } } as const;
  const thin = { style: "thin", color: { argb: "FFBDBDBD" } } as const;
  const border = { top: thin, left: thin, bottom: thin, right: thin } as const;

  // Row 1 (group headers)
  ws.getRow(1).values = Array(colCount + 1).fill("");
  ws.getCell(1, 1).value = "Batch";
  ws.getCell(1, 2).value = "Attendee";
  ws.getCell(1, 2 + ticketIds.length + 1).value = "T-shirt";
  ws.getCell(1, 2 + ticketIds.length + 1 + SIZES.length).value = "Payment";

  ws.mergeCells(1, 1, 2, 1); // Batch spans 2 rows
  ws.mergeCells(1, 2, 1, 2 + ticketIds.length); // Attendee spans tickets+Total
  ws.mergeCells(1, 2 + ticketIds.length + 1, 1, 2 + ticketIds.length + SIZES.length); // T-shirt spans sizes
  ws.mergeCells(1, 2 + ticketIds.length + 1 + SIZES.length, 1, colCount); // Payment spans 3 cols

  // Row 2 (column headers)
  const row2: (string | number)[] = [];
  row2.push("Batch");
  for (const t of tickets) row2.push(t.name);
  row2.push("Total");
  for (const s of SIZES) row2.push(s);
  row2.push("Total Ticket Sales", "Paid", "Due");
  ws.getRow(2).values = row2 as any;

  // Style header rows
  for (let r = 1; r <= 2; r++) {
    const row = ws.getRow(r);
    row.height = 20;
    row.eachCell((cell) => {
      cell.fill = headerFill;
      cell.border = border;
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: r === 1 ? "center" : "left", wrapText: true };
    });
  }

  // Data rows
  let excelRow = 3;
  for (const r of rows) {
    const values: (string | number)[] = [];
    values.push(r.batchCode);
    values.push(...r.values);
    values.push(r.attendeeTotal);
    for (const s of SIZES) values.push(r.sizes.get(s) ?? 0);
    values.push(r.sales, r.paid, r.due);
    ws.getRow(excelRow).values = values as any;
    ws.getRow(excelRow).eachCell((cell, col) => {
      cell.border = border;
      cell.alignment = { vertical: "middle", horizontal: col === 1 ? "left" : "right" };
      if (col !== 1) cell.numFmt = "#,##0";
    });
    excelRow += 1;
  }

  // Grand total row
  if (rows.length > 0) {
    const values: (string | number)[] = [];
    values.push("Grand total");
    values.push(...grandTicketTotals);
    values.push(grandAttendeeTotal);
    for (const s of SIZES) values.push(grandSizeTotals.get(s) ?? 0);
    values.push(grandSales, grandPaid, grandDue);
    ws.getRow(excelRow).values = values as any;
    ws.getRow(excelRow).eachCell((cell, col) => {
      cell.fill = headerFill;
      cell.border = border;
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: col === 1 ? "left" : "right" };
      if (col !== 1) cell.numFmt = "#,##0";
    });
  }

  const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const filename = `final-report-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buf, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename=\"${filename}\"`,
      "cache-control": "no-store",
    },
  });
}

