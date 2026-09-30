-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT,
    "model" TEXT,
    "costUsd" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AiUsage_kind_createdAt_idx" ON "AiUsage"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_ip_createdAt_idx" ON "AiUsage"("ip", "createdAt");
