"use client";

import { useEffect, useId, useRef } from "react";

import { parseCheckInCodeFromScan } from "@/app/lib/attendance-qr";

type Props = {
  active?: boolean;
  /** Gate mode: tall viewport, scan frame, faster scan rate. */
  variant?: "default" | "gate";
  onScan: (text: string) => void;
  onError?: (message: string) => void;
};

function ScanFrameOverlay() {
  return (
    <section className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <section className="relative h-[min(62vw,280px)] w-[min(62vw,280px)]">
        <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-emerald-400" />
        <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-emerald-400" />
        <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-emerald-400" />
        <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-emerald-400" />
      </section>
      <p className="absolute bottom-4 left-0 right-0 text-center text-xs font-medium text-white/90">
        Align QR inside the frame
      </p>
    </section>
  );
}

function pickRearCamera(cameras: { id: string; label: string }[]) {
  if (cameras.length === 0) return null;
  const back = cameras.find((c) => /back|rear|environment|traseira|arrière/i.test(c.label));
  return (back ?? cameras[cameras.length - 1]).id;
}

export function QrScanner({ active = true, variant = "default", onScan, onError }: Props) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const lastKeyRef = useRef<string | null>(null);
  const lastAtRef = useRef(0);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  onScanRef.current = onScan;
  onErrorRef.current = onError;

  const isGate = variant === "gate";
  const minHeight = isGate ? "min(75vh, 520px)" : "min(70vw, 320px)";
  const dedupeMs = isGate ? 900 : 2000;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(regionId, { verbose: false });
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (cancelled) return;

        if (cameras.length === 0) {
          onErrorRef.current?.("No camera found. Allow camera permission and reload.");
          return;
        }

        const cameraId = pickRearCamera(cameras);
        if (!cameraId) {
          onErrorRef.current?.("No camera found.");
          return;
        }

        await scanner.start(
          cameraId,
          {
            fps: isGate ? 20 : 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const edge = Math.min(viewfinderWidth, viewfinderHeight);
              const size = Math.floor(edge * (isGate ? 0.78 : 0.72));
              return { width: size, height: size };
            },
            aspectRatio: 1,
            disableFlip: false,
          },
          (decoded) => {
            const text = decoded.trim();
            if (!text) return;

            const code = parseCheckInCodeFromScan(text);
            const key = code ?? text;
            const now = Date.now();
            if (lastKeyRef.current === key && now - lastAtRef.current < dedupeMs) return;
            lastKeyRef.current = key;
            lastAtRef.current = now;

            onScanRef.current(text);
          },
          () => {},
        );
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : "Camera not available. Use HTTPS and allow camera permission.";
        onErrorRef.current?.(message);
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        void scanner.stop().catch(() => {});
        scanner.clear();
      }
    };
  }, [active, regionId, isGate, dedupeMs]);

  if (!active) return null;

  return (
    <section
      className="relative w-full overflow-hidden bg-black [&_video]:object-cover"
      style={{ minHeight }}
    >
      <section id={regionId} className="h-full w-full" style={{ minHeight }} />
      {isGate ? <ScanFrameOverlay /> : null}
    </section>
  );
}
