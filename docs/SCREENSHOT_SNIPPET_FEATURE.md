# Screenshot Snippet Feature

## Overview
The screenshot snippet feature allows users to capture selected regions of the page when creating review notes or adding comments. Screenshots are stored in Azure Blob Storage and attached to review notes.

## Features Implemented

### 1. Screenshot Capture
- **Component**: `ScreenshotCapture.tsx`
- Full-page overlay with drag-to-select functionality
- Visual feedback with selection rectangle and dimensions
- ESC key to cancel
- Uses html2canvas for high-quality captures
- Automatic compression (85% quality)
- **Automatically copies current page URL to clipboard**
- Captured URL stored with screenshot metadata

### 2. Screenshot Management
- **Component**: `ScreenshotManager.tsx`
- Support for multiple screenshots (up to 10 per note, 5 per comment)
- Thumbnail previews with file size and dimensions
- Remove screenshots before upload
- Upload status indicators (pending, uploading, uploaded, error)
- **Two capture modes**:
  - "Capture Here" - Quick capture on current page
  - "Capture Elsewhere" - Start persistent session for multi-page capture

### 2.5. Cross-Page Screenshot Sessions
- **Components**: `ScreenshotCaptureSession.tsx`, `ScreenshotSessionProvider.tsx`
- Persistent floating control panel
- Navigate to any page/tab and capture screenshots
- Screenshots stored in sessionStorage
- Automatic return to original modal with captured screenshots
- Session management with visual indicators

### 3. Screenshot Display
- **Component**: `ScreenshotLightbox.tsx`
- Full-screen lightbox for viewing screenshots
- Download functionality
- Metadata display (uploader, date, file size)
- ESC key or click outside to close

### 4. Integration Points

#### CreateReviewNoteModal
- Screenshot manager integrated above form buttons
- Screenshots uploaded after note creation
- Progress indicators during upload
- **Auto-fills Reference URL field with URL from first screenshot**
- Shows captured URL in screenshot thumbnail info

#### ReviewNoteDetailModal
- Screenshot manager in comment section
- Screenshots uploaded with comments (linked via commentId)
- Thumbnail grid display of existing attachments
- Click thumbnails to open lightbox

### 5. API Routes

#### POST `/api/tasks/[id]/review-notes/[noteId]/screenshots`
- Upload screenshots to Azure Blob Storage
- Create ReviewNoteAttachment records
- Support for both note-level and comment-level attachments
- Validation: max 5MB, PNG/JPEG only, 4K max dimensions

#### GET/DELETE `/api/tasks/[id]/review-notes/[noteId]/attachments/[attachmentId]`
- Updated to support blob storage for screenshots
- Backward compatible with local filesystem attachments

### 6. Database Schema

#### ReviewNoteAttachment Table
- Added `commentId` column (nullable, foreign key to ReviewNoteComment)
- Allows screenshots to be associated with specific comments
- Maintains backward compatibility with note-level attachments

### 7. Blob Storage
- **Container**: `review-notes`
- **Path Structure**: `{noteId}/screenshots/{timestamp}_{filename}.png`
- Functions added to `blobStorage.ts`:
  - `uploadScreenshot()`
  - `downloadScreenshot()`
  - `deleteScreenshot()`
  - `generateScreenshotSasUrl()`

## Usage

### Creating a Review Note with Screenshots

#### Option A: Capture on Current Page
1. Click "Add Review Note" button
2. Fill in note details
3. Click "Capture Here" button
4. Drag to select region on page
5. Click "Capture" to confirm
   - **Current page URL is automatically copied to clipboard**
   - Reference URL field auto-fills with captured URL
6. Repeat for multiple screenshots (optional)
7. Click "Create Review Note"
8. Screenshots automatically upload after note creation

#### Option B: Capture from Other Pages (NEW)
1. Click "Add Review Note" button
2. Fill in note details
3. Click "Capture Elsewhere" button
4. **Floating control panel appears** in bottom-right corner
5. Navigate to any page you want to capture
   - Open different tabs
   - Navigate within the application
   - Go to external pages (if needed)
6. Click "Capture" button on floating panel
7. Drag to select region and capture
   - URL automatically copied to clipboard
8. Repeat on different pages (up to 10 screenshots)
9. Click "Done" on floating panel when finished
10. **Automatically returns captured screenshots to your review note**
11. Click "Create Review Note"
12. Screenshots automatically upload

### Adding Comment with Screenshots
1. Open review note detail
2. Type comment in text area
3. Click "Add Screenshot" button
4. Capture screenshot(s) as above
   - **Current page URL is automatically copied to clipboard**
5. Click "Add Comment"
6. Screenshots automatically upload with comment

### Viewing Screenshots
1. Open review note detail
2. Scroll to "Attachments" section
3. Click any thumbnail to open lightbox
4. Use download button to save screenshot
5. Press ESC or click outside to close

## Security & Validation

### Client-Side
- Max 10 screenshots per note, 5 per comment
- File size validation (5MB max)
- Image compression before upload

### Server-Side
- File type validation (PNG/JPEG only)
- File size validation (5MB max)
- MIME type verification
- User authentication required
- Task access verification
- Rate limiting applied

## Performance Considerations

- Screenshots compressed to 85% quality
- Lazy loading of thumbnails
- Blob storage for scalability
- Efficient database queries with indexes
- SessionStorage for cross-page sessions (temporary, cleared on completion)
- Automatic cleanup of session data

## Testing Checklist

### Basic Functionality
- ✅ Create note with single screenshot
- ✅ Create note with multiple screenshots (3+)
- ✅ Add screenshot to existing note comment
- ✅ Cancel screenshot capture mid-selection
- ✅ Remove screenshot before upload

### Edge Cases
- ✅ Large selection areas (full page)
- ✅ Small selection areas (single button)
- ✅ Screenshot upload failure handling
- ✅ Network error during upload
- ✅ Maximum screenshots limit

### Display & Viewing
- ✅ View screenshot in lightbox
- ✅ Download screenshot
- ✅ Multiple attachments display
- ✅ Responsive thumbnail grid

## Migration Required

Run the following migration to add commentId support:

```bash
# Apply migration
npx prisma migrate deploy

# Or manually run
# prisma/migrations/20251223_add_commentid_to_attachments/migration.sql
```

## Dependencies

- `html2canvas`: ^1.4.1 (for screenshot capture)
- `@azure/storage-blob`: ^12.24.0 (for blob storage)

## Recent Updates

### Cross-Page Screenshot Capture (Latest)
- ✅ **Navigate to any page/tab and capture screenshots**
- ✅ Persistent floating control panel
- ✅ Screenshots stored in sessionStorage
- ✅ Automatic return to original modal
- ✅ Minimizable control panel
- ✅ Visual screenshot preview grid
- ✅ Session state management

### URL Auto-Copy Feature
- ✅ Automatically copies current page URL to clipboard when capturing
- ✅ Captured URL stored with screenshot metadata
- ✅ Reference URL field auto-fills from first screenshot
- ✅ Shows captured URL in screenshot thumbnail
- ✅ User-friendly notifications in UI

## Future Enhancements

- [ ] Annotation tools (arrows, text, highlights)
- [ ] Screenshot editing before upload
- [ ] Drag & drop reordering of screenshots
- [ ] Bulk download of all attachments
- [ ] Image optimization/resizing on server
- [ ] SAS URL generation for secure direct access
- [ ] Screenshot comparison view
- [ ] Copy URL button on screenshot thumbnails
- [ ] Browser extension for easier cross-tab capture
- [ ] Keyboard shortcuts for quick capture (e.g., Ctrl+Shift+S)

