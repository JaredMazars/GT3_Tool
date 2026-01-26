# Migration Guide

Step-by-step guide for migrating domains to the centralized design system.

## Table of Contents

- [Overview](#overview)
- [Pre-Migration Checklist](#pre-migration-checklist)
- [Migration Steps](#migration-steps)
  - [Step 1: Replace Browser Dialogs](#step-1-replace-browser-dialogs)
  - [Step 2: Replace Custom Buttons](#step-2-replace-custom-buttons)
  - [Step 3: Centralize Inline Gradients](#step-3-centralize-inline-gradients)
  - [Step 4: Replace Custom Alerts](#step-4-replace-custom-alerts)
  - [Step 5: Standardize Color Usage](#step-5-standardize-color-usage)
  - [Step 6: Update Form Components](#step-6-update-form-components)
- [Domain Checklist Template](#domain-checklist-template)
- [Verification Steps](#verification-steps)
- [Common Issues & Solutions](#common-issues--solutions)

## Overview

This guide provides a systematic approach to migrating each domain to use centralized styling components and patterns.

**Migration Goals:**
- ✅ Remove all browser dialogs (window.confirm, alert, prompt)
- ✅ Replace custom buttons with Button component
- ✅ Centralize all inline gradients
- ✅ Use Banner component for notifications
- ✅ Standardize Forvis brand colors
- ✅ Use Input component for forms

**Estimated Time per Domain:**
- Small domain (5-10 files): 1-2 hours
- Medium domain (10-20 files): 2-4 hours
- Large domain (20+ files): 4-8 hours

---

## Pre-Migration Checklist

Before starting migration, complete these preparation steps:

### 1. Identify Domain Files

List all component and page files in the domain directory.

**Example for Admin domain:**
```bash
# List all TypeScript/TSX files
find src/app/dashboard/admin -name "*.tsx" -o -name "*.ts" > admin-files.txt
find src/components/features/admin -name "*.tsx" -o -name "*.ts" >> admin-files.txt
```

### 2. Search for Violations

Identify instances that need fixing:

```bash
# Browser dialogs
grep -r "window.confirm\|window.alert\|window.prompt" src/app/dashboard/[domain]/
grep -r "window.confirm\|window.alert\|window.prompt" src/components/features/[domain]/

# Inline gradients
grep -r "linear-gradient" src/app/dashboard/[domain]/
grep -r "linear-gradient" src/components/features/[domain]/

# Custom button implementations (need manual review)
grep -r "<button" src/app/dashboard/[domain]/
grep -r "<button" src/components/features/[domain]/

# Old Tailwind colors
grep -r "text-red-\|bg-red-\|border-red-" src/app/dashboard/[domain]/
grep -r "text-green-\|bg-green-\|border-green-" src/app/dashboard/[domain]/
grep -r "text-yellow-\|bg-yellow-\|text-amber-" src/app/dashboard/[domain]/
```

### 3. Create Domain Tracking Document

Copy the [Domain Checklist Template](#domain-checklist-template) below and create a file:
```
docs/migration-checklists/[domain-name].md
```

Fill in specific counts and file paths from your searches.

---

## Migration Steps

### Step 1: Replace Browser Dialogs

**Critical:** Browser dialogs violate Forvis design standards and must be removed.

#### Find Browser Dialogs

Search for:
- `window.confirm()`
- `confirm()`
- `window.alert()`
- `alert()`
- `window.prompt()`
- `prompt()`

#### Replace with ConfirmModal

**Before:**
```tsx
const handleDelete = async () => {
  if (window.confirm('Are you sure you want to delete this item?')) {
    await deleteItem(id);
    navigate('/list');
  }
};

<button onClick={handleDelete}>Delete</button>
```

**After:**
```tsx
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { Button } from '@/components/ui';

const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

const handleDelete = async () => {
  await deleteItem(id);
  setShowDeleteConfirm(false);
  navigate('/list');
};

<>
  <Button
    variant="danger"
    onClick={() => setShowDeleteConfirm(true)}
  >
    Delete
  </Button>

  <ConfirmModal
    isOpen={showDeleteConfirm}
    onClose={() => setShowDeleteConfirm(false)}
    onConfirm={handleDelete}
    title="Confirm Deletion"
    message="Are you sure you want to delete this item? This action cannot be undone."
    variant="danger"
    confirmText="Delete"
    cancelText="Cancel"
  />
</>
```

#### Replace alert() with Banner

**Before:**
```tsx
try {
  await saveData();
} catch (err) {
  alert('Failed to save data');
}
```

**After:**
```tsx
import { Banner } from '@/components/ui';

const [error, setError] = useState<string | null>(null);

{error && (
  <Banner
    variant="error"
    message={error}
    dismissible
    onDismiss={() => setError(null)}
  />
)}

try {
  await saveData();
} catch (err) {
  setError('Failed to save data. Please try again.');
}
```

#### Checklist

- [ ] All `window.confirm()` replaced with ConfirmModal
- [ ] All `alert()` replaced with Banner
- [ ] All `prompt()` replaced with Input in modal
- [ ] State management added for modals
- [ ] Import statements added
- [ ] Test all confirmation flows

---

### Step 2: Replace Custom Buttons

**Goal:** Use Button component from `@/components/ui` for all action buttons.

#### Find Custom Buttons

Look for:
- `<button className="...custom styles...">`
- Buttons with inline styles
- Buttons with gradient backgrounds

#### Replace with Button Component

**Before:**
```tsx
<button
  onClick={handleSave}
  className="px-4 py-2 text-white rounded-lg"
  style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
>
  Save Changes
</button>
```

**After:**
```tsx
import { Button } from '@/components/ui';

<Button
  variant="gradient"
  onClick={handleSave}
>
  Save Changes
</Button>
```

#### Button Variant Guide

| Old Style | New Variant | Usage |
|---|---|---|
| Blue solid | `primary` | Standard actions |
| Blue gradient | `gradient` | Primary CTAs |
| Outline/border | `secondary` | Cancel/back actions |
| Red/danger | `danger` | Destructive actions |

#### With Loading State

**Before:**
```tsx
<button disabled={saving}>
  {saving ? 'Saving...' : 'Save'}
</button>
```

**After:**
```tsx
<Button variant="gradient" loading={saving}>
  Save
</Button>
```

#### Checklist

- [ ] All custom `<button>` elements reviewed
- [ ] Action buttons use Button component
- [ ] Correct variant chosen for each button
- [ ] Loading states use `loading` prop
- [ ] Icons added where appropriate
- [ ] Import statements added

---

### Step 3: Centralize Inline Gradients

**Goal:** Replace all inline gradient strings with centralized system.

#### Find Inline Gradients

Search for:
- `style={{ background: 'linear-gradient(...)'`
- `background: linear-gradient`

#### Choose Replacement Method

Three options available:

**Option 1: CSS Classes** (Recommended for static elements)
```tsx
// Before
<div style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}>

// After
<div className="bg-gradient-dashboard-card">
```

**Option 2: Constants** (Recommended for inline styles)
```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';

// Before
<div style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}>

// After
<div style={{ background: GRADIENTS.dashboard.card }}>
```

**Option 3: Utility Functions** (Recommended for dynamic/conditional)
```tsx
import { getGradient, getSemanticGradient } from '@/lib/design-system/gradients';

// Before
<div style={{ background: isSuccess ? 'linear-gradient(...)' : 'linear-gradient(...)' }}>

// After
<div style={{ background: getSemanticGradient(isSuccess ? 'success' : 'error', 'light') }}>
```

#### Gradient Mapping Guide

| Inline Gradient | Replacement |
|---|---|
| `linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)` | `GRADIENTS.primary.diagonal` |
| `linear-gradient(to right, #2E5AAC, #25488A)` | `GRADIENTS.primary.horizontal` |
| `linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)` | `GRADIENTS.dashboard.card` |
| `linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)` | `GRADIENTS.icon.standard` |
| `linear-gradient(135deg, #E8F3F1 0%, #C8E3DF 100%)` | `GRADIENTS.semantic.success.light` |
| `linear-gradient(135deg, #4E9B8E 0%, #2F6A5F 50%, #1F4540 100%)` | `GRADIENTS.semantic.success.button` |

See [03-gradients.md](./03-gradients.md) for complete gradient reference.

#### Checklist

- [ ] All inline gradient strings identified
- [ ] Gradients mapped to centralized system
- [ ] Method chosen (CSS class, constant, or function)
- [ ] Import statements added
- [ ] Visual appearance verified unchanged
- [ ] No inline gradient strings remain

---

### Step 4: Replace Custom Alerts

**Goal:** Use Banner component for all notifications and alerts.

#### Replace Custom Alert Divs

**Before:**
```tsx
<div className="bg-red-50 border-2 border-red-200 text-red-800 rounded-lg p-4">
  <p>Error: Operation failed</p>
</div>
```

**After:**
```tsx
import { Banner } from '@/components/ui';

<Banner variant="error" message="Operation failed. Please try again." />
```

#### Replace Toast Libraries

If using sonner, react-toastify, or react-hot-toast:

**Before:**
```tsx
import { toast } from 'sonner';

toast.success('Saved successfully');
toast.error('Operation failed');
```

**After:**
```tsx
import { Banner } from '@/components/ui';

const [success, setSuccess] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);

{success && (
  <Banner
    variant="success"
    message={success}
    dismissible
    onDismiss={() => setSuccess(null)}
  />
)}

{error && (
  <Banner
    variant="error"
    message={error}
    dismissible
    onDismiss={() => setError(null)}
  />
)}

// Trigger
setSuccess('Saved successfully');
setError('Operation failed');
```

#### Auto-Dismiss Pattern (5 seconds for success)

```tsx
useEffect(() => {
  if (success) {
    const timer = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(timer);
  }
}, [success]);
```

#### Checklist

- [ ] Custom alert divs replaced with Banner
- [ ] Toast libraries removed (sonner, react-toastify)
- [ ] State management added for banners
- [ ] Success messages auto-dismiss after 5 seconds
- [ ] Error messages persist until dismissed
- [ ] Import statements added

---

### Step 5: Standardize Color Usage

**Goal:** Use Forvis brand colors instead of default Tailwind colors.

#### Color Migration Table

| Old (Tailwind Default) | New (Forvis Brand) |
|---|---|
| `text-red-600` | `text-forvis-error-600` |
| `bg-red-50` | `bg-forvis-error-50` |
| `border-red-200` | `border-forvis-error-200` |
| `text-green-600` | `text-forvis-success-600` |
| `bg-green-50` | `bg-forvis-success-50` |
| `border-green-200` | `border-forvis-success-200` |
| `text-yellow-600` / `text-amber-600` | `text-forvis-warning-600` |
| `bg-yellow-50` / `bg-amber-50` | `bg-forvis-warning-50` |
| `border-yellow-200` / `border-amber-200` | `border-forvis-warning-200` |

See [02-color-system.md](./02-color-system.md) for complete color reference.

#### Find and Replace

**Using grep + sed:**
```bash
# Find all instances (review first)
grep -r "text-red-600" src/app/dashboard/[domain]/

# Replace (backup first!)
find src/app/dashboard/[domain]/ -name "*.tsx" -exec sed -i '' 's/text-red-600/text-forvis-error-600/g' {} +
find src/app/dashboard/[domain]/ -name "*.tsx" -exec sed -i '' 's/bg-red-50/bg-forvis-error-50/g' {} +
find src/app/dashboard/[domain]/ -name "*.tsx" -exec sed -i '' 's/text-green-600/text-forvis-success-600/g' {} +
```

**Manual Review:** Always review changes to ensure semantic meaning is preserved.

#### Checklist

- [ ] All `text-red-*` replaced with `text-forvis-error-*`
- [ ] All `bg-red-*` replaced with `bg-forvis-error-*`
- [ ] All `border-red-*` replaced with `border-forvis-error-*`
- [ ] All `text-green-*` replaced with `text-forvis-success-*`
- [ ] All `bg-green-*` replaced with `bg-forvis-success-*`
- [ ] All `text-yellow-*` and `text-amber-*` replaced with `text-forvis-warning-*`
- [ ] Visual appearance verified
- [ ] Semantic meaning preserved

---

### Step 6: Update Form Components

**Goal:** Use Input component from `@/components/ui` for all form fields.

#### Replace Custom Inputs

**Before:**
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700">
    Email
  </label>
  <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg"
  />
  {emailError && (
    <p className="mt-1 text-sm text-red-600">{emailError}</p>
  )}
</div>
```

**After:**
```tsx
import { Input } from '@/components/ui';

<Input
  variant="email"
  label="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={emailError}
  required
/>
```

#### Input Variant Guide

| Field Type | Variant |
|---|---|
| Text | `text` |
| Email | `email` |
| Password | `password` |
| Number | `number` |
| Multi-line | `textarea` |
| Dropdown | `select` |

#### Checklist

- [ ] All custom `<input>` elements reviewed
- [ ] Form fields use Input component
- [ ] Correct variant chosen for each field
- [ ] Labels moved to `label` prop
- [ ] Error messages moved to `error` prop
- [ ] Required fields marked with `required` prop
- [ ] Import statements added

---

## Domain Checklist Template

Copy this template to track migration progress:

```markdown
# Domain Migration: [DOMAIN NAME]

**Domain Path:** `src/app/dashboard/[domain]/` and `src/components/features/[domain]/`
**Started:** [DATE]
**Completed:** [DATE]
**Migrator:** [NAME]

## Files to Migrate

### Page Files
- [ ] `path/to/page1.tsx`
- [ ] `path/to/page2.tsx`
- [ ] `path/to/page3.tsx`

### Component Files
- [ ] `path/to/Component1.tsx`
- [ ] `path/to/Component2.tsx`
- [ ] `path/to/Component3.tsx`

## Migration Tasks

### Step 1: Browser Dialogs
**Found:** [X] instances

**Files:**
- [ ] `file1.tsx` - Line [X]: `window.confirm()`
- [ ] `file2.tsx` - Line [X]: `alert()`

**Status:** [ ] Complete

---

### Step 2: Custom Buttons
**Found:** [Y] instances (manual review)

**Files:**
- [ ] `file1.tsx` - [X] custom buttons
- [ ] `file2.tsx` - [X] custom buttons

**Status:** [ ] Complete

---

### Step 3: Inline Gradients
**Found:** [Z] instances

**Files:**
- [ ] `file1.tsx` - [X] inline gradients
- [ ] `file2.tsx` - [X] inline gradients

**Status:** [ ] Complete

---

### Step 4: Custom Alerts
**Found:** [N] instances

**Files:**
- [ ] `file1.tsx` - Custom alert divs
- [ ] `file2.tsx` - Toast library usage

**Status:** [ ] Complete

---

### Step 5: Color Classes
**Found:** [M] instances

**Breakdown:**
- [ ] `text-red-*` classes: [X]
- [ ] `bg-green-*` classes: [X]
- [ ] `text-yellow-*` classes: [X]

**Status:** [ ] Complete

---

### Step 6: Form Components
**Found:** [P] instances

**Files:**
- [ ] `file1.tsx` - [X] custom inputs
- [ ] `file2.tsx` - [X] custom inputs

**Status:** [ ] Complete

---

## Verification Checklist

- [ ] All browser dialogs removed (grep confirms 0 instances)
- [ ] All buttons use Button component
- [ ] No inline gradients remain (grep confirms 0 instances)
- [ ] Forvis colors used consistently
- [ ] All forms use Input component
- [ ] No console errors in browser
- [ ] No TypeScript errors
- [ ] Visual regression check passed
- [ ] All functionality works as before

## Notes

[Add any notes, issues encountered, or special considerations here]

## Sign-Off

- [ ] Code review completed
- [ ] QA testing passed
- [ ] Documentation updated
- [ ] Migration complete ✓
```

---

## Verification Steps

After completing migration, verify changes:

### 1. Code Search Verification

```bash
# Verify no browser dialogs remain
grep -r "window.confirm\|window.alert\|window.prompt\|confirm()\|alert()" src/app/dashboard/[domain]/
# Should return: no matches

# Verify no inline gradients remain
grep -r "linear-gradient" src/app/dashboard/[domain]/
# Should return: no matches (or only in comments)

# Verify no old Tailwind colors remain
grep -r "text-red-[0-9]\|bg-green-[0-9]\|text-yellow-[0-9]" src/app/dashboard/[domain]/
# Should return: no matches
```

### 2. TypeScript Verification

```bash
# Check for TypeScript errors
npm run type-check
# Should pass with no errors
```

### 3. Build Verification

```bash
# Verify application builds successfully
npm run build
# Should complete without errors
```

### 4. Visual Regression Testing

- [ ] Load each page in domain
- [ ] Verify colors match previous appearance
- [ ] Verify gradients look correct
- [ ] Verify buttons styled correctly
- [ ] Verify forms work properly
- [ ] Test all interactive elements
- [ ] Check responsive layouts

### 5. Functional Testing

- [ ] Test all confirmation flows (modals open/close)
- [ ] Test all form submissions
- [ ] Test all button actions
- [ ] Test all navigation
- [ ] Test error states
- [ ] Test success states

---

## Common Issues & Solutions

### Issue: Modal Not Showing

**Problem:** ConfirmModal added but doesn't appear.

**Solution:** Check state management:
```tsx
// ❌ WRONG - State not managed
<ConfirmModal isOpen={true} ... />

// ✅ CORRECT - State managed
const [showModal, setShowModal] = useState(false);
<ConfirmModal isOpen={showModal} onClose={() => setShowModal(false)} ... />
```

---

### Issue: Gradient Looks Different

**Problem:** Centralized gradient doesn't match original.

**Solution:** Verify gradient mapping:
1. Copy original gradient string
2. Search in `src/lib/design-system/gradients.ts`
3. If not found, check [03-gradients.md](./03-gradients.md)
4. If still not found, add to gradients.ts first

---

### Issue: Button Not Styled Correctly

**Problem:** Button component doesn't match old styling.

**Solution:** Choose correct variant:
- Blue solid → `primary`
- Blue gradient → `gradient`
- Outline → `secondary`
- Red → `danger`

If none match, the old button may have been non-standard. Use closest match.

---

### Issue: Colors Look Wrong

**Problem:** Forvis colors don't match old colors exactly.

**Solution:** This is expected. Forvis colors are professional brand colors. Verify semantic meaning is preserved:
- Red/error → Forvis error (burgundy)
- Green/success → Forvis success (teal)
- Yellow/warning → Forvis warning (ochre)

If colors need adjustment, update design system, not individual files.

---

### Issue: Form Validation Broken

**Problem:** Input component error display different.

**Solution:** Input component handles errors differently:
```tsx
// ❌ OLD WAY
{error && <p className="text-red-600">{error}</p>}

// ✅ NEW WAY
<Input error={error} ... />
// Error automatically displays below input
```

---

## Related Documentation

- [Component Catalog](./04-component-catalog.md) - Component reference
- [Pattern Library](./05-pattern-library.md) - Common patterns
- [Gradient System](./03-gradients.md) - Gradient reference
- [Color System](./02-color-system.md) - Color reference
- [Before/After Examples](./07-before-after-examples.md) - Code examples
