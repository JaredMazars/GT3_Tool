-- Migration: Add Task Independence Confirmations
-- Description: Add TaskIndependenceConfirmation table to track team member independence confirmations

-- =====================================================
-- Create TaskIndependenceConfirmation Table
-- =====================================================
CREATE TABLE [dbo].[TaskIndependenceConfirmation] (
  [id] INT NOT NULL IDENTITY(1,1),
  [taskTeamId] INT NOT NULL,
  [confirmed] BIT NOT NULL CONSTRAINT [DF_TaskIndependenceConfirmation_confirmed] DEFAULT 0,
  [confirmedAt] DATETIME2 NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_TaskIndependenceConfirmation_createdAt] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [PK_TaskIndependenceConfirmation] PRIMARY KEY CLUSTERED ([id] ASC),
  CONSTRAINT [UQ_TaskIndependenceConfirmation_taskTeamId] UNIQUE ([taskTeamId])
);

-- =====================================================
-- Create Indexes
-- =====================================================
CREATE NONCLUSTERED INDEX [IX_TaskIndependenceConfirmation_taskTeamId] ON [dbo].[TaskIndependenceConfirmation]([taskTeamId] ASC);
CREATE NONCLUSTERED INDEX [IX_TaskIndependenceConfirmation_confirmed] ON [dbo].[TaskIndependenceConfirmation]([confirmed] ASC);

-- =====================================================
-- Create Foreign Key Constraints
-- =====================================================
ALTER TABLE [dbo].[TaskIndependenceConfirmation]
ADD CONSTRAINT [FK_TaskIndependenceConfirmation_TaskTeam_taskTeamId] FOREIGN KEY ([taskTeamId])
REFERENCES [dbo].[TaskTeam] ([id]) ON UPDATE NO ACTION ON DELETE CASCADE;
