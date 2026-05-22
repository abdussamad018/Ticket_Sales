import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { PrintButton } from "@/app/(print)/reports/print/PrintButton";
import { BatchCombobox } from "@/app/ui/BatchCombobox";
import Link from "next/link";

type RosterEntry = {
  id: string;
  fullName: string;
  phone: string | null;
  notes: string | null;
  createdAt: Date;
};

type SportGroup = {
  sport: { id: string; name: string; code: string; sortOrder: number; maxPlayersPerBatch: number };
  players: RosterEntry[];
};

type BatchGroup = {
  batch: { id: string; code: string; name: string | null };
  sports: SportGroup[];
};

function rosterExportHref(params: { batchId?: string; sportId?: string }) {
  const qs = new URLSearchParams();
  if (params.batchId) qs.set("batchId", params.batchId);
  if (params.sportId) qs.set("sportId", params.sportId);
  const q = qs.toString();
  return q ? `/reports/sport-rosters/export?${q}` : "/reports/sport-rosters/export";
}

export default async function SportRostersPrintPage({
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

  const rosterWhere =
    session.role === "SUPER_ADMIN"
      ? batchFilterActive
        ? { batchId }
        : {}
      : session.role === "BATCH_REP" && session.batchId
        ? { batchId: session.batchId }
        : { id: { in: [] as string[] } };

  const entries = await prisma.sportRosterEntry.findMany({
    where: rosterWhere,
    select: {
      id: true,
      fullName: true,
      phone: true,
      notes: true,
      createdAt: true,
      batchId: true,
      sport: {
        select: {
          id: true,
          name: true,
          code: true,
          sortOrder: true,
          maxPlayersPerBatch: true,
        },
      },
      batch: { select: { id: true, code: true, name: true } },
    },
  });

  const byBatchId = new Map<string, Map<string, SportGroup>>();

  for (const e of entries) {
    let sportMap = byBatchId.get(e.batchId);
    if (!sportMap) {
      sportMap = new Map();
      byBatchId.set(e.batchId, sportMap);
    }
    let sg = sportMap.get(e.sport.id);
    if (!sg) {
      sg = { sport: e.sport, players: [] };
      sportMap.set(e.sport.id, sg);
    }
    sg.players.push({
      id: e.id,
      fullName: e.fullName,
      phone: e.phone,
      notes: e.notes,
      createdAt: e.createdAt,
    });
  }

  for (const sportMap of byBatchId.values()) {
    for (const sg of sportMap.values()) {
      sg.players.sort((a, b) => {
        const n = a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" });
        if (n !== 0) return n;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    }
  }

  const batchMeta = new Map<string, { id: string; code: string; name: string | null }>();
  for (const e of entries) {
    if (!batchMeta.has(e.batchId)) batchMeta.set(e.batchId, e.batch);
  }

  const batchGroups: BatchGroup[] = Array.from(byBatchId.entries())
    .map(([bid, sportMap]) => {
      const batch = batchMeta.get(bid);
      if (!batch) return null;
      const sports = Array.from(sportMap.values()).sort((a, b) => {
        const o = a.sport.sortOrder - b.sport.sortOrder;
        if (o !== 0) return o;
        return a.sport.name.localeCompare(b.sport.name, undefined, { sensitivity: "base" });
      });
      return { batch, sports };
    })
    .filter((g): g is BatchGroup => g != null)
    .sort((a, b) => a.batch.code.localeCompare(b.batch.code, undefined, { numeric: true }));

  const visibleBatches =
    batchFilterActive && batchId ? batchesAll.filter((b) => b.id === batchId) : batchesAll;

  const today = new Date();
  const exportUrl = rosterExportHref({
    batchId: batchFilterActive && batchId ? batchId : undefined,
  });

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
          <h1 className="text-2xl font-semibold tracking-tight">Sport roster report</h1>
          <p className="text-sm text-zinc-600">
            Players listed by batch and sport (print or save as PDF from the print dialog).{" "}
            <Link
              href="/reports/sport-rosters/print-by-sport"
              className="underline underline-offset-2 hover:text-zinc-900"
            >
              Switch to sport-first view
            </Link>
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
            href={exportUrl}
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
            Sport rosters — by batch &amp; sport
            {batchFilterActive ? (
              <span className="ml-2 font-normal text-zinc-600">(one batch)</span>
            ) : null}
          </div>
          <div className="text-zinc-600">Generated: {today.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-4 space-y-6">
        {visibleBatches.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-zinc-600">
            No batches found for your account.
          </div>
        ) : batchGroups.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-zinc-600">
            No sport roster players in{" "}
            {batchFilterActive ? "this batch" : "the selected scope"} yet.
          </div>
        ) : (
          batchGroups.map((bg) => (
            <section
              key={bg.batch.id}
              className="break-inside-avoid rounded-2xl border border-black/15 bg-white"
            >
              <div className="border-b border-black/10 bg-zinc-50 px-4 py-3">
                <div className="text-lg font-semibold tabular-nums">{bg.batch.code}</div>
                {bg.batch.name?.trim() ? (
                  <div className="text-xs text-zinc-600">{bg.batch.name}</div>
                ) : null}
              </div>

              <div className="divide-y divide-black/10">
                {bg.sports.map((sg) => (
                  <div key={sg.sport.id} className="break-inside-avoid p-4">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">{sg.sport.name}</div>
                        <div className="text-xs text-zinc-600">
                          Code {sg.sport.code} · max {sg.sport.maxPlayersPerBatch} per batch ·{" "}
                          <span className="font-medium text-zinc-800">{sg.players.length}</span> listed
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[480px] border-collapse text-sm">
                        <thead>
                          <tr className="text-zinc-600">
                            <th className="border border-black/20 px-2 py-2 text-left font-medium w-10">
                              #
                            </th>
                            <th className="border border-black/20 px-3 py-2 text-left font-medium">
                              Player
                            </th>
                            <th className="border border-black/20 px-3 py-2 text-left font-medium">
                              Phone
                            </th>
                            <th className="border border-black/20 px-3 py-2 text-left font-medium">
                              Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sg.players.map((p, idx) => (
                            <tr key={p.id}>
                              <td className="border border-black/20 px-2 py-2 tabular-nums text-zinc-600">
                                {idx + 1}
                              </td>
                              <td className="border border-black/20 px-3 py-2 font-medium">{p.fullName}</td>
                              <td className="border border-black/20 px-3 py-2 font-mono text-xs tabular-nums">
                                {p.phone?.trim() || "—"}
                              </td>
                              <td className="border border-black/20 px-3 py-2 text-zinc-700">
                                {p.notes?.trim() || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
