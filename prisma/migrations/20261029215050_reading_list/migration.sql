/*
  Warnings:

  - You are about to drop the `PushSubscription` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "PushSubscription_userId_idx";

-- DropIndex
DROP INDEX "PushSubscription_endpoint_key";

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "readingId" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PushSubscription";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AiUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "userId" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "model" TEXT,
    "purpose" TEXT,
    "durationMs" INTEGER,
    "readResult" TEXT,
    "photoPaths" TEXT,
    "readTitles" TEXT,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AiUsage" ("completionTokens", "costUsd", "createdAt", "durationMs", "id", "ip", "isGuest", "kind", "model", "photoPaths", "promptTokens", "purpose", "readResult", "userId") SELECT "completionTokens", "costUsd", "createdAt", "durationMs", "id", "ip", "isGuest", "kind", "model", "photoPaths", "promptTokens", "purpose", "readResult", "userId" FROM "AiUsage";
DROP TABLE "AiUsage";
ALTER TABLE "new_AiUsage" RENAME TO "AiUsage";
CREATE INDEX "AiUsage_kind_createdAt_idx" ON "AiUsage"("kind", "createdAt");
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");
CREATE INDEX "AiUsage_ip_createdAt_idx" ON "AiUsage"("ip", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Recipe_userId_readingId_idx" ON "Recipe"("userId", "readingId");
