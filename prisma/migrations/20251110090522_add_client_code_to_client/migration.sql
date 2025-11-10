BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Client] ADD [clientCode] NVARCHAR(1000);

-- CreateIndex
CREATE UNIQUE NONCLUSTERED INDEX [Client_clientCode_key] ON [dbo].[Client]([clientCode]) WHERE [clientCode] IS NOT NULL;
CREATE NONCLUSTERED INDEX [Client_clientCode_idx] ON [dbo].[Client]([clientCode]) WHERE [clientCode] IS NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH


