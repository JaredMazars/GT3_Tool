# Review Notebook Tool

A comprehensive review notebook tool for partners to raise, track, and manage review notes on files and resources.

## Features Implemented

### Core Functionality
- ✅ Create review notes with full metadata (title, description, URL, section, priority, category, due date)
- ✅ Assign notes to team members
- ✅ Full workflow: OPEN → IN_PROGRESS → ADDRESSED → CLEARED/REJECTED
- ✅ Comments and discussion threads on notes
- ✅ File attachments support
- ✅ Categories for organizing notes
- ✅ Priority levels (Critical, High, Medium, Low)
- ✅ Due dates with overdue tracking
- ✅ Email notifications for all workflow events

### Security & Authorization
- ✅ Secure API routes with `secureRoute` wrapper
- ✅ Role-based permissions (partners can raise/clear, assignees can address)
- ✅ Task team validation for assignments
- ✅ Input validation with Zod schemas
- ✅ File upload validation (size and type)

### Analytics & Reporting
- ✅ Summary metrics (total, by status, by priority, overdue count)
- ✅ Average resolution time calculation
- ✅ Notes grouped by category
- ✅ Performance metrics by assignee
- ✅ Timeline visualization (last 30 days)

## Database Schema

### Tables Created
- **ReviewNote**: Core review note entity with all workflow fields
- **ReviewNoteComment**: Discussion threads on notes
- **ReviewNoteAttachment**: File attachments for notes
- **ReviewCategory**: Master list of review categories

### Migration
Run the migration: `prisma/migrations/20251223_add_review_notebook_tables/migration.sql`

### Seed Tool
Run the seed script to create the tool: `prisma/seed-review-notebook-tool.sql`

## API Routes

All routes under `/api/tasks/[taskId]/review-notes/`:
- `GET /` - List review notes with filters
- `POST /` - Create new review note
- `GET /[noteId]` - Get single note with details
- `PUT /[noteId]` - Update review note
- `DELETE /[noteId]` - Delete review note
- `POST /[noteId]/status` - Change note status
- `POST /[noteId]/assign` - Assign/reassign note
- `GET/POST /[noteId]/comments` - Comments management
- `GET/POST /[noteId]/attachments` - Attachments management
- `GET/DELETE /[noteId]/attachments/[attachmentId]` - Individual attachment
- `GET /analytics` - Analytics data
- `GET/POST /categories` - Categories management
- `PUT/DELETE /categories/[categoryId]` - Individual category

## React Hooks

Located in `hooks/`:
- `useReviewNotes` - Fetch notes with filters
- `useReviewNote` - Fetch single note
- `useReviewNoteAnalytics` - Fetch analytics
- `useReviewCategories` - Fetch categories
- `useCreateReviewNote` - Create note mutation
- `useUpdateReviewNote` - Update note mutation
- `useDeleteReviewNote` - Delete note mutation
- `useChangeReviewNoteStatus` - Status change mutation
- `useAssignReviewNote` - Assignment mutation
- `useReviewNoteComments` - Comments queries/mutations
- `useReviewNoteAttachments` - Attachments queries/mutations

## UI Components

Located in `components/`:
- `ReviewNoteList.tsx` - Filterable list of notes (MVP implemented)
- `ReviewNoteAnalytics.tsx` - Analytics dashboard (MVP implemented)

### Components to Enhance (Future)
- `ReviewNoteDetail.tsx` - Full detail view with workflow actions
- `AddReviewNoteModal.tsx` - Create note modal with form
- `EditReviewNoteModal.tsx` - Edit note modal
- `CategoryManagement.tsx` - Manage categories (admin)
- `ReviewNoteReport.tsx` - Export reports (PDF/Excel)

## Notifications

Email notifications implemented for:
- Review note assigned
- Review note addressed
- Review note cleared
- Review note rejected
- Comment added
- Overdue notes (scheduled job)

## Usage

1. Run database migration to create tables
2. Run seed script to create the tool record
3. Tool will appear in the tools list for all service lines
4. Partners can add the tool to tasks via the tools menu
5. Partners can create review notes and assign to team members
6. Team members receive email notifications and can address notes
7. Partners review responses and clear or reject notes
8. Analytics provide insights into review activity

## Next Steps (Optional Enhancements)

1. **Enhanced UI**: Complete detail view with workflow visualization
2. **Rich modals**: Full-featured create/edit modals with all fields
3. **Report generation**: PDF and Excel export functionality
4. **Templates**: Pre-defined templates for common review scenarios
5. **Batch operations**: Mark multiple notes as cleared, bulk reassign
6. **AI suggestions**: Auto-categorization based on note description
7. **Mobile optimization**: Responsive design for mobile review workflows
8. **Integration**: Link notes to specific TaskDocument or WorkspaceFile records
9. **Dashboard**: High-level partner view across all tasks
10. **Historical analytics**: Track quality improvements over time

## Technical Notes

- All IDs properly typed with branded types
- React Query for caching and optimistic updates
- Follows Forvis Mazars design system
- Prisma for database access
- Azure Communication Services for emails
- File storage in local filesystem (can be migrated to Azure Blob Storage)
- Proper error handling and logging throughout
- Cache invalidation on mutations
- Input sanitization and validation on all routes

