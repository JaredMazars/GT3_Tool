-- CreateTable
CREATE TABLE [dbo].[ClientPartnerManagerChangeRequest] (
    [id] INT NOT NULL IDENTITY(1,1),
    [clientId] INT NOT NULL,
    [changeType] VARCHAR(20) NOT NULL,
    [currentEmployeeCode] NVARCHAR(10) NOT NULL,
    [currentEmployeeName] NVARCHAR(100),
    [proposedEmployeeCode] NVARCHAR(10) NOT NULL,
    [proposedEmployeeName] NVARCHAR(100),
    [reason] NVARCHAR(500),
    [status] VARCHAR(20) NOT NULL,
    [requestedById] NVARCHAR(1000) NOT NULL,
    [requestedAt] DATETIME2 NOT NULL CONSTRAINT [DF_ClientPartnerManagerChangeRequest_requestedAt] DEFAULT CURRENT_TIMESTAMP,
    [resolvedById] NVARCHAR(1000),
    [resolvedAt] DATETIME2,
    [resolutionComment] NVARCHAR(500),
    CONSTRAINT [PK_ClientPartnerManagerChangeRequest] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_ClientPartnerManagerChangeRequest_Client] FOREIGN KEY ([clientId]) REFERENCES [dbo].[Client]([id]) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT [FK_ClientPartnerManagerChangeRequest_RequestedBy] FOREIGN KEY ([requestedById]) REFERENCES [dbo].[User]([id]) ON UPDATE NO ACTION,
    CONSTRAINT [FK_ClientPartnerManagerChangeRequest_ResolvedBy] FOREIGN KEY ([resolvedById]) REFERENCES [dbo].[User]([id]) ON UPDATE NO ACTION
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_clientId_idx] ON [dbo].[ClientPartnerManagerChangeRequest]([clientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_status_idx] ON [dbo].[ClientPartnerManagerChangeRequest]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_proposedEmployeeCode_status_idx] ON [dbo].[ClientPartnerManagerChangeRequest]([proposedEmployeeCode], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClientPartnerManagerChangeRequest_requestedAt_idx] ON [dbo].[ClientPartnerManagerChangeRequest]([requestedAt] DESC);
