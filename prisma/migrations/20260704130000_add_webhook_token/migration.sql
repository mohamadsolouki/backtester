-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "webhookToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_webhookToken_key" ON "UserSettings"("webhookToken");
