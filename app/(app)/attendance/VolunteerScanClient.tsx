"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { parseCheckInCodeFromScan } from "@/app/lib/attendance-qr";
import { gateFeedback } from "@/app/lib/gate-feedback";
import { QrScanner } from "@/app/ui/QrScanner";
import { useScreenWakeLock } from "@/app/ui/useScreenWakeLock";

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

async function postCheckIn(code: string, scan: string) {
  return fetch("/api/attendance/volunteer-scan", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, scan }),
    cache: "no-store",
  });
}

export function VolunteerScanClient() {
  useScreenWakeLock(true);

  const [alert, setAlert] = useState<Alert | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const lastCodeRef = useRef<string | null>(null);
  const lastAtRef = useRef(0);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback((next: Alert) => {
    setAlert(next);
    gateFeedback(next.kind);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    const ms = next.kind === "success" ? 1400 : next.kind === "error" ? 2500 : 2200;
    alertTimerRef.current = setTimeout(() => setAlert(null), ms);
  }, []);

  const handleApiResponse = useCallback(
    (res: Response, data: ScanResponse, code: string) => {
      if (res.status === 403) {
        showAlert({ kind: "neutral", title: "Login again as volunteer" });
        return;
      }
      if (!res.ok) {
        showAlert({ kind: "neutral", title: data.error ?? "Check-in failed" });
        return;
      }
      if (data.status === "checked_in") {
        showAlert({
          kind: "success",
          title: "✓ Checked in",
          detail: data.detail,
        });
        return;
      }
      if (data.status === "already_checked_in") {
        showAlert({
          kind: "error",
          title: "Already checked in",
          detail: data.detail,
        });
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
      const trimmed = raw.trim();
      if (!trimmed || busyRef.current) return;

      const code = parseCheckInCodeFromScan(trimmed);
      if (!code) return;

      const now = Date.now();
      if (lastCodeRef.current === code && now - lastAtRef.current < 900) return;
      lastCodeRef.current = code;
      lastAtRef.current = now;

      busyRef.current = true;
      try {
        let res = await postCheckIn(code, trimmed);
        if (!res.ok && res.status >= 500) {
          await new Promise((r) => setTimeout(r, 300));
          res = await postCheckIn(code, trimmed);
        }
        let data: ScanResponse = {};
        try {
          data = (await res.json()) as ScanResponse;
        } catch {
          showAlert({ kind: "neutral", title: "Server error" });
          return;
        }
        handleApiResponse(res, data, code);
      } catch {
        showAlert({ kind: "neutral", title: "Network error" });
      } finally {
        busyRef.current = false;
      }
    },
    [handleApiResponse, showAlert],
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
        className={`flex min-h-[140px] flex-col items-center justify-center rounded-2xl border-2 px-4 py-6 text-center ${alertClass}`}
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
