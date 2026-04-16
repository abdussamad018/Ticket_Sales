-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "attendeeType" "AttendeeType" NOT NULL DEFAULT 'ADULT';

ALTER TABLE "Ticket" ADD COLUMN "hasTshirt" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Ticket_attendeeType_idx" ON "Ticket"("attendeeType");

-- Align with Prisma schema: no DB default for attendeeType (app always sets it)
ALTER TABLE "Ticket" ALTER COLUMN "attendeeType" DROP DEFAULT;
