import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";

/** SVG data URL for print / server-rendered QR cards (qrcode.react). */
export function qrSvgDataUrl(value: string, size = 160): string {
  const svg = renderToStaticMarkup(
    <QRCodeSVG
      value={value}
      size={size}
      level="M"
      marginSize={2}
      bgColor="#ffffff"
      fgColor="#000000"
    />,
  );
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
