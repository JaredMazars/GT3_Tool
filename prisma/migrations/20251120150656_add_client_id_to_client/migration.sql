-- Add ClientID field to Client table
ALTER TABLE [Client]
ADD [ClientID] [uniqueidentifier] NOT NULL DEFAULT NEWID();

-- Create unique index on ClientID
CREATE UNIQUE INDEX [Client_ClientID_key] ON [Client]([ClientID]);




