import {
  Html5Qrcode,
  type Html5QrcodeCameraScanConfig,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";

const BACK_CAMERA_LABEL = /back|rear|environment|world|后置/i;
const FRONT_CAMERA_LABEL = /front|user|selfie|facetime|前置/i;

/** Prefer the rear / environment camera for QR scanning (gate check-in). */
export function pickBackCameraId(cameras: Array<{ id: string; label: string }>): string {
  const labeledBack = cameras.find((c) => BACK_CAMERA_LABEL.test(c.label));
  if (labeledBack) return labeledBack.id;

  const labeledNotFront = cameras.find((c) => c.label && !FRONT_CAMERA_LABEL.test(c.label));
  if (labeledNotFront) return labeledNotFront.id;

  if (cameras.length >= 2) {
    return cameras[cameras.length - 1]!.id;
  }

  return cameras[0]!.id;
}

/** Full viewfinder scan — fixed qrbox often fails on phone screens. */
export const QR_SCAN_CONFIG: Html5QrcodeCameraScanConfig = {
  fps: 10,
  disableFlip: false,
};

export function createQrScanner(elementId: string): Html5Qrcode {
  return new Html5Qrcode(elementId, {
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    useBarCodeDetectorIfSupported: true,
    verbose: false,
  });
}

async function stopScannerIfRunning(scanner: Html5Qrcode): Promise<void> {
  try {
    if (scanner.isScanning) {
      await scanner.stop();
    }
  } catch {
    /* not started */
  }
}

async function waitForVideo(elementId: string, timeoutMs = 8000): Promise<HTMLVideoElement | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const video = document.getElementById(elementId)?.querySelector("video");
    if (video instanceof HTMLVideoElement && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      return video;
    }
    await new Promise((r) => window.setTimeout(r, 80));
  }
  const video = document.getElementById(elementId)?.querySelector("video");
  return video instanceof HTMLVideoElement ? video : null;
}

/** Chrome / Edge: native detector reads screen QRs more reliably than canvas-only ZXing. */
function attachNativeBarcodeScan(
  video: HTMLVideoElement,
  onSuccess: (decoded: string) => void,
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
  let raf = 0;
  let lastTick = 0;
  const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });

  const tick = (now: number) => {
    if (stopped) return;
    raf = requestAnimationFrame(tick);

    if (inflight || now - lastTick < 150) return;
    if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;

    lastTick = now;
    inflight = true;
    void detector
      .detect(video)
      .then((codes) => {
        const value = codes[0]?.rawValue?.trim();
        if (value) onSuccess(value);
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

async function boostCameraFocus(scanner: Html5Qrcode): Promise<void> {
  try {
    await scanner.applyVideoConstraints({
      width: { ideal: 1280 },
      height: { ideal: 720 },
      focusMode: "continuous",
    } as MediaTrackConstraints);
  } catch {
    /* optional */
  }
}

/**
 * Start QR scanner on the back camera. Returns cleanup (stop camera + native loop).
 */
export async function startQrScannerWithBackCamera(
  scanner: Html5Qrcode,
  elementId: string,
  config: Html5QrcodeCameraScanConfig,
  onSuccess: (decoded: string) => void,
): Promise<() => void> {
  const onError = () => {};
  const rearFacing: MediaTrackConstraints = { facingMode: "environment" };

  const cameras = await Html5Qrcode.getCameras();
  const attempts: Array<string | MediaTrackConstraints> = [];
  if (cameras.length > 0) {
    attempts.push(pickBackCameraId(cameras));
  }
  attempts.push(rearFacing);

  let started = false;
  let lastError: unknown;

  for (const camera of attempts) {
    await stopScannerIfRunning(scanner);
    try {
      await scanner.start(camera, config, onSuccess, onError);
      started = true;
      break;
    } catch (e) {
      lastError = e;
    }
  }

  if (!started) {
    throw lastError ?? new Error("No camera found");
  }

  await boostCameraFocus(scanner);

  const video = await waitForVideo(elementId);
  const stopNative = video ? attachNativeBarcodeScan(video, onSuccess) : () => {};

  return () => {
    stopNative();
    void stopScannerIfRunning(scanner);
    scanner.clear();
  };
}
