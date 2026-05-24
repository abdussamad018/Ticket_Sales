"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { parseCheckInCodeFromScan } from "@/app/lib/attendance-qr";
import { QrScanner } from "@/app/ui/QrScanner";

type AlertKind = "success" | "error" | "neutral";

type Alert = {
  kind: AlertKind;
  title: string;
  detail?: string;
};

type ScanResponse = {
  status?: string;
  message?: string;
  detail?: string;
  error?: string;
};

function pulse(kind: AlertKind) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(kind === "success" ? 80 : kind === "error" ? [80, 40, 80] : 40);
  }
}

export function VolunteerScanClient() {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const busyRef = useRef(false);
  const lastCodeRef = useRef<string | null>(null);
  const lastAtRef = useRef(0);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback((next: Alert) => {
    setAlert(next);
    pulse(next.kind);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    const ms = next.kind === "success" ? 2200 : next.kind === "error" ? 3500 : 3000;
    alertTimerRef.current = setTimeout(() => setAlert(null), ms);
  }, []);

  const processScan = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || busyRef.current) return;

      const code = parseCheckInCodeFromScan(trimmed);
      if (!code) return;

      const now = Date.now();
      if (lastCodeRef.current === code && now - lastAtRef.current < 1200) return;
      lastCodeRef.current = code;
      lastAtRef.current = now;

      busyRef.current = true;
      try {
        const res = await fetch("/api/attendance/volunteer-scan", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scan: trimmed }),
        });

        let data: ScanResponse = {};
        try {
          data = (await res.json()) as ScanResponse;
        } catch {
          showAlert({ kind: "neutral", title: "Server error. Try again." });
          return;
        }

        if (!res.ok) {
          showAlert({ kind: "neutral", title: data.error ?? "Check-in failed." });
          return;
        }

        if (data.status === "checked_in") {
          setScanCount((n) => n + 1);
          showAlert({
            kind: "success",
            title: data.message ?? "Check-in successful",
            detail: data.detail,
          });
          return;
        }

        if (data.status === "already_checked_in") {
          showAlert({
            kind: "error",
            title: data.message ?? "Already checked in",
            detail: data.detail,
          });
          return;
        }

        showAlert({
          kind: "neutral",
          title: data.message ?? "Could not check in.",
        });
      } catch {
        showAlert({ kind: "neutral", title: "Network error. Try again." });
      } finally {
        busyRef.current = false;
      }
    },
    [showAlert],
  );

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, []);

  return (
    <section className="space-y-3">
      <section className="overflow-hidden rounded-2xl border border-black/10 bg-black dark:border-white/10">
        <QrScanner
          variant="gate"
          onScan={(text) => {
            void processScan(text);
          }}
          onError={(message) => {
            setCameraError(
              message ||
                "Camera not available. Use HTTPS, allow camera permission, then reload.",
            );
          }}
        />
      </section>

      <section className="flex items-center justify-between gap-2 px-1 text-xs text-zinc-500">
        <span>{cameraError ? "Camera error" : "Ready to scan"}</span>
        <span className="tabular-nums">Checked in this session: {scanCount}</span>
      </section>

      {cameraError ? (
        <section
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100"
        >
          <p className="font-semibold">Camera problem</p>
          <p className="mt-1 text-sm">{cameraError}</p>
        </section>
      ) : null}

      {alert ? (
        <section
          role="alert"
          aria-live="assertive"
          className={`rounded-2xl border px-4 py-5 ${
            alert.kind === "success"
              ? "border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100"
              : alert.kind === "error"
                ? "border-red-400 bg-red-50 text-red-950 dark:border-red-700 dark:bg-red-950/50 dark:text-red-100"
                : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
          }`}
        >
          <p className="text-xl font-bold">{alert.title}</p>
          {alert.detail ? <p className="mt-1 text-base opacity-90">{alert.detail}</p> : null}
        </section>
      ) : null}
    </section>
  );
}
