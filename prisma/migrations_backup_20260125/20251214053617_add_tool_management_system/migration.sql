-- Tool Management System Tables

-- Create Tool table
CREATE TABLE [dbo].[Tool] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(200) NOT NULL,
    [code] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(MAX),
    [icon] NVARCHAR(50),
    [componentPath] NVARCHAR(500) NOT NULL,
    [active] BIT NOT NULL DEFAULT 1,
    [sortOrder] INT NOT NULL DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_Tool] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [Tool_code_key] UNIQUE NONCLUSTERED ([code] ASC)
);

-- Create indexes for Tool
CREATE NONCLUSTERED INDEX [Tool_active_idx] ON [dbo].[Tool]([active] ASC);
CREATE NONCLUSTERED INDEX [Tool_code_idx] ON [dbo].[Tool]([code] ASC);
CREATE NONCLUSTERED INDEX [Tool_sortOrder_idx] ON [dbo].[Tool]([sortOrder] ASC);

-- Create ToolSubTab table
CREATE TABLE [dbo].[ToolSubTab] (
    [id] INT NOT NULL IDENTITY(1,1),
    [toolId] INT NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [code] NVARCHAR(50) NOT NULL,
    [componentPath] NVARCHAR(500) NOT NULL,
    [icon] NVARCHAR(50),
    [sortOrder] INT NOT NULL DEFAULT 0,
    [active] BIT NOT NULL DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_ToolSubTab] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [ToolSubTab_toolId_code_key] UNIQUE NONCLUSTERED ([toolId] ASC, [code] ASC),
    CONSTRAINT [FK_ToolSubTab_Tool] FOREIGN KEY ([toolId]) REFERENCES [dbo].[Tool]([id]) ON DELETE CASCADE
);

-- Create indexes for ToolSubTab
CREATE NONCLUSTERED INDEX [ToolSubTab_toolId_idx] ON [dbo].[ToolSubTab]([toolId] ASC);
CREATE NONCLUSTERED INDEX [ToolSubTab_active_idx] ON [dbo].[ToolSubTab]([active] ASC);
CREATE NONCLUSTERED INDEX [ToolSubTab_toolId_sortOrder_idx] ON [dbo].[ToolSubTab]([toolId] ASC, [sortOrder] ASC);

-- Create ServiceLineTool junction table
CREATE TABLE [dbo].[ServiceLineTool] (
    [id] INT NOT NULL IDENTITY(1,1),
    [serviceLineCode] NVARCHAR(50) NOT NULL,
    [toolId] INT NOT NULL,
    [active] BIT NOT NULL DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_ServiceLineTool] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [ServiceLineTool_serviceLineCode_toolId_key] UNIQUE NONCLUSTERED ([serviceLineCode] ASC, [toolId] ASC),
    CONSTRAINT [FK_ServiceLineTool_Tool] FOREIGN KEY ([toolId]) REFERENCES [dbo].[Tool]([id]) ON DELETE CASCADE
);

-- Create indexes for ServiceLineTool
CREATE NONCLUSTERED INDEX [ServiceLineTool_serviceLineCode_idx] ON [dbo].[ServiceLineTool]([serviceLineCode] ASC);
CREATE NONCLUSTERED INDEX [ServiceLineTool_toolId_idx] ON [dbo].[ServiceLineTool]([toolId] ASC);
CREATE NONCLUSTERED INDEX [ServiceLineTool_active_idx] ON [dbo].[ServiceLineTool]([active] ASC);

-- Create TaskTool junction table
CREATE TABLE [dbo].[TaskTool] (
    [id] INT NOT NULL IDENTITY(1,1),
    [taskId] INT NOT NULL,
    [toolId] INT NOT NULL,
    [addedBy] NVARCHAR(1000) NOT NULL,
    [sortOrder] INT NOT NULL DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_TaskTool] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [TaskTool_taskId_toolId_key] UNIQUE NONCLUSTERED ([taskId] ASC, [toolId] ASC),
    CONSTRAINT [FK_TaskTool_Task] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Task]([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_TaskTool_Tool] FOREIGN KEY ([toolId]) REFERENCES [dbo].[Tool]([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_TaskTool_User] FOREIGN KEY ([addedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Create indexes for TaskTool
CREATE NONCLUSTERED INDEX [TaskTool_taskId_idx] ON [dbo].[TaskTool]([taskId] ASC);
CREATE NONCLUSTERED INDEX [TaskTool_toolId_idx] ON [dbo].[TaskTool]([toolId] ASC);
CREATE NONCLUSTERED INDEX [TaskTool_addedBy_idx] ON [dbo].[TaskTool]([addedBy] ASC);
CREATE NONCLUSTERED INDEX [TaskTool_taskId_sortOrder_idx] ON [dbo].[TaskTool]([taskId] ASC, [sortOrder] ASC);








