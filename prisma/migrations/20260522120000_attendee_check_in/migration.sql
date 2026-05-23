-- AlterTable
ALTER TABLE "Attendee" ADD COLUMN "checkInCode" TEXT,
ADD COLUMN "checkedInAt" TIMESTAMP(3),
ADD COLUMN "checkedInById" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Attendee_checkInCode_key" ON "Attendee"("checkInCode");

-- CreateIndex
CREATE INDEX "Attendee_phone_idx" ON "Attendee"("phone");

-- CreateIndex
CREATE INDEX "Attendee_checkedInAt_idx" ON "Attendee"("checkedInAt");

-- AddForeignKey
ALTER TABLE "Attendee" ADD CONSTRAINT "Attendee_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
