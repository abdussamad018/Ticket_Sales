import QRCode from "qrcode";

import { buildAttendanceQrPayload } from "@/app/lib/attendance-qr";

type Props = {
  code: string;
  batchCode: string;
  name: string;
  size?: number;
};

export async function AttendeeCheckInQr({ code, batchCode, name, size = 120 }: Props) {
  const payload = buildAttendanceQrPayload({ code, batch: batchCode, name });
  const dataUrl = await QRCode.toDataURL(payload, {
    width: size,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`Check-in QR ${code}`}
      width={size}
      height={size}
      className="rounded-lg bg-white"
    />
  );
}
