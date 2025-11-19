-- Add section generation tracking fields to OpinionChatMessage
ALTER TABLE [dbo].[OpinionChatMessage] ADD [sectionGenerationId] NVARCHAR(255) NULL;
ALTER TABLE [dbo].[OpinionChatMessage] ADD [sectionType] NVARCHAR(255) NULL;

-- Create index for sectionGenerationId
CREATE INDEX [OpinionChatMessage_sectionGenerationId_idx] ON [dbo].[OpinionChatMessage]([sectionGenerationId]);



















