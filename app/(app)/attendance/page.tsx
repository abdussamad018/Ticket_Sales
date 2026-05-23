import Link from "next/link";

import { requireSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { AttendanceClient } from "./AttendanceClient";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; batchId?: string }>;
}) {
  const session = await requireSession();
  const { code, batchId } = await searchParams;
  const initialCode = code?.trim().toUpperCase() || undefined;

  const isAdmin = session.role === "SUPER_ADMIN";

  const batches = isAdmin
    ? await prisma.batch.findMany({
        orderBy: { code: "asc" },
        select: { id: true, code: true },
      })
    : session.batchId
      ? await prisma.batch.findMany({
          where: { id: session.batchId },
          select: { id: true, code: true },
        })
      : [];

  const defaultBatchId =
    isAdmin && batchId && batches.some((b) => b.id === batchId)
      ? batchId
      : session.batchId ?? batches[0]?.id;

  return (
    <div className="mx-auto w-full max-w-2xl px-0 py-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Attendance check-in</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Select batch, then search by phone/code or load the full batch list to check in.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/reports/attendance/sign-sheet"
            className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Print sign-in sheets
          </Link>
          <Link
            href="/reports/attendance/qr-cards"
            className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Print QR cards
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
        <AttendanceClient
          initialCode={initialCode}
          batches={batches}
          defaultBatchId={defaultBatchId}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
