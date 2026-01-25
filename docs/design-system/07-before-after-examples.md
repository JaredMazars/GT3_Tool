# Before/After Examples

Real code examples showing violations and correct implementations for the Forvis Mazars Design System.

## Table of Contents

- [Browser Dialog Migration](#browser-dialog-migration)
- [Gradient Centralization](#gradient-centralization)
- [Button Component Migration](#button-component-migration)
- [Alert/Banner Migration](#alertbanner-migration)
- [Color Class Migration](#color-class-migration)
- [Form Component Migration](#form-component-migration)
- [Modal Pattern Migration](#modal-pattern-migration)
- [Icon Container Migration](#icon-container-migration)
- [Table Styling Migration](#table-styling-migration)
- [Stat Card Migration](#stat-card-migration)

---

## Browser Dialog Migration

### Example 1: Confirmation Dialog

**❌ BEFORE (Violation):**
```tsx
const handleDelete = async () => {
  if (window.confirm('Are you sure you want to delete this client?')) {
    await deleteClient(clientId);
    navigate('/clients');
  }
};

<button onClick={handleDelete}>Delete Client</button>
```

**✅ AFTER (Correct):**
```tsx
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { Button } from '@/components/ui';
import { useState } from 'react';

const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

const handleDelete = async () => {
  await deleteClient(clientId);
  setShowDeleteConfirm(false);
  navigate('/clients');
};

<>
  <Button
    variant="danger"
    onClick={() => setShowDeleteConfirm(true)}
  >
    Delete Client
  </Button>

  <ConfirmModal
    isOpen={showDeleteConfirm}
    onClose={() => setShowDeleteConfirm(false)}
    onConfirm={handleDelete}
    title="Confirm Deletion"
    message="Are you sure you want to delete this client? This action cannot be undone."
    variant="danger"
    confirmText="Delete"
    cancelText="Cancel"
  />
</>
```

---

### Example 2: Alert Dialog

**❌ BEFORE (Violation):**
```tsx
try {
  await saveChanges();
  alert('Changes saved successfully!');
} catch (err) {
  alert('Failed to save changes. Please try again.');
}
```

**✅ AFTER (Correct):**
```tsx
import { Banner } from '@/components/ui';
import { useState, useEffect } from 'react';

const [success, setSuccess] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);

// Auto-dismiss success after 5 seconds
useEffect(() => {
  if (success) {
    const timer = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(timer);
  }
}, [success]);

// In JSX
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

// In handler
try {
  await saveChanges();
  setSuccess('Changes saved successfully!');
} catch (err) {
  setError('Failed to save changes. Please try again.');
}
```

---

### Example 3: Unsaved Changes Warning

**❌ BEFORE (Violation):**
```tsx
const handleCancel = () => {
  if (hasUnsavedChanges) {
    if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
      navigate(-1);
    }
  } else {
    navigate(-1);
  }
};
```

**✅ AFTER (Correct):**
```tsx
import { ConfirmModal } from '@/components/shared/ConfirmModal';

const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

const handleCancel = () => {
  if (hasUnsavedChanges) {
    setShowUnsavedWarning(true);
  } else {
    navigate(-1);
  }
};

<>
  <Button variant="secondary" onClick={handleCancel}>
    Cancel
  </Button>

  <ConfirmModal
    isOpen={showUnsavedWarning}
    onClose={() => setShowUnsavedWarning(false)}
    onConfirm={() => {
      setShowUnsavedWarning(false);
      navigate(-1);
    }}
    title="Unsaved Changes"
    message="You have unsaved changes. Are you sure you want to leave without saving?"
    variant="warning"
    confirmText="Leave Without Saving"
    cancelText="Stay"
  />
</>
```

---

## Gradient Centralization

### Example 1: Dashboard Card Gradient (CSS Class)

**❌ BEFORE (Violation):**
```tsx
<div
  className="rounded-lg p-4 border border-forvis-blue-100 shadow-corporate"
  style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}
>
  <h3 className="text-lg font-semibold">Total Revenue</h3>
  <p className="text-2xl font-bold text-forvis-blue-600">$1.2M</p>
</div>
```

**✅ AFTER (Correct - CSS Class):**
```tsx
<div className="bg-gradient-dashboard-card rounded-lg p-4 border border-forvis-blue-100 shadow-corporate">
  <h3 className="text-lg font-semibold">Total Revenue</h3>
  <p className="text-2xl font-bold text-forvis-blue-600">$1.2M</p>
</div>
```

---

### Example 2: Button Gradient (Constant)

**❌ BEFORE (Violation):**
```tsx
<button
  onClick={handleSubmit}
  className="px-4 py-2 text-white rounded-lg font-medium"
  style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
>
  Submit
</button>
```

**✅ AFTER (Correct - Button Component):**
```tsx
import { Button } from '@/components/ui';

<Button variant="gradient" onClick={handleSubmit}>
  Submit
</Button>
```

---

### Example 3: Icon Container Gradient (Constant)

**❌ BEFORE (Violation):**
```tsx
<div
  className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm"
  style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
>
  <DollarSign className="h-6 w-6 text-white" />
</div>
```

**✅ AFTER (Correct - CSS Class or Constant):**

**Option 1 - CSS Class:**
```tsx
<div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm bg-gradient-icon-standard">
  <DollarSign className="h-6 w-6 text-white" />
</div>
```

**Option 2 - Constant:**
```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';

<div
  className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm"
  style={{ background: GRADIENTS.icon.standard }}
>
  <DollarSign className="h-6 w-6 text-white" />
</div>
```

---

### Example 4: Conditional Gradient (Utility Function)

**❌ BEFORE (Violation):**
```tsx
const gradient = isSuccess
  ? 'linear-gradient(135deg, #E8F3F1 0%, #C8E3DF 100%)'
  : 'linear-gradient(135deg, #F7EBF0 0%, #EDCED9 100%)';

<div style={{ background: gradient }}>
  {message}
</div>
```

**✅ AFTER (Correct - Utility Function):**
```tsx
import { getSemanticGradient } from '@/lib/design-system/gradients';

const gradient = getSemanticGradient(
  isSuccess ? 'success' : 'error',
  'light'
);

<div style={{ background: gradient }}>
  {message}
</div>
```

---

### Example 5: Modal Header Gradient (Constant)

**❌ BEFORE (Violation):**
```tsx
<div
  className="p-4"
  style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)' }}
>
  <h2 className="text-xl font-bold text-white">Create Task</h2>
</div>
```

**✅ AFTER (Correct - Constant):**
```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';

<div
  className="p-4"
  style={{ background: GRADIENTS.primary.diagonal }}
>
  <h2 className="text-xl font-bold text-white">Create Task</h2>
</div>
```

---

## Button Component Migration

### Example 1: Primary Action Button

**❌ BEFORE (Violation):**
```tsx
<button
  onClick={handleSave}
  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-forvis-blue-500 hover:bg-forvis-blue-600"
>
  Save Changes
</button>
```

**✅ AFTER (Correct):**
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" onClick={handleSave}>
  Save Changes
</Button>
```

---

### Example 2: Button with Loading State

**❌ BEFORE (Violation):**
```tsx
<button
  onClick={handleSubmit}
  disabled={isSubmitting}
  className="px-4 py-2 text-white rounded-lg bg-forvis-blue-500"
>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</button>
```

**✅ AFTER (Correct):**
```tsx
import { Button } from '@/components/ui';

<Button
  variant="primary"
  onClick={handleSubmit}
  loading={isSubmitting}
>
  Submit
</Button>
```

---

### Example 3: Button with Icon

**❌ BEFORE (Violation):**
```tsx
import { Plus } from 'lucide-react';

<button className="flex items-center gap-2 px-4 py-2 text-white rounded-lg bg-forvis-blue-500">
  <Plus className="h-4 w-4" />
  Add Client
</button>
```

**✅ AFTER (Correct):**
```tsx
import { Button } from '@/components/ui';
import { Plus } from 'lucide-react';

<Button
  variant="gradient"
  icon={<Plus className="h-4 w-4" />}
>
  Add Client
</Button>
```

---

### Example 4: Danger Button

**❌ BEFORE (Violation):**
```tsx
<button
  onClick={() => setShowDeleteConfirm(true)}
  className="px-4 py-2 text-white rounded-lg bg-red-600 hover:bg-red-700"
>
  Delete
</button>
```

**✅ AFTER (Correct):**
```tsx
import { Button } from '@/components/ui';

<Button
  variant="danger"
  onClick={() => setShowDeleteConfirm(true)}
>
  Delete
</Button>
```

---

### Example 5: Button Group

**❌ BEFORE (Violation):**
```tsx
<div className="flex justify-end gap-3">
  <button
    onClick={onCancel}
    className="px-4 py-2 border border-forvis-gray-300 rounded-lg text-forvis-gray-700 bg-white hover:bg-forvis-gray-50"
  >
    Cancel
  </button>
  <button
    onClick={onSave}
    disabled={isSaving}
    className="px-4 py-2 text-white rounded-lg bg-forvis-blue-500"
  >
    {isSaving ? 'Saving...' : 'Save'}
  </button>
</div>
```

**✅ AFTER (Correct):**
```tsx
import { Button } from '@/components/ui';

<div className="flex justify-end gap-3">
  <Button variant="secondary" onClick={onCancel}>
    Cancel
  </Button>
  <Button variant="gradient" onClick={onSave} loading={isSaving}>
    Save
  </Button>
</div>
```

---

## Alert/Banner Migration

### Example 1: Error Alert

**❌ BEFORE (Violation):**
```tsx
{error && (
  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
    <div className="flex items-start gap-3">
      <XCircle className="h-5 w-5 text-red-600" />
      <div>
        <h3 className="text-sm font-semibold text-red-900">Error</h3>
        <p className="text-sm text-red-800 mt-1">{error}</p>
      </div>
    </div>
  </div>
)}
```

**✅ AFTER (Correct):**
```tsx
import { Banner } from '@/components/ui';

{error && (
  <Banner
    variant="error"
    title="Error"
    message={error}
    dismissible
    onDismiss={() => setError(null)}
  />
)}
```

---

### Example 2: Success Toast to Banner

**❌ BEFORE (Violation):**
```tsx
import { toast } from 'sonner';

const handleSave = async () => {
  try {
    await saveData();
    toast.success('Changes saved successfully');
  } catch (err) {
    toast.error('Failed to save changes');
  }
};
```

**✅ AFTER (Correct):**
```tsx
import { Banner } from '@/components/ui';
import { useState, useEffect } from 'react';

const [success, setSuccess] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  if (success) {
    const timer = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(timer);
  }
}, [success]);

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

const handleSave = async () => {
  try {
    await saveData();
    setSuccess('Changes saved successfully');
  } catch (err) {
    setError('Failed to save changes');
  }
};
```

---

## Color Class Migration

### Example 1: Status Badge

**❌ BEFORE (Violation):**
```tsx
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
  <CheckCircle className="h-3 w-3 mr-1" />
  Approved
</span>
```

**✅ AFTER (Correct):**
```tsx
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-forvis-success-100 text-forvis-success-800 border border-forvis-success-200">
  <CheckCircle className="h-3 w-3 mr-1" />
  Approved
</span>
```

---

### Example 2: Error Message

**❌ BEFORE (Violation):**
```tsx
{error && (
  <p className="text-sm text-red-600 mt-1">{error}</p>
)}
```

**✅ AFTER (Correct):**
```tsx
{error && (
  <p className="text-sm text-forvis-error-600 mt-1">{error}</p>
)}
```

---

### Example 3: Financial Values

**❌ BEFORE (Violation):**
```tsx
const value = -5000;
const isPositive = value >= 0;

<span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
  {formatCurrency(value)}
</span>
```

**✅ AFTER (Correct):**
```tsx
const value = -5000;
const isPositive = value >= 0;

<span className={`font-semibold ${isPositive ? 'text-forvis-success-600' : 'text-forvis-error-600'}`}>
  {formatCurrency(value)}
</span>
```

---

## Form Component Migration

### Example 1: Text Input

**❌ BEFORE (Violation):**
```tsx
<div>
  <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
    Client Name *
  </label>
  <input
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg focus:border-forvis-blue-500 focus:ring-2 focus:ring-forvis-blue-500"
  />
  {nameError && (
    <p className="text-sm text-red-600 mt-1">{nameError}</p>
  )}
</div>
```

**✅ AFTER (Correct):**
```tsx
import { Input } from '@/components/ui';

<Input
  variant="text"
  label="Client Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={nameError}
  required
/>
```

---

### Example 2: Select Dropdown

**❌ BEFORE (Violation):**
```tsx
<div>
  <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
    Status
  </label>
  <select
    value={status}
    onChange={(e) => setStatus(e.target.value)}
    className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg"
  >
    <option value="">Select status...</option>
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
    <option value="pending">Pending</option>
  </select>
</div>
```

**✅ AFTER (Correct):**
```tsx
import { Input } from '@/components/ui';

<Input
  variant="select"
  label="Status"
  value={status}
  onChange={(e) => setStatus(e.target.value)}
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ]}
/>
```

---

### Example 3: Textarea

**❌ BEFORE (Violation):**
```tsx
<div>
  <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
    Description
  </label>
  <textarea
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    rows={4}
    className="block w-full px-4 py-2 border border-forvis-gray-300 rounded-lg"
  />
</div>
```

**✅ AFTER (Correct):**
```tsx
import { Input } from '@/components/ui';

<Input
  variant="textarea"
  label="Description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={4}
/>
```

---

## Modal Pattern Migration

### Example 1: Custom Modal to Standard Pattern

**❌ BEFORE (Violation - Inconsistent styling):**
```tsx
{showModal && (
  <div className="fixed inset-0 z-50">
    <div className="fixed inset-0 bg-black opacity-50" onClick={onClose} />
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div className="bg-white rounded-md p-6 max-w-md">
        <h2 className="text-lg font-bold mb-4">Modal Title</h2>
        <p>Modal content</p>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose}>Cancel</button>
          <button onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  </div>
)}
```

**✅ AFTER (Correct - Standard pattern with gradient):**
```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';
import { Button } from '@/components/ui';

{showModal && (
  <div className="fixed inset-0 z-50">
    <div
      className="fixed inset-0 bg-black bg-opacity-50"
      onClick={onClose}
    />
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-corporate-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header with gradient */}
        <div
          className="p-4"
          style={{ background: GRADIENTS.primary.diagonal }}
        >
          <h2 className="text-xl font-bold text-white">Modal Title</h2>
        </div>

        {/* Body */}
        <div className="p-6">
          <p>Modal content</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-forvis-gray-200">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  </div>
)}
```

---

## Icon Container Migration

### Example 1: Dashboard Card Icon

**❌ BEFORE (Violation - Dark gradient):**
```tsx
<div
  className="w-12 h-12 rounded-lg flex items-center justify-center"
  style={{ background: 'linear-gradient(to bottom right, #2E5AAC, #1C3667)' }}
>
  <Users className="h-6 w-6 text-white" />
</div>
```

**✅ AFTER (Correct - Light gradient):**
```tsx
<div className="w-12 h-12 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-sm bg-gradient-icon-standard">
  <Users className="h-6 w-6 text-white" />
</div>
```

---

### Example 2: Compact Icon Container

**❌ BEFORE (Violation):**
```tsx
<div
  className="w-10 h-10 rounded-md flex items-center justify-center"
  style={{ background: '#2E5AAC' }}
>
  <Icon className="h-5 w-5 text-white" />
</div>
```

**✅ AFTER (Correct):**
```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';

<div
  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm"
  style={{ background: GRADIENTS.icon.standard }}
>
  <Icon className="h-5 w-5 text-white" />
</div>
```

---

## Table Styling Migration

### Example 1: Table Header

**❌ BEFORE (Violation):**
```tsx
<div className="grid bg-forvis-blue-500 text-white py-2" style={{ gridTemplateColumns: '2fr 1fr 1fr 150px' }}>
  <div className="px-4">Name</div>
  <div className="px-4">Status</div>
  <div className="px-4">Amount</div>
  <div className="px-4">Actions</div>
</div>
```

**✅ AFTER (Correct):**
```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';

<div
  className="grid py-2 shadow-sm text-white font-semibold text-sm"
  style={{
    background: GRADIENTS.primary.horizontal,
    gridTemplateColumns: '2fr 1fr 1fr 150px',
  }}
>
  <div className="px-4">Name</div>
  <div className="px-4">Status</div>
  <div className="px-4">Amount</div>
  <div className="px-4 text-center">Actions</div>
</div>
```

---

## Stat Card Migration

### Example 1: Analytics Card

**❌ BEFORE (Violation):**
```tsx
<div className="bg-blue-50 rounded-lg p-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs text-gray-600 uppercase">Total Revenue</p>
      <p className="text-2xl font-bold text-blue-600">$1.2M</p>
    </div>
    <div className="rounded-full p-2 bg-blue-500">
      <DollarSign className="w-5 h-5 text-white" />
    </div>
  </div>
</div>
```

**✅ AFTER (Correct):**
```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';
import { DollarSign } from 'lucide-react';

<div
  className="rounded-lg p-4 border border-forvis-blue-100 shadow-corporate"
  style={{ background: GRADIENTS.dashboard.card }}
>
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
        Total Revenue
      </p>
      <p className="text-2xl font-bold mt-2 text-forvis-blue-600">$1.2M</p>
    </div>
    <div
      className="rounded-full p-2.5"
      style={{ background: GRADIENTS.icon.standard }}
    >
      <DollarSign className="w-5 h-5 text-white" />
    </div>
  </div>
</div>
```

---

## Related Documentation

- [Migration Guide](./06-migration-guide.md) - Step-by-step migration process
- [Component Catalog](./04-component-catalog.md) - Component reference
- [Pattern Library](./05-pattern-library.md) - UI pattern reference
- [Gradient System](./03-gradients.md) - Gradient documentation
- [Color System](./02-color-system.md) - Color documentation
