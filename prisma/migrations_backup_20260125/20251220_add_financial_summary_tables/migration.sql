-- CreateTable: Wip (Work In Progress Summary)
CREATE TABLE [dbo].[Wip] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSClientID] UNIQUEIDENTIFIER NOT NULL,
    [GSTaskID] UNIQUEIDENTIFIER NOT NULL,
    [PeriodRef] INT,
    [PeriodStart] DATETIME2,
    [PeriodEnd] DATETIME2,
    [ClientCode] NVARCHAR(10) NOT NULL,
    [TaskCode] NVARCHAR(10) NOT NULL,
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [ServLineCode] NVARCHAR(10) NOT NULL,
    [TaskPartner] NVARCHAR(10) NOT NULL,
    [LTDTime] MONEY,
    [LTDDisb] MONEY,
    [LTDFeeTime] MONEY,
    [LTDFeeDisb] MONEY,
    [LTDAdjTime] MONEY,
    [LTDAdjDisb] MONEY,
    [LTDCost] MONEY,
    [YTDTime] MONEY,
    [YTDDisb] MONEY,
    [YTDFeeTime] MONEY,
    [YTDFeeDisb] MONEY,
    [YTDAdjTime] MONEY,
    [YTDAdjDisb] MONEY,
    [YTDCost] MONEY,
    [PTDTime] MONEY,
    [PTDDisb] MONEY,
    [PTDFeeTime] MONEY,
    [PTDFeeDisb] MONEY,
    [PTDAdjTime] MONEY,
    [PTDAdjDisb] MONEY,
    [PTDCost] MONEY,
    [BalTime] MONEY,
    [BalDisb] MONEY,
    [BalWIP] MONEY,
    [WipProvision] MONEY,
    [PTDProvision] MONEY,
    [YTDProvision] MONEY,
    [PTDPendingTime] MONEY,
    [YTDPendingTime] MONEY,
    [LTDPendingTime] MONEY,
    [PTDCostExcludeCP] MONEY,
    [YTDCostExcludeCP] MONEY,
    [LTDCostExcludeCP] MONEY,
    [LTDHours] MONEY,
    [YTDHours] MONEY,
    [PTDHours] MONEY,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_Wip_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_Wip] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: Debtors (Debtor Aging Summary)
CREATE TABLE [dbo].[Debtors] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSClientID] UNIQUEIDENTIFIER NOT NULL,
    [PeriodRef] INT,
    [PeriodStart] DATETIME2,
    [PeriodEnd] DATETIME2,
    [ClientCode] NVARCHAR(10) NOT NULL,
    [Biller] NVARCHAR(10) NOT NULL,
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [ServLineCode] NVARCHAR(10) NOT NULL,
    [LTDInv] MONEY,
    [LTDFee] MONEY,
    [LTDVat] MONEY,
    [LTDCn] MONEY,
    [LTDRec] MONEY,
    [LTDInt] MONEY,
    [LTDPLFC] MONEY,
    [YTDInv] MONEY,
    [YTDFee] MONEY,
    [YTDVat] MONEY,
    [YTDCn] MONEY,
    [YTDRec] MONEY,
    [YTDInt] MONEY,
    [YTDPLFC] MONEY,
    [PTDInv] MONEY,
    [PTDFee] MONEY,
    [PTDVat] MONEY,
    [PTDCn] MONEY,
    [PTDRec] MONEY,
    [PTDInt] MONEY,
    [PTDPLFC] MONEY,
    [CBal] MONEY,
    [BalCurr] MONEY,
    [Bal30] MONEY,
    [Bal60] MONEY,
    [Bal90] MONEY,
    [Bal120] MONEY,
    [Bal150] MONEY,
    [Bal180] MONEY,
    [DebtorProvision] MONEY,
    [PTDDebtorProvision] MONEY,
    [YTDDebtorProvision] MONEY,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_Debtors_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_Debtors] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable: WIPAging (WIP Aging Summary)
CREATE TABLE [dbo].[WIPAging] (
    [id] INT NOT NULL IDENTITY(1,1),
    [GSClientID] UNIQUEIDENTIFIER NOT NULL,
    [GSTaskID] UNIQUEIDENTIFIER NOT NULL,
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
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_WIPAging_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_WIPAging] PRIMARY KEY CLUSTERED ([id])
);

-- Add Foreign Key Constraints
ALTER TABLE [dbo].[Wip] ADD CONSTRAINT [FK_Wip_Client] FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Wip] ADD CONSTRAINT [FK_Wip_Task] FOREIGN KEY ([GSTaskID]) REFERENCES [dbo].[Task]([GSTaskID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[Debtors] ADD CONSTRAINT [FK_Debtors_Client] FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[WIPAging] ADD CONSTRAINT [FK_WIPAging_Client] FOREIGN KEY ([GSClientID]) REFERENCES [dbo].[Client]([GSClientID]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[WIPAging] ADD CONSTRAINT [FK_WIPAging_Task] FOREIGN KEY ([GSTaskID]) REFERENCES [dbo].[Task]([GSTaskID]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Create Indexes for Wip table
CREATE NONCLUSTERED INDEX [Wip_GSClientID_idx] ON [dbo].[Wip]([GSClientID]);
CREATE NONCLUSTERED INDEX [Wip_GSTaskID_idx] ON [dbo].[Wip]([GSTaskID]);
CREATE NONCLUSTERED INDEX [Wip_PeriodRef_idx] ON [dbo].[Wip]([PeriodRef]);
CREATE NONCLUSTERED INDEX [Wip_OfficeCode_idx] ON [dbo].[Wip]([OfficeCode]);
CREATE NONCLUSTERED INDEX [Wip_ServLineCode_idx] ON [dbo].[Wip]([ServLineCode]);
CREATE NONCLUSTERED INDEX [Wip_TaskPartner_idx] ON [dbo].[Wip]([TaskPartner]);
CREATE NONCLUSTERED INDEX [Wip_GSClientID_PeriodRef_idx] ON [dbo].[Wip]([GSClientID], [PeriodRef]);
CREATE NONCLUSTERED INDEX [Wip_GSTaskID_PeriodRef_idx] ON [dbo].[Wip]([GSTaskID], [PeriodRef]);

-- Create Indexes for Debtors table
CREATE NONCLUSTERED INDEX [Debtors_GSClientID_idx] ON [dbo].[Debtors]([GSClientID]);
CREATE NONCLUSTERED INDEX [Debtors_PeriodRef_idx] ON [dbo].[Debtors]([PeriodRef]);
CREATE NONCLUSTERED INDEX [Debtors_Biller_idx] ON [dbo].[Debtors]([Biller]);
CREATE NONCLUSTERED INDEX [Debtors_OfficeCode_idx] ON [dbo].[Debtors]([OfficeCode]);
CREATE NONCLUSTERED INDEX [Debtors_ServLineCode_idx] ON [dbo].[Debtors]([ServLineCode]);
CREATE NONCLUSTERED INDEX [Debtors_GSClientID_PeriodRef_idx] ON [dbo].[Debtors]([GSClientID], [PeriodRef]);

-- Create Indexes for WIPAging table
CREATE NONCLUSTERED INDEX [WIPAging_GSClientID_idx] ON [dbo].[WIPAging]([GSClientID]);
CREATE NONCLUSTERED INDEX [WIPAging_GSTaskID_idx] ON [dbo].[WIPAging]([GSTaskID]);
CREATE NONCLUSTERED INDEX [WIPAging_PeriodRef_idx] ON [dbo].[WIPAging]([PeriodRef]);
CREATE NONCLUSTERED INDEX [WIPAging_OfficeCode_idx] ON [dbo].[WIPAging]([OfficeCode]);
CREATE NONCLUSTERED INDEX [WIPAging_ServLineCode_idx] ON [dbo].[WIPAging]([ServLineCode]);
CREATE NONCLUSTERED INDEX [WIPAging_TaskPartner_idx] ON [dbo].[WIPAging]([TaskPartner]);
CREATE NONCLUSTERED INDEX [WIPAging_GSClientID_PeriodRef_idx] ON [dbo].[WIPAging]([GSClientID], [PeriodRef]);
CREATE NONCLUSTERED INDEX [WIPAging_GSTaskID_PeriodRef_idx] ON [dbo].[WIPAging]([GSTaskID], [PeriodRef]);


















