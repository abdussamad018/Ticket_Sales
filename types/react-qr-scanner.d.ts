declare module "react-qr-scanner" {
  import type { CSSProperties } from "react";

  export type QrScanData = {
    text?: string;
    rawValue?: string;
    canvas?: HTMLCanvasElement;
  } | null;

  export type QrReaderProps = {
    delay?: number;
    onError: (error: unknown) => void;
    onScan: (data: QrScanData) => void;
    onLoad?: () => void;
    constraints?: MediaStreamConstraints;
    resolution?: number;
    qrArea?: [number, number];
    style?: CSSProperties;
  };

  const QrReader: React.FC<QrReaderProps>;
  export default QrReader;
}
