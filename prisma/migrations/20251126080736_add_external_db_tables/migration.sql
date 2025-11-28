BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Employee] (
    [id] INT NOT NULL IDENTITY(1,1),
    [EmpCode] NVARCHAR(10) NOT NULL,
    [EmpName] NVARCHAR(50) NOT NULL,
    [EmpNameFull] NVARCHAR(63) NOT NULL,
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [SLGroup] NVARCHAR(10) NOT NULL,
    [ServLineCode] NVARCHAR(10) NOT NULL,
    [ServLineDesc] NVARCHAR(150) NOT NULL,
    [SubServLineCode] NVARCHAR(10) NOT NULL,
    [SubServLineDesc] NVARCHAR(50) NOT NULL,
    [EmpCatCode] NVARCHAR(5) NOT NULL,
    [EmpCatDesc] NVARCHAR(50) NOT NULL,
    [EmpCatType] NVARCHAR(1),
    [RateValue] MONEY NOT NULL,
    [EmpDateLeft] DATETIME2,
    [Active] VARCHAR(3) NOT NULL,
    [EmpDateStarted] DATETIME2,
    [Team] NVARCHAR(100),
    [ExternalEmpID] UNIQUEIDENTIFIER NOT NULL,
    [WinLogon] NVARCHAR(100),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Employee_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Employee_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Employee_EmpCode_key] UNIQUE NONCLUSTERED ([EmpCode])
);

-- CreateTable
CREATE TABLE [dbo].[ServiceLine] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ServLineCode] NVARCHAR(10),
    [ServLineDesc] NVARCHAR(150),
    [GLPrefix] NVARCHAR(10),
    [SLGroup] NVARCHAR(10),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ServiceLine_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ServiceLine_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Task] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ExternalTaskID] UNIQUEIDENTIFIER NOT NULL,
    [ClientCode] NVARCHAR(10) NOT NULL,
    [TaskCode] NVARCHAR(10) NOT NULL,
    [TaskDesc] NVARCHAR(150) NOT NULL,
    [TaskPartner] NVARCHAR(10) NOT NULL,
    [TaskPartnerName] NVARCHAR(50) NOT NULL,
    [TaskManager] NVARCHAR(10) NOT NULL,
    [TaskManagerName] NVARCHAR(50) NOT NULL,
    [OfficeCode] NVARCHAR(10) NOT NULL,
    [SLGroup] NVARCHAR(10) NOT NULL,
    [ServLineCode] NVARCHAR(10) NOT NULL,
    [ServLineDesc] NVARCHAR(150) NOT NULL,
    [Active] VARCHAR(3) NOT NULL,
    [TaskDateOpen] DATETIME2 NOT NULL,
    [TaskDateTerminate] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Task_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Task_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Task_ClientCode_TaskCode_key] UNIQUE NONCLUSTERED ([ClientCode],[TaskCode])
);

-- CreateTable
CREATE TABLE [dbo].[WipLTD] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [ExternalTaskID] UNIQUEIDENTIFIER NOT NULL,
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
    [BalTime] MONEY,
    [BalDisb] MONEY,
    [BalWIP] MONEY,
    [WipProvision] MONEY,
    [LTDPendingTime] MONEY,
    [LTDCostExcludeCP] MONEY,
    [LTDHours] MONEY,
    [EstFeeTime] MONEY,
    [EstFeeDisb] MONEY,
    [EstChgTime] MONEY,
    [EstChgDisb] MONEY,
    [EstChgHours] MONEY,
    [EstAdjTime] MONEY,
    [EstAdjDisb] MONEY,
    [BudStartDate] DATETIME2,
    [BudDueDate] DATETIME2,
    [BudApproveDate] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WipLTD_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [WipLTD_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_EmpCode_idx] ON [dbo].[Employee]([EmpCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_Active_idx] ON [dbo].[Employee]([Active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_ServLineCode_idx] ON [dbo].[Employee]([ServLineCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_WinLogon_idx] ON [dbo].[Employee]([WinLogon]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_OfficeCode_idx] ON [dbo].[Employee]([OfficeCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Employee_SLGroup_idx] ON [dbo].[Employee]([SLGroup]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLine_ServLineCode_idx] ON [dbo].[ServiceLine]([ServLineCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ServiceLine_SLGroup_idx] ON [dbo].[ServiceLine]([SLGroup]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_ClientCode_idx] ON [dbo].[Task]([ClientCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_TaskCode_idx] ON [dbo].[Task]([TaskCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_TaskPartner_idx] ON [dbo].[Task]([TaskPartner]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_TaskManager_idx] ON [dbo].[Task]([TaskManager]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_Active_idx] ON [dbo].[Task]([Active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_ServLineCode_idx] ON [dbo].[Task]([ServLineCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_OfficeCode_idx] ON [dbo].[Task]([OfficeCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Task_SLGroup_idx] ON [dbo].[Task]([SLGroup]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WipLTD_taskId_idx] ON [dbo].[WipLTD]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WipLTD_ClientCode_idx] ON [dbo].[WipLTD]([ClientCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WipLTD_TaskCode_idx] ON [dbo].[WipLTD]([TaskCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WipLTD_TaskPartner_idx] ON [dbo].[WipLTD]([TaskPartner]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WipLTD_ServLineCode_idx] ON [dbo].[WipLTD]([ServLineCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WipLTD_OfficeCode_idx] ON [dbo].[WipLTD]([OfficeCode]);

-- AddForeignKey
ALTER TABLE [dbo].[Task] ADD CONSTRAINT [Task_ClientCode_fkey] FOREIGN KEY ([ClientCode]) REFERENCES [dbo].[Client]([clientCode]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WipLTD] ADD CONSTRAINT [WipLTD_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

