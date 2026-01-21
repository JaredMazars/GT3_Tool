# Rules Files Improvements - January 21, 2026

## Summary

Comprehensive review and improvement of all 7 rules files in `.cursor/rules/` to enhance clarity, maintainability, and best practice adherence.

## Changes Implemented

### High Priority (Security/Correctness) ✅

#### 1. Fixed Toast/Banner Confusion in `forvis-design-rules.mdc`
- **Issue**: File showed example of `toast` from `@/lib/utils/toast` but then prohibited external toast libraries
- **Fix**: Removed toast example entirely since the utility doesn't exist; only Banner component pattern remains
- **Impact**: Eliminates developer confusion about which pattern to use

#### 2. Fixed ConfirmModal Import Path
- **Issue**: Import shown as `@/components/ui/modals` but actual location is `@/components/shared/ConfirmModal`
- **Fix**: Corrected import path in both `forvis-design-rules.mdc` and `consolidated.mdc`
- **Impact**: Prevents import errors when developers follow the examples

#### 3. Added Comprehensive Error Handling Sections
Added detailed error handling to three rules files:

**`approval-system-rules.mdc`**:
- Approval creation failures with rollback strategies
- Route not found handling
- Approval step failures
- Delegate availability checks
- Cleanup procedures for workflow cancellation/deletion

**`ai-patterns.mdc`**:
- AI API timeout handling with AbortSignal
- Rate limit exceeded scenarios
- Invalid model configuration
- RAG engine unavailability with graceful degradation
- Document intelligence extraction failures
- Exponential backoff retry strategies
- User communication patterns

**`blob-storage-rules.mdc`**:
- Container does not exist handling
- Upload failures (403, 413 errors)
- Download failures with existence checks
- Delete failures (non-blocking)
- Entity deletion cleanup procedures
- File validation before upload

#### 4. Removed Security Duplication
- **Issue**: Security patterns repeated between `consolidated.mdc` and `security-rules.mdc`
- **Fix**: Replaced detailed duplicated content with references to `security-rules.mdc`
- **Sections Simplified**:
  - API Routes section now points to security-rules.mdc
  - Page-Level Access simplified to basic usage
  - User Interface & Interaction Patterns points to forvis-design-rules.mdc
  - Input Validation & Authorization section consolidated with reference
- **Impact**: Single source of truth, easier maintenance

### Medium Priority (Maintainability) ✅

#### 5. Added Versioning Metadata to All Rules Files
All 7 rules files now include:
```yaml
version: X.Y.Z
lastUpdated: 2026-01-21
changelog:
  - "X.Y.Z (date): Description of changes"
```

**Versions Assigned**:
- `consolidated.mdc`: 2.0.0 (major refactor to remove duplication)
- `forvis-design-rules.mdc`: 2.1.0 (fixed import paths)
- `security-rules.mdc`: 1.0.0 (initial versioned release)
- `approval-system-rules.mdc`: 1.1.0 (added error handling)
- `ai-patterns.mdc`: 1.1.0 (expanded error handling)
- `blob-storage-rules.mdc`: 1.1.0 (added error handling)
- `tool-system-rules.mdc`: 1.0.0 (initial versioned release)

#### 6. Added Rule Exception Guidance

**`blob-storage-rules.mdc`**:
- Development/testing exceptions
- Data migration exceptions
- Exception request process

**`security-rules.mdc`**:
- Public endpoints that don't need secureRoute
- Webhook receivers with custom auth
- Internal service-to-service calls
- Exception process with documentation requirements

**`forvis-design-rules.mdc`**:
- Browser dialogs exceptions (emergency hotfix only)
- External toast libraries (no exceptions)

### Low Priority (Quality of Life) ✅

#### 7. Added Anti-Pattern Examples

**`tool-system-rules.mdc`**:
- Relation naming mistakes (camelCase vs PascalCase)
- User relations mistakes
- Inconsistent junction table naming
- Missing unique constraints
- Cache invalidation mistakes
- Incorrect tool registration
- Missing component config
- Hardcoded tool access

**`blob-storage-rules.mdc`**:
- Mixing document types in one container
- User-controlled paths (security risk)
- No file validation
- Hardcoded container names
- No cleanup on entity deletion

**`approval-system-rules.mdc`**:
- Custom approval logic instead of system
- Manually creating approval steps
- Missing cache invalidation
- No workflow registration
- Ignoring approval failures
- Using workflow-specific fields

#### 8. Added Quick Reference Tables

**`consolidated.mdc`**:
- 12-row quick reference table covering common tasks
- Direct links to relevant sections
- Examples of correct patterns

**`security-rules.mdc`**:
- Quick reference table for common security tasks
- Code examples for each task
- Key concepts summary

#### 9. Improved Mermaid Diagram in `security-rules.mdc`
- Simplified node IDs (A, B, C instead of descriptive names)
- Added descriptive labels separately
- Added color coding for outcomes:
  - Green: Full access granted
  - Yellow: View-only access
  - Red: Access denied
- Follows Mermaid best practices (no spaces in node IDs)

#### 10. Added Tool Versioning Strategy to `tool-system-rules.mdc`
- Semantic versioning guidelines (MAJOR.MINOR.PATCH)
- Version tracking in tool config
- Handling breaking changes with deprecation period
- Version update checklist
- Future multi-version support strategy

#### 11. Added Rate Limiting Details to `ai-patterns.mdc`
- Default rate limits (per-user and per-IP)
- Handling rate limit errors (client and server)
- Exponential backoff strategies
- User communication patterns
- Custom rate limits process
- Monitoring rate limit hits

#### 12. Added PascalCase Convention Clarification to `tool-system-rules.mdc`
- Explanation of why Prisma uses PascalCase
- Clear distinction: Prisma relations (PascalCase) vs regular TypeScript (camelCase)
- Examples showing correct usage
- Common mistakes to avoid

## Changes NOT Implemented (Intentionally Deferred)

### 1. Split security-rules.mdc into Focused Files
**Reason**: Major refactoring that would:
- Break existing references from other files
- Require updating all cross-references
- Need coordination with development team
- Could be done in future dedicated effort

**Recommendation**: Consider for future improvement sprint when can coordinate with team

### 2. Rename consolidated.mdc to core-conventions.mdc
**Reason**: Would break references in:
- Other rules files
- Developer documentation
- Potentially IDE configurations or scripts
- Team mental models and existing documentation

**Recommendation**: Keep current name; duplication has been removed which was the main issue

## Metrics

- **Files Modified**: 7 (all rules files)
- **New Sections Added**: 15+
- **Anti-Pattern Examples Added**: 25+
- **Error Handling Scenarios Covered**: 20+
- **Total Lines Added**: ~500
- **Duplication Removed**: ~150 lines

## Benefits

1. **Clarity**: Developers now have clear examples of what NOT to do
2. **Error Resilience**: Comprehensive error handling guidance prevents naive implementations
3. **Maintainability**: Versioning allows tracking of rule changes over time
4. **Consistency**: Single source of truth for security patterns (no duplication)
5. **Discoverability**: Quick reference tables help developers find information faster
6. **Best Practices**: Rule exceptions document when and how rules can be broken safely

## Next Steps

1. **Communicate Changes**: Notify development team of improvements
2. **Review in Team Meeting**: Walk through major changes
3. **Update Onboarding**: Include versioning info in new developer onboarding
4. **Consider Future**: Plan for security-rules.mdc split in future sprint
5. **Monitor Adoption**: Track if developers reference error handling sections

## Files Changed

- `.cursor/rules/consolidated.mdc`
- `.cursor/rules/forvis-design-rules.mdc`
- `.cursor/rules/security-rules.mdc`
- `.cursor/rules/approval-system-rules.mdc`
- `.cursor/rules/ai-patterns.mdc`
- `.cursor/rules/blob-storage-rules.mdc`
- `.cursor/rules/tool-system-rules.mdc`

## Validation

All changes have been:
- ✅ Verified for syntax correctness
- ✅ Cross-referenced with actual codebase (ConfirmModal, Banner locations)
- ✅ Checked for consistency across files
- ✅ Aligned with existing patterns and conventions
