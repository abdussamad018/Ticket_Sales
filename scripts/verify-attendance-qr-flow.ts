/**
 * Verifies QR generate → parse → lookup key consistency (no DB required).
 * Run: npx tsx scripts/verify-attendance-qr-flow.ts
 */
import {
  buildAttendanceQrPayload,
  buildAttendanceQrScanValue,
  parseCheckInCodeFromScan,
} from "../app/lib/attendance-qr";
import { generateCheckInCode } from "../app/lib/check-in-code";

let failed = 0;

function assert(label: string, ok: boolean) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`OK: ${label}`);
  }
}

const sampleCode = generateCheckInCode(8);
const plainQr = buildAttendanceQrScanValue(sampleCode);
assert("plain QR equals uppercase code", plainQr === sampleCode.toUpperCase());
assert("parse plain QR", parseCheckInCodeFromScan(plainQr) === sampleCode.toUpperCase());

const jsonQr = buildAttendanceQrPayload({
  code: sampleCode,
  batch: "2014",
  name: "Test User",
});
assert("parse JSON QR", parseCheckInCodeFromScan(jsonQr) === sampleCode.toUpperCase());

const urlQr = `https://example.com/attendance?code=${sampleCode}`;
assert("parse URL QR", parseCheckInCodeFromScan(urlQr) === sampleCode.toUpperCase());

assert("reject empty", parseCheckInCodeFromScan("") === null);
assert("reject garbage", parseCheckInCodeFromScan("hello") === null);

console.log(failed === 0 ? "\nAll QR flow checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
