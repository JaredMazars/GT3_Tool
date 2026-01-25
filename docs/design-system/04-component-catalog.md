# Component Catalog

Complete reference for all UI components in the Forvis Mazars Design System.

## Table of Contents

- [Overview](#overview)
- [Import Pattern](#import-pattern)
- [Components](#components)
  - [Badge](#badge)
  - [Banner](#banner)
  - [Button](#button)
  - [Card](#card)
  - [DashboardCard](#dashboardcard)
  - [ErrorModal](#errormodal)
  - [Input](#input)
  - [LoadingSpinner & LoadingOverlay](#loadingspinner--loadingoverlay)
  - [MultiSelect](#multiselect)
  - [SearchCombobox](#searchcombobox)
  - [SearchMultiCombobox](#searchmulticombobox)
  - [SqlEditor](#sqleditor)
  - [StatCard](#statcard)

## Overview

All UI components are located in `src/components/ui/` and exported from a single index file for easy importing.

**Key Principles:**
- ✅ Use components instead of custom HTML elements
- ✅ Consistent styling across application
- ✅ Type-safe with TypeScript
- ✅ Accessible with ARIA attributes
- ✅ Forvis Mazars brand compliant

## Import Pattern

**All components are imported from a single location:**

```tsx
import { Button, Card, Input, Badge, Banner } from '@/components/ui';
```

**Never import directly from component files:**
```tsx
// ❌ WRONG
import Button from '@/components/ui/Button';

// ✅ CORRECT
import { Button } from '@/components/ui';
```

---

## Components

### Badge

**Purpose:** Status indicators and labels with color variants

**File:** `src/components/ui/Badge.tsx`

#### Props Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'default' \| 'blue' \| 'green' \| 'yellow' \| 'red' \| 'purple' \| 'teal' \| 'indigo' \| 'cyan' \| 'orange' \| 'emerald' \| 'pink'` | `'default'` | Badge color variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Badge size |
| `dot` | `boolean` | `false` | Show colored dot indicator |
| `children` | `ReactNode` | - | Badge content |
| `className` | `string` | - | Additional CSS classes |

#### Variants

- **default** - Gray badge for neutral states
- **blue** - Primary blue for informational states
- **green** - Success/approved states
- **yellow** - Warning/pending states
- **red** - Error/rejected states
- **purple, teal, indigo, cyan, orange, emerald, pink** - Additional color options

#### Code Examples

**Basic Badge:**
```tsx
import { Badge } from '@/components/ui';

<Badge>Default</Badge>
<Badge variant="blue">Info</Badge>
<Badge variant="green">Success</Badge>
<Badge variant="yellow">Warning</Badge>
<Badge variant="red">Error</Badge>
```

**With Dot Indicator:**
```tsx
<Badge variant="green" dot>Active</Badge>
<Badge variant="red" dot>Offline</Badge>
```

**Size Variants:**
```tsx
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>
```

**With Icons:**
```tsx
import { CheckCircle, XCircle } from 'lucide-react';

<Badge variant="green">
  <CheckCircle className="h-3 w-3 mr-1" />
  Approved
</Badge>

<Badge variant="red">
  <XCircle className="h-3 w-3 mr-1" />
  Rejected
</Badge>
```

#### Do's and Don'ts

✅ **Do:**
- Use semantic variants (green for success, red for error)
- Keep badge text short (1-2 words)
- Use dot indicator for status badges
- Combine with icons for clarity

❌ **Don't:**
- Use for long text (use label or tag instead)
- Mix badge styles inconsistently
- Use non-semantic colors without reason

---

### Banner

**Purpose:** Alerts and notifications (replaces toast libraries like sonner, react-toastify)

**File:** `src/components/ui/Banner.tsx`

#### Props Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'info' \| 'error' \| 'warning' \| 'success'` | `'info'` | Banner type |
| `title` | `string` | - | Banner title (optional) |
| `message` | `string \| ReactNode` | - | Banner message content |
| `icon` | `ReactNode` | - | Custom icon (defaults to variant icon) |
| `dismissible` | `boolean` | `false` | Show close button |
| `onDismiss` | `() => void` | - | Callback when dismissed |
| `className` | `string` | - | Additional CSS classes |

#### Variants

- **info** - Blue background for informational messages
- **error** - Red background for error messages
- **warning** - Yellow background for warnings
- **success** - Green background for success messages

#### Code Examples

**Basic Banners:**
```tsx
import { Banner } from '@/components/ui';

<Banner variant="info" message="Client acceptance must be completed first" />
<Banner variant="error" message="Operation failed. Please try again." />
<Banner variant="warning" message="Your session will expire in 5 minutes" />
<Banner variant="success" message="Changes saved successfully" />
```

**With Title:**
```tsx
<Banner 
  variant="error"
  title="Validation Error"
  message="Please correct the errors below before submitting"
/>
```

**Dismissible Banner:**
```tsx
const [showBanner, setShowBanner] = useState(true);

{showBanner && (
  <Banner
    variant="success"
    message="Operation completed successfully"
    dismissible
    onDismiss={() => setShowBanner(false)}
  />
)}
```

**Auto-Dismiss Pattern (5 seconds):**
```tsx
const [success, setSuccess] = useState<string | null>(null);

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
```

**Error State Management:**
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

// Set error on API failure
try {
  await apiCall();
} catch (err) {
  setError('Operation failed. Please try again.');
}
```

#### Do's and Don'ts

✅ **Do:**
- Use instead of browser `alert()` or `confirm()`
- Make success/error messages dismissible
- Auto-dismiss success messages after 5 seconds
- Place at top of affected section
- Keep error messages visible until dismissed

❌ **Don't:**
- Use toast libraries (sonner, react-toastify)
- Stack too many banners (limit to 1-2)
- Use for critical errors (use modal instead)
- Auto-dismiss error messages

---

### Button

**Purpose:** Primary action buttons with variants

**File:** `src/components/ui/Button.tsx`

#### Props Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'gradient' \| 'danger'` | `'primary'` | Button style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `loading` | `boolean` | `false` | Show loading spinner |
| `icon` | `ReactNode` | - | Icon before text |
| `children` | `ReactNode` | - | Button text |
| `disabled` | `boolean` | `false` | Disabled state |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Button type |
| `onClick` | `(e: MouseEvent) => void` | - | Click handler |
| `className` | `string` | - | Additional CSS classes |

#### Variants

- **primary** - Solid blue button for primary actions
- **secondary** - Outline button for secondary actions
- **gradient** - Blue gradient button for emphasis CTAs
- **danger** - Red button for destructive actions

#### Code Examples

**Basic Buttons:**
```tsx
import { Button } from '@/components/ui';

<Button variant="primary">Save</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="gradient">Create Task</Button>
<Button variant="danger">Delete</Button>
```

**With Icons:**
```tsx
import { Plus, Save, Trash2 } from 'lucide-react';

<Button variant="gradient" icon={<Plus className="h-4 w-4" />}>
  Add Client
</Button>

<Button variant="primary" icon={<Save className="h-4 w-4" />}>
  Save Changes
</Button>

<Button variant="danger" icon={<Trash2 className="h-4 w-4" />}>
  Delete
</Button>
```

**Loading State:**
```tsx
const [saving, setSaving] = useState(false);

<Button
  variant="primary"
  loading={saving}
  onClick={async () => {
    setSaving(true);
    await saveData();
    setSaving(false);
  }}
>
  Save
</Button>
```

**Size Variants:**
```tsx
<Button variant="primary" size="sm">Small</Button>
<Button variant="primary" size="md">Medium</Button>
<Button variant="primary" size="lg">Large</Button>
```

**Disabled State:**
```tsx
<Button variant="primary" disabled>
  Disabled Button
</Button>
```

**Form Submit:**
```tsx
<form onSubmit={handleSubmit}>
  <Button variant="gradient" type="submit">
    Submit Form
  </Button>
</form>
```

#### Do's and Don'ts

✅ **Do:**
- Use `gradient` for primary CTAs on pages
- Use `primary` for standard actions
- Use `secondary` for cancel/back actions
- Use `danger` for destructive actions
- Show loading state during async operations
- Include icons for visual clarity

❌ **Don't:**
- Use custom styled `<button>` elements
- Mix multiple gradient buttons on same page
- Forget to disable during loading state
- Use danger variant without confirmation

---

### Card

**Purpose:** Container component with variants

**File:** `src/components/ui/Card.tsx`

#### Props Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'standard' \| 'dashboard' \| 'shared-service' \| 'stats'` | `'standard'` | Card style |
| `hoverable` | `boolean` | `false` | Enable hover effects |
| `loading` | `boolean` | `false` | Show loading overlay |
| `children` | `ReactNode` | - | Card content |
| `className` | `string` | - | Additional CSS classes |
| `style` | `CSSProperties` | - | Inline styles |

#### Variants

- **standard** - White background, border, shadow (default)
- **dashboard** - Light blue gradient background with hover overlay
- **shared-service** - Similar to dashboard with lighter shadow
- **stats** - Blue gradient background for stat displays

#### Code Examples

**Standard Card:**
```tsx
import { Card } from '@/components/ui';

<Card variant="standard">
  <div className="p-6">
    <h3 className="text-lg font-semibold text-forvis-gray-900">Card Title</h3>
    <p className="text-sm text-forvis-gray-600 mt-2">Card content</p>
  </div>
</Card>
```

**Dashboard Card:**
```tsx
<Card variant="dashboard" hoverable>
  <div className="p-4">
    <h3 className="text-lg font-semibold text-forvis-blue-700">Analytics</h3>
    <p className="text-sm text-forvis-gray-600 mt-2">View analytics dashboard</p>
  </div>
</Card>
```

**With Loading State:**
```tsx
const [loading, setLoading] = useState(true);

<Card variant="standard" loading={loading}>
  <div className="p-6">
    {/* Content */}
  </div>
</Card>
```

**Clickable Card:**
```tsx
<Card variant="dashboard" hoverable className="cursor-pointer" onClick={() => navigate('/path')}>
  <div className="p-4">
    {/* Content */}
  </div>
</Card>
```

#### Do's and Don'ts

✅ **Do:**
- Use `standard` for content cards
- Use `dashboard` for interactive/navigation cards
- Add `hoverable` for clickable cards
- Include proper padding (p-4 to p-6)
- Group related content in single card

❌ **Don't:**
- Nest cards deeply (2 levels max)
- Make cards too small (min height ~100px)
- Use without proper spacing
- Forget loading state for async data

---

### DashboardCard

**Purpose:** Interactive navigation cards for dashboards with stats

**File:** `src/components/ui/DashboardCard.tsx`

#### Props Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | - | Card title |
| `description` | `string` | - | Card description (optional) |
| `icon` | `ReactNode` | - | Icon in gradient container |
| `href` | `string` | - | Link destination |
| `onClick` | `(e: MouseEvent) => void` | - | Click handler (optional) |
| `stats` | `Array<{ label: string; value: string \| number; primary?: boolean }>` | - | Statistics to display |
| `loading` | `boolean` | `false` | Show loading overlay |
| `variant` | `'default' \| 'compact'` | `'default'` | Card variant |

#### Variants

- **default** - Standard layout with stats grid below title
- **compact** - Horizontal layout for space-constrained areas

#### Code Examples

**Basic Dashboard Card:**
```tsx
import { DashboardCard } from '@/components/ui';
import { Users } from 'lucide-react';

<DashboardCard
  title="Clients"
  description="Manage your client portfolio"
  icon={<Users />}
  href="/dashboard/clients"
/>
```

**With Stats:**
```tsx
import { Briefcase } from 'lucide-react';

<DashboardCard
  title="Active Tasks"
  description="Tasks in progress"
  icon={<Briefcase />}
  href="/dashboard/tasks"
  stats={[
    { label: 'In Progress', value: 24, primary: true },
    { label: 'Pending Review', value: 8 },
    { label: 'Completed', value: 156 },
  ]}
/>
```

**Compact Variant:**
```tsx
<DashboardCard
  variant="compact"
  title="Notifications"
  icon={<Bell />}
  href="/dashboard/notifications"
  stats={[{ label: 'Unread', value: 5 }]}
/>
```

**With onClick Handler:**
```tsx
<DashboardCard
  title="Reports"
  icon={<FileText />}
  href="/dashboard/reports"
  onClick={(e) => {
    console.log('Card clicked');
    // Custom logic before navigation
  }}
/>
```

#### Do's and Don'ts

✅ **Do:**
- Use for main navigation on dashboards
- Include meaningful icons
- Show relevant stats (3-4 max)
- Mark primary stat with `primary: true`
- Use compact variant in sidebars

❌ **Don't:**
- Overload with too many stats (>5)
- Use without icon
- Make description too long (>100 chars)
- Nest inside other cards

---

### ErrorModal

**Purpose:** Modal for displaying error messages

**File:** `src/components/ui/ErrorModal.tsx`

#### Props Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | - | Controls visibility |
| `title` | `string` | `'Error'` | Modal title |
| `message` | `string` | - | Error message content |
| `onClose` | `() => void` | - | Close handler |

#### Code Examples

**Basic Error Modal:**
```tsx
import { ErrorModal } from '@/components/ui';

const [error, setError] = useState<string | null>(null);

<ErrorModal
  isOpen={error !== null}
  message={error || ''}
  onClose={() => setError(null)}
/>

// Trigger error
try {
  await apiCall();
} catch (err) {
  setError('Failed to save data. Please try again.');
}
```

**With Custom Title:**
```tsx
<ErrorModal
  isOpen={showError}
  title="Validation Error"
  message="Please fill in all required fields before submitting."
  onClose={() => setShowError(false)}
/>
```

**API Error Handling:**
```tsx
const handleSubmit = async () => {
  try {
    await submitForm(data);
    setSuccess('Form submitted successfully');
  } catch (err: any) {
    setError(err.message || 'An unexpected error occurred');
  }
};
```

#### Do's and Don'ts

✅ **Do:**
- Use for unexpected errors
- Provide clear error messages
- Allow ESC key to close
- Include actionable guidance

❌ **Don't:**
- Use for validation errors (use inline validation)
- Show technical error details to users
- Stack multiple error modals
- Use without close handler

---

### Input

**Purpose:** Form inputs with validation support

**File:** `src/components/ui/Input.tsx`

#### Props Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'text' \| 'email' \| 'password' \| 'number' \| 'textarea' \| 'select'` | `'text'` | Input type |
| `label` | `string` | - | Input label (optional) |
| `error` | `string` | - | Error message (optional) |
| `helperText` | `string` | - | Helper text (hidden if error present) |
| `required` | `boolean` | `false` | Show asterisk on label |
| `icon` | `ReactNode` | - | Left icon (text inputs only) |
| `rows` | `number` | `4` | Rows for textarea |
| `options` | `Array<{ value: string; label: string }>` | - | Options for select |
| `value` | `string \| number` | - | Input value |
| `onChange` | `(e: ChangeEvent) => void` | - | Change handler |
| `disabled` | `boolean` | `false` | Disabled state |
| `placeholder` | `string` | - | Placeholder text |

#### Variants

- **text** - Standard text input
- **email** - Email input with validation
- **password** - Password input with masking
- **number** - Number input
- **textarea** - Multi-line text input
- **select** - Dropdown select

#### Code Examples

**Text Input:**
```tsx
import { Input } from '@/components/ui';

<Input
  variant="text"
  label="Client Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  required
/>
```

**With Error:**
```tsx
<Input
  variant="email"
  label="Email Address"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={emailError}
  required
/>
```

**With Helper Text:**
```tsx
<Input
  variant="password"
  label="Password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  helperText="Must be at least 8 characters"
/>
```

**With Icon:**
```tsx
import { Search } from 'lucide-react';

<Input
  variant="text"
  placeholder="Search..."
  icon={<Search className="h-4 w-4" />}
  value={search}
  onChange={(e) => setSearch(e.target.value)}
/>
```

**Textarea:**
```tsx
<Input
  variant="textarea"
  label="Description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={6}
/>
```

**Select:**
```tsx
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

**Number Input:**
```tsx
<Input
  variant="number"
  label="Amount"
  value={amount}
  onChange={(e) => setAmount(Number(e.target.value))}
  min={0}
  max={100}
/>
```

#### Do's and Don'ts

✅ **Do:**
- Always include labels
- Show error messages below input
- Use helper text for guidance
- Mark required fields with asterisk
- Use appropriate input types
- Disable during form submission

❌ **Don't:**
- Use placeholder as label
- Show multiple errors at once
- Make inputs too narrow (<200px)
- Forget to handle empty states
- Use custom input styling

---

### LoadingSpinner & LoadingOverlay

**Purpose:** Loading indicators

**File:** `src/components/ui/LoadingSpinner.tsx`

#### LoadingSpinner Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Spinner size |
| `color` | `'blue' \| 'white' \| 'gray'` | `'blue'` | Spinner color |
| `className` | `string` | - | Additional CSS classes |

#### LoadingOverlay Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `spinnerSize` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Spinner size |
| `message` | `string` | - | Loading message (optional) |
| `className` | `string` | - | Additional CSS classes |

#### Code Examples

**Basic Spinner:**
```tsx
import { LoadingSpinner } from '@/components/ui';

<LoadingSpinner />
<LoadingSpinner size="lg" />
<LoadingSpinner color="white" />
```

**Loading Overlay:**
```tsx
import { LoadingOverlay } from '@/components/ui';

{loading && <LoadingOverlay message="Loading data..." />}
```

**Inline Loading:**
```tsx
<div className="flex items-center gap-2">
  <LoadingSpinner size="sm" />
  <span>Loading...</span>
</div>
```

**Card with Loading:**
```tsx
<div className="relative">
  {loading && <LoadingOverlay />}
  <Card>
    {/* Card content */}
  </Card>
</div>
```

#### Do's and Don'ts

✅ **Do:**
- Show during async operations
- Include message for long operations
- Use appropriate size for context
- Use white spinner on dark backgrounds

❌ **Don't:**
- Show spinner without context
- Use for very fast operations (<200ms)
- Block entire page unnecessarily
- Forget to remove after loading

---

### MultiSelect

**Purpose:** Multi-select dropdown with client-side filtering

**File:** `src/components/ui/MultiSelect.tsx`

#### Props Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` | `Array<{ id: string \| number; label: string }>` | - | Available options |
| `value` | `(string \| number)[]` | - | Selected IDs |
| `onChange` | `(value: (string \| number)[]) => void` | - | Change handler |
| `placeholder` | `string` | `'Select...'` | Placeholder text |
| `searchPlaceholder` | `string` | `'Search...'` | Search input placeholder |
| `label` | `string` | - | Field label (optional) |
| `disabled` | `boolean` | `false` | Disabled state |
| `className` | `string` | - | Additional CSS classes |

#### Code Examples

**Basic MultiSelect:**
```tsx
import { MultiSelect } from '@/components/ui';

const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

<MultiSelect
  label="Assign Users"
  options={[
    { id: 1, label: 'John Smith' },
    { id: 2, label: 'Jane Doe' },
    { id: 3, label: 'Bob Johnson' },
  ]}
  value={selectedUsers}
  onChange={setSelectedUsers}
  placeholder="Select users..."
/>
```

**With Search:**
```tsx
<MultiSelect
  label="Service Lines"
  options={serviceLines}
  value={selected}
  onChange={setSelected}
  searchPlaceholder="Search service lines..."
/>
```

#### Do's and Don'ts

✅ **Do:**
- Use for selecting multiple items
- Include search for >10 options
- Show selected count
- Allow clearing all selections

❌ **Don't:**
- Use for single selection (use SearchCombobox)
- Overload with >100 options
- Forget to handle empty state

---

### SearchCombobox

**Purpose:** Single-select searchable dropdown with server-side search

**File:** `src/components/ui/SearchCombobox.tsx`

#### Props Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string \| number \| null` | - | Selected ID |
| `onChange` | `(value: string \| number \| null) => void` | - | Change handler |
| `onSearchChange` | `(search: string) => void` | - | Search handler |
| `options` | `Array<{ id: string \| number; label: string; subtitle?: string }>` | - | Options |
| `placeholder` | `string` | `'Select...'` | Placeholder |
| `searchPlaceholder` | `string` | `'Type to search...'` | Search placeholder |
| `minimumSearchChars` | `number` | `2` | Min chars before search |
| `isLoading` | `boolean` | `false` | Loading state |
| `disabled` | `boolean` | `false` | Disabled state |
| `error` | `string` | - | Error message |
| `label` | `string` | - | Field label |

#### Code Examples

**Client Search:**
```tsx
import { SearchCombobox } from '@/components/ui';

const [clientId, setClientId] = useState<string | null>(null);
const [search, setSearch] = useState('');
const { data: clients, isLoading } = useClientSearch(search);

<SearchCombobox
  label="Select Client"
  value={clientId}
  onChange={setClientId}
  onSearchChange={setSearch}
  options={clients || []}
  isLoading={isLoading}
  minimumSearchChars={3}
  placeholder="Search clients..."
/>
```

#### Do's and Don'ts

✅ **Do:**
- Use for server-side search
- Set appropriate minimum chars (2-3)
- Show loading state
- Use subtitle for additional context

❌ **Don't:**
- Load all options at once (defeats purpose)
- Set min chars too high (>4)
- Forget debouncing for API calls

---

### SearchMultiCombobox

**Purpose:** Multi-select searchable dropdown with server-side search

**File:** `src/components/ui/SearchMultiCombobox.tsx`

Props and usage similar to SearchCombobox but returns array of IDs.

---

### SqlEditor

**Purpose:** SQL code editor using CodeMirror 6

**File:** `src/components/ui/SqlEditor.tsx`

#### Props Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | - | SQL code |
| `onChange` | `(value: string) => void` | - | Change handler |
| `height` | `string` | `'300px'` | Editor height |
| `readOnly` | `boolean` | `false` | Read-only mode |

#### Code Examples

```tsx
import { SqlEditor } from '@/components/ui';

const [sql, setSql] = useState('SELECT * FROM clients');

<SqlEditor
  value={sql}
  onChange={setSql}
  height="400px"
/>
```

---

### StatCard

**Purpose:** Statistics/metrics display cards with gradients

**File:** `src/components/ui/StatCard.tsx`

#### Props Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | - | Metric label |
| `value` | `string \| number` | - | Metric value |
| `icon` | `ReactNode` | - | Icon (optional) |
| `gradientVariant` | `1 \| 2 \| 3 \| 4` | `1` | Gradient style |

#### Code Examples

```tsx
import { StatCard } from '@/components/ui';
import { DollarSign } from 'lucide-react';

<StatCard
  label="Total Revenue"
  value="$1.2M"
  icon={<DollarSign />}
  gradientVariant={1}
/>
```

---

## Related Documentation

- [Gradient System](./03-gradients.md) - Gradients used in components
- [Color System](./02-color-system.md) - Colors used in components
- [Pattern Library](./05-pattern-library.md) - Common component patterns
- [Before/After Examples](./07-before-after-examples.md) - Migration examples
