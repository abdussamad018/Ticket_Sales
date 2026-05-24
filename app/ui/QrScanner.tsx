"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import type { QrScanData } from "react-qr-scanner";

const QrReader = dynamic(() => import("react-qr-scanner"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[min(70vw,320px)] w-full items-center justify-center bg-black text-sm text-zinc-400">
      Starting camera…
    </div>
  ),
});

type Props = {
  active?: boolean;
  onScan: (text: string) => void;
  onError?: (message: string) => void;
};

function textFromScanData(data: QrScanData): string {
  if (!data) return "";
  return (data.text ?? data.rawValue ?? "").trim();
}

export function QrScanner({ active = true, onScan, onError }: Props) {
  const constraints = useMemo(
    () =>
      ({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      }) satisfies MediaStreamConstraints,
    [],
  );

  if (!active) return null;

  return (
    <div className="min-h-[min(70vw,320px)] w-full overflow-hidden bg-black [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover">
      <QrReader
        onError={(err) => onError?.(err instanceof Error ? err.message : "Camera not available.")}
        onScan={(data) => {
          const text = textFromScanData(data);
          if (text) onScan(text);
        }}
        constraints={constraints}
        resolution={1280}
        style={{ width: "100%", height: "100%", minHeight: "min(70vw, 320px)" }}
      />
    </div>
  );
}
