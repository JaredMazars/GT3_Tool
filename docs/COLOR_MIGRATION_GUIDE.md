# Forvis Color Migration Guide

**Version:** 1.0.0  
**Last Updated:** January 24, 2026

## Overview

This guide provides a comprehensive reference for migrating from default Tailwind colors to the new Forvis Mazars brand colors. The new semantic color palettes (success, error, warning) and data visualization colors ensure brand consistency, accessibility, and professional appearance across the application.

## Why Migrate?

✅ **Brand Consistency**: Muted, professional tones matching Forvis identity  
✅ **Accessibility**: All colors meet WCAG AA standards  
✅ **Maintainability**: Centralized color definitions in tailwind.config.ts  
✅ **Clarity**: Semantic naming (success/error/warning) vs generic (green/red/yellow)

## Migration Strategy

### Gradual Approach (Recommended)

1. ✅ **Completed**: Tailwind config updated with new colors
2. ✅ **Completed**: Banner component migrated
3. **Next Priority**: Critical user-facing components (acceptances, approvals, finance)
4. **Lower Priority**: Internal admin components
5. **Final Pass**: Remaining components

### Files to Update

Approximately **694 instances** across the codebase use ad-hoc semantic colors.

**High Priority** (~150 instances):
- Client acceptance components
- Task approval components  
- Financial data displays
- Status badges and indicators

**Medium Priority** (~300 instances):
- Admin components
- Template wizard
- Document vault
- Analytics dashboards

**Low Priority** (~244 instances):
- Error messages
- Form validation
- Utility components

## Color Mapping Reference

### Success (Green) Colors

| Old (Tailwind) | New (Forvis) | Context | Example |
|----------------|--------------|---------|---------|
| `text-green-600` | `text-forvis-success-600` | Icons, emphasis text | Approval status |
| `text-green-700` | `text-forvis-success-700` | Dark text | Subtitles |
| `text-green-800` | `text-forvis-success-800` | Body text | Alert content |
| `text-green-900` | `text-forvis-success-900` | Headings | Alert titles |
| `bg-green-50` | `bg-forvis-success-50` | Light backgrounds | Success alerts |
| `bg-green-100` | `bg-forvis-success-100` | Badges, pills | Status badges |
| `border-green-200` | `border-forvis-success-200` | Soft borders | Card borders |
| `border-green-300` | `border-forvis-success-300` | Medium borders | Emphasis borders |

### Error (Red) Colors

| Old (Tailwind) | New (Forvis) | Context | Example |
|----------------|--------------|---------|---------|
| `text-red-600` | `text-forvis-error-600` | Icons, emphasis text | Error icons |
| `text-red-700` | `text-forvis-error-700` | Dark text | Error details |
| `text-red-800` | `text-forvis-error-800` | Body text | Alert content |
| `text-red-900` | `text-forvis-error-900` | Headings | Alert titles |
| `bg-red-50` | `bg-forvis-error-50` | Light backgrounds | Error alerts |
| `bg-red-100` | `bg-forvis-error-100` | Badges, pills | Status badges |
| `bg-red-400` | `bg-forvis-error-400` | Icons in empty states | Illustration accents |
| `border-red-200` | `border-forvis-error-200` | Soft borders | Card borders |
| `border-red-300` | `border-forvis-error-300` | Medium borders | Emphasis borders |
| `hover:bg-red-50` | `hover:bg-forvis-error-50` | Hover states | Delete buttons |
| `hover:text-red-600` | `hover:text-forvis-error-600` | Hover text | Interactive text |

### Warning (Amber/Yellow) Colors

| Old (Tailwind) | New (Forvis) | Context | Example |
|----------------|--------------|---------|---------|
| `text-yellow-600` | `text-forvis-warning-600` | Icons, emphasis | Warning icons |
| `text-yellow-700` | `text-forvis-warning-700` | Dark text | Warning details |
| `text-yellow-800` | `text-forvis-warning-800` | Body text | Alert content |
| `text-yellow-900` | `text-forvis-warning-900` | Headings | Alert titles |
| `text-amber-600` | `text-forvis-warning-600` | Icons, emphasis | Caution indicators |
| `text-amber-800` | `text-forvis-warning-800` | Body text | Alert content |
| `bg-yellow-50` | `bg-forvis-warning-50` | Light backgrounds | Warning alerts |
| `bg-yellow-100` | `bg-forvis-warning-100` | Badges, pills | Status badges |
| `bg-amber-50` | `bg-forvis-warning-50` | Light backgrounds | Caution alerts |
| `bg-amber-100` | `bg-forvis-warning-100` | Badges, pills | Status badges |
| `border-yellow-200` | `border-forvis-warning-200` | Soft borders | Card borders |
| `border-yellow-300` | `border-forvis-warning-300` | Medium borders | Emphasis borders |
| `border-amber-200` | `border-forvis-warning-200` | Soft borders | Card borders |
| `border-amber-300` | `border-forvis-warning-300` | Medium borders | Emphasis borders |

### Orange Colors (Context-Dependent)

| Old (Tailwind) | New (Forvis) | Context | Rationale |
|----------------|--------------|---------|-----------|
| `text-orange-*` | `text-forvis-warning-*` | Capacity warnings | Use warning for caution states |
| `bg-orange-*` | `bg-forvis-warning-*` | Alert backgrounds | Orange → Amber for consistency |
| `border-orange-*` | `border-forvis-warning-*` | Alert borders | Orange → Amber for consistency |

## Migration Examples

### Example 1: Status Badge

**Before:**
```tsx
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
  <CheckCircle className="h-3 w-3 mr-1" />
  Approved
</span>
```

**After:**
```tsx
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-forvis-success-100 text-forvis-success-800 border border-forvis-success-200">
  <CheckCircle className="h-3 w-3 mr-1" />
  Approved
</span>
```

### Example 2: Error Alert Container

**Before:**
```tsx
<div className="p-4 bg-red-50 border-2 border-red-300 text-red-700 rounded-lg shadow-corporate">
  <div className="flex items-center gap-2">
    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
    <p className="text-sm text-red-700">{error}</p>
  </div>
</div>
```

**After:**
```tsx
<div className="p-4 bg-forvis-error-50 border-2 border-forvis-error-300 text-forvis-error-700 rounded-lg shadow-corporate">
  <div className="flex items-center gap-2">
    <AlertTriangle className="w-5 h-5 text-forvis-error-600 flex-shrink-0" />
    <p className="text-sm text-forvis-error-700">{error}</p>
  </div>
</div>
```

### Example 3: Conditional Positive/Negative Styling

**Before:**
```tsx
const textColor = value >= 0 ? 'text-green-600' : 'text-red-600';
const bgColor = value >= 0 ? 'bg-green-50' : 'bg-red-50';

<div className={`${bgColor} rounded-lg p-3`}>
  <span className={`font-semibold ${textColor}`}>
    {formatCurrency(value)}
  </span>
</div>
```

**After:**
```tsx
const textColor = value >= 0 ? 'text-forvis-success-600' : 'text-forvis-error-600';
const bgColor = value >= 0 ? 'bg-forvis-success-50' : 'bg-forvis-error-50';

<div className={`${bgColor} rounded-lg p-3`}>
  <span className={`font-semibold ${textColor}`}>
    {formatCurrency(value)}
  </span>
</div>
```

### Example 4: Chart Colors (Recharts)

**Before:**
```tsx
<LineChart data={data}>
  <Line dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
  <Line dataKey="costs" stroke="#EF4444" strokeWidth={2} />
  <Line dataKey="profit" stroke="#10B981" strokeWidth={2} />
</LineChart>
```

**After:**
```tsx
<LineChart data={data}>
  <Line dataKey="revenue" stroke="#2E5AAC" strokeWidth={2} /> {/* forvis-dataViz-primary */}
  <Line dataKey="costs" stroke="#DC2626" strokeWidth={2} /> {/* forvis-dataViz-error */}
  <Line dataKey="profit" stroke="#43A047" strokeWidth={2} /> {/* forvis-dataViz-success */}
</LineChart>
```

### Example 5: Risk Level Indicators

**Before:**
```tsx
const riskStyles = {
  LOW: 'bg-green-100 text-green-800 border-green-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  HIGH: 'bg-red-100 text-red-800 border-red-300',
};
```

**After:**
```tsx
const riskStyles = {
  LOW: 'bg-forvis-success-100 text-forvis-success-800 border-forvis-success-300',
  MEDIUM: 'bg-forvis-warning-100 text-forvis-warning-800 border-forvis-warning-300',
  HIGH: 'bg-forvis-error-100 text-forvis-error-800 border-forvis-error-300',
};
```

### Example 6: Hover States

**Before:**
```tsx
<button className="p-1.5 text-forvis-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
  <Trash2 className="w-4 h-4" />
</button>
```

**After:**
```tsx
<button className="p-1.5 text-forvis-gray-600 hover:text-forvis-error-600 hover:bg-forvis-error-50 rounded transition-colors">
  <Trash2 className="w-4 h-4" />
</button>
```

## Data Visualization Colors

### New Data Viz Palette

Use these colors for multi-line charts and data visualizations:

```tsx
const CHART_COLORS = {
  primary: '#2E5AAC',    // Forvis Blue - main data series
  secondary: '#5B93D7',  // Light Blue - secondary series
  success: '#43A047',    // Success Green - positive metrics
  warning: '#F59E0B',    // Warning Amber - caution metrics
  error: '#DC2626',      // Error Red - negative metrics
  purple: '#7E57C2',     // Professional Purple - additional series
  teal: '#26A69A',       // Professional Teal - additional series
  orange: '#FF7043',     // Professional Orange - additional series
};
```

### Recharts Implementation

```tsx
import { LineChart, Line, BarChart, Bar } from 'recharts';

<LineChart data={chartData}>
  <Line dataKey="revenue" stroke="#2E5AAC" strokeWidth={2} />
  <Line dataKey="costs" stroke="#DC2626" strokeWidth={2} />
  <Line dataKey="profit" stroke="#43A047" strokeWidth={2} />
  <Line dataKey="forecast" stroke="#5B93D7" strokeWidth={2} strokeDasharray="5 5" />
</LineChart>

<BarChart data={barData}>
  <Bar dataKey="actual" fill="#2E5AAC" />
  <Bar dataKey="budget" fill="#5B93D7" />
</BarChart>
```

## Search and Replace Patterns

### VS Code Regex Search

Use these regex patterns to find instances to update:

**Find Green Colors:**
```regex
(text-green-|bg-green-|border-green-)(50|100|200|300|400|500|600|700|800|900)
```

**Find Red Colors:**
```regex
(text-red-|bg-red-|border-red-)(50|100|200|300|400|500|600|700|800|900)
```

**Find Yellow/Amber Colors:**
```regex
(text-(yellow|amber)-|bg-(yellow|amber)-|border-(yellow|amber)-)(50|100|200|300|400|500|600|700|800|900)
```

**Find Orange Colors:**
```regex
(text-orange-|bg-orange-|border-orange-)(50|100|200|300|400|500|600|700|800|900)
```

### Automated Find & Replace (Use with Caution)

**Success (Green) - Simple Replacement:**
```regex
Find: text-green-(\d+)
Replace: text-forvis-success-$1

Find: bg-green-(\d+)
Replace: bg-forvis-success-$1

Find: border-green-(\d+)
Replace: border-forvis-success-$1
```

**Error (Red) - Simple Replacement:**
```regex
Find: text-red-(\d+)
Replace: text-forvis-error-$1

Find: bg-red-(\d+)
Replace: bg-forvis-error-$1

Find: border-red-(\d+)
Replace: border-forvis-error-$1
```

**Warning (Yellow/Amber) - Consolidation:**
```regex
Find: text-(yellow|amber)-(\d+)
Replace: text-forvis-warning-$2

Find: bg-(yellow|amber)-(\d+)
Replace: bg-forvis-warning-$2

Find: border-(yellow|amber)-(\d+)
Replace: border-forvis-warning-$2
```

⚠️ **Important**: Always review automated replacements manually to ensure context is appropriate.

## Component-Specific Notes

### Banner Component

✅ **Already Migrated** - Uses new Forvis semantic colors throughout

### Status Badges

**Common Pattern:**
```tsx
// Success
bg-forvis-success-100 text-forvis-success-800 border-forvis-success-200

// Error
bg-forvis-error-100 text-forvis-error-800 border-forvis-error-200

// Warning
bg-forvis-warning-100 text-forvis-warning-800 border-forvis-warning-200
```

### Alert Containers

**Common Pattern:**
```tsx
// Success
bg-forvis-success-50 border-forvis-success-200

// Error
bg-forvis-error-50 border-forvis-error-200

// Warning
bg-forvis-warning-50 border-forvis-warning-200
```

### Financial Data (Positive/Negative)

```tsx
const isPositive = value >= 0;
const textColor = isPositive ? 'text-forvis-success-600' : 'text-forvis-error-600';
const bgColor = isPositive ? 'bg-forvis-success-50' : 'bg-forvis-error-50';
```

### Empty States

For illustration accents in empty states:
```tsx
// Icon color
text-forvis-error-400  // Replaces text-red-400
```

## Gradient Patterns

### Semantic State Gradients

**Success (Approvals):**
```tsx
style={{ background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)' }}
```

**Error (Rejections):**
```tsx
style={{ background: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)' }}
```

**Warning (Pending):**
```tsx
style={{ background: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)' }}
```

## Testing Checklist

After migrating a component, verify:

- [ ] Colors match brand guidelines (muted, professional)
- [ ] Text contrast meets WCAG AA (4.5:1 for body text)
- [ ] Border colors are visible against backgrounds
- [ ] Hover states work correctly
- [ ] Dark mode compatibility (if applicable)
- [ ] Semantic meaning preserved (success/error/warning)

## Common Pitfalls

❌ **Don't**: Mix old and new colors in the same component
```tsx
// BAD - Inconsistent
<div className="bg-forvis-success-50 border-green-200">
```

✅ **Do**: Use consistent Forvis colors
```tsx
// GOOD - Consistent
<div className="bg-forvis-success-50 border-forvis-success-200">
```

❌ **Don't**: Use generic green/red for non-semantic purposes
```tsx
// BAD - Not semantic
<div className="bg-forvis-success-50">This is just a colored box</div>
```

✅ **Do**: Use blue/gray for non-semantic colored elements
```tsx
// GOOD - Semantic colors only for meaning
<div className="bg-forvis-blue-50">This is just a colored box</div>
```

❌ **Don't**: Forget to update hover states
```tsx
// BAD - Inconsistent hover
<button className="text-forvis-error-600 hover:text-red-800">
```

✅ **Do**: Update all state variations
```tsx
// GOOD - Consistent
<button className="text-forvis-error-600 hover:text-forvis-error-800">
```

## Priority Files for Migration

### High Priority (User-Facing Critical)

1. `src/components/features/clients/ClientAcceptanceCard.tsx` (~10 instances)
2. `src/components/features/clients/ClientAcceptanceQuestionnaire.tsx` (~20 instances)
3. `src/components/features/approvals/ClientAcceptanceApprovalItem.tsx` (~5 instances)
4. `src/components/features/tasks/AcceptanceTab.tsx` (~15 instances)
5. `src/components/features/tasks/TaskFinanceTab.tsx` (~20 instances)
6. `src/components/features/tasks/TaskBudgetTab.tsx` (~15 instances)

### Medium Priority (Internal/Admin)

7. `src/components/features/planning/EmployeePlannerList.tsx` (~10 instances)
8. `src/components/features/planning/ClientPlannerList.tsx` (~10 instances)
9. `src/components/features/document-vault/*` (~30 instances)
10. `src/components/features/templates/*` (~50 instances)

### Lower Priority (Utility/Secondary)

11. Form validation messages (~100 instances)
12. Admin components (~80 instances)
13. Error boundaries and fallbacks (~40 instances)

## Questions?

Refer to:
- **Color Definitions**: `tailwind.config.ts`
- **Design Guidelines**: `.cursor/rules/forvis-design-rules.mdc` (Section 3)
- **Banner Component**: `src/components/ui/Banner.tsx` (reference implementation)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-24 | Initial release - comprehensive migration guide |
