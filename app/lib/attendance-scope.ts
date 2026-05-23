import type { Prisma } from "@prisma/client";

import type { Session } from "@/app/lib/auth";

export function attendeeParticipantScopeWhere(session: Session): Prisma.ParticipantWhereInput {
  if (session.role === "SUPER_ADMIN") return {};
  if (session.role === "BATCH_REP" && session.batchId) return { batchId: session.batchId };
  return { id: { in: [] } };
}

export function attendeeScopeWhere(session: Session): Prisma.AttendeeWhereInput {
  return { participant: attendeeParticipantScopeWhere(session) };
}

/** Scope with optional batch filter (admin). Batch reps may only use their own batch. */
export function attendeeScopeWhereWithBatch(
  session: Session,
  batchId?: string | null,
): Prisma.AttendeeWhereInput {
  const base = attendeeParticipantScopeWhere(session);

  if (session.role === "BATCH_REP") {
    if (!session.batchId) return { participant: { id: { in: [] } } };
    return { participant: { batchId: session.batchId } };
  }

  if (batchId?.trim()) {
    return { participant: { ...base, batchId: batchId.trim() } };
  }

  return { participant: base };
}

export function assertBatchAccess(session: Session, batchId: string): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (session.role === "BATCH_REP" && session.batchId === batchId) return true;
  return false;
}
