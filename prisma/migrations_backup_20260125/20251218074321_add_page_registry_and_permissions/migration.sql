-- CreateTable: PageRegistry
CREATE TABLE [dbo].[PageRegistry] (
    [id] INT NOT NULL IDENTITY(1,1),
    [pathname] NVARCHAR(1000) NOT NULL,
    [pageTitle] NVARCHAR(255),
    [category] NVARCHAR(100),
    [discovered] BIT NOT NULL CONSTRAINT [PageRegistry_discovered_df] DEFAULT 1,
    [active] BIT NOT NULL CONSTRAINT [PageRegistry_active_df] DEFAULT 1,
    [lastSeen] DATETIME2 NOT NULL CONSTRAINT [PageRegistry_lastSeen_df] DEFAULT CURRENT_TIMESTAMP,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PageRegistry_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PageRegistry_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PageRegistry_pathname_key] UNIQUE NONCLUSTERED ([pathname])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PageRegistry_category_idx] ON [dbo].[PageRegistry]([category]);
CREATE NONCLUSTERED INDEX [PageRegistry_active_idx] ON [dbo].[PageRegistry]([active]);

-- CreateTable: PagePermission
CREATE TABLE [dbo].[PagePermission] (
    [id] INT NOT NULL IDENTITY(1,1),
    [pathname] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(50) NOT NULL,
    [accessLevel] NVARCHAR(20) NOT NULL,
    [description] NVARCHAR(MAX),
    [active] BIT NOT NULL CONSTRAINT [PagePermission_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PagePermission_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [createdBy] NVARCHAR(255),
    CONSTRAINT [PagePermission_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PagePermission_pathname_role_key] UNIQUE NONCLUSTERED ([pathname], [role])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PagePermission_pathname_idx] ON [dbo].[PagePermission]([pathname]);
CREATE NONCLUSTERED INDEX [PagePermission_role_idx] ON [dbo].[PagePermission]([role]);
CREATE NONCLUSTERED INDEX [PagePermission_active_idx] ON [dbo].[PagePermission]([active]);






















