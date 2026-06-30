-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "riskPerTrade" DECIMAL(5,2) NOT NULL DEFAULT 0.75,
    "maxDailyLoss" DECIMAL(12,2) NOT NULL DEFAULT 1500,
    "maxOpenRisk" DECIMAL(5,2) NOT NULL DEFAULT 1.5,
    "maxTrades" INTEGER NOT NULL DEFAULT 4,
    "minR" DECIMAL(5,2) NOT NULL DEFAULT 1.5,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "onboardingSeen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
