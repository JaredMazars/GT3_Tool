-- Seed Approval Routes
-- Pre-configured approval routes for common workflows

-- Single Partner Approval (for Acceptance, Engagement Letters, DPAs)
INSERT INTO ApprovalRoute (workflowType, routeName, description, routeConfig, isActive, isDefault, createdAt, updatedAt)
VALUES (
  'ACCEPTANCE',
  'partner-approval',
  'Requires single partner approval',
  '{"steps":[{"stepOrder":1,"stepType":"ROLE","assignedToRole":"PARTNER","isRequired":true}],"requiresAllSteps":true}',
  1,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO ApprovalRoute (workflowType, routeName, description, routeConfig, isActive, isDefault, createdAt, updatedAt)
VALUES (
  'ENGAGEMENT_LETTER',
  'partner-approval',
  'Requires single partner approval',
  '{"steps":[{"stepOrder":1,"stepType":"ROLE","assignedToRole":"PARTNER","isRequired":true}],"requiresAllSteps":true}',
  1,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO ApprovalRoute (workflowType, routeName, description, routeConfig, isActive, isDefault, createdAt, updatedAt)
VALUES (
  'DPA',
  'partner-approval',
  'Requires single partner approval',
  '{"steps":[{"stepOrder":1,"stepType":"ROLE","assignedToRole":"PARTNER","isRequired":true}],"requiresAllSteps":true}',
  1,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Client Partner Approval (for Client Acceptance - assigned client partner)
INSERT INTO ApprovalRoute (workflowType, routeName, description, routeConfig, isActive, isDefault, createdAt, updatedAt)
VALUES (
  'CLIENT_ACCEPTANCE',
  'client-partner-approval',
  'Requires approval from assigned client partner',
  '{"steps":[{"stepOrder":1,"stepType":"USER","assignedToUserIdPath":"clientPartnerCode","isRequired":true}],"requiresAllSteps":true}',
  1,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Dual Approval (for Change Requests - proposed + current employee)
INSERT INTO ApprovalRoute (workflowType, routeName, description, routeConfig, isActive, isDefault, createdAt, updatedAt)
VALUES (
  'CHANGE_REQUEST',
  'dual-approval',
  'Requires both proposed and current employee approval',
  '{"steps":[{"stepOrder":1,"stepType":"USER","assignedToUserIdPath":"proposedEmployeeCode","isRequired":true},{"stepOrder":2,"stepType":"USER","assignedToUserIdPath":"currentEmployeeCode","isRequired":true,"condition":"context.requiresDualApproval === true"}],"requiresAllSteps":true}',
  1,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Single Employee Approval (for Change Requests - only proposed employee)
INSERT INTO ApprovalRoute (workflowType, routeName, description, routeConfig, isActive, isDefault, createdAt, updatedAt)
VALUES (
  'CHANGE_REQUEST',
  'single-approval',
  'Requires only proposed employee approval',
  '{"steps":[{"stepOrder":1,"stepType":"USER","assignedToUserIdPath":"proposedEmployeeCode","isRequired":true}],"requiresAllSteps":true}',
  1,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Assignee Approval (for Review Notes)
INSERT INTO ApprovalRoute (workflowType, routeName, description, routeConfig, isActive, isDefault, createdAt, updatedAt)
VALUES (
  'REVIEW_NOTE',
  'assignee-approval',
  'Requires assignee approval',
  '{"steps":[{"stepOrder":1,"stepType":"USER","assignedToUserIdPath":"assignedToUserId","isRequired":true}],"requiresAllSteps":true}',
  1,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Risk-Based Approval (for Continuance - conditional routing)
INSERT INTO ApprovalRoute (workflowType, routeName, description, routeConfig, isActive, isDefault, createdAt, updatedAt)
VALUES (
  'CONTINUANCE',
  'risk-based-approval',
  'Routing based on risk level - Manager for low risk, Partner for high risk',
  '{"steps":[{"stepOrder":1,"stepType":"ROLE","assignedToRole":"MANAGER","isRequired":true,"condition":"context.riskLevel <= 3"},{"stepOrder":2,"stepType":"ROLE","assignedToRole":"PARTNER","isRequired":true,"condition":"context.riskLevel > 3"}],"requiresAllSteps":false}',
  1,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Partner or Administrator Approval (alternative for high-priority items)
INSERT INTO ApprovalRoute (workflowType, routeName, description, routeConfig, isActive, isDefault, createdAt, updatedAt)
VALUES (
  'ACCEPTANCE',
  'senior-approval',
  'Requires approval from Partner or Administrator',
  '{"steps":[{"stepOrder":1,"stepType":"ROLE","assignedToRole":"PARTNER","isRequired":false},{"stepOrder":2,"stepType":"ROLE","assignedToRole":"ADMINISTRATOR","isRequired":false}],"requiresAllSteps":false}',
  1,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Administrator Approval (for Document Vault uploads)
INSERT INTO ApprovalRoute (workflowType, routeName, description, routeConfig, isActive, isDefault, createdAt, updatedAt)
VALUES (
  'VAULT_DOCUMENT',
  'admin-approval',
  'Requires administrator approval for document vault uploads',
  '{"steps":[{"stepOrder":1,"stepType":"ROLE","assignedToRole":"ADMINISTRATOR","isRequired":true}],"requiresAllSteps":true}',
  1,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
