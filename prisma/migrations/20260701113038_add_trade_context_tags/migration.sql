-- CreateTable
CREATE TABLE "TradeContextTag" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "weight" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TradeContextTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradeContextTag_tradeId_name_key" ON "TradeContextTag"("tradeId", "name");

-- AddForeignKey
ALTER TABLE "TradeContextTag" ADD CONSTRAINT "TradeContextTag_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
