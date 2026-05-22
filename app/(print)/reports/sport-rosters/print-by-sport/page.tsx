import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { PrintButton } from "@/app/(print)/reports/print/PrintButton";
import { BatchCombobox } from "@/app/ui/BatchCombobox";

type RosterEntry = {
  id: string;
  fullName: string;
  phone: string | null;
  notes: string | null;
  createdAt: Date;
};

type BatchBlock = {
  batch: { id: string; code: string; name: string | null };
  players: RosterEntry[];
};

type SportSection = {
  sport: { id: string; name: string; code: string; sortOrder: number; maxPlayersPerBatch: number };
  batches: BatchBlock[];
};

function rosterExportHref(params: { batchId?: string; sportId?: string }) {
  const qs = new URLSearchParams();
  if (params.batchId) qs.set("batchId", params.batchId);
  if (params.sportId) qs.set("sportId", params.sportId);
  const q = qs.toString();
  return q ? `/reports/sport-rosters/export?${q}` : "/reports/sport-rosters/export";
}

export default async function SportRostersBySportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string; sportId?: string }>;
}) {
  const session = await requireSession();
  const { batchId, sportId } = await searchParams;

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

  const sportsAll = await prisma.sport.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true },
  });

  const isAdmin = session.role === "SUPER_ADMIN";
  const batchFilterActive = isAdmin && !!batchId && batchesAll.some((b) => b.id === batchId);
  const sportFilterActive =
    !!sportId && sportsAll.some((s) => s.id === sportId);

  let rosterWhere: Prisma.SportRosterEntryWhereInput;
  if (session.role === "SUPER_ADMIN") {
    rosterWhere = {
      ...(batchFilterActive ? { batchId: batchId! } : {}),
      ...(sportFilterActive ? { sportId: sportId! } : {}),
    };
  } else if (session.role === "BATCH_REP" && session.batchId) {
    rosterWhere = {
      batchId: session.batchId,
      ...(sportFilterActive ? { sportId: sportId! } : {}),
    };
  } else {
    rosterWhere = { id: { in: [] } };
  }

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

  const bySportId = new Map<string, Map<string, BatchBlock>>();

  for (const e of entries) {
    let batchMap = bySportId.get(e.sport.id);
    if (!batchMap) {
      batchMap = new Map();
      bySportId.set(e.sport.id, batchMap);
    }
    let block = batchMap.get(e.batchId);
    if (!block) {
      block = { batch: e.batch, players: [] };
      batchMap.set(e.batchId, block);
    }
    block.players.push({
      id: e.id,
      fullName: e.fullName,
      phone: e.phone,
      notes: e.notes,
      createdAt: e.createdAt,
    });
  }

  for (const batchMap of bySportId.values()) {
    for (const block of batchMap.values()) {
      block.players.sort((a, b) => {
        const n = a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" });
        if (n !== 0) return n;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    }
  }

  const sportMeta = new Map<string, SportSection["sport"]>();
  for (const e of entries) {
    if (!sportMeta.has(e.sport.id)) sportMeta.set(e.sport.id, e.sport);
  }

  const sportSections: SportSection[] = Array.from(bySportId.entries())
    .map(([sid, batchMap]) => {
      const sport = sportMeta.get(sid);
      if (!sport) return null;
      const batches = Array.from(batchMap.values()).sort((a, b) =>
        a.batch.code.localeCompare(b.batch.code, undefined, { numeric: true }),
      );
      return { sport, batches };
    })
    .filter((s): s is SportSection => s != null)
    .sort((a, b) => {
      const o = a.sport.sortOrder - b.sport.sortOrder;
      if (o !== 0) return o;
      return a.sport.name.localeCompare(b.sport.name, undefined, { sensitivity: "base" });
    });

  const visibleBatches =
    batchFilterActive && batchId ? batchesAll.filter((b) => b.id === batchId) : batchesAll;

  const today = new Date();
  const exportUrl = rosterExportHref({
    batchId: batchFilterActive && batchId ? batchId : undefined,
    sportId: sportFilterActive && sportId ? sportId : undefined,
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
          <h1 className="text-2xl font-semibold tracking-tight">Sport roster — by sport</h1>
          <p className="text-sm text-zinc-600">
            Each sport lists every batch&apos;s players (print or save as PDF).{" "}
            <Link
              href="/reports/sport-rosters/print"
              className="underline underline-offset-2 hover:text-zinc-900"
            >
              Switch to batch-first view
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
          {sportsAll.length > 0 ? (
            <form method="get" className="flex flex-wrap items-end gap-2">
              {isAdmin && batchesAll.length > 0 ? (
                <BatchCombobox
                  batches={batchesAll.map((b) => ({ id: b.id, code: b.code }))}
                  name="batchId"
                  label="Batch"
                  defaultBatchId={batchId}
                  allowAll
                  inputClassName="h-10 min-w-[12rem] rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30"
                />
              ) : null}
              <div className="space-y-1">
                <label htmlFor="sport-filter" className="text-sm font-medium">
                  Sport
                </label>
                <select
                  id="sport-filter"
                  name="sportId"
                  defaultValue={sportFilterActive ? sportId : ""}
                  className="h-10 min-w-[12rem] rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30"
                >
                  <option value="">All sports</option>
                  {sportsAll.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
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
            Sport rosters — by sport, then batch
            {sportFilterActive ? (
              <span className="ml-2 font-normal text-zinc-600">(one sport)</span>
            ) : null}
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
        ) : sportSections.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-zinc-600">
            No sport roster players in this scope yet.
          </div>
        ) : (
          sportSections.map((sec) => (
            <section
              key={sec.sport.id}
              className="break-inside-avoid rounded-2xl border border-black/15 bg-white"
            >
              <div className="border-b border-black/10 bg-zinc-50 px-4 py-3">
                <div className="text-lg font-semibold">{sec.sport.name}</div>
                <div className="text-xs text-zinc-600">
                  Code {sec.sport.code} · up to {sec.sport.maxPlayersPerBatch} players per batch ·{" "}
                  <span className="font-medium text-zinc-800">
                    {sec.batches.reduce((n, b) => n + b.players.length, 0)}
                  </span>{" "}
                  total in view
                </div>
              </div>

              <div className="divide-y divide-black/10">
                {sec.batches.map((bb) => (
                  <div key={bb.batch.id} className="break-inside-avoid p-4">
                    <div className="mb-2 flex flex-wrap items-end justify-between gap-2 border-b border-black/5 pb-2">
                      <div>
                        <div className="text-sm font-semibold tabular-nums">Batch {bb.batch.code}</div>
                        {bb.batch.name?.trim() ? (
                          <div className="text-xs text-zinc-600">{bb.batch.name}</div>
                        ) : null}
                      </div>
                      <div className="text-xs text-zinc-600">
                        <span className="font-medium text-zinc-800">{bb.players.length}</span> /{" "}
                        {sec.sport.maxPlayersPerBatch}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px] border-collapse text-sm">
                        <thead>
                          <tr className="text-zinc-600">
                            <th className="w-10 border border-black/20 px-2 py-2 text-left font-medium">
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
                          {bb.players.map((p, idx) => (
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
