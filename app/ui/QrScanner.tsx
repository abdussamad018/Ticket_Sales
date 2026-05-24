"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef } from "react";

import { parseCheckInCodeFromScan } from "@/app/lib/attendance-qr";
import type { QrScanData } from "react-qr-scanner";

const QrReader = dynamic(() => import("react-qr-scanner"), {
  ssr: false,
  loading: () => (
    <section className="flex min-h-[min(75vh,520px)] w-full items-center justify-center bg-black text-sm text-zinc-400">
      Starting camera…
    </section>
  ),
});

type Props = {
  active?: boolean;
  /** Gate mode: tall viewport, scan frame, faster debounce for high-volume check-in. */
  variant?: "default" | "gate";
  onScan: (text: string) => void;
  onError?: (message: string) => void;
};

function textFromScanData(data: QrScanData): string {
  if (!data) return "";
  return (data.text ?? data.rawValue ?? "").trim();
}

function ScanFrameOverlay() {
  return (
    <section className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <section className="relative h-[min(62vw,280px)] w-[min(62vw,280px)]">
        <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-emerald-400" />
        <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-emerald-400" />
        <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-emerald-400" />
        <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-emerald-400" />
        <span className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 bg-emerald-400/40" />
      </section>
      <p className="absolute bottom-4 left-0 right-0 text-center text-xs font-medium text-white/90">
        Align QR inside the frame
      </p>
    </section>
  );
}

export function QrScanner({ active = true, variant = "default", onScan, onError }: Props) {
  const lastKeyRef = useRef<string | null>(null);
  const lastAtRef = useRef(0);

  const constraints = useMemo(
    () =>
      ({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      }) satisfies MediaStreamConstraints,
    [],
  );

  const isGate = variant === "gate";
  const minHeight = isGate ? "min(75vh, 520px)" : "min(70vw, 320px)";
  const scanDelay = isGate ? 250 : 400;
  const dedupeMs = isGate ? 1200 : 2000;

  const handleScan = useCallback(
    (data: QrScanData) => {
      const text = textFromScanData(data);
      if (!text) return;

      const code = parseCheckInCodeFromScan(text);
      const key = code ?? text;
      const now = Date.now();
      if (lastKeyRef.current === key && now - lastAtRef.current < dedupeMs) return;
      lastKeyRef.current = key;
      lastAtRef.current = now;

      onScan(text);
    },
    [dedupeMs, onScan],
  );

  if (!active) return null;

  return (
    <section
      className="relative w-full overflow-hidden bg-black [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover"
      style={{ minHeight }}
    >
      <QrReader
        delay={scanDelay}
        onError={(err) => onError?.(err instanceof Error ? err.message : "Camera not available.")}
        onScan={handleScan}
        constraints={constraints}
        resolution={isGate ? 1920 : 1280}
        style={{ width: "100%", height: "100%", minHeight }}
      />
      {isGate ? <ScanFrameOverlay /> : null}
    </section>
  );
}
