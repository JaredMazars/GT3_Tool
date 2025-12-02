-- CreateTable: ClientAnalyticsDocument
CREATE TABLE [dbo].[ClientAnalyticsDocument] (
    [id] INT NOT NULL IDENTITY(1,1),
    [clientId] INT NOT NULL,
    [documentType] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [filePath] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [ClientAnalyticsDocument_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [extractedData] NVARCHAR(MAX),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClientAnalyticsDocument_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ClientAnalyticsDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: ClientCreditRating
CREATE TABLE [dbo].[ClientCreditRating] (
    [id] INT NOT NULL IDENTITY(1,1),
    [clientId] INT NOT NULL,
    [ratingScore] FLOAT(53) NOT NULL,
    [ratingGrade] NVARCHAR(1000) NOT NULL,
    [ratingDate] DATETIME2 NOT NULL CONSTRAINT [ClientCreditRating_ratingDate_df] DEFAULT CURRENT_TIMESTAMP,
    [analysisReport] NVARCHAR(MAX) NOT NULL,
    [financialRatios] NVARCHAR(MAX) NOT NULL,
    [confidence] FLOAT(53) NOT NULL,
    [analyzedBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClientCreditRating_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ClientCreditRating_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: CreditRatingDocument
CREATE TABLE [dbo].[CreditRatingDocument] (
    [id] INT NOT NULL IDENTITY(1,1),
    [creditRatingId] INT NOT NULL,
    [analyticsDocumentId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CreditRatingDocument_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [CreditRatingDocument_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CreditRatingDocument_creditRatingId_analyticsDocumentId_key] UNIQUE NONCLUSTERED ([creditRatingId], [analyticsDocumentId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientAnalyticsDocument_clientId_idx] ON [dbo].[ClientAnalyticsDocument]([clientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientAnalyticsDocument_documentType_idx] ON [dbo].[ClientAnalyticsDocument]([documentType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientAnalyticsDocument_uploadedAt_idx] ON [dbo].[ClientAnalyticsDocument]([uploadedAt] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientCreditRating_clientId_idx] ON [dbo].[ClientCreditRating]([clientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientCreditRating_ratingGrade_idx] ON [dbo].[ClientCreditRating]([ratingGrade]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientCreditRating_ratingDate_idx] ON [dbo].[ClientCreditRating]([ratingDate] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientCreditRating_clientId_ratingDate_idx] ON [dbo].[ClientCreditRating]([clientId], [ratingDate] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CreditRatingDocument_creditRatingId_idx] ON [dbo].[CreditRatingDocument]([creditRatingId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [CreditRatingDocument_analyticsDocumentId_idx] ON [dbo].[CreditRatingDocument]([analyticsDocumentId]);

-- AddForeignKey
ALTER TABLE [dbo].[ClientAnalyticsDocument] ADD CONSTRAINT [ClientAnalyticsDocument_clientId_fkey] FOREIGN KEY ([clientId]) REFERENCES [dbo].[Client]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ClientCreditRating] ADD CONSTRAINT [ClientCreditRating_clientId_fkey] FOREIGN KEY ([clientId]) REFERENCES [dbo].[Client]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CreditRatingDocument] ADD CONSTRAINT [CreditRatingDocument_creditRatingId_fkey] FOREIGN KEY ([creditRatingId]) REFERENCES [dbo].[ClientCreditRating]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CreditRatingDocument] ADD CONSTRAINT [CreditRatingDocument_analyticsDocumentId_fkey] FOREIGN KEY ([analyticsDocumentId]) REFERENCES [dbo].[ClientAnalyticsDocument]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

