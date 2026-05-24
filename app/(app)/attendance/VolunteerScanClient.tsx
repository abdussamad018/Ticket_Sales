"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useCallback, useEffect, useId, useRef, useState } from "react";

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

function pickRearCameraId(cameras: { id: string; label: string }[]) {
  if (cameras.length === 0) return null;
  const back = cameras.find((c) => /back|rear|environment|traseira|arrière/i.test(c.label));
  return (back ?? cameras[cameras.length - 1]).id;
}

export function VolunteerScanClient() {
  const scanRegionId = useId().replace(/:/g, "");
  const [alert, setAlert] = useState<Alert | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const lastCodeRef = useRef<string | null>(null);
  const lastAtRef = useRef(0);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback((next: Alert) => {
    setAlert(next);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => setAlert(null), 4000);
  }, []);

  const processScan = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || busyRef.current) return;

      const now = Date.now();
      if (lastCodeRef.current === trimmed && now - lastAtRef.current < 3000) return;
      lastCodeRef.current = trimmed;
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
    let cancelled = false;
    const scanner = new Html5Qrcode(scanRegionId, { verbose: false });
    scannerRef.current = scanner;

    async function startScanner() {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cancelled) return;

        if (cameras.length === 0) {
          setCameraError("No camera found. Allow camera permission and reload.");
          return;
        }

        const cameraId = pickRearCameraId(cameras);
        const config = {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const size = Math.min(viewfinderWidth, viewfinderHeight, 280) * 0.85;
            return { width: size, height: size };
          },
          aspectRatio: 1,
        };

        await scanner.start(
          cameraId ?? { facingMode: "environment" },
          config,
          (decoded) => {
            void processScan(decoded);
          },
          () => {},
        );

        if (!cancelled) {
          setReady(true);
          setCameraError(null);
        }
      } catch {
        if (!cancelled) {
          setCameraError(
            "Camera not available. Use HTTPS, allow camera permission, then reload this page.",
          );
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
      if (scannerRef.current) {
        void scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [scanRegionId, processScan]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-black dark:border-white/10">
        <div id={scanRegionId} className="min-h-[min(70vh,420px)] w-full [&>video]:object-cover" />
      </div>

      {cameraError ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100"
        >
          <div className="font-semibold">Camera problem</div>
          <p className="mt-1 text-sm">{cameraError}</p>
        </div>
      ) : ready ? (
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
          <div className="text-lg font-semibold">{alert.title}</div>
          {alert.detail ? <div className="mt-1 text-sm opacity-90">{alert.detail}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
