-- CreateTable
CREATE TABLE "AdjustmentDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "taxAdjustmentId" INTEGER,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "extractionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "extractedData" TEXT,
    "extractionError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdjustmentDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AdjustmentDocument_taxAdjustmentId_fkey" FOREIGN KEY ("taxAdjustmentId") REFERENCES "TaxAdjustment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TaxAdjustment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
    "sourceDocuments" TEXT,
    "extractedData" TEXT,
    "calculationDetails" TEXT,
    "notes" TEXT,
    "sarsSection" TEXT,
    "confidenceScore" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxAdjustment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TaxAdjustment" ("amount", "createdAt", "description", "id", "projectId", "type", "updatedAt") SELECT "amount", "createdAt", "description", "id", "projectId", "type", "updatedAt" FROM "TaxAdjustment";
DROP TABLE "TaxAdjustment";
ALTER TABLE "new_TaxAdjustment" RENAME TO "TaxAdjustment";
CREATE INDEX "TaxAdjustment_projectId_idx" ON "TaxAdjustment"("projectId");
CREATE INDEX "TaxAdjustment_status_idx" ON "TaxAdjustment"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AdjustmentDocument_projectId_idx" ON "AdjustmentDocument"("projectId");

-- CreateIndex
CREATE INDEX "AdjustmentDocument_taxAdjustmentId_idx" ON "AdjustmentDocument"("taxAdjustmentId");

-- CreateIndex
CREATE INDEX "AdjustmentDocument_extractionStatus_idx" ON "AdjustmentDocument"("extractionStatus");
