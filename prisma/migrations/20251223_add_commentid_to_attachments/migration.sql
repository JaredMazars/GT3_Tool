-- Add commentId column to ReviewNoteAttachment table
-- This allows attachments to be associated with specific comments on review notes

-- Add the commentId column (nullable since existing attachments belong to notes, not comments)
ALTER TABLE [dbo].[ReviewNoteAttachment]
ADD [commentId] INT NULL;

-- Add foreign key constraint to ReviewNoteComment
ALTER TABLE [dbo].[ReviewNoteAttachment]
ADD CONSTRAINT [FK_ReviewNoteAttachment_Comment]
FOREIGN KEY ([commentId])
REFERENCES [dbo].[ReviewNoteComment]([id])
ON DELETE NO ACTION;

-- Add index for commentId for efficient lookups
CREATE NONCLUSTERED INDEX [ReviewNoteAttachment_commentId_idx]
ON [dbo].[ReviewNoteAttachment]([commentId] ASC)
WHERE [commentId] IS NOT NULL;

