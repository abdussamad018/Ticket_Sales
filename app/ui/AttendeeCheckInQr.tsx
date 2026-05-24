import QRCode from "qrcode";

import { buildAttendanceQrScanValue } from "@/app/lib/attendance-qr";

type Props = {
  code: string;
  batchCode: string;
  name: string;
  size?: number;
};

export async function AttendeeCheckInQr({ code, batchCode, name, size = 200 }: Props) {
  const payload = buildAttendanceQrScanValue(code);
  const dataUrl = await QRCode.toDataURL(payload, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`Check-in QR ${code} · Batch ${batchCode} · ${name}`}
      width={size}
      height={size}
      className="rounded-lg bg-white"
    />
  );
}
