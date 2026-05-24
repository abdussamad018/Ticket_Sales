import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

import { requireSession } from "@/app/lib/auth";
import { buildAttendanceQrScanValue } from "@/app/lib/attendance-qr";
import { prisma } from "@/app/lib/prisma";
import { PrintButton } from "@/app/(print)/reports/print/PrintButton";
import { BatchCombobox } from "@/app/ui/BatchCombobox";

type CardData = {
  id: string;
  fullName: string;
  batchCode: string;
  checkInCode: string;
  ticketCode: string;
};

export default async function AttendanceQrCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string }>;
}) {
  const session = await requireSession();
  const { batchId } = await searchParams;

  const batchScopeWhere =
    session.role === "SUPER_ADMIN"
      ? {}
      : session.role === "BATCH_REP" && session.batchId
        ? { id: session.batchId }
        : { id: { in: [] as string[] } };

  const batchesAll = await prisma.batch.findMany({
    where: batchScopeWhere,
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  const isAdmin = session.role === "SUPER_ADMIN";
  const batchFilterActive = isAdmin && !!batchId && batchesAll.some((b) => b.id === batchId);

  const participantWhere =
    session.role === "SUPER_ADMIN"
      ? batchFilterActive
        ? { batchId }
        : { id: { in: [] as string[] } }
      : session.role === "BATCH_REP" && session.batchId
        ? { batchId: session.batchId }
        : { id: { in: [] as string[] } };

  const attendees =
    batchFilterActive || (session.role === "BATCH_REP" && session.batchId)
      ? await prisma.attendee.findMany({
          where: { participant: participantWhere },
          select: {
            id: true,
            fullName: true,
            checkInCode: true,
            ticket: { select: { code: true } },
            participant: { select: { batch: { select: { code: true } } } },
          },
          orderBy: [{ fullName: "asc" }],
        })
      : [];

  const cards: CardData[] = [];
  const missingCode: string[] = [];

  for (const a of attendees) {
    const batchCode = a.participant.batch.code;
    const name = a.fullName?.trim() || "—";
    if (!a.checkInCode) {
      missingCode.push(name);
      continue;
    }
    cards.push({
      id: a.id,
      fullName: name,
      batchCode,
      checkInCode: a.checkInCode,
      ticketCode: a.ticket.code,
    });
  }

  const selectedBatch = batchFilterActive
    ? batchesAll.find((b) => b.id === batchId)
    : session.role === "BATCH_REP"
      ? batchesAll[0]
      : undefined;

  const today = new Date();

  return (
    <div className="qr-cards-root w-full">
      <style>{`
@media print {
  .no-print { display: none !important; }
  body { background: white !important; }
  .qr-cards-root { padding: 0 !important; margin: 0 !important; }
  .print-shell { padding: 0 !important; max-width: none !important; }
  @page { size: landscape; margin: 8mm; }
  .qr-print-header {
    margin: 0 0 4mm;
    font-size: 10pt;
    font-weight: 600;
  }
  .qr-grid {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr);
    gap: 3mm;
    margin-top: 0 !important;
  }
  .qr-card {
    break-inside: avoid;
    page-break-inside: avoid;
    border-radius: 4px;
    padding: 2.5mm;
  }
}
      `}</style>

      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Check-in QR cards</h1>
          <p className="text-sm text-zinc-600">
            Batch-wise printable cards. QR contains name, batch, and check-in code.
          </p>
          <Link
            href="/reports"
            className="inline-block text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
          >
            ← Back to reports
          </Link>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          {isAdmin && batchesAll.length > 0 ? (
            <form method="get" className="flex items-end gap-2">
              <BatchCombobox
                batches={batchesAll.map((b) => ({ id: b.id, code: b.code }))}
                name="batchId"
                label="Batch"
                defaultBatchId={batchId}
                allowAll={false}
                placeholder="Type batch code (e.g. 2014)"
                inputClassName="h-10 min-w-[12rem] rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30"
              />
              <button
                type="submit"
                className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5"
              >
                Apply
              </button>
            </form>
          ) : null}
          {cards.length > 0 ? (
            <PrintButton className="h-10 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90">
              Print
            </PrintButton>
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-sm no-print">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-medium">
            {selectedBatch ? (
              <>
                Batch <span className="tabular-nums">{selectedBatch.code}</span>
                {selectedBatch.name ? ` · ${selectedBatch.name}` : null}
              </>
            ) : (
              "Select a batch to generate cards"
            )}
          </div>
          <div className="text-zinc-600">
            {cards.length} card{cards.length === 1 ? "" : "s"} · Generated: {today.toLocaleString()}
          </div>
        </div>
        {missingCode.length > 0 ? (
          <p className="mt-2 text-xs text-amber-800">
            {missingCode.length} attendee(s) skipped — no check-in code yet (run backfill migration).
          </p>
        ) : null}
      </div>

      {isAdmin && !batchFilterActive ? (
        <p className="mt-6 text-sm text-zinc-600 no-print">Choose a batch above, then Apply to generate QR cards.</p>
      ) : cards.length === 0 && batchFilterActive ? (
        <p className="mt-6 text-sm text-zinc-600 no-print">No attendees with check-in codes in this batch.</p>
      ) : (
        <>
          {selectedBatch ? (
            <div className="qr-print-header hidden print:block">
              Batch {selectedBatch.code}
              {selectedBatch.name ? ` · ${selectedBatch.name}` : null} · {cards.length} cards
            </div>
          ) : null}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 qr-grid print:mt-0">
            {cards.map((card) => (
              <article
                key={card.id}
                className="qr-card flex gap-3 rounded-xl bg-black p-3 text-white"
              >
                <div className="shrink-0 rounded-md bg-white p-1">
                  <QRCodeSVG
                    value={buildAttendanceQrScanValue(card.checkInCode)}
                    size={112}
                    level="M"
                    marginSize={1}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    title={`Check-in ${card.checkInCode}`}
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-white/70">
                    Batch {card.batchCode} · {card.ticketCode}
                  </div>
                  <div className="text-xs text-white/90">গেট check-in কোড</div>
                  <div className="font-mono text-lg font-bold leading-tight tracking-wide">
                    {card.checkInCode}
                  </div>
                  <div className="truncate text-sm font-medium text-white" title={card.fullName}>
                    {card.fullName}
                  </div>
                  <div className="text-[11px] leading-snug text-white/80">
                    ইভেন্টে দিন QR scan বা কোড দেখান
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
