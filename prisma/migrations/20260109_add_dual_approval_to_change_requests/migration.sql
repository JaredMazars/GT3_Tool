-- Add dual approval fields to ClientPartnerManagerChangeRequest table

-- Add requiresDualApproval field
ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest]
ADD [requiresDualApproval] BIT NOT NULL CONSTRAINT [DF_ClientPartnerManagerChangeRequest_requiresDualApproval] DEFAULT 0;

-- Add current employee approval fields
ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest]
ADD [currentEmployeeApprovedAt] DATETIME2,
    [currentEmployeeApprovedById] NVARCHAR(1000);

-- Add proposed employee approval fields
ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest]
ADD [proposedEmployeeApprovedAt] DATETIME2,
    [proposedEmployeeApprovedById] NVARCHAR(1000);

-- Add foreign key constraints for approval user IDs
ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest]
ADD CONSTRAINT [FK_ClientPartnerManagerChangeRequest_CurrentApprover]
    FOREIGN KEY ([currentEmployeeApprovedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[ClientPartnerManagerChangeRequest]
ADD CONSTRAINT [FK_ClientPartnerManagerChangeRequest_ProposedApprover]
    FOREIGN KEY ([proposedEmployeeApprovedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Add indexes for the new approval fields
CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_requiresDualApproval_idx]
ON [dbo].[ClientPartnerManagerChangeRequest]([requiresDualApproval]);

CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_currentEmployeeApprovedById_idx]
ON [dbo].[ClientPartnerManagerChangeRequest]([currentEmployeeApprovedById]);

CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_proposedEmployeeApprovedById_idx]
ON [dbo].[ClientPartnerManagerChangeRequest]([proposedEmployeeApprovedById]);
