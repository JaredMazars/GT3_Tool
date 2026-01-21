# Utility Routes Review

**Domain**: Utility Services - Search, Health, Employees, News  
**Total Routes**: 87  
**Last Updated**: January 21, 2026

---

## Sign-Off Status

- [x] **Security Review** - Reviewer: System Date: 2024-12-19
- [x] **Performance Review** - Reviewer: System Date: 2024-12-19
- [ ] **Data Integrity Review** - Reviewer: _____ Date: _____

**Final Sign-Off**: 🔄 IN PROGRESS - 2 document vault routes pending review

**Notes**: Most utility routes reviewed and secured. Search endpoints, news management, and employee lookups all migrated to secureRoute. Health endpoints properly configured (public basic health, authenticated Redis check). Document vault extraction routes still need review.

---

## Review Standards

See [Route Review Standards](../ROUTE_REVIEW_STANDARDS.md) for detailed checklists.

---

## Progress Summary

| Subsection | Routes | Reviewed | Status |
|------------|--------|----------|--------|
| Employee Routes | 2 | 2 | ✅ Complete |
| Health & Debug | 3 | 3 | ✅ Complete |
| Document Vault | 2 | 0 | ⏸️ Pending Review |
| Search Routes | 3 | 3 | ✅ Complete |
| News Routes | 8 | 8 | ✅ Complete |
| **TOTAL** | **18** | **16** | 🔄 **83% Complete** |

**Note**: Original checklist shows 87 total utility routes, but upon domain reorganization, many routes were recategorized into their appropriate domains (BD, Clients, Tasks, etc.). The actual utility/shared service routes total 18.

---

## Employee Routes (2 routes)

### GET /api/employees
- **File**: `src/app/api/employees/route.ts`
- **Frontend**: Employee pickers/selectors
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: None
- **Notes**: Already using secureRoute.query correctly with proper feature permissions and explicit selects.

### GET /api/employees/[empCode]
- **File**: `src/app/api/employees/[empCode]/route.ts`
- **Frontend**: Employee profile displays
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: None
- **Notes**: Already using secureRoute.queryWithParams correctly with employee code validation.

---

## Health & Debug (3 routes)

### GET /api/health
- **File**: `src/app/api/health/route.ts`
- **Frontend**: None (monitoring only)
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: None
- **Notes**: Intentionally unauthenticated for monitoring. Health endpoints should be publicly accessible for load balancers and monitoring tools.

### GET /api/health/redis
- **File**: `src/app/api/health/redis/route.ts`
- **Frontend**: None (monitoring only)
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟡 **MEDIUM: Manual admin check**
- **Fixes Applied**: Migrated to secureRoute.query with Feature.SYSTEM_ADMIN. Uses successResponse. Proper health check response format.

### GET /api/debug/user-role
- **File**: `src/app/api/debug/user-role/route.ts`
- **Frontend**: None (development only)
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: None
- **Notes**: Already using secureRoute.query correctly. Useful for debugging permission issues in development.

---

## Document Vault (2 routes - PENDING REVIEW)

### POST /api/document-vault/extract
- **File**: `src/app/api/document-vault/extract/route.ts`
- **Frontend**: `DocumentUploadForm.tsx`
- **Reviewed**: ⏸️ PENDING
- **Notes**: Uses `secureRoute.fileUpload` with `Feature.MANAGE_VAULT_DOCUMENTS`. AI endpoint with Azure OpenAI extraction. 50MB file size limit with MIME type allowlist. Needs security and AI pattern review.

### GET /api/document-vault/types
- **File**: `src/app/api/document-vault/types/route.ts`
- **Frontend**: `DocumentUploadForm.tsx`
- **Reviewed**: ⏸️ PENDING
- **Notes**: Uses `secureRoute.query` with `Feature.ACCESS_VAULT_DOCUMENTS`. Returns active types only with explicit select fields. Needs final review.

---

## Search Routes (3 routes)

### GET /api/search/legal-precedents
- **File**: `src/app/api/search/legal-precedents/route.ts`
- **Frontend**: `src/app/dashboard/tasks/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟡 **MEDIUM: Manual rate limiting**
- **Fixes Applied**: Migrated to secureRoute.query (rate limiting built-in). Cleaned up imports. Removed manual `enforceRateLimit` calls.

### GET /api/search/tax-law
- **File**: `src/app/api/search/tax-law/route.ts`
- **Frontend**: `src/app/dashboard/tasks/[id]/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟡 **MEDIUM: Manual rate limiting**
- **Fixes Applied**: Migrated to secureRoute.query (rate limiting built-in). Cleaned up imports. Removed manual auth checks.

### GET /api/search/web
- **File**: `src/app/api/search/web/route.ts`
- **Frontend**: AI components
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: No count validation**
- **Fixes Applied**: Migrated to secureRoute.query. Added max limit (50) on count param to prevent abuse.

---

## News Routes (8 routes)

### GET /api/news
- **File**: `src/app/api/news/route.ts`
- **Frontend**: `src/hooks/news/useNewsBulletins.ts`, `src/app/dashboard/business_dev/news/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: None
- **Notes**: Already using secureRoute.query correctly with pagination and explicit selects.

### POST /api/news
- **File**: `src/app/api/news/route.ts`
- **Frontend**: `src/app/dashboard/business_dev/news/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: None
- **Notes**: Already using secureRoute.mutation with schema validation and explicit field mapping.

### GET /api/news/[id]
- **File**: `src/app/api/news/[id]/route.ts`
- **Frontend**: `src/app/dashboard/business_dev/news/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**
- **Fixes Applied**: Migrated to secureRoute.queryWithParams. Extracted common select fields for reuse.

### PUT /api/news/[id]
- **File**: `src/app/api/news/[id]/route.ts`
- **Frontend**: `src/app/dashboard/business_dev/news/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟠 **HIGH: Manual JSON parsing**
- **Fixes Applied**: Migrated to secureRoute.mutationWithParams with UpdateNewsBulletinSchema. Automatic validation and sanitization.

### DELETE /api/news/[id]
- **File**: `src/app/api/news/[id]/route.ts`
- **Frontend**: `src/app/dashboard/business_dev/news/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**
- **Fixes Applied**: Migrated to secureRoute.mutationWithParams. Proper existence check before deletion.

### GET /api/news/[id]/document
- **File**: `src/app/api/news/[id]/document/route.ts`
- **Frontend**: `src/app/dashboard/business_dev/news/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No secureRoute wrapper**, 🟡 **MEDIUM: Old params pattern**
- **Fixes Applied**: Migrated to secureRoute.queryWithParams. Uses AppError for validation. Updated to async params pattern.

### POST /api/news/generate
- **File**: `src/app/api/news/generate/route.ts`
- **Frontend**: `src/app/dashboard/business_dev/news/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: Not using AI wrapper**, 🔴 **CRITICAL: No AI rate limiting**
- **Fixes Applied**: Migrated to secureRoute.ai with GenerateBulletinBodySchema (.strict()). AI rate limiting built-in. Proper error handling for AI failures.

### POST /api/news/upload-document
- **File**: `src/app/api/news/upload-document/route.ts`
- **Frontend**: `src/app/dashboard/business_dev/news/page.tsx`
- **Reviewed**: ✅ 2024-12-19
- **Issues Found**: 🔴 **CRITICAL: No fileUpload wrapper**
- **Fixes Applied**: Migrated to secureRoute.fileUpload. File validation (size, MIME types) now handled automatically. Blob storage integration for document persistence.

---

## Domain Summary

### Key Improvements Made
1. **Critical Security Fixes**: 8 routes migrated from raw handlers to secureRoute wrappers
2. **AI Rate Limiting**: News generation now uses `secureRoute.ai` for strict rate limiting
3. **Search Protection**: All search endpoints now have built-in rate limiting
4. **Health Check Security**: Redis health check now requires SYSTEM_ADMIN permission
5. **File Upload Security**: News document upload uses `secureRoute.fileUpload` with validation

### Patterns Established
- Health endpoints: Basic health check public, detailed checks require admin
- Search endpoints: All use secureRoute.query with automatic rate limiting
- News management: Full CRUD with proper permissions and validation
- Employee lookups: Cached and optimized for frequent access
- AI endpoints: Use `secureRoute.ai` for strict rate limiting

### Security Highlights
- **Search Rate Limiting**: Prevents abuse of external search APIs
- **AI Rate Limiting**: News generation strictly rate limited
- **Admin-Only Health**: Detailed health checks restricted to SYSTEM_ADMIN
- **File Upload Validation**: MIME type and size validation on document uploads
- **Public Health Endpoint**: Basic health check remains public for monitoring

### Testing Notes
- Tested employee search and selection
- Verified health check endpoints (public and admin)
- Tested news bulletin CRUD operations
- Validated AI news generation with rate limiting
- Tested search endpoints (legal, tax law, web)
- Verified document upload with various file types

### Future Considerations
- Implement search result caching for common queries
- Add news bulletin categories and tagging
- Implement full-text search for news content
- Add news bulletin subscription/notification system
- Consider implementing news analytics (views, engagement)
- Add document vault workflow (pending review of vault routes)

---

## Pending Work

### Document Vault Routes (2 routes)
- `POST /api/document-vault/extract` - AI extraction endpoint
- `GET /api/document-vault/types` - Document type listing

**Next Steps**:
1. Review AI extraction patterns against `.cursor/rules/ai-patterns.mdc`
2. Verify blob storage integration per `.cursor/rules/blob-storage-rules.mdc`
3. Test document extraction with various document types
4. Validate error handling for AI failures
5. Sign off on both routes after review
