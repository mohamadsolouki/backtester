-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TRADER', 'REVIEWER');

-- CreateEnum
CREATE TYPE "SessionName" AS ENUM ('PRE_MARKET', 'OPEN', 'MIDDAY', 'CLOSE', 'POST_MARKET');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('PLANNED', 'WATCHING', 'TAKEN', 'SKIPPED', 'NOT_FORMED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('A_PLUS', 'A', 'A_MINUS', 'B_PLUS', 'B', 'C', 'D', 'F');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('E1', 'E2', 'E3');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('TAKEN', 'SKIPPED', 'NOT_FORMED', 'WAITING');

-- CreateEnum
CREATE TYPE "SkipReason" AS ENUM ('FAR_FROM_EMA', 'UNSAFE_STOP', 'LOW_VOLUME', 'RANGE', 'NEWS', 'PSYCHOLOGY', 'OTHER');

-- CreateEnum
CREATE TYPE "TradeDirection" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'CLOSED', 'SCRATCH');

-- CreateEnum
CREATE TYPE "ScreenshotKind" AS ENUM ('CONTEXT', 'ENTRY', 'EXIT', 'REVIEW', 'PLAYBOOK');

-- CreateEnum
CREATE TYPE "ReportPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'TRADER',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dubai',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "pair" TEXT,
    "setupName" TEXT NOT NULL,
    "market" TEXT NOT NULL DEFAULT 'Futures',
    "bias" TEXT NOT NULL,
    "primaryContext" TEXT NOT NULL,
    "sessionName" "SessionName" NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'PLANNED',
    "confirmationCount" INTEGER NOT NULL DEFAULT 0,
    "grade" "Grade" NOT NULL DEFAULT 'C',
    "plannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "takenAt" TIMESTAMP(3),
    "riskReward" DECIMAL(8,2),
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContextTag" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,

    CONSTRAINT "ContextTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "type" "EntryType" NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'WAITING',
    "skipReason" "SkipReason",
    "entryPrice" DECIMAL(12,4),
    "stopPrice" DECIMAL(12,4),
    "targetPrice" DECIMAL(12,4),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "ticker" TEXT NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'CLOSED',
    "sessionName" "SessionName" NOT NULL,
    "quantity" DECIMAL(12,4),
    "entryPrice" DECIMAL(12,4) NOT NULL,
    "exitPrice" DECIMAL(12,4),
    "rMultiple" DECIMAL(8,2) NOT NULL,
    "pnl" DECIMAL(12,2) NOT NULL,
    "fees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleBreak" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuleBreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screenshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "opportunityId" TEXT,
    "tradeId" TEXT,
    "playbookId" TEXT,
    "kind" "ScreenshotKind" NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Screenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "tradeId" TEXT,
    "score" INTEGER NOT NULL,
    "lesson" TEXT NOT NULL,
    "actionItem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SOPDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SOPDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SOPVersion" (
    "id" TEXT NOT NULL,
    "sopId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "changeLog" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SOPVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookSetup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "validConditions" TEXT[],
    "invalidConditions" TEXT[],
    "entryLogic" TEXT NOT NULL,
    "exitLogic" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaybookSetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" "ReportPeriod" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "validRows" INTEGER NOT NULL,
    "errorRows" INTEGER NOT NULL,
    "mapping" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Opportunity_userId_plannedAt_idx" ON "Opportunity"("userId", "plannedAt");

-- CreateIndex
CREATE INDEX "Opportunity_ticker_setupName_idx" ON "Opportunity"("ticker", "setupName");

-- CreateIndex
CREATE INDEX "Opportunity_grade_status_idx" ON "Opportunity"("grade", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ContextTag_opportunityId_name_key" ON "ContextTag"("opportunityId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_opportunityId_type_key" ON "Entry"("opportunityId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_opportunityId_key" ON "Trade"("opportunityId");

-- CreateIndex
CREATE INDEX "Trade_userId_openedAt_idx" ON "Trade"("userId", "openedAt");

-- CreateIndex
CREATE INDEX "Trade_ticker_sessionName_idx" ON "Trade"("ticker", "sessionName");

-- CreateIndex
CREATE INDEX "Screenshot_opportunityId_tradeId_playbookId_idx" ON "Screenshot"("opportunityId", "tradeId", "playbookId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_opportunityId_key" ON "Review"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_tradeId_key" ON "Review"("tradeId");

-- CreateIndex
CREATE INDEX "SOPDocument_userId_active_idx" ON "SOPDocument"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "SOPVersion_sopId_version_key" ON "SOPVersion"("sopId", "version");

-- CreateIndex
CREATE INDEX "PlaybookSetup_userId_active_idx" ON "PlaybookSetup"("userId", "active");

-- CreateIndex
CREATE INDEX "Report_userId_period_startsAt_idx" ON "Report"("userId", "period", "startsAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContextTag" ADD CONSTRAINT "ContextTag_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleBreak" ADD CONSTRAINT "RuleBreak_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screenshot" ADD CONSTRAINT "Screenshot_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screenshot" ADD CONSTRAINT "Screenshot_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screenshot" ADD CONSTRAINT "Screenshot_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "PlaybookSetup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SOPDocument" ADD CONSTRAINT "SOPDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SOPVersion" ADD CONSTRAINT "SOPVersion_sopId_fkey" FOREIGN KEY ("sopId") REFERENCES "SOPDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookSetup" ADD CONSTRAINT "PlaybookSetup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
