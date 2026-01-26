-- CreateTable
CREATE TABLE [dbo].[WorkspaceFolder] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [serviceLine] NVARCHAR(50),
    [subServiceLineGroup] NVARCHAR(100),
    [parentFolderId] INT,
    [driveId] NVARCHAR(255),
    [itemId] NVARCHAR(255),
    [sharepointUrl] NVARCHAR(500),
    [createdBy] NVARCHAR(200) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_WorkspaceFolder_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [DF_WorkspaceFolder_active] DEFAULT 1,
    CONSTRAINT [PK_WorkspaceFolder] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkspaceFile] (
    [id] INT NOT NULL IDENTITY(1,1),
    [folderId] INT NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [fileType] NVARCHAR(50) NOT NULL,
    [fileSize] BIGINT NOT NULL,
    [driveId] NVARCHAR(255) NOT NULL,
    [itemId] NVARCHAR(255) NOT NULL,
    [webUrl] NVARCHAR(500) NOT NULL,
    [embedUrl] NVARCHAR(500),
    [thumbnailUrl] NVARCHAR(500),
    [uploadedBy] NVARCHAR(200) NOT NULL,
    [lastModifiedBy] NVARCHAR(200),
    [lastModifiedAt] DATETIME2,
    [version] INT NOT NULL CONSTRAINT [DF_WorkspaceFile_version] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_WorkspaceFile_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PK_WorkspaceFile] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkspaceFileActivity] (
    [id] INT NOT NULL IDENTITY(1,1),
    [fileId] INT NOT NULL,
    [userId] NVARCHAR(200) NOT NULL,
    [action] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(500),
    [timestamp] DATETIME2 NOT NULL CONSTRAINT [DF_WorkspaceFileActivity_timestamp] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_WorkspaceFileActivity] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WorkspaceFilePermission] (
    [id] INT NOT NULL IDENTITY(1,1),
    [fileId] INT NOT NULL,
    [userId] NVARCHAR(200),
    [role] NVARCHAR(50) NOT NULL,
    [serviceLine] NVARCHAR(50),
    [grantedBy] NVARCHAR(200) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_WorkspaceFilePermission_createdAt] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_WorkspaceFilePermission] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_WorkspaceFolder_serviceLine] ON [dbo].[WorkspaceFolder]([serviceLine]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_WorkspaceFolder_parentFolderId] ON [dbo].[WorkspaceFolder]([parentFolderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_WorkspaceFolder_createdBy] ON [dbo].[WorkspaceFolder]([createdBy]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_WorkspaceFolder_active] ON [dbo].[WorkspaceFolder]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_WorkspaceFile_folderId] ON [dbo].[WorkspaceFile]([folderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_WorkspaceFile_uploadedBy] ON [dbo].[WorkspaceFile]([uploadedBy]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_WorkspaceFile_fileType] ON [dbo].[WorkspaceFile]([fileType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_WorkspaceFile_createdAt] ON [dbo].[WorkspaceFile]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_WorkspaceFileActivity_fileId] ON [dbo].[WorkspaceFileActivity]([fileId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_WorkspaceFileActivity_userId] ON [dbo].[WorkspaceFileActivity]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_WorkspaceFileActivity_timestamp] ON [dbo].[WorkspaceFileActivity]([timestamp]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_WorkspaceFilePermission_fileId] ON [dbo].[WorkspaceFilePermission]([fileId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_WorkspaceFilePermission_userId] ON [dbo].[WorkspaceFilePermission]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IX_WorkspaceFilePermission_serviceLine] ON [dbo].[WorkspaceFilePermission]([serviceLine]);

-- AddForeignKey
ALTER TABLE [dbo].[WorkspaceFolder] ADD CONSTRAINT [FK_WorkspaceFolder_ParentFolder] FOREIGN KEY ([parentFolderId]) REFERENCES [dbo].[WorkspaceFolder]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkspaceFile] ADD CONSTRAINT [FK_WorkspaceFile_Folder] FOREIGN KEY ([folderId]) REFERENCES [dbo].[WorkspaceFolder]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkspaceFileActivity] ADD CONSTRAINT [FK_WorkspaceFileActivity_File] FOREIGN KEY ([fileId]) REFERENCES [dbo].[WorkspaceFile]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WorkspaceFilePermission] ADD CONSTRAINT [FK_WorkspaceFilePermission_File] FOREIGN KEY ([fileId]) REFERENCES [dbo].[WorkspaceFile]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

