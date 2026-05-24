"use client";

import { useCallback, useRef, useState } from "react";

import { parseCheckInCodeFromScan } from "@/app/lib/attendance-qr";
import { QrScanner } from "@/app/ui/QrScanner";

type AlertKind = "success" | "error" | "neutral";

type Alert = {
  kind: AlertKind;
  title: string;
  detail?: string;
};

type CheckInBrief = {
  id: string;
  fullName: string | null;
  batchCode: string;
  checkedInAt: string | null;
};

export function VolunteerScanClient() {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const lastScannedRef = useRef<string | null>(null);
  const lastScanAtRef = useRef(0);
  const busyRef = useRef(false);
  busyRef.current = busy;

  const processCode = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const code = parseCheckInCodeFromScan(trimmed);
    const debounceKey = code ?? trimmed;

    const now = Date.now();
    if (lastScannedRef.current === debounceKey && now - lastScanAtRef.current < 2500) {
      return;
    }
    lastScannedRef.current = debounceKey;
    lastScanAtRef.current = now;

    setBusy(true);
    setAlert(null);

    try {
      const searchRes = await fetch(`/api/attendance/search?q=${encodeURIComponent(trimmed)}`);
      const searchData = (await searchRes.json()) as {
        attendees?: { id: string; fullName: string | null; checkedInAt: string | null; participant: { batch: { code: string } } }[];
        error?: string;
      };

      if (!searchRes.ok || !searchData.attendees?.length) {
        setAlert({
          kind: "neutral",
          title: code ? "No attendee found for this QR." : "Invalid QR code.",
        });
        return;
      }

      const attendee = searchData.attendees[0];
      const name = attendee.fullName?.trim() || "Attendee";
      const batch = attendee.participant.batch.code;

      if (attendee.checkedInAt) {
        setAlert({
          kind: "error",
          title: "Already checked in",
          detail: `${name} · Batch ${batch}`,
        });
        return;
      }

      const checkRes = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attendeeIds: [attendee.id] }),
      });
      const checkData = (await checkRes.json()) as {
        status?: string;
        updated?: number;
        attendees?: CheckInBrief[];
        error?: string;
      };

      if (!checkRes.ok) {
        setAlert({ kind: "neutral", title: checkData.error ?? "Check-in failed." });
        return;
      }

      if (checkData.status === "already_checked_in" || checkData.updated === 0) {
        const brief = checkData.attendees?.[0];
        setAlert({
          kind: "error",
          title: "Already checked in",
          detail: brief
            ? `${brief.fullName?.trim() || name} · Batch ${brief.batchCode}`
            : `${name} · Batch ${batch}`,
        });
        return;
      }

      const brief = checkData.attendees?.[0];
      setAlert({
        kind: "success",
        title: "Check-in successful",
        detail: brief
          ? `${brief.fullName?.trim() || name} · Batch ${brief.batchCode}`
          : `${name} · Batch ${batch}`,
      });
      setManualCode("");
    } catch {
      setAlert({ kind: "neutral", title: "Something went wrong. Try again." });
    } finally {
      setBusy(false);
    }
  }, []);

  const handleScan = useCallback(
    (decoded: string) => {
      if (busyRef.current) return;
      void processCode(decoded);
    },
    [processCode],
  );

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-black dark:border-white/10">
        <QrScanner
          active
          onScan={handleScan}
          onError={() => setAlert({ kind: "neutral", title: "Camera not available." })}
        />
      </div>

      {busy ? (
        <p className="text-center text-sm text-zinc-500">Processing…</p>
      ) : (
        <p className="text-center text-sm text-zinc-500">Point camera at QR · hold steady 2 seconds</p>
      )}

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void processCode(manualCode);
        }}
      >
        <input
          type="text"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
          placeholder="Or type check-in code (e.g. 3X9WU48R)"
          autoComplete="off"
          spellCheck={false}
          className="h-12 flex-1 rounded-xl border border-black/15 bg-white px-4 font-mono text-base tracking-wide outline-none focus:ring-2 focus:ring-black/20 dark:border-white/15 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={busy || manualCode.trim().length < 6}
          className="h-12 shrink-0 rounded-xl bg-black px-5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Check in
        </button>
      </form>

      {alert ? (
        <div
          role="alert"
          className={`rounded-2xl border px-4 py-4 ${
            alert.kind === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100"
              : alert.kind === "error"
                ? "border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100"
                : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
          }`}
        >
          <div className="text-base font-semibold">{alert.title}</div>
          {alert.detail ? <div className="mt-1 text-sm opacity-90">{alert.detail}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
