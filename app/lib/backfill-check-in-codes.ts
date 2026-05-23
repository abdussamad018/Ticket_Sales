import { generateCheckInCode } from "@/app/lib/check-in-code";
import { prisma } from "@/app/lib/prisma";

const UPDATE_CHUNK = 50;

/**
 * Assign unique checkInCode to attendees that do not have one yet.
 * Safe to run on every deploy (no-op when nothing is missing).
 */
export async function backfillCheckInCodes(): Promise<{ updated: number }> {
  const existing = await prisma.attendee.findMany({
    where: { checkInCode: { not: null } },
    select: { checkInCode: true },
  });
  const used = new Set(existing.map((e) => e.checkInCode!));

  const missing = await prisma.attendee.findMany({
    where: { checkInCode: null },
    select: { id: true },
  });

  if (missing.length === 0) {
    return { updated: 0 };
  }

  const assignments: Array<{ id: string; code: string }> = [];
  for (const row of missing) {
    let code: string;
    do {
      code = generateCheckInCode();
    } while (used.has(code));
    used.add(code);
    assignments.push({ id: row.id, code });
  }

  for (let i = 0; i < assignments.length; i += UPDATE_CHUNK) {
    const chunk = assignments.slice(i, i + UPDATE_CHUNK);
    await Promise.all(
      chunk.map(({ id, code }) =>
        prisma.attendee.update({ where: { id }, data: { checkInCode: code } }),
      ),
    );
  }

  return { updated: assignments.length };
}
