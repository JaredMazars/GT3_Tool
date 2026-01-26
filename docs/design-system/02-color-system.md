# Color System

Complete color palette reference for the Forvis Mazars Design System.

## Table of Contents

- [Overview](#overview)
- [Forvis Color Palette](#forvis-color-palette)
  - [Primary Blues](#primary-blues)
  - [Corporate Neutrals](#corporate-neutrals)
  - [Semantic Colors](#semantic-colors)
  - [Data Visualization Palette](#data-visualization-palette)
- [Usage Guidelines](#usage-guidelines)
- [Accessibility](#accessibility)
- [Migration Guide](#migration-guide)
- [Code Examples](#code-examples)

## Overview

The Forvis Mazars color system is designed to convey professionalism, trustworthiness, and authority. All colors are carefully selected to:

- ✅ Meet WCAG AA accessibility standards
- ✅ Work harmoniously together
- ✅ Maintain brand identity
- ✅ Support clear visual hierarchy

**Visual Reference:** See `docs/color-reference.html` for interactive color swatches and examples.

## Forvis Color Palette

### Primary Blues

The core brand colors representing Forvis Mazars identity.

| Shade | Hex | Usage |
|---|---|---|
| **blue-50** | #EBF2FA | Lightest backgrounds, hover states |
| **blue-100** | #D6E4F5 | Light backgrounds |
| **blue-200** | #ADC9EB | Borders, dividers |
| **blue-300** | #84AEE1 | Muted accents |
| **blue-400** | #5B93D7 | Interactive elements, icons |
| **blue-500** | #2E5AAC | **Primary brand color** - buttons, links |
| **blue-600** | #25488A | Text on light backgrounds |
| **blue-700** | #1C3667 | Dark text, headers |
| **blue-800** | #132445 | High contrast text |
| **blue-900** | #0A1222 | Deepest dark |

**Tailwind Classes:**
- Text: `text-forvis-blue-500`, `text-forvis-blue-600`
- Backgrounds: `bg-forvis-blue-50`, `bg-forvis-blue-500`
- Borders: `border-forvis-blue-200`, `border-forvis-blue-500`

### Corporate Neutrals

Professional gray scale for text, borders, and backgrounds.

#### Forvis Gray (Standard Neutrals)

| Shade | Hex | Usage |
|---|---|---|
| **gray-50** | #F8F9FA | Page backgrounds |
| **gray-100** | #F1F3F5 | Light container backgrounds |
| **gray-200** | #E9ECEF | Borders |
| **gray-300** | #DEE2E6 | Input borders |
| **gray-400** | #CED4DA | Disabled states |
| **gray-500** | #ADB5BD | Placeholder text |
| **gray-600** | #6C757D | Secondary text |
| **gray-700** | #495057 | Body text |
| **gray-800** | #343A40 | Primary text |
| **gray-900** | #212529 | Headings |

**Tailwind Classes:**
- Text: `text-forvis-gray-700`, `text-forvis-gray-900`
- Backgrounds: `bg-forvis-gray-50`, `bg-forvis-gray-100`
- Borders: `border-forvis-gray-200`, `border-forvis-gray-300`

### Semantic Colors

Professional, muted status colors that harmonize with brand identity.

#### Success (Teal-Green) - Professional Growth

| Shade | Hex | Usage | WCAG AA |
|---|---|---|---|
| **success-50** | #E8F3F1 | Lightest background | - |
| **success-100** | #C8E3DF | Light background | - |
| **success-200** | #A0CFC8 | Soft borders | 3:1 |
| **success-300** | #71B5AA | Muted accents | 3:1 |
| **success-400** | #4E9B8E | Interactive elements | 3:1 |
| **success-500** | #3A7F73 | Base - buttons, emphasis | 4.5:1 |
| **success-600** | #2F6A5F | **Text on light** | 4.5:1 ✓ |
| **success-700** | #27574F | Dark text | 7:1 |
| **success-800** | #1F4540 | High contrast | 10:1 |
| **success-900** | #163530 | Darkest | 12:1 |

**Usage:** Approved status, completed actions, positive metrics, profit indicators

**Tailwind Classes:**
- Text: `text-forvis-success-600` (on light), `text-forvis-success-800` (emphasis)
- Backgrounds: `bg-forvis-success-50` (light), `bg-forvis-success-100` (cards)
- Borders: `border-forvis-success-200`

#### Error (Burgundy) - Professional Alert

| Shade | Hex | Usage | WCAG AA |
|---|---|---|---|
| **error-50** | #F7EBF0 | Lightest background | - |
| **error-100** | #EDCED9 | Light background | - |
| **error-200** | #DFA8B8 | Soft borders | 3:1 |
| **error-300** | #CD7B91 | Muted accents | 3:1 |
| **error-400** | #B8546E | Interactive elements | 3:1 |
| **error-500** | #9F3B56 | Base - buttons, emphasis | 4.5:1 |
| **error-600** | #872F48 | **Text on light** | 4.5:1 ✓ |
| **error-700** | #6F263B | Dark text | 7:1 |
| **error-800** | #581E2F | High contrast | 10:1 |
| **error-900** | #421624 | Darkest | 12:1 |

**Usage:** Rejected status, failed operations, negative metrics, loss indicators, overdue/high risk

**Tailwind Classes:**
- Text: `text-forvis-error-600` (on light), `text-forvis-error-800` (emphasis)
- Backgrounds: `bg-forvis-error-50` (light), `bg-forvis-error-100` (cards)
- Borders: `border-forvis-error-200`

#### Warning (Ochre/Amber) - Professional Caution

| Shade | Hex | Usage | WCAG AA |
|---|---|---|---|
| **warning-50** | #F8F3E8 | Lightest background | - |
| **warning-100** | #EFE3C8 | Light background | - |
| **warning-200** | #E3CFA0 | Soft borders | 3:1 |
| **warning-300** | #D4B571 | Muted accents | 3:1 |
| **warning-400** | #C09B4E | Interactive elements | 3:1 |
| **warning-500** | #A8803A | Base - buttons, emphasis | 4.5:1 |
| **warning-600** | #8F6A2F | **Text on light** | 4.5:1 ✓ |
| **warning-700** | #765727 | Dark text | 7:1 |
| **warning-800** | #5E451F | High contrast | 10:1 |
| **warning-900** | #473418 | Darkest | 12:1 |

**Usage:** Pending review, attention needed, approaching deadline, caution states

**Tailwind Classes:**
- Text: `text-forvis-warning-600` (on light), `text-forvis-warning-800` (emphasis)
- Backgrounds: `bg-forvis-warning-50` (light), `bg-forvis-warning-100` (cards)
- Borders: `border-forvis-warning-200`

### Data Visualization Palette

Nine harmonious colors for multi-series charts and graphs. Maintains professional Forvis aesthetic with muted, corporate tones.

| Variable | Hex | Usage |
|---|---|---|
| **viz-1** | #2E5AAC | Primary series (revenue, main metric) |
| **viz-2** | #3F74C6 | Secondary series (forecast, comparison) |
| **viz-3** | #2C5A8A | Tertiary series (supporting data) |
| **viz-4** | #2F6A5F | Success metrics (positive trends) |
| **viz-5** | #A8803A | Warning metrics (attention needed) |
| **viz-6** | #872F48 | Error metrics (negative trends) |
| **viz-7** | #5E5AAE | Additional series (muted violet) |
| **viz-8** | #2E7C7A | Additional series (muted teal) |
| **viz-9** | #B56A3B | Additional series (muted copper) |

**Recharts Usage:**
```tsx
<Line dataKey="revenue" stroke="#2E5AAC" strokeWidth={2} />
<Line dataKey="costs" stroke="#872F48" strokeWidth={2} />
<Line dataKey="profit" stroke="#2F6A5F" strokeWidth={2} />
```

**Tailwind Access:**
```tsx
className="text-forvis-dataViz-primary"
style={{ color: '#2E5AAC' }}
```

## Usage Guidelines

### When to Use Each Color Family

| Color Family | Use For | Don't Use For |
|---|---|---|
| **Primary Blues** | Brand elements, primary actions, navigation, headers | Status indicators, semantic meaning |
| **Corporate Neutrals** | Text, borders, backgrounds, disabled states | Semantic status, data visualization |
| **Success** | Approvals, completions, positive metrics, profits | Generic positive text |
| **Error** | Rejections, failures, negative metrics, losses | Generic red accents |
| **Warning** | Pending states, cautions, attention needed | Generic yellow accents |
| **Data Viz** | Charts, graphs, multi-series data | UI elements, status badges |

### Color Hierarchy

**Primary Actions:**
- Primary blue (#2E5AAC) for main CTAs
- Gradient blue for hero/emphasis CTAs

**Text Hierarchy:**
- Headings: `text-forvis-gray-900`
- Body: `text-forvis-gray-800`
- Secondary: `text-forvis-gray-700`
- Muted/Meta: `text-forvis-gray-600`

**Backgrounds:**
- Page: `bg-forvis-gray-50` or `bg-white`
- Cards: `bg-white` with border
- Hover: `bg-forvis-gray-50` or `bg-forvis-blue-50`

### Financial Data Patterns

**Positive/Negative Values:**
```tsx
const value = -5000;
const isPositive = value >= 0;

<span className={isPositive ? 'text-forvis-success-600' : 'text-forvis-error-600'}>
  {formatCurrency(value)}
</span>
```

**Budget Variance:**
```tsx
const variance = actual - budget;
const isUnderBudget = variance <= 0;

<div className={isUnderBudget ? 'bg-forvis-success-50' : 'bg-forvis-error-50'}>
  <span className={isUnderBudget ? 'text-forvis-success-600' : 'text-forvis-error-600'}>
    {formatCurrency(Math.abs(variance))}
  </span>
</div>
```

## Accessibility

All semantic colors meet **WCAG AA accessibility standards** for text and interactive elements.

### Contrast Requirements

| Element Type | Min Contrast | Shade to Use |
|---|---|---|
| Body text (16px) | 4.5:1 | 600+ shades |
| Large text (18px+) | 3:1 | 500+ shades |
| UI components | 3:1 | 200+ shades |
| Decorative | No requirement | Any shade |

### Accessible Text Combinations

**On White Backgrounds:**
- ✅ `text-forvis-blue-600` and darker
- ✅ `text-forvis-success-600` and darker
- ✅ `text-forvis-error-600` and darker
- ✅ `text-forvis-warning-600` and darker
- ❌ 50-500 shades (insufficient contrast)

**On Light Backgrounds (50-100 shades):**
- ✅ 600+ shades for all text
- ⚠️ 500 shades for large text (18px+) only

**On Dark Backgrounds (700+ shades):**
- ✅ White text
- ✅ 50-300 shades

### Testing Tools

- **Chrome DevTools:** Lighthouse accessibility audit
- **Color Contrast Analyzer:** Desktop app for precise testing
- **WebAIM Contrast Checker:** https://webaim.org/resources/contrastchecker/

## Migration Guide

### From Default Tailwind Colors

| Old (Tailwind Default) | New (Forvis Brand) | Context |
|---|---|---|
| `text-red-600` | `text-forvis-error-600` | Error messages |
| `bg-red-50` | `bg-forvis-error-50` | Error backgrounds |
| `border-red-200` | `border-forvis-error-200` | Error borders |
| `text-green-600` | `text-forvis-success-600` | Success messages |
| `bg-green-50` | `bg-forvis-success-50` | Success backgrounds |
| `border-green-200` | `border-forvis-success-200` | Success borders |
| `text-yellow-600` | `text-forvis-warning-600` | Warning messages |
| `text-amber-600` | `text-forvis-warning-600` | Warning messages |
| `bg-yellow-50` | `bg-forvis-warning-50` | Warning backgrounds |
| `bg-amber-50` | `bg-forvis-warning-50` | Warning backgrounds |
| `border-yellow-200` | `border-forvis-warning-200` | Warning borders |
| `border-amber-200` | `border-forvis-warning-200` | Warning borders |
| `text-gray-600` | `text-forvis-gray-600` | Secondary text |
| `bg-gray-50` | `bg-forvis-gray-50` | Light backgrounds |
| `text-blue-600` | `text-forvis-blue-600` | Links, primary text |

### Migration Steps

1. **Search for old colors:**
   ```bash
   # Find all instances of old Tailwind semantic colors
   grep -r "text-red-" src/
   grep -r "bg-green-" src/
   grep -r "text-yellow-" src/
   ```

2. **Replace with Forvis colors:**
   - Replace `red` → `forvis-error`
   - Replace `green` → `forvis-success`
   - Replace `yellow`/`amber` → `forvis-warning`
   - Replace `gray` → `forvis-gray` (if using semantic meaning)

3. **Verify accessibility:**
   - Check contrast ratios for text colors
   - Ensure 600+ shades used for body text on light backgrounds

4. **Test visual consistency:**
   - Review all status indicators
   - Verify brand colors used consistently
   - Check financial positive/negative indicators

## Code Examples

### Tailwind Classes

**Text Colors:**
```tsx
<h1 className="text-forvis-gray-900">Heading</h1>
<p className="text-forvis-gray-800">Body text</p>
<span className="text-forvis-gray-600">Secondary text</span>
<a className="text-forvis-blue-500 hover:text-forvis-blue-600">Link</a>
```

**Background Colors:**
```tsx
<div className="bg-forvis-blue-50">Light blue background</div>
<div className="bg-forvis-success-50">Light success background</div>
<div className="bg-forvis-error-50">Light error background</div>
```

**Borders:**
```tsx
<div className="border-2 border-forvis-blue-500">Primary border</div>
<input className="border border-forvis-gray-300 focus:border-forvis-blue-500" />
```

### Inline Styles

**Direct Hex Values:**
```tsx
<div style={{ color: '#2E5AAC' }}>Primary blue text</div>
<div style={{ backgroundColor: '#E8F3F1' }}>Success background</div>
```

**Dynamic Colors:**
```tsx
const statusColor = isSuccess ? '#2F6A5F' : '#872F48';
<span style={{ color: statusColor }}>{status}</span>
```

### Recharts/Data Visualization

**Line Chart:**
```tsx
import { LineChart, Line } from 'recharts';

<LineChart data={data}>
  <Line dataKey="revenue" stroke="#2E5AAC" strokeWidth={2} />
  <Line dataKey="costs" stroke="#872F48" strokeWidth={2} />
  <Line dataKey="profit" stroke="#2F6A5F" strokeWidth={2} />
  <Line dataKey="forecast" stroke="#3F74C6" strokeWidth={2} strokeDasharray="5 5" />
</LineChart>
```

**Bar Chart:**
```tsx
import { BarChart, Bar } from 'recharts';

<BarChart data={data}>
  <Bar dataKey="value" fill="#2E5AAC" />
</BarChart>
```

### Status Badges

**Success Badge:**
```tsx
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-forvis-success-100 text-forvis-success-800 border border-forvis-success-200">
  <CheckCircle className="h-3 w-3 mr-1" />
  Approved
</span>
```

**Error Badge:**
```tsx
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-forvis-error-100 text-forvis-error-800 border border-forvis-error-200">
  <XCircle className="h-3 w-3 mr-1" />
  Rejected
</span>
```

**Warning Badge:**
```tsx
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-forvis-warning-100 text-forvis-warning-800 border border-forvis-warning-200">
  <AlertTriangle className="h-3 w-3 mr-1" />
  Pending
</span>
```

### Alert Containers

**Success Alert:**
```tsx
<div className="bg-forvis-success-50 border-2 border-forvis-success-200 rounded-lg p-4">
  <div className="flex items-start gap-3">
    <CheckCircle className="h-5 w-5 text-forvis-success-600 flex-shrink-0" />
    <div>
      <h3 className="text-sm font-semibold text-forvis-success-900">Success</h3>
      <p className="text-sm text-forvis-success-800 mt-1">Operation completed successfully</p>
    </div>
  </div>
</div>
```

**Error Alert:**
```tsx
<div className="bg-forvis-error-50 border-2 border-forvis-error-200 rounded-lg p-4">
  <div className="flex items-start gap-3">
    <XCircle className="h-5 w-5 text-forvis-error-600 flex-shrink-0" />
    <div>
      <h3 className="text-sm font-semibold text-forvis-error-900">Error</h3>
      <p className="text-sm text-forvis-error-800 mt-1">Operation failed</p>
    </div>
  </div>
</div>
```

## Related Documentation

- [Gradient System](./03-gradients.md) - Gradient color combinations
- [Component Catalog](./04-component-catalog.md) - Components using these colors
- [Pattern Library](./05-pattern-library.md) - Common color usage patterns
- [Before/After Examples](./07-before-after-examples.md) - Migration examples
