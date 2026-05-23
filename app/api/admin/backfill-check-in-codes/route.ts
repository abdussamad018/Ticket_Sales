import { NextResponse } from "next/server";

import { backfillCheckInCodes } from "@/app/lib/backfill-check-in-codes";
import { getSession } from "@/app/lib/auth";

/** Super admin: run check-in code backfill on production DB without a local machine. */
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { updated } = await backfillCheckInCodes();
    return NextResponse.json({
      ok: true,
      updated,
      message:
        updated === 0
          ? "All attendees already have check-in codes."
          : `Assigned check-in codes to ${updated} attendee(s).`,
    });
  } catch (e) {
    console.error("[backfill-check-in-codes]", e);
    const message = e instanceof Error ? e.message : "Backfill failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
