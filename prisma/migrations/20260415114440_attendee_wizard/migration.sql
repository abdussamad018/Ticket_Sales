/*
  Warnings:

  - You are about to drop the column `email` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `ticketQty` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `tshirt` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the `ChildAttendee` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AttendeeType" AS ENUM ('ADULT', 'CHILD', 'INFANT');

-- DropForeignKey
ALTER TABLE "ChildAttendee" DROP CONSTRAINT "ChildAttendee_participantId_fkey";

-- DropForeignKey
ALTER TABLE "Participant" DROP CONSTRAINT "Participant_ticketId_fkey";

-- DropIndex
DROP INDEX "Participant_ticketId_idx";

-- DropIndex
DROP INDEX "Participant_tshirt_idx";

-- AlterTable
ALTER TABLE "Participant" DROP COLUMN "email",
DROP COLUMN "fullName",
DROP COLUMN "gender",
DROP COLUMN "phone",
DROP COLUMN "ticketQty",
DROP COLUMN "tshirt",
ADD COLUMN     "adultCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "childCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "infantCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "ticketId" DROP NOT NULL;

-- DropTable
DROP TABLE "ChildAttendee";

-- CreateTable
CREATE TABLE "Attendee" (
    "id" TEXT NOT NULL,
    "type" "AttendeeType" NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "tshirt" "TshirtSize",
    "ticketId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attendee_participantId_idx" ON "Attendee"("participantId");

-- CreateIndex
CREATE INDEX "Attendee_type_idx" ON "Attendee"("type");

-- CreateIndex
CREATE INDEX "Attendee_tshirt_idx" ON "Attendee"("tshirt");

-- CreateIndex
CREATE INDEX "Attendee_ticketId_idx" ON "Attendee"("ticketId");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendee" ADD CONSTRAINT "Attendee_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendee" ADD CONSTRAINT "Attendee_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
