BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[DrsTransactions] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSDebtorsTranID] UNIQUEIDENTIFIER NOT NULL,
    [GSClientID] UNIQUEIDENTIFIER NOT NULL,
    [ClientCode] NVARCHAR(10) NOT NULL,
    [ClientNameFull] NVARCHAR(222),
    [GroupCode] NVARCHAR(10) NOT NULL,
    [GroupDesc] NVARCHAR(150) NOT NULL,
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [OfficeDesc] NVARCHAR(100) NOT NULL,
    [ServLineCode] NVARCHAR(10) NOT NULL,
    [ServLineDesc] NVARCHAR(150) NOT NULL,
    [Biller] NVARCHAR(10) NOT NULL,
    [BillerName] NVARCHAR(50) NOT NULL,
    [TranDate] DATETIME2 NOT NULL,
    [EntryType] VARCHAR(19),
    [Ordinal] INT,
    [Reference] NVARCHAR(20),
    [InvNumber] NVARCHAR(20),
    [Amount] MONEY,
    [Vat] MONEY,
    [Total] MONEY,
    [Batch] NVARCHAR(10),
    [Allocation] NVARCHAR(20) NOT NULL,
    [Narration] TEXT,
    [VatCode] NVARCHAR(2),
    [PeriodKey] INT NOT NULL,
    [EntryGroupCode] NVARCHAR(10),
    [EntryGroup] NVARCHAR(50),
    [DRAccount] NVARCHAR(30),
    [CRAccount] NVARCHAR(30),
    [ClientPartner] NVARCHAR(10) NOT NULL,
    [ClientPartnerName] NVARCHAR(50) NOT NULL,
    [ClientManager] NVARCHAR(10) NOT NULL,
    [ClientManagerName] NVARCHAR(50) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DrsTransactions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [DrsTransactions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [DrsTransactions_GSDebtorsTranID_key] UNIQUE NONCLUSTERED ([GSDebtorsTranID])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DrsTransactions_GSClientID_idx] ON [dbo].[DrsTransactions]([GSClientID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DrsTransactions_TranDate_idx] ON [dbo].[DrsTransactions]([TranDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DrsTransactions_Biller_idx] ON [dbo].[DrsTransactions]([Biller]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DrsTransactions_OfficeCode_idx] ON [dbo].[DrsTransactions]([OfficeCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DrsTransactions_ServLineCode_idx] ON [dbo].[DrsTransactions]([ServLineCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DrsTransactions_PeriodKey_idx] ON [dbo].[DrsTransactions]([PeriodKey]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DrsTransactions_GSClientID_TranDate_idx] ON [dbo].[DrsTransactions]([GSClientID], [TranDate]);

-- AddForeignKey
ALTER TABLE [dbo].[DrsTransactions] ADD CONSTRAINT [DrsTransactions_GSClientID_fkey] FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
