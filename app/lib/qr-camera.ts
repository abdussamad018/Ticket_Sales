import { Html5Qrcode } from "html5-qrcode";

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

type QrScanConfig = {
  fps: number;
  qrbox: { width: number; height: number };
};

/** Start html5-qrcode using the back camera when available. */
export async function startQrScannerWithBackCamera(
  scanner: Html5Qrcode,
  config: QrScanConfig,
  onSuccess: (decoded: string) => void,
): Promise<void> {
  const onError = () => {};
  const cameras = await Html5Qrcode.getCameras();
  if (cameras.length === 0) {
    throw new Error("No camera found");
  }

  await scanner.start(pickBackCameraId(cameras), config, onSuccess, onError);
}
