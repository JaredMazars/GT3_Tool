# Client Acceptance and Continuance Questionnaire Migration

**Date:** November 24, 2025
**Version:** 1.0.0

## Overview

This migration adds comprehensive questionnaire-based client acceptance and continuance functionality with automatic risk assessment. It replaces the basic acceptance approval workflow with a detailed question-and-answer system matching professional services requirements.

## Changes

### New Tables

1. **ClientAcceptanceResponse**
   - Stores completed questionnaires for each project
   - Tracks questionnaire type (Full vs Lite, Acceptance vs Continuance)
   - Records risk assessment results
   - Maintains completion and review workflow status

2. **AcceptanceQuestion**
   - Defines all questions for each questionnaire type
   - Stores question metadata (text, description, field type, options)
   - Includes risk weighting for automatic risk calculation
   - Organized by section for better UX

3. **AcceptanceAnswer**
   - Individual answers to questionnaire questions
   - Supports both structured answers and free-text comments
   - Links responses to specific questions

4. **AcceptanceDocument**
   - Supporting documents (WeCheck reports, PONG reports, etc.)
   - Tracks file metadata and storage location
   - Associates documents with questionnaire responses

## Questionnaire Types

- **ACCEPTANCE_FULL**: Comprehensive new client acceptance (18 questions)
- **ACCEPTANCE_LITE**: Simplified new client acceptance (6 questions, < R250k fees)
- **CONTINUANCE_FULL**: Comprehensive existing client continuance (15 questions)
- **CONTINUANCE_LITE**: Simplified existing client continuance

## Risk Assessment

The system automatically calculates risk scores based on:
- Question responses (Yes answers to high-risk questions)
- Risk weights assigned to each question
- Section-based risk aggregation

Risk ratings:
- **LOW**: 0-30% risk score
- **MEDIUM**: 31-60% risk score
- **HIGH**: 61%+ risk score

## Workflow Integration

This migration integrates with the existing client acceptance workflow:
1. User completes questionnaire
2. System calculates risk assessment
3. User submits for review
4. Partner/Superuser reviews answers and risk
5. Partner/Superuser approves (sets `Project.acceptanceApproved = true`)

## Post-Migration Steps

1. Run seeding script to populate `AcceptanceQuestion` table with question definitions
2. Existing projects with `acceptanceApproved = true` continue to work normally
3. New projects require questionnaire completion before approval

## Rollback

This migration creates new tables only and does not modify existing data or tables.
To roll back: Drop the four new tables in reverse order (AcceptanceDocument, AcceptanceAnswer, AcceptanceQuestion, ClientAcceptanceResponse).

## Dependencies

- Prisma Client must be regenerated after this migration
- Seeding script required to populate question definitions
- API routes and UI components deployed to use the new tables




