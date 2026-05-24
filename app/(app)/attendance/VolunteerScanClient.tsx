"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { parseCheckInCodeFromScan } from "@/app/lib/attendance-qr";
import {
  createQrScanner,
  QR_SCAN_CONFIG,
  startQrScannerWithBackCamera,
} from "@/app/lib/qr-camera";

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
  const scanRegionId = useId().replace(/:/g, "");
  const [alert, setAlert] = useState<Alert | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const scannerRef = useRef<ReturnType<typeof createQrScanner> | null>(null);
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
    } catch {
      setAlert({ kind: "neutral", title: "Something went wrong. Try again." });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const scanner = createQrScanner(scanRegionId);
    scannerRef.current = scanner;

    const startTimer = window.setTimeout(() => {
      if (cancelled) return;

      startQrScannerWithBackCamera(
        scanner,
        QR_SCAN_CONFIG,
        (decoded) => {
          if (busyRef.current) return;
          void processCode(decoded);
        },
      )
        .then(() => {
          if (!cancelled) setCameraReady(true);
        })
        .catch(() => {
          if (!cancelled) {
            setAlert({ kind: "neutral", title: "Camera not available." });
          }
        });
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      if (scannerRef.current) {
        void scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [scanRegionId, processCode]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-black dark:border-white/10">
        <div id={scanRegionId} className="min-h-[min(70vw,320px)] w-full [&_video]:!object-cover" />
      </div>

      {busy ? (
        <p className="text-center text-sm text-zinc-500">Processing…</p>
      ) : cameraReady ? (
        <p className="text-center text-sm text-zinc-500">Point camera at attendee QR code</p>
      ) : (
        <p className="text-center text-sm text-zinc-500">Starting camera…</p>
      )}

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
