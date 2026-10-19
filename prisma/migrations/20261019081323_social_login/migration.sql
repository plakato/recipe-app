-- CreateTable
CREATE TABLE "SocialLogin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialLogin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SocialLogin_userId_idx" ON "SocialLogin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialLogin_provider_providerAccountId_key" ON "SocialLogin"("provider", "providerAccountId");
