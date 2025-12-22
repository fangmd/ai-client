-- AlterTable: Change ai_provider.id from TEXT to BIGINT
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Step 1: Create new table with BigInt id
CREATE TABLE "ai_provider_new" (
    "id" INTEGER NOT NULL PRIMARY KEY,
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

-- Step 2: Drop old table
DROP TABLE "ai_provider";

-- Step 3: Rename new table
ALTER TABLE "ai_provider_new" RENAME TO "ai_provider";

-- Step 4: Recreate indexes
CREATE INDEX "ai_provider_provider_idx" ON "ai_provider"("provider");
CREATE INDEX "ai_provider_isDefault_idx" ON "ai_provider"("isDefault");
