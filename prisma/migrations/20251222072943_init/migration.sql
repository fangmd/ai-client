-- CreateTable
CREATE TABLE "ai_provider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "baseURL" TEXT,
    "model" TEXT NOT NULL,
    "temperature" REAL,
    "maxTokens" INTEGER,
    "organization" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ai_provider_provider_idx" ON "ai_provider"("provider");

-- CreateIndex
CREATE INDEX "ai_provider_isDefault_idx" ON "ai_provider"("isDefault");
