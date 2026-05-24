"use client";

import { QRCodeSVG } from "qrcode.react";

import { buildAttendanceQrScanValue } from "@/app/lib/attendance-qr";

type Props = {
  code: string;
  batchCode: string;
  name: string;
  size?: number;
};

export function AttendeeCheckInQr({ code, batchCode, name, size = 240 }: Props) {
  const value = buildAttendanceQrScanValue(code);

  return (
    <QRCodeSVG
      value={value}
      size={size}
      level="H"
      marginSize={3}
      bgColor="#ffffff"
      fgColor="#000000"
      className="rounded-lg bg-white"
      title={`Check-in QR ${code} · Batch ${batchCode} · ${name}`}
    />
  );
}
