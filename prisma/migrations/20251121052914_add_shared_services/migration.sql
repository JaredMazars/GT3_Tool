-- AddSharedServices Migration
-- This migration adds support for 5 new shared service lines

-- No schema changes required as serviceLine is already a string field in the Project table
-- This migration documents the addition of the following valid service line values:
-- - QRM (Quality & Risk Management)
-- - BUSINESS_DEV (Business Development & Marketing)
-- - IT (Information Technology)
-- - FINANCE (Finance)
-- - HR (Human Resources)

-- These service lines function similarly to the main service lines (TAX, AUDIT, ACCOUNTING, ADVISORY)
-- Users can be assigned to these service lines via the ServiceLineUser table
-- Projects can be created for these service lines with their own project types

