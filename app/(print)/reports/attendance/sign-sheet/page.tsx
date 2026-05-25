import type { AttendeeType } from "@prisma/client";
import Link from "next/link";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { PrintButton } from "@/app/(print)/reports/print/PrintButton";
import { BatchCombobox } from "@/app/ui/BatchCombobox";

const ROWS_PER_PAGE = 45;
/** Attendee rows on sign-in sheet: ticket.code in DB (see prisma/seed). */
const ALUMNI_TICKET_CODE = "ALUMNI";
const MIN_BLANK_ROWS_PER_BATCH = 5;

function labelType(t: AttendeeType) {
  if (t === "ADULT") return "Adult";
  if (t === "CHILD") return "Child";
  return "Infant";
}

type AttendeeRow = {
  id: string;
  fullName: string | null;
  type: AttendeeType;
  phone: string | null;
  tshirt: string | null;
  isBlank?: boolean;
};

type BatchSection = {
  batch: { id: string; code: string; name: string | null };
  rows: AttendeeRow[];
};

function blankSignInRows(count: number, batchId: string): AttendeeRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `blank-${batchId}-${i}`,
    fullName: null,
    type: "ADULT" as AttendeeType,
    phone: null,
    tshirt: null,
    isBlank: true,
  }));
}

function paginateBatchSheet(attendeeRows: AttendeeRow[], batchId: string, pageSize: number) {
  const blanks = blankSignInRows(MIN_BLANK_ROWS_PER_BATCH, batchId);
  const dataPages = chunkRows(attendeeRows, pageSize);
  if (dataPages.length === 0) {
    return [blanks];
  }
  const lastIdx = dataPages.length - 1;
  const lastPage = dataPages[lastIdx]!;
  const withBlanks = [...lastPage, ...blanks];
  if (withBlanks.length <= pageSize) {
    dataPages[lastIdx] = withBlanks;
    return dataPages;
  }
  dataPages.push(blanks);
  return dataPages;
}

function chunkRows(rows: AttendeeRow[], size: number) {
  const chunks: AttendeeRow[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks.length > 0 ? chunks : [[]];
}

export default async function AttendanceSignSheetPage({
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
        : {}
      : session.role === "BATCH_REP" && session.batchId
        ? { batchId: session.batchId }
        : { id: { in: [] as string[] } };

  const attendees = await prisma.attendee.findMany({
    where: {
      participant: participantWhere,
      ticket: { code: ALUMNI_TICKET_CODE },
    },
    select: {
      id: true,
      fullName: true,
      type: true,
      phone: true,
      tshirt: true,
      participant: {
        select: {
          batchId: true,
          batch: { select: { id: true, code: true, name: true } },
        },
      },
    },
    orderBy: [
      { participant: { batch: { code: "asc" } } },
      { fullName: "asc" },
    ],
  });

  const byBatchId = new Map<string, BatchSection>();
  for (const a of attendees) {
    const bid = a.participant.batchId;
    let section = byBatchId.get(bid);
    if (!section) {
      section = { batch: a.participant.batch, rows: [] };
      byBatchId.set(bid, section);
    }
    section.rows.push({
      id: a.id,
      fullName: a.fullName,
      type: a.type,
      phone: a.phone,
      tshirt: a.tshirt,
    });
  }

  let batchSections = Array.from(byBatchId.values()).sort((a, b) =>
    a.batch.code.localeCompare(b.batch.code, undefined, { numeric: true }),
  );

  if (batchFilterActive && batchId && batchSections.length === 0) {
    const batch = batchesAll.find((b) => b.id === batchId);
    if (batch) {
      batchSections = [{ batch, rows: [] }];
    }
  }

  const today = new Date();
  const totalAttendees = attendees.length;

  return (
    <div className="w-full">
      <style>{`
@media print {
  .no-print { display: none !important; }
  body { background: white !important; }
}
      `}</style>

      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Alumni sign-in sheet</h1>
          <p className="text-sm text-zinc-600">
            Batch-wise printable list for ticket code{" "}
            <span className="font-mono">{ALUMNI_TICKET_CODE}</span> only, with signature column and{" "}
            {MIN_BLANK_ROWS_PER_BATCH} blank rows at the end of each batch for walk-ins.
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
                allowAll
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

          <a
            href={
              batchFilterActive && batchId
                ? `/reports/attendance/export?batchId=${encodeURIComponent(batchId)}`
                : "/reports/attendance/export"
            }
            className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm hover:bg-black/5"
          >
            Export CSV
          </a>
          <PrintButton className="h-10 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90">
            Print
          </PrintButton>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-medium">
            Alumni sign-in — ticket {ALUMNI_TICKET_CODE}
            {batchFilterActive ? (
              <span className="ml-2 font-normal text-zinc-600">(one batch)</span>
            ) : null}
          </div>
          <div className="text-zinc-600">
            {totalAttendees} alumni ticket{totalAttendees === 1 ? "" : "s"} · +{MIN_BLANK_ROWS_PER_BATCH} blank
            row(s) per batch · Generated: {today.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-8">
        {batchesAll.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-zinc-600">
            No batches found for your account.
          </div>
        ) : batchSections.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-zinc-600">
            No {ALUMNI_TICKET_CODE} ticket holders in this scope yet. Select a batch to print a sheet with blank rows
            only.
          </div>
        ) : (
          batchSections.map((sec) => {
            const alumniCount = sec.rows.length;
            const pages = paginateBatchSheet(sec.rows, sec.batch.id, ROWS_PER_PAGE);
            return pages.map((pageRows, pageIdx) => (
              <section
                key={`${sec.batch.id}-${pageIdx}`}
                className="break-inside-avoid rounded-2xl border border-black/15 bg-white"
              >
                <div className="border-b border-black/10 bg-zinc-50 px-4 py-3">
                  <div className="text-lg font-semibold tabular-nums">Batch {sec.batch.code}</div>
                  {sec.batch.name?.trim() ? (
                    <div className="text-xs text-zinc-600">{sec.batch.name}</div>
                  ) : null}
                  <div className="mt-1 text-xs text-zinc-600">
                    {alumniCount} alumni ticket{alumniCount === 1 ? "" : "s"} · {MIN_BLANK_ROWS_PER_BATCH} blank
                    row(s) at end
                    {pages.length > 1 ? (
                      <>
                        {" "}
                        · Page {pageIdx + 1} of {pages.length}
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="overflow-x-auto p-4">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className="text-zinc-600">
                        <th className="w-10 border border-black/20 px-2 py-2 text-left font-medium">#</th>
                        <th className="border border-black/20 px-3 py-2 text-left font-medium">Name</th>
                        <th className="w-20 border border-black/20 px-2 py-2 text-left font-medium">Type</th>
                        <th className="border border-black/20 px-3 py-2 text-left font-medium">Phone</th>
                        <th className="w-16 border border-black/20 px-2 py-2 text-left font-medium">T-shirt</th>
                        <th className="min-w-[8rem] border border-black/20 px-3 py-2 text-left font-medium">
                          Signature
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((row, idx) => {
                        const rowNum = pageIdx * ROWS_PER_PAGE + idx + 1;
                        return (
                          <tr key={row.id} className={row.isBlank ? "bg-zinc-50/80" : undefined}>
                            <td className="border border-black/20 px-2 py-2.5 tabular-nums text-zinc-600">
                              {row.isBlank ? "" : rowNum}
                            </td>
                            <td className="border border-black/20 px-3 py-2.5 font-medium">
                              {row.isBlank ? "" : row.fullName?.trim() || "—"}
                            </td>
                            <td className="border border-black/20 px-2 py-2.5 text-xs">
                              {row.isBlank ? "" : labelType(row.type)}
                            </td>
                            <td className="border border-black/20 px-3 py-2.5 font-mono text-xs tabular-nums">
                              {row.isBlank ? "" : row.phone?.trim() || "—"}
                            </td>
                            <td className="border border-black/20 px-2 py-2.5 text-xs tabular-nums">
                              {row.isBlank ? "" : row.tshirt ?? "—"}
                            </td>
                            <td className="h-10 border border-black/20 px-3 py-2.5" />
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ));
          })
        )}
      </div>
    </div>
  );
}
