/*
  Warnings:

  - The primary key for the `ai_provider` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `ai_provider` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- CreateTable
CREATE TABLE "chat_session" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "aiProviderId" BIGINT NOT NULL,
    "ragLibraryId" BIGINT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "message" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "sessionId" BIGINT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT,
    "totalTokens" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentType" TEXT DEFAULT 'text',
    "toolType" TEXT,
    "toolStatus" TEXT,
    "toolQuery" TEXT,
    "toolItemId" TEXT,
    "toolOutputIndex" INTEGER
);

-- CreateTable
CREATE TABLE "attachment" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "messageId" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "config" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ai_provider" (
    "id" BIGINT NOT NULL PRIMARY KEY,
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
INSERT INTO "new_ai_provider" ("apiKey", "baseURL", "createdAt", "id", "isDefault", "maxTokens", "model", "name", "organization", "provider", "temperature", "updatedAt") SELECT "apiKey", "baseURL", "createdAt", "id", "isDefault", "maxTokens", "model", "name", "organization", "provider", "temperature", "updatedAt" FROM "ai_provider";
DROP TABLE "ai_provider";
ALTER TABLE "new_ai_provider" RENAME TO "ai_provider";
CREATE INDEX "ai_provider_provider_idx" ON "ai_provider"("provider");
CREATE INDEX "ai_provider_isDefault_idx" ON "ai_provider"("isDefault");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "chat_session_aiProviderId_idx" ON "chat_session"("aiProviderId");

-- CreateIndex
CREATE INDEX "chat_session_ragLibraryId_idx" ON "chat_session"("ragLibraryId");

-- CreateIndex
CREATE INDEX "chat_session_createdAt_idx" ON "chat_session"("createdAt");

-- CreateIndex
CREATE INDEX "chat_session_updatedAt_idx" ON "chat_session"("updatedAt");

-- CreateIndex
CREATE INDEX "message_sessionId_idx" ON "message"("sessionId");

-- CreateIndex
CREATE INDEX "message_createdAt_idx" ON "message"("createdAt");

-- CreateIndex
CREATE INDEX "message_contentType_idx" ON "message"("contentType");

-- CreateIndex
CREATE INDEX "message_toolItemId_idx" ON "message"("toolItemId");

-- CreateIndex
CREATE INDEX "attachment_messageId_idx" ON "attachment"("messageId");
