-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MappedAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "subsection" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "priorYearBalance" REAL NOT NULL DEFAULT 0,
    "sarsItem" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" INTEGER NOT NULL,
    CONSTRAINT "MappedAccount_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MappedAccount" ("accountCode", "accountName", "balance", "createdAt", "id", "projectId", "sarsItem", "section", "subsection", "updatedAt") SELECT "accountCode", "accountName", "balance", "createdAt", "id", "projectId", "sarsItem", "section", "subsection", "updatedAt" FROM "MappedAccount";
DROP TABLE "MappedAccount";
ALTER TABLE "new_MappedAccount" RENAME TO "MappedAccount";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
