/** Compact JSON stored in printed / confirmation QR codes. */
export type AttendanceQrPayload = {
  v: 1;
  code: string;
  batch: string;
  name: string;
};

/** Plain check-in code for QR images — scans reliably on phone screens. */
export function buildAttendanceQrScanValue(code: string): string {
  return code.trim().toUpperCase().replace(/\s/g, "");
}

export function buildAttendanceQrPayload(input: {
  code: string;
  batch: string;
  name: string;
}): string {
  const payload: AttendanceQrPayload = {
    v: 1,
    code: input.code.trim().toUpperCase(),
    batch: input.batch.trim(),
    name: input.name.trim(),
  };
  return JSON.stringify(payload);
}

/** Extract check-in code from scanned QR text (JSON, URL, or plain code). */
export function parseCheckInCodeFromScan(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  if (text.startsWith("{")) {
    try {
      const o = JSON.parse(text) as Partial<AttendanceQrPayload>;
      if (o.v === 1 && typeof o.code === "string" && o.code.length >= 6) {
        return o.code.toUpperCase().replace(/\s/g, "");
      }
    } catch {
      /* fall through */
    }
  }

  const urlMatch = text.match(/[?&]code=([A-Z0-9]+)/i);
  if (urlMatch) return urlMatch[1].toUpperCase();

  const plain = text.toUpperCase().replace(/\s/g, "");
  if (/^[A-Z0-9]{6,10}$/.test(plain)) return plain;

  return null;
}

export function parseAttendanceQrPayload(raw: string): AttendanceQrPayload | null {
  const text = raw.trim();
  if (!text.startsWith("{")) return null;
  try {
    const o = JSON.parse(text) as Partial<AttendanceQrPayload>;
    if (o.v === 1 && typeof o.code === "string" && typeof o.batch === "string") {
      return {
        v: 1,
        code: o.code.toUpperCase().replace(/\s/g, ""),
        batch: o.batch,
        name: typeof o.name === "string" ? o.name : "",
      };
    }
  } catch {
    return null;
  }
  return null;
}
