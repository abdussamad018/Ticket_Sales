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

  // Many phones enumerate front first, rear second; labels are often empty until granted.
  if (cameras.length >= 2) {
    return cameras[cameras.length - 1]!.id;
  }

  return cameras[0]!.id;
}

const qrScanBoxDimensions: Html5QrcodeCameraScanConfig["qrbox"] = (
  viewfinderWidth,
  viewfinderHeight,
) => {
  const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.75);
  return { width: edge, height: edge };
};

export const QR_SCAN_CONFIG: Html5QrcodeCameraScanConfig = {
  fps: 15,
  qrbox: qrScanBoxDimensions,
  disableFlip: false,
};

export function createQrScanner(elementId: string): Html5Qrcode {
  return new Html5Qrcode(elementId, {
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
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

/** Start html5-qrcode using the back camera when available. */
export async function startQrScannerWithBackCamera(
  scanner: Html5Qrcode,
  config: Html5QrcodeCameraScanConfig,
  onSuccess: (decoded: string) => void,
): Promise<void> {
  const onError = () => {};
  const rearFacing: MediaTrackConstraints = { facingMode: "environment" };

  const cameras = await Html5Qrcode.getCameras();
  const attempts: Array<string | MediaTrackConstraints> = [];
  if (cameras.length > 0) {
    attempts.push(pickBackCameraId(cameras));
  }
  attempts.push(rearFacing);

  let lastError: unknown;
  for (const camera of attempts) {
    await stopScannerIfRunning(scanner);
    try {
      await scanner.start(camera, config, onSuccess, onError);
      return;
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError ?? new Error("No camera found");
}
