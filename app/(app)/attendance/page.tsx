import Link from "next/link";

import { requireSession } from "@/app/lib/auth";
import { AttendanceClient } from "./AttendanceClient";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  await requireSession();
  const { code } = await searchParams;
  const initialCode = code?.trim().toUpperCase() || undefined;

  return (
    <div className="mx-auto w-full max-w-2xl px-0 py-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Attendance check-in</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Search by phone or scan QR. Each attendee is checked in separately.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/reports/attendance/sign-sheet"
            className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Print sign-in sheets
          </Link>
          <a
            href="/reports/attendance/export"
            className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="mt-6">
        <AttendanceClient initialCode={initialCode} />
      </div>
    </div>
  );
}
