import { headers } from "next/headers";
import QRCode from "qrcode";

export async function AttendeeCheckInQr({ code }: { code: string }) {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const url = `${proto}://${host}/attendance?code=${encodeURIComponent(code)}`;
  const dataUrl = await QRCode.toDataURL(url, { width: 120, margin: 1 });

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={dataUrl} alt={`Check-in QR ${code}`} width={120} height={120} className="rounded-lg" />
  );
}
