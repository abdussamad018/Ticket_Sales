-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "maxPlayersPerBatch" INTEGER NOT NULL,
    "dataEntryOpen" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportRosterEntry" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportRosterEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sport_code_key" ON "Sport"("code");

-- CreateIndex
CREATE INDEX "Sport_sortOrder_idx" ON "Sport"("sortOrder");

-- CreateIndex
CREATE INDEX "SportRosterEntry_sportId_batchId_idx" ON "SportRosterEntry"("sportId", "batchId");

-- CreateIndex
CREATE INDEX "SportRosterEntry_batchId_idx" ON "SportRosterEntry"("batchId");

-- CreateIndex
CREATE INDEX "SportRosterEntry_createdById_idx" ON "SportRosterEntry"("createdById");

-- AddForeignKey
ALTER TABLE "SportRosterEntry" ADD CONSTRAINT "SportRosterEntry_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportRosterEntry" ADD CONSTRAINT "SportRosterEntry_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportRosterEntry" ADD CONSTRAINT "SportRosterEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
