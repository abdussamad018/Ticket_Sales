-- CreateTable
CREATE TABLE "SystemSetting" (
  "id" TEXT NOT NULL,
  "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

