-- CreateEnum
CREATE TYPE "TradePlatform" AS ENUM ('MT4', 'MT5', 'CTRADER', 'TRADINGVIEW', 'BINANCE', 'BYBIT', 'OTHER');

-- CreateTable
CREATE TABLE "TradingAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "TradePlatform" NOT NULL DEFAULT 'MT5',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingAccount_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "accountId" TEXT,
ADD COLUMN "stopPrice" DECIMAL(12,4),
ADD COLUMN "takeProfit" DECIMAL(12,4);

-- CreateIndex
CREATE INDEX "TradingAccount_userId_active_idx" ON "TradingAccount"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "TradingAccount_userId_name_key" ON "TradingAccount"("userId", "name");

-- CreateIndex
CREATE INDEX "Trade_accountId_idx" ON "Trade"("accountId");

-- AddForeignKey
ALTER TABLE "TradingAccount" ADD CONSTRAINT "TradingAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
