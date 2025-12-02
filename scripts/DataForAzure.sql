

/****** Object:  Table [dbo].[Employee]    Script Date: 26/11/2025 07:20:40 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Employee](
	[EmpCode] [nvarchar](10) NOT NULL,
	[EmpName] [nvarchar](50) NOT NULL,
	[EmpNameFull] [nvarchar](63) NOT NULL,
	[OfficeCode] [nvarchar](10) NOT NULL,
	[SLGroup] [nvarchar](10) NOT NULL,
	[ServLineCode] [nvarchar](10) NOT NULL,
	[ServLineDesc] [nvarchar](150) NOT NULL,
	[SubServLineCode] [nvarchar](10) NOT NULL,
	[SubServLineDesc] [nvarchar](50) NOT NULL,
	[EmpCatCode] [nvarchar](5) NOT NULL,
	[EmpCatDesc] [nvarchar](50) NOT NULL,
	[EmpCatType] [nvarchar](1) NULL,
	[RateValue] [money] NOT NULL,
	[EmpDateLeft] [datetime] NULL,
	[Active] [varchar](3) NOT NULL,
	[EmpDateStarted] [datetime] NULL,
	[Team] [nvarchar](100) NULL,
	[EmpID] [uniqueidentifier] NOT NULL,
	[WinLogon] [nvarchar](100) NULL
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[ServiceLine]    Script Date: 26/11/2025 07:20:40 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[ServiceLine](
	[ServLineCode] [nvarchar](10) NULL,
	[ServLineDesc] [nvarchar](150) NULL,
	[GLPrefix] [nvarchar](10) NULL,
	[SLGroup] [nvarchar](10) NULL
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[Task]    Script Date: 26/11/2025 07:20:40 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Task](
	[TaskID] [uniqueidentifier] NOT NULL,
	[ClientCode] [nvarchar](10) NOT NULL,
	[TaskCode] [nvarchar](10) NOT NULL,
	[TaskDesc] [nvarchar](150) NOT NULL,
	[TaskPartner] [nvarchar](10) NOT NULL,
	[TaskPartnerName] [nvarchar](50) NOT NULL,
	[TaskManager] [nvarchar](10) NOT NULL,
	[TaskManagerName] [nvarchar](50) NOT NULL,
	[OfficeCode] [nvarchar](10) NOT NULL,
	[SLGroup] [nvarchar](10) NOT NULL,
	[ServLineCode] [nvarchar](10) NOT NULL,
	[ServLineDesc] [nvarchar](150) NOT NULL,
	[Active] [varchar](3) NOT NULL,
	[TaskDateOpen] [datetime] NOT NULL,
	[TaskDateTerminate] [datetime] NULL
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[Wip_LTD]    Script Date: 26/11/2025 07:20:40 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Wip_LTD](
	[TaskID] [uniqueidentifier] NOT NULL,
	[ClientCode] [nvarchar](10) NOT NULL,
	[TaskCode] [nvarchar](10) NOT NULL,
	[OfficeCode] [nvarchar](10) NOT NULL,
	[ServLineCode] [nvarchar](10) NOT NULL,
	[TaskPartner] [nvarchar](10) NOT NULL,
	[LTDTime] [money] NULL,
	[LTDDisb] [money] NULL,
	[LTDFeeTime] [money] NULL,
	[LTDFeeDisb] [money] NULL,
	[LTDAdjTime] [money] NULL,
	[LTDAdjDisb] [money] NULL,
	[LTDCost] [money] NULL,
	[BalTime] [money] NULL,
	[BalDisb] [money] NULL,
	[BalWIP] [money] NULL,
	[WipProvision] [money] NULL,
	[LTDPendingTime] [money] NULL,
	[LTDCostExcludeCP] [money] NULL,
	[LTDHours] [money] NULL,
	[EstFeeTime] [money] NULL,
	[EstFeeDisb] [money] NULL,
	[EstChgTime] [money] NULL,
	[EstChgDisb] [money] NULL,
	[EstChgHours] [money] NULL,
	[EstAdjTime] [money] NULL,
	[EstAdjDisb] [money] NULL,
	[BudStartDate] [datetime] NULL,
	[BudDueDate] [datetime] NULL,
	[BudApproveDate] [datetime] NULL
) ON [PRIMARY]
GO


