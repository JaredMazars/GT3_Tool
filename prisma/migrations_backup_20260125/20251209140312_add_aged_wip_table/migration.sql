BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[AgedWip] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSAgedWipID] UNIQUEIDENTIFIER NOT NULL,
    [GSClientID] UNIQUEIDENTIFIER,
    [GSTaskID] UNIQUEIDENTIFIER,
    [PeriodRef] INT,
    [PeriodStart] DATETIME2,
    [PeriodEnd] DATETIME2,
    [ClientCode] NVARCHAR(10),
    [TaskCode] NVARCHAR(10),
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [ServLineCode] NVARCHAR(10) NOT NULL,
    [TaskPartner] NVARCHAR(10) NOT NULL,
    [Curr] MONEY,
    [Bal30] MONEY,
    [Bal60] MONEY,
    [Bal90] MONEY,
    [Bal120] MONEY,
    [Bal150] MONEY,
    [Bal180] MONEY,
    [BalWip] MONEY,
    [Provision] MONEY,
    [NettWip] MONEY,
    [PtdFeeAmt] MONEY,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AgedWip_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AgedWip_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AgedWip_GSAgedWipID_key] UNIQUE NONCLUSTERED ([GSAgedWipID])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AgedWip_GSClientID_idx] ON [dbo].[AgedWip]([GSClientID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AgedWip_GSTaskID_idx] ON [dbo].[AgedWip]([GSTaskID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AgedWip_PeriodRef_idx] ON [dbo].[AgedWip]([PeriodRef]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AgedWip_OfficeCode_idx] ON [dbo].[AgedWip]([OfficeCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AgedWip_ServLineCode_idx] ON [dbo].[AgedWip]([ServLineCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AgedWip_TaskPartner_idx] ON [dbo].[AgedWip]([TaskPartner]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AgedWip_GSClientID_PeriodRef_idx] ON [dbo].[AgedWip]([GSClientID], [PeriodRef]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AgedWip_GSTaskID_PeriodRef_idx] ON [dbo].[AgedWip]([GSTaskID], [PeriodRef]);

-- AddForeignKey
ALTER TABLE [dbo].[AgedWip] ADD CONSTRAINT [AgedWip_GSClientID_fkey] FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AgedWip] ADD CONSTRAINT [AgedWip_GSTaskID_fkey] FOREIGN KEY ([GSTaskID]) REFERENCES [dbo].[Task]([GSTaskID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
