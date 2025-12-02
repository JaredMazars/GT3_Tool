# Client Analytics Migration

This migration adds tables to support client credit rating analytics functionality.

## Tables Added

### ClientAnalyticsDocument
Stores uploaded financial documents for analysis (AFS, management accounts, bank statements, cash flow statements, etc.)

### ClientCreditRating
Stores AI-generated credit ratings with comprehensive analysis, financial ratios, and confidence scores.

### CreditRatingDocument
Junction table linking credit ratings to the documents used in their analysis.

## Features
- Document upload and management for client analytics
- AI-powered credit rating generation
- Financial ratio calculation and storage
- Historical rating tracking
- Document versioning and metadata














