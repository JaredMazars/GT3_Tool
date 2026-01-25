# Pattern Library

Common UI patterns for the Forvis Mazars Design System.

## Table of Contents

- [Overview](#overview)
- [Modal Patterns](#modal-patterns)
- [Form Patterns](#form-patterns)
- [Data Display Patterns](#data-display-patterns)
- [Alert & Notification Patterns](#alert--notification-patterns)
- [Button Patterns](#button-patterns)
- [Icon Container Patterns](#icon-container-patterns)
- [Navigation Patterns](#navigation-patterns)

## Overview

This pattern library provides reusable UI patterns for common scenarios. Each pattern includes:

- ✅ Complete code examples
- ✅ When to use the pattern
- ✅ Visual hierarchy guidelines
- ✅ Accessibility considerations

**Goal:** Consistent user experience across all domains by following established patterns.

---

## Modal Patterns

### ConfirmModal - Destructive Actions

**File:** `src/components/shared/ConfirmModal.tsx`

**Usage:** Confirmations for delete, remove, or other irreversible actions

**Props:**
- `isOpen: boolean` - Controls visibility
- `onClose: () => void` - Close handler
- `onConfirm: () => void` - Confirm action handler
- `title: string` - Modal title
- `message: string` - Confirmation message
- `confirmText?: string` - Confirm button text (default: "Confirm")
- `cancelText?: string` - Cancel button text (default: "Cancel")
- `variant?: 'danger' | 'warning' | 'info'` - Modal variant (default: "danger")

**Example:**
```tsx
import { ConfirmModal } from '@/components/shared/ConfirmModal';

const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

// Trigger
<Button
  variant="danger"
  onClick={() => setShowDeleteConfirm(true)}
>
  Delete Client
</Button>

// Modal
<ConfirmModal
  isOpen={showDeleteConfirm}
  onClose={() => setShowDeleteConfirm(false)}
  onConfirm={async () => {
    await deleteClient(clientId);
    setShowDeleteConfirm(false);
    navigate('/clients');
  }}
  title="Confirm Deletion"
  message="Are you sure you want to delete this client? This action cannot be undone."
  variant="danger"
  confirmText="Delete"
  cancelText="Cancel"
/>
```

**Variants:**
- **danger** - Red header, for destructive actions (delete, remove)
- **warning** - Yellow header, for cautions (archive, disable)
- **info** - Blue header, for non-destructive confirmations

**Best Practices:**
- ✅ Always use for destructive actions
- ✅ Explain consequences in message
- ✅ Use action verb in confirm button ("Delete", "Remove")
- ✅ Show loading state during async operations

---

### AlertModal - Success/Error/Warning Notifications

**File:** `src/components/shared/AlertModal.tsx`

**Usage:** Non-blocking notifications that require acknowledgment

**Props:**
- `isOpen: boolean` - Controls visibility
- `onClose: () => void` - Close handler
- `variant: 'success' | 'error' | 'warning' | 'info'` - Alert type
- `title: string` - Alert title
- `message: string | ReactNode` - Alert message

**Example:**
```tsx
import { AlertModal } from '@/components/shared/AlertModal';

const [alert, setAlert] = useState<{
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
} | null>(null);

// Trigger after operation
try {
  await saveData();
  setAlert({
    type: 'success',
    title: 'Success',
    message: 'Changes saved successfully',
  });
} catch (err) {
  setAlert({
    type: 'error',
    title: 'Error',
    message: 'Failed to save changes. Please try again.',
  });
}

// Modal
{alert && (
  <AlertModal
    isOpen={true}
    variant={alert.type}
    title={alert.title}
    message={alert.message}
    onClose={() => setAlert(null)}
  />
)}
```

**When to Use:**
- ✅ Operation completed successfully
- ✅ Important errors that need acknowledgment
- ✅ Warnings that require user awareness

**When NOT to Use:**
- ❌ Simple success messages (use Banner instead)
- ❌ Inline validation errors (use Input error prop)
- ❌ Multiple consecutive alerts (use Banner)

---

### Custom Domain Modals

**When to create custom modals:**
1. Complex forms (multi-step, conditional fields)
2. Domain-specific workflows
3. Data preview/details views
4. Custom interactions not covered by ConfirmModal/AlertModal

**Example Structure:**
```tsx
const CustomModal = ({ isOpen, onClose, data }) => {
  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
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
            {/* Content */}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-forvis-gray-200">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSubmit}>
              Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

**Best Practices:**
- ✅ Use gradient header for branding
- ✅ Max width: 400-800px depending on content
- ✅ Max height: 90vh with scroll
- ✅ ESC key to close (add event listener)
- ✅ Focus trap for accessibility

---

## Form Patterns

### Standard Form Layout

**Example:**
```tsx
import { Input, Button, Banner } from '@/components/ui';

const [formData, setFormData] = useState({ name: '', email: '', description: '' });
const [errors, setErrors] = useState<Record<string, string>>({});
const [success, setSuccess] = useState<string | null>(null);
const [saving, setSaving] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validate
  const newErrors: Record<string, string> = {};
  if (!formData.name) newErrors.name = 'Name is required';
  if (!formData.email) newErrors.email = 'Email is required';
  
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  // Submit
  setSaving(true);
  try {
    await submitForm(formData);
    setSuccess('Form submitted successfully');
    setFormData({ name: '', email: '', description: '' });
  } catch (err) {
    setErrors({ _form: 'Failed to submit form. Please try again.' });
  } finally {
    setSaving(false);
  }
};

<form onSubmit={handleSubmit} className="space-y-4">
  {/* Success message */}
  {success && (
    <Banner variant="success" message={success} dismissible onDismiss={() => setSuccess(null)} />
  )}

  {/* Form-level error */}
  {errors._form && (
    <Banner variant="error" message={errors._form} dismissible onDismiss={() => setErrors({})} />
  )}

  {/* Fields */}
  <Input
    variant="text"
    label="Name"
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
    error={errors.name}
    required
  />

  <Input
    variant="email"
    label="Email"
    value={formData.email}
    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
    error={errors.email}
    required
  />

  <Input
    variant="textarea"
    label="Description"
    value={formData.description}
    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
    rows={4}
  />

  {/* Actions */}
  <div className="flex justify-end gap-3 pt-4">
    <Button variant="secondary" onClick={() => navigate(-1)}>
      Cancel
    </Button>
    <Button variant="gradient" type="submit" loading={saving}>
      Submit
    </Button>
  </div>
</form>
```

**Best Practices:**
- ✅ Show success banner at top
- ✅ Show form-level errors at top
- ✅ Show field errors inline below inputs
- ✅ Disable submit during loading
- ✅ Clear form after successful submit
- ✅ Vertical spacing: `space-y-4` or `space-y-6`

---

### Multi-Step Forms

**Example:**
```tsx
const [step, setStep] = useState(1);
const [formData, setFormData] = useState({
  // Step 1 data
  name: '',
  email: '',
  // Step 2 data
  address: '',
  city: '',
});

const handleNext = () => {
  // Validate current step
  if (step === 1 && !formData.name) {
    setErrors({ name: 'Name is required' });
    return;
  }
  setStep(step + 1);
};

const handleBack = () => setStep(step - 1);

<div className="space-y-6">
  {/* Progress indicator */}
  <div className="flex items-center justify-center gap-2">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-forvis-blue-500 text-white' : 'bg-forvis-gray-200'}`}>
      1
    </div>
    <div className={`w-16 h-1 ${step >= 2 ? 'bg-forvis-blue-500' : 'bg-forvis-gray-200'}`} />
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-forvis-blue-500 text-white' : 'bg-forvis-gray-200'}`}>
      2
    </div>
  </div>

  {/* Step content */}
  {step === 1 && (
    <div className="space-y-4">
      <Input label="Name" value={formData.name} onChange={...} />
      <Input label="Email" value={formData.email} onChange={...} />
    </div>
  )}

  {step === 2 && (
    <div className="space-y-4">
      <Input label="Address" value={formData.address} onChange={...} />
      <Input label="City" value={formData.city} onChange={...} />
    </div>
  )}

  {/* Navigation */}
  <div className="flex justify-between pt-4">
    {step > 1 && (
      <Button variant="secondary" onClick={handleBack}>
        Back
      </Button>
    )}
    <div className="flex gap-3 ml-auto">
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      {step < 2 ? (
        <Button variant="gradient" onClick={handleNext}>
          Next
        </Button>
      ) : (
        <Button variant="gradient" onClick={handleSubmit} loading={saving}>
          Submit
        </Button>
      )}
    </div>
  </div>
</div>
```

---

### Search Forms with Comboboxes

**Example:**
```tsx
import { SearchCombobox, Button } from '@/components/ui';

const [clientId, setClientId] = useState<string | null>(null);
const [search, setSearch] = useState('');
const { data: clients, isLoading } = useClientSearch(search);

<div className="flex gap-3">
  <div className="flex-1">
    <SearchCombobox
      label="Select Client"
      value={clientId}
      onChange={setClientId}
      onSearchChange={setSearch}
      options={clients || []}
      isLoading={isLoading}
      minimumSearchChars={2}
      placeholder="Search clients..."
    />
  </div>
  <Button
    variant="gradient"
    onClick={handleSearch}
    disabled={!clientId}
    className="mt-6"
  >
    Search
  </Button>
</div>
```

---

## Data Display Patterns

### Table Headers with Gradient

**Example:**
```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';

<div
  className="grid py-2 shadow-sm text-white font-semibold text-sm"
  style={{
    background: GRADIENTS.primary.horizontal,
    gridTemplateColumns: '2fr 1fr 1fr 1fr 150px',
  }}
>
  <div className="px-4">Client Name</div>
  <div className="px-4">Status</div>
  <div className="px-4">Partner</div>
  <div className="px-4">Amount</div>
  <div className="px-4 text-center">Actions</div>
</div>
```

**Best Practices:**
- ✅ Use horizontal blue gradient for headers
- ✅ White text on gradient background
- ✅ Font: semibold, text-sm
- ✅ Grid layout for columns
- ✅ Padding: px-4, py-2

---

### Table Rows with Alternating Backgrounds

**Example:**
```tsx
{data.map((item, index) => (
  <div
    key={item.id}
    className={`grid cursor-pointer hover:bg-forvis-blue-50 transition-colors ${
      index % 2 === 0 ? 'bg-white' : 'bg-forvis-gray-50'
    }`}
    style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 150px' }}
    onClick={() => navigate(`/clients/${item.id}`)}
  >
    <div className="px-4 py-3">{item.name}</div>
    <div className="px-4 py-3">
      <Badge variant={item.status === 'active' ? 'green' : 'red'}>
        {item.status}
      </Badge>
    </div>
    <div className="px-4 py-3">{item.partner}</div>
    <div className="px-4 py-3">{formatCurrency(item.amount)}</div>
    <div className="px-4 py-3 flex justify-center gap-2">
      <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
        <Edit2 className="h-4 w-4" />
      </button>
    </div>
  </div>
))}
```

**Best Practices:**
- ✅ Alternating white/gray-50 backgrounds
- ✅ Blue-50 hover state
- ✅ Cursor pointer if clickable
- ✅ Padding: px-4 py-3
- ✅ Stop propagation on action buttons

---

### Stat Cards for Metrics

**Example:**
```tsx
import { DollarSign, Users, Briefcase } from 'lucide-react';

<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

  <div
    className="rounded-lg p-4 border border-forvis-blue-100 shadow-corporate"
    style={{ background: GRADIENTS.dashboard.card }}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
          Active Clients
        </p>
        <p className="text-2xl font-bold mt-2 text-forvis-blue-600">142</p>
      </div>
      <div
        className="rounded-full p-2.5"
        style={{ background: GRADIENTS.icon.standard }}
      >
        <Users className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>

  <div
    className="rounded-lg p-4 border border-forvis-blue-100 shadow-corporate"
    style={{ background: GRADIENTS.dashboard.card }}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-forvis-gray-600 uppercase tracking-wider">
          Open Tasks
        </p>
        <p className="text-2xl font-bold mt-2 text-forvis-blue-600">24</p>
      </div>
      <div
        className="rounded-full p-2.5"
        style={{ background: GRADIENTS.icon.standard }}
      >
        <Briefcase className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
</div>
```

**Best Practices:**
- ✅ Use dashboard card gradient background
- ✅ Label: uppercase, tracking-wider, text-xs, gray-600
- ✅ Value: text-2xl, font-bold, blue-600
- ✅ Icon: circular container with icon gradient
- ✅ Grid: 1 column on mobile, 3 columns on desktop

---

## Alert & Notification Patterns

### Banner Placement

**Page-Level Banner (Top):**
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {/* Page-level banner */}
  {error && (
    <Banner variant="error" message={error} dismissible onDismiss={() => setError(null)} />
  )}

  <div className="mt-6">
    {/* Page content */}
  </div>
</div>
```

**Section-Level Banner:**
```tsx
<Card>
  <div className="p-6">
    <h3 className="text-lg font-semibold">Section Title</h3>
    
    {/* Section banner */}
    {sectionError && (
      <div className="mt-4">
        <Banner variant="warning" message={sectionError} />
      </div>
    )}

    {/* Section content */}
  </div>
</Card>
```

---

### Auto-Dismiss Success Messages (5 Second Pattern)

**Example:**
```tsx
const [success, setSuccess] = useState<string | null>(null);

// Auto-dismiss after 5 seconds
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

// Trigger success
const handleSave = async () => {
  await saveData();
  setSuccess('Changes saved successfully');
};
```

---

### Persistent Error Messages

**Example:**
```tsx
const [error, setError] = useState<string | null>(null);

{error && (
  <Banner
    variant="error"
    message={error}
    dismissible
    onDismiss={() => setError(null)}
  />
)}

// Error stays until user dismisses
try {
  await dangerousOperation();
} catch (err) {
  setError('Operation failed. Please check your inputs and try again.');
}
```

---

## Button Patterns

### Primary Actions (Gradient Buttons)

**Usage:** Main CTAs on pages, form submits, create actions

```tsx
<Button variant="gradient" icon={<Plus />}>
  Create Task
</Button>
```

---

### Secondary Actions (Outline Buttons)

**Usage:** Cancel, back, alternative actions

```tsx
<Button variant="secondary">
  Cancel
</Button>
```

---

### Danger Actions (Red Gradient)

**Usage:** Delete, remove, destructive actions (always with confirmation)

```tsx
<Button
  variant="danger"
  icon={<Trash2 />}
  onClick={() => setShowDeleteConfirm(true)}
>
  Delete
</Button>
```

---

### Button Groups

**Example:**
```tsx
<div className="flex justify-end gap-3">
  <Button variant="secondary" onClick={onCancel}>
    Cancel
  </Button>
  <Button variant="gradient" onClick={onSave} loading={saving}>
    Save Changes
  </Button>
</div>
```

**Best Practices:**
- ✅ Right-aligned for forms
- ✅ Secondary button first, primary button last
- ✅ Gap: gap-3 (12px)
- ✅ Show loading state on primary button

---

## Icon Container Patterns

### Standard Size (12×12 container, 6×6 icon)

**Usage:** Dashboard cards, regular UI elements

```tsx
import { GRADIENTS } from '@/lib/design-system/gradients';

<div
  className="w-12 h-12 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-sm"
  style={{ background: GRADIENTS.icon.standard }}
>
  <Icon className="h-6 w-6 text-white" />
</div>
```

---

### Compact Size (10×10 container, 5×5 icon)

**Usage:** Compact cards, sidebars, dense layouts

```tsx
<div
  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-sm"
  style={{ background: GRADIENTS.icon.standard }}
>
  <Icon className="h-5 w-5 text-white" />
</div>
```

**Best Practices:**
- ✅ Always use lighter icon gradient (`GRADIENTS.icon.standard`)
- ✅ Rounded corners: `rounded-lg`
- ✅ Add hover scale effect: `group-hover:scale-110`
- ✅ White icon on gradient background
- ❌ Never use dark gradient (`#2E5AAC → #1C3667`)

---

## Navigation Patterns

### Dashboard Navigation Cards

**Example:**
```tsx
import { DashboardCard } from '@/components/ui';
import { Users, Briefcase, FileText } from 'lucide-react';

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <DashboardCard
    title="Clients"
    description="Manage your client portfolio"
    icon={<Users />}
    href="/dashboard/clients"
    stats={[
      { label: 'Active', value: 142, primary: true },
      { label: 'Inactive', value: 23 },
    ]}
  />

  <DashboardCard
    title="Tasks"
    description="Track engagement tasks"
    icon={<Briefcase />}
    href="/dashboard/tasks"
    stats={[
      { label: 'In Progress', value: 24, primary: true },
      { label: 'Pending', value: 8 },
      { label: 'Completed', value: 156 },
    ]}
  />

  <DashboardCard
    title="Reports"
    description="View financial reports"
    icon={<FileText />}
    href="/dashboard/reports"
  />
</div>
```

---

## Related Documentation

- [Component Catalog](./04-component-catalog.md) - Individual component documentation
- [Gradient System](./03-gradients.md) - Gradients used in patterns
- [Color System](./02-color-system.md) - Colors used in patterns
- [Migration Guide](./06-migration-guide.md) - How to apply patterns
- [Before/After Examples](./07-before-after-examples.md) - Pattern migrations
