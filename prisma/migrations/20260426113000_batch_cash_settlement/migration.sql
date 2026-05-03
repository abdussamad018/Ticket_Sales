-- CreateTable (additive only — no changes to existing tables)
CREATE TABLE "BatchCashSettlement" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "amountBdt" INTEGER NOT NULL,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchCashSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BatchCashSettlement_batchId_idx" ON "BatchCashSettlement"("batchId");

-- CreateIndex
CREATE INDEX "BatchCashSettlement_recordedById_idx" ON "BatchCashSettlement"("recordedById");

-- CreateIndex
CREATE INDEX "BatchCashSettlement_createdAt_idx" ON "BatchCashSettlement"("createdAt");

-- AddForeignKey
ALTER TABLE "BatchCashSettlement" ADD CONSTRAINT "BatchCashSettlement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchCashSettlement" ADD CONSTRAINT "BatchCashSettlement_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
