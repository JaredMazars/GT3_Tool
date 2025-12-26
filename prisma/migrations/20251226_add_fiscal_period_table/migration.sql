-- CreateTable
CREATE TABLE [dbo].[FiscalPeriod] (
    [id] INT NOT NULL IDENTITY(1,1),
    [periodKey] INT NOT NULL,
    [fiscalYear] INT NOT NULL,
    [fiscalQuarter] INT NOT NULL,
    [fiscalMonth] INT NOT NULL,
    [calendarMonth] INT NOT NULL,
    [calendarYear] INT NOT NULL,
    [startDate] DATETIME2 NOT NULL,
    [endDate] DATETIME2 NOT NULL,
    [periodName] NVARCHAR(50) NOT NULL,
    [quarterName] NVARCHAR(50) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_FiscalPeriod_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_FiscalPeriod] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ_FiscalPeriod_periodKey] UNIQUE ([periodKey])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_fiscalYear] ON [dbo].[FiscalPeriod]([fiscalYear]);

CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_fiscalQuarter] ON [dbo].[FiscalPeriod]([fiscalQuarter]);

CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_fiscalYear_fiscalQuarter] ON [dbo].[FiscalPeriod]([fiscalYear], [fiscalQuarter]);

CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_fiscalYear_fiscalMonth] ON [dbo].[FiscalPeriod]([fiscalYear], [fiscalMonth]);

CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_startDate_endDate] ON [dbo].[FiscalPeriod]([startDate], [endDate]);

CREATE NONCLUSTERED INDEX [IX_FiscalPeriod_calendarYear_calendarMonth] ON [dbo].[FiscalPeriod]([calendarYear], [calendarMonth]);


-- Test the functions with sample dates
-- Uncomment to verify functionality:
/*
SELECT 
    '2023-09-01' as TestDate,
    dbo.GetFiscalYear('2023-09-01') as FiscalYear,
    dbo.GetFiscalMonth('2023-09-01') as FiscalMonth,
    dbo.GetFiscalQuarter('2023-09-01') as FiscalQuarter,
    dbo.GetFiscalPeriodKey('2023-09-01') as PeriodKey
UNION ALL
SELECT 
    '2024-01-15',
    dbo.GetFiscalYear('2024-01-15'),
    dbo.GetFiscalMonth('2024-01-15'),
    dbo.GetFiscalQuarter('2024-01-15'),
    dbo.GetFiscalPeriodKey('2024-01-15')
UNION ALL
SELECT 
    '2024-08-31',
    dbo.GetFiscalYear('2024-08-31'),
    dbo.GetFiscalMonth('2024-08-31'),
    dbo.GetFiscalQuarter('2024-08-31'),
    dbo.GetFiscalPeriodKey('2024-08-31');
*/

