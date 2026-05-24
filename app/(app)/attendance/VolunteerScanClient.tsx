"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { parseCheckInCodeFromScan } from "@/app/lib/attendance-qr";
import { gateFeedback } from "@/app/lib/gate-feedback";
import { QrScanner } from "@/app/ui/QrScanner";
import { useScreenWakeLock } from "@/app/ui/useScreenWakeLock";

type AlertKind = "success" | "error" | "neutral" | "pending";

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

function postCheckIn(code: string) {
  return fetch("/api/attendance/volunteer-scan", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
    cache: "no-store",
    keepalive: true,
  });
}

export function VolunteerScanClient() {
  useScreenWakeLock(true);

  const [alert, setAlert] = useState<Alert | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const inFlightRef = useRef<Set<string>>(new Set());
  const lastCodeRef = useRef<string | null>(null);
  const lastAtRef = useRef(0);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback((next: Alert, autoClearMs?: number) => {
    setAlert(next);
    if (next.kind !== "pending") gateFeedback(next.kind);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    if (next.kind === "pending") return;
    const ms =
      autoClearMs ??
      (next.kind === "success" ? 1000 : next.kind === "error" ? 2000 : 1800);
    alertTimerRef.current = setTimeout(() => setAlert(null), ms);
  }, []);

  const finalize = useCallback(
    (res: Response, data: ScanResponse, code: string) => {
      if (res.status === 403) {
        showAlert({ kind: "neutral", title: "Login again as volunteer" });
        return;
      }
      if (!res.ok) {
        showAlert({ kind: "neutral", title: data.error ?? "Failed" });
        return;
      }
      if (data.status === "checked_in") {
        showAlert({ kind: "success", title: "✓ Checked in", detail: data.detail });
        return;
      }
      if (data.status === "already_checked_in") {
        showAlert({ kind: "error", title: "Already checked in", detail: data.detail });
        return;
      }
      showAlert({
        kind: "neutral",
        title: data.message ?? "Not found",
        detail: data.status === "not_found" ? code : undefined,
      });
    },
    [showAlert],
  );

  const processScan = useCallback(
    async (raw: string) => {
      const code = parseCheckInCodeFromScan(raw.trim());
      if (!code || inFlightRef.current.has(code)) return;

      const now = Date.now();
      if (lastCodeRef.current === code && now - lastAtRef.current < 500) return;
      lastCodeRef.current = code;
      lastAtRef.current = now;

      inFlightRef.current.add(code);
      showAlert({ kind: "pending", title: "…" });

      try {
        const res = await postCheckIn(code);
        let data: ScanResponse = {};
        try {
          data = (await res.json()) as ScanResponse;
        } catch {
          showAlert({ kind: "neutral", title: "Server error" });
          return;
        }
        finalize(res, data, code);
      } catch {
        showAlert({ kind: "neutral", title: "Network error" });
      } finally {
        inFlightRef.current.delete(code);
      }
    },
    [finalize, showAlert],
  );

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, []);

  const alertClass =
    alert?.kind === "success"
      ? "border-emerald-400 bg-emerald-50 text-emerald-950"
      : alert?.kind === "error"
        ? "border-red-400 bg-red-50 text-red-950"
        : alert?.kind === "pending"
          ? "border-zinc-300 bg-zinc-100 text-zinc-600"
          : alert
            ? "border-amber-200 bg-amber-50 text-amber-950"
            : "border-zinc-200 bg-zinc-50 text-zinc-400";

  return (
    <section className="flex flex-col gap-3">
      <section className="shrink-0 overflow-hidden rounded-xl border border-black/10 bg-black">
        <QrScanner
          variant="gate"
          onScan={(text) => void processScan(text)}
          onError={(message) => setCameraError(message ?? "Camera unavailable")}
        />
      </section>

      <section
        role="status"
        aria-live="assertive"
        className={`flex min-h-[140px] flex-col items-center justify-center rounded-2xl border-2 px-4 py-6 text-center transition-colors duration-75 ${alertClass}`}
      >
        {cameraError ? (
          <>
            <p className="text-lg font-bold">Camera error</p>
            <p className="mt-2 text-sm">{cameraError}</p>
          </>
        ) : alert ? (
          <>
            <p className="text-2xl font-bold leading-tight">{alert.title}</p>
            {alert.detail ? (
              <p className="mt-2 text-lg leading-snug opacity-90">{alert.detail}</p>
            ) : null}
          </>
        ) : (
          <p className="text-base font-medium">Scan QR code</p>
        )}
      </section>
    </section>
  );
}
