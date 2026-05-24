"use client";

import { useEffect, useId, useRef } from "react";

import { parseCheckInCodeFromScan } from "@/app/lib/attendance-qr";

type Props = {
  active?: boolean;
  /** Gate: compact camera for volunteers. Default: admin scan tab. */
  variant?: "default" | "gate";
  onScan: (text: string) => void;
  onError?: (message: string) => void;
};

function ScanFrameOverlay({ compact }: { compact?: boolean }) {
  const size = compact ? "h-[min(48vw,180px)] w-[min(48vw,180px)]" : "h-[min(62vw,280px)] w-[min(62vw,280px)]";
  return (
    <section className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <section className={`relative ${size}`}>
        <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-md border-l-[3px] border-t-[3px] border-emerald-400" />
        <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-md border-r-[3px] border-t-[3px] border-emerald-400" />
        <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-md border-b-[3px] border-l-[3px] border-emerald-400" />
        <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-md border-b-[3px] border-r-[3px] border-emerald-400" />
      </section>
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
  const minHeight = isGate ? "220px" : "min(70vw, 320px)";
  const dedupeMs = isGate ? 450 : 2000;

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
            fps: isGate ? 24 : 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const edge = Math.min(viewfinderWidth, viewfinderHeight);
              const size = Math.floor(edge * (isGate ? 0.8 : 0.72));
              return { width: size, height: size };
            },
            aspectRatio: 1,
            disableFlip: true,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true,
            },
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
      style={{ minHeight, maxHeight: isGate ? "220px" : undefined }}
    >
      <section id={regionId} className="h-full w-full" style={{ minHeight, maxHeight: isGate ? "220px" : undefined }} />
      {isGate ? <ScanFrameOverlay compact /> : null}
    </section>
  );
}
