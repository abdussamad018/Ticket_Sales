"use client";

import { BrowserQRCodeReader } from "@zxing/browser";
import { useEffect, useRef } from "react";

import { pickBackCameraId } from "@/app/lib/qr-camera";

type Props = {
  active?: boolean;
  onScan: (text: string) => void;
  onError?: (message: string) => void;
  onReady?: () => void;
};

function attachNativeBarcodeDetector(
  video: HTMLVideoElement,
  onScan: (text: string) => void,
): () => void {
  const BarcodeDetectorCtor = (
    globalThis as typeof globalThis & {
      BarcodeDetector?: new (options?: { formats: string[] }) => {
        detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
      };
    }
  ).BarcodeDetector;

  if (!BarcodeDetectorCtor) {
    return () => {};
  }

  let stopped = false;
  let inflight = false;
  let lastTick = 0;
  let raf = 0;
  const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });

  const tick = (now: number) => {
    if (stopped) return;
    raf = requestAnimationFrame(tick);
    if (inflight || now - lastTick < 100) return;
    if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;

    lastTick = now;
    inflight = true;
    void detector
      .detect(video)
      .then((codes) => {
        const value = codes[0]?.rawValue?.trim();
        if (value) onScan(value);
      })
      .catch(() => {})
      .finally(() => {
        inflight = false;
      });
  };

  raf = requestAnimationFrame(tick);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}

export function LiveQrScanner({ active = true, onScan, onError, onReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let zxingControls: { stop: () => void } | null = null;
    let stopNative = () => {};

    const reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 80,
      delayBetweenScanSuccess: 1500,
    });

    const emitScan = (text: string) => {
      const trimmed = text.trim();
      if (trimmed) onScanRef.current(trimmed);
    };

    async function start() {
      const video = videoRef.current;
      if (!video || cancelled) return;

      try {
        const devices = await BrowserQRCodeReader.listVideoInputDevices();
        if (cancelled) return;

        const onResult: Parameters<BrowserQRCodeReader["decodeFromVideoDevice"]>[2] = (result) => {
          if (result) emitScan(result.getText());
        };

        if (devices.length > 0) {
          const deviceId = pickBackCameraId(
            devices.map((d) => ({ id: d.deviceId, label: d.label })),
          );
          zxingControls = await reader.decodeFromVideoDevice(deviceId, video, onResult);
        } else {
          zxingControls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: "environment" } } },
            video,
            onResult,
          );
        }

        stopNative = attachNativeBarcodeDetector(video, emitScan);
        if (!cancelled) onReady?.();
      } catch {
        if (!cancelled) onError?.("Camera not available.");
      }
    }

    const timer = window.setTimeout(() => void start(), 100);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopNative();
      zxingControls?.stop();
      const video = videoRef.current;
      if (video) {
        BrowserQRCodeReader.cleanVideoSource(video);
      }
    };
  }, [active, onError, onReady]);

  return (
    <video
      ref={videoRef}
      className="min-h-[min(70vw,320px)] w-full object-cover"
      playsInline
      muted
      autoPlay
    />
  );
}
