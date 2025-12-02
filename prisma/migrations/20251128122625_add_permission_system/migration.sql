-- CreateTable
CREATE TABLE [Permission] (
    [id] INT NOT NULL IDENTITY(1,1),
    [resourceType] NVARCHAR(20) NOT NULL,
    [resourceKey] NVARCHAR(100) NOT NULL,
    [displayName] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(500),
    [availableActions] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Permission_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Permission_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Permission_resourceType_resourceKey_key] UNIQUE NONCLUSTERED ([resourceType],[resourceKey])
);

-- CreateTable
CREATE TABLE [RolePermission] (
    [id] INT NOT NULL IDENTITY(1,1),
    [role] NVARCHAR(20) NOT NULL,
    [permissionId] INT NOT NULL,
    [allowedActions] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RolePermission_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [RolePermission_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RolePermission_role_permissionId_key] UNIQUE NONCLUSTERED ([role],[permissionId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Permission_resourceType_idx] ON [Permission]([resourceType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Permission_resourceKey_idx] ON [Permission]([resourceKey]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RolePermission_role_idx] ON [RolePermission]([role]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RolePermission_permissionId_idx] ON [RolePermission]([permissionId]);

-- AddForeignKey
ALTER TABLE [RolePermission] ADD CONSTRAINT [RolePermission_permissionId_fkey] FOREIGN KEY ([permissionId]) REFERENCES [Permission]([id]) ON DELETE CASCADE ON UPDATE CASCADE;













