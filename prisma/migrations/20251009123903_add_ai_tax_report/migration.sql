-- CreateTable
CREATE TABLE "AITaxReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "executiveSummary" TEXT NOT NULL,
    "risks" TEXT NOT NULL,
    "taxSensitiveItems" TEXT NOT NULL,
    "detailedFindings" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AITaxReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AITaxReport_projectId_idx" ON "AITaxReport"("projectId");
