BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[WIPTransactions] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSWIPTransID] UNIQUEIDENTIFIER NOT NULL,
    [GSTaskID] UNIQUEIDENTIFIER NOT NULL,
    [GSClientID] UNIQUEIDENTIFIER,
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [OfficeDesc] NVARCHAR(100) NOT NULL,
    [TranDate] DATETIME2 NOT NULL,
    [TranType] VARCHAR(23) NOT NULL,
    [TType] VARCHAR(3) NOT NULL,
    [Ref] NVARCHAR(20),
    [ClientCode] NVARCHAR(10) NOT NULL,
    [ClientName] NVARCHAR(259),
    [TaskCode] NVARCHAR(10) NOT NULL,
    [TaskDesc] NVARCHAR(150) NOT NULL,
    [TaskPartner] NVARCHAR(10) NOT NULL,
    [PartnerName] NVARCHAR(50) NOT NULL,
    [TaskManager] NVARCHAR(10) NOT NULL,
    [ManagerName] NVARCHAR(50) NOT NULL,
    [TaskServLine] NVARCHAR(10) NOT NULL,
    [TaskServLineDesc] NVARCHAR(150) NOT NULL,
    [EmpCode] NVARCHAR(10),
    [EmpName] NVARCHAR(50),
    [EmpOffice] NVARCHAR(10),
    [EmpServLineCode] NVARCHAR(10),
    [EmpServLineDesc] NVARCHAR(150),
    [TranSubServLine] NVARCHAR(10),
    [TranSubServLineDesc] NVARCHAR(50),
    [ADOType] NVARCHAR(10),
    [ADODesc] NVARCHAR(100),
    [Hour] MONEY NOT NULL,
    [Rate] NVARCHAR(2),
    [Amount] MONEY,
    [Cost] MONEY NOT NULL,
    [Narr] TEXT,
    [TaskDateTerminate] DATETIME2,
    [Ordinal] INT NOT NULL,
    [GroupCode] NVARCHAR(10),
    [GroupDesc] NVARCHAR(150),
    [MainServLineCode] NVARCHAR(10) NOT NULL,
    [MainServLineDesc] NVARCHAR(150) NOT NULL,
    [ServLineGroup] NVARCHAR(10) NOT NULL,
    [EmpMainServLineCode] NVARCHAR(10),
    [EmpMainServLineDesc] NVARCHAR(150),
    [EmpServLineGroup] NVARCHAR(10),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WIPTransactions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [WIPTransactions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WIPTransactions_GSWIPTransID_key] UNIQUE NONCLUSTERED ([GSWIPTransID])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPTransactions_GSClientID_idx] ON [dbo].[WIPTransactions]([GSClientID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPTransactions_GSTaskID_idx] ON [dbo].[WIPTransactions]([GSTaskID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPTransactions_TranDate_idx] ON [dbo].[WIPTransactions]([TranDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPTransactions_OfficeCode_idx] ON [dbo].[WIPTransactions]([OfficeCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPTransactions_ServLineGroup_idx] ON [dbo].[WIPTransactions]([ServLineGroup]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPTransactions_EmpCode_idx] ON [dbo].[WIPTransactions]([EmpCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WIPTransactions_GSTaskID_TranDate_idx] ON [dbo].[WIPTransactions]([GSTaskID], [TranDate]);

-- AddForeignKey
ALTER TABLE [dbo].[WIPTransactions] ADD CONSTRAINT [WIPTransactions_GSClientID_fkey] FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WIPTransactions] ADD CONSTRAINT [WIPTransactions_GSTaskID_fkey] FOREIGN KEY ([GSTaskID]) REFERENCES [dbo].[Task]([GSTaskID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
