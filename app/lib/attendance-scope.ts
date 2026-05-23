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
