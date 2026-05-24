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
