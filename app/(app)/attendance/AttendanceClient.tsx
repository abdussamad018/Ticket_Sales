"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { BatchCombobox } from "@/app/ui/BatchCombobox";

type AttendeeResult = {
  id: string;
  fullName: string | null;
  type: string;
  phone: string | null;
  tshirt: string | null;
  checkInCode: string | null;
  checkedInAt: string | null;
  ticket: { name: string; code: string };
  participant: {
    id: string;
    batch: { code: string; name: string | null };
  };
};

type Stats = { total: number; checkedIn: number; pending: number };

type BatchOption = { id: string; code: string };

function labelType(t: string) {
  if (t === "ADULT") return "Adult";
  if (t === "CHILD") return "Child";
  return "Infant";
}

type Props = {
  initialCode?: string;
  batches: BatchOption[];
  defaultBatchId?: string;
  isAdmin: boolean;
};

export function AttendanceClient({ initialCode, batches, defaultBatchId, isAdmin }: Props) {
  const scanRegionId = useId().replace(/:/g, "");
  const [tab, setTab] = useState<"phone" | "scan">("phone");
  const [query, setQuery] = useState(initialCode ?? "");
  const [batchId, setBatchId] = useState(defaultBatchId ?? "");
  const [results, setResults] = useState<AttendeeResult[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const initialSearchDone = useRef(false);

  const buildSearchUrl = useCallback(
    (q: string) => {
      const params = new URLSearchParams();
      if (batchId) params.set("batchId", batchId);
      const trimmed = q.trim();
      if (trimmed.length > 0) params.set("q", trimmed);
      return `/api/attendance/search?${params}`;
    },
    [batchId],
  );

  const refreshStats = useCallback(async () => {
    if (!batchId) return;
    const res = await fetch(`/api/attendance/stats?batchId=${encodeURIComponent(batchId)}`);
    if (res.ok) setStats(await res.json());
  }, [batchId]);

  const runSearch = useCallback(
    async (q: string) => {
      if (!batchId) {
        setMessage("Select a batch first.");
        setResults([]);
        return;
      }

      const trimmed = q.trim();
      if (trimmed.length > 0 && trimmed.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(buildSearchUrl(q));
        const data = (await res.json()) as { attendees?: AttendeeResult[]; error?: string };
        if (!res.ok) {
          setMessage(data.error ?? "Search failed.");
          setResults([]);
          return;
        }
        setResults(data.attendees ?? []);
        if ((data.attendees?.length ?? 0) === 0) {
          setMessage(trimmed ? "No attendees found." : "No attendees in this batch.");
        }
      } catch {
        setMessage("Search failed. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [batchId, buildSearchUrl],
  );

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    if (initialCode && batchId && !initialSearchDone.current) {
      initialSearchDone.current = true;
      void runSearch(initialCode);
    }
  }, [initialCode, batchId, runSearch]);

  useEffect(() => {
    if (tab !== "scan") {
      if (scannerRef.current) {
        void scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const scanner = new Html5Qrcode(scanRegionId);
    scannerRef.current = scanner;

    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (cancelled || cameras.length === 0) return;
        return scanner.start(
          cameras[0].id,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            const text = decoded.trim();
            const codeMatch = text.match(/[?&]code=([A-Z0-9]+)/i);
            const code = codeMatch ? codeMatch[1].toUpperCase() : text.toUpperCase().replace(/\s/g, "");
            setQuery(code);
            setTab("phone");
            void runSearch(code);
          },
          () => {},
        );
      })
      .catch(() => {
        setMessage("Camera not available. Use phone search instead.");
      });

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        void scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [tab, scanRegionId, runSearch]);

  async function checkIn(ids: string[]) {
    setBusyId(ids.join(","));
    setMessage(null);
    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attendeeIds: ids }),
      });
      if (!res.ok) throw new Error("Check-in failed");
      const data = (await res.json()) as { updated: number };
      setMessage(data.updated > 0 ? `Checked in ${data.updated} attendee(s).` : "Already checked in.");
      await runSearch(query);
      await refreshStats();
    } catch {
      setMessage("Check-in failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function undoCheckIn(ids: string[]) {
    setBusyId(ids.join(","));
    setMessage(null);
    try {
      const res = await fetch("/api/attendance/undo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attendeeIds: ids }),
      });
      if (!res.ok) throw new Error("Undo failed");
      await runSearch(query);
      await refreshStats();
      setMessage("Check-in undone.");
    } catch {
      setMessage("Undo failed.");
    } finally {
      setBusyId(null);
    }
  }

  const pendingIds = results.filter((r) => !r.checkedInAt).map((r) => r.id);
  const repBatch = !isAdmin && batches[0];

  return (
    <div className="space-y-6">
      {batches.length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          Your account is not linked to a batch. Contact an administrator.
        </p>
      ) : isAdmin ? (
        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
          <BatchCombobox
            batches={batches}
            name="attendanceBatch"
            label="Batch"
            defaultBatchId={batchId || defaultBatchId}
            allowAll={false}
            placeholder="Type batch code (e.g. 2014)"
            inputClassName="h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:bg-zinc-950"
            onBatchChange={(id) => {
              setBatchId(id);
              setResults([]);
              setMessage(null);
            }}
          />
          <p className="mt-2 text-xs text-zinc-500">Pick a batch, then load list or search within that batch.</p>
        </div>
      ) : repBatch ? (
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-zinc-950">
          <span className="text-zinc-600 dark:text-zinc-400">Batch: </span>
          <span className="font-semibold tabular-nums">{repBatch.code}</span>
        </div>
      ) : null}

      {stats && batchId ? (
        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Checked in (this batch)</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {stats.checkedIn}{" "}
            <span className="text-base font-normal text-zinc-500">/ {stats.total}</span>
          </div>
          <div className="mt-1 text-xs text-zinc-500">{stats.pending} pending</div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("phone")}
          className={`h-10 rounded-xl px-4 text-sm ${
            tab === "phone"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950"
          }`}
        >
          Phone / code
        </button>
        <button
          type="button"
          onClick={() => setTab("scan")}
          className={`h-10 rounded-xl px-4 text-sm ${
            tab === "scan"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950"
          }`}
        >
          Scan QR
        </button>
      </div>

      {tab === "phone" ? (
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch(query);
          }}
        >
          <div className="flex-1 space-y-1">
            <label htmlFor="attendance-search" className="text-sm font-medium">
              Phone or check-in code (optional)
            </label>
            <input
              id="attendance-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Leave empty for full batch list"
              autoComplete="off"
              className="h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-base outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:bg-zinc-950"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !batchId || (query.trim().length > 0 && query.trim().length < 2)}
            className="h-12 shrink-0 rounded-xl bg-black px-6 text-sm text-white hover:bg-black/90 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {loading ? "Loading…" : query.trim() ? "Search" : "Load list"}
          </button>
        </form>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-black dark:border-white/10">
          <div id={scanRegionId} className="w-full" />
        </div>
      )}

      {message ? (
        <p className="rounded-xl border border-black/10 bg-zinc-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-zinc-900">
          {message}
        </p>
      ) : null}

      {results.length > 0 ? (
        <div className="space-y-3">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {results.length} attendee{results.length === 1 ? "" : "s"} shown
          </div>

          {pendingIds.length > 1 ? (
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => void checkIn(pendingIds)}
              className="h-10 rounded-xl border border-black/15 bg-white px-4 text-sm hover:bg-black/5 dark:border-white/15 dark:bg-zinc-900"
            >
              Check in all shown ({pendingIds.length})
            </button>
          ) : null}

          {results.map((a) => {
            const checkedIn = !!a.checkedInAt;
            const busy = busyId === a.id || busyId === pendingIds.join(",");
            return (
              <div
                key={a.id}
                className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{a.fullName?.trim() || "—"}</div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {labelType(a.type)} · {a.ticket.name}
                    </div>
                    <div className="mt-1 font-mono text-xs text-zinc-500">
                      {a.phone?.trim() || "—"}
                      {a.checkInCode ? ` · ${a.checkInCode}` : null}
                      {a.tshirt ? ` · T-shirt ${a.tshirt}` : null}
                    </div>
                    {checkedIn ? (
                      <div className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Checked in {new Date(a.checkedInAt!).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {checkedIn ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void undoCheckIn([a.id])}
                        className="h-10 rounded-xl border border-black/15 px-4 text-sm hover:bg-black/5 dark:border-white/15"
                      >
                        Undo
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void checkIn([a.id])}
                        className="h-10 rounded-xl bg-black px-4 text-sm text-white hover:bg-black/90 dark:bg-white dark:text-black"
                      >
                        Check in
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
