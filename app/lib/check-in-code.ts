const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCheckInCode(length = 8) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export async function generateUniqueCheckInCode(
  exists: (code: string) => Promise<boolean>,
  maxAttempts = 20,
) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateCheckInCode();
    if (!(await exists(code))) return code;
  }
  throw new Error("Could not generate unique check-in code");
}

/** Strip spaces/dashes; keep digits for phone search. */
export function normalizePhoneQuery(raw: string) {
  return raw.replace(/[\s-]/g, "").trim();
}
