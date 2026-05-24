import type { AttendeeType } from "@prisma/client";
import Link from "next/link";
import QRCode from "qrcode";

import { requireSession } from "@/app/lib/auth";
import { buildAttendanceQrScanValue } from "@/app/lib/attendance-qr";
import { prisma } from "@/app/lib/prisma";
import { PrintButton } from "@/app/(print)/reports/print/PrintButton";
import { BatchCombobox } from "@/app/ui/BatchCombobox";

const CARDS_PER_PAGE = 6;

function labelType(t: AttendeeType) {
  if (t === "ADULT") return "Adult";
  if (t === "CHILD") return "Child";
  return "Infant";
}

type CardData = {
  id: string;
  fullName: string;
  batchCode: string;
  checkInCode: string;
  type: AttendeeType;
  qrDataUrl: string;
};

async function makeQrDataUrl(payload: string) {
  return QRCode.toDataURL(payload, {
    width: 160,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#ffffff", light: "#000000" },
  });
}

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
            type: true,
            checkInCode: true,
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
    const payload = buildAttendanceQrScanValue(a.checkInCode);
    const qrDataUrl = await makeQrDataUrl(payload);
    cards.push({
      id: a.id,
      fullName: name,
      batchCode,
      checkInCode: a.checkInCode,
      type: a.type,
      qrDataUrl,
    });
  }

  const pages: CardData[][] = [];
  for (let i = 0; i < cards.length; i += CARDS_PER_PAGE) {
    pages.push(cards.slice(i, i + CARDS_PER_PAGE));
  }

  const selectedBatch = batchFilterActive
    ? batchesAll.find((b) => b.id === batchId)
    : session.role === "BATCH_REP"
      ? batchesAll[0]
      : undefined;

  const today = new Date();

  return (
    <div className="w-full">
      <style>{`
@media print {
  .no-print { display: none !important; }
  body { background: white !important; }
  .qr-page { break-after: page; }
  .qr-page:last-child { break-after: auto; }
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

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-sm">
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
        <p className="mt-6 text-sm text-zinc-600">Choose a batch above, then Apply to generate QR cards.</p>
      ) : cards.length === 0 && batchFilterActive ? (
        <p className="mt-6 text-sm text-zinc-600">No attendees with check-in codes in this batch.</p>
      ) : (
        <div className="mt-6 space-y-8">
          {pages.map((pageCards, pageIdx) => (
            <section key={pageIdx} className="qr-page">
              <div className="mb-3 text-xs text-zinc-500 no-print">
                Page {pageIdx + 1} of {pages.length}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pageCards.map((card) => (
                  <article
                    key={card.id}
                    className="flex gap-3 rounded-xl bg-black p-3 text-white print:break-inside-avoid"
                  >
                    <div className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.qrDataUrl}
                        alt=""
                        width={112}
                        height={112}
                        className="rounded-md"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                      <div className="text-[10px] font-medium uppercase tracking-wide text-white/70">
                        Batch {card.batchCode} · {labelType(card.type)}
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
