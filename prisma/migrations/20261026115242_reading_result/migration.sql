/*
  Warnings:

  - You are about to drop the column `recipeIds` on the `AiUsage` table. All the data in the column will be lost.

*/
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
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AiUsage" ("completionTokens", "costUsd", "createdAt", "durationMs", "id", "ip", "isGuest", "kind", "model", "promptTokens", "purpose", "userId") SELECT "completionTokens", "costUsd", "createdAt", "durationMs", "id", "ip", "isGuest", "kind", "model", "promptTokens", "purpose", "userId" FROM "AiUsage";
DROP TABLE "AiUsage";
ALTER TABLE "new_AiUsage" RENAME TO "AiUsage";
CREATE INDEX "AiUsage_kind_createdAt_idx" ON "AiUsage"("kind", "createdAt");
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");
CREATE INDEX "AiUsage_ip_createdAt_idx" ON "AiUsage"("ip", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
