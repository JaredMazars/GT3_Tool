# Forvis Mazars Design System Repository

Welcome to the centralized design system repository for the Forvis Mazars application.

## 📚 Quick Navigation

| Document | Purpose | When to Use |
|---|---|---|
| **[Getting Started](./01-getting-started.md)** | Quick start guide and overview | New to the design system |
| **[Color System](./02-color-system.md)** | Complete color palette reference | Choosing colors for UI |
| **[Gradient System](./03-gradients.md)** | Centralized gradient definitions | Using or replacing gradients |
| **[Component Catalog](./04-component-catalog.md)** | All UI components with props and examples | Building UI components |
| **[Pattern Library](./05-pattern-library.md)** | Common UI patterns (modals, forms, tables) | Implementing standard patterns |
| **[Migration Guide](./06-migration-guide.md)** | Step-by-step domain migration checklist | Migrating existing code |
| **[Before/After Examples](./07-before-after-examples.md)** | Code examples showing violations and fixes | Need concrete examples |

---

## 🎯 Purpose

This repository serves as the **single source of truth** for:

- ✅ **Centralized Styling** - All gradients, colors, and patterns in one place
- ✅ **Component Reference** - Complete documentation of all UI components
- ✅ **Migration Guidelines** - Step-by-step process for standardizing code
- ✅ **Code Examples** - Real before/after examples for common scenarios

**Goal:** Enable efficient manual migration of domains while ensuring consistency across the application.

---

## 🚀 Quick Start

### For New Development

1. **Read**: [Getting Started Guide](./01-getting-started.md)
2. **Reference**: [Component Catalog](./04-component-catalog.md) for available components
3. **Use**: [Pattern Library](./05-pattern-library.md) for common patterns
4. **Import**: Components from `@/components/ui`

**Example:**
```tsx
import { Button, Input, Banner } from '@/components/ui';
import { GRADIENTS } from '@/lib/design-system/gradients';

<Button variant="gradient">Create Task</Button>
<div className="bg-gradient-dashboard-card">Dashboard Card</div>
```

### For Migrating Existing Code

1. **Read**: [Migration Guide](./06-migration-guide.md)
2. **Copy**: Domain checklist template
3. **Follow**: Step-by-step migration process
4. **Reference**: [Before/After Examples](./07-before-after-examples.md)

**Migration Priority:**
1. ⚠️ **Critical**: Replace browser dialogs (`window.confirm`, `alert`)
2. 🔴 **High**: Centralize inline gradients (159 files)
3. 🟡 **Medium**: Replace custom buttons with Button component
4. 🟢 **Low**: Standardize color classes

---

## 🎨 Key Principles

### 1. Consistent Components

**Always use components from `@/components/ui`:**

```tsx
// ✅ CORRECT
import { Button, Card, Input } from '@/components/ui';

// ❌ WRONG
<button className="custom-button">Click</button>
```

### 2. Centralized Gradients

**Never hardcode gradient strings:**

```tsx
// ❌ WRONG
style={{ background: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)' }}

// ✅ CORRECT - CSS Class
className="bg-gradient-dashboard-card"

// ✅ CORRECT - Constant
import { GRADIENTS } from '@/lib/design-system/gradients';
style={{ background: GRADIENTS.dashboard.card }}
```

### 3. Forvis Brand Colors

**Use Forvis colors instead of default Tailwind:**

```tsx
// ❌ WRONG
text-red-600 bg-green-50 border-yellow-200

// ✅ CORRECT
text-forvis-error-600 bg-forvis-success-50 border-forvis-warning-200
```

### 4. No Browser Dialogs

**Use ConfirmModal and Banner instead:**

```tsx
// ❌ WRONG
window.confirm('Delete this?')
alert('Operation failed')

// ✅ CORRECT
import { ConfirmModal, Banner } from '@/components/ui';
<ConfirmModal ... />
<Banner variant="error" message="..." />
```

---

## 📖 Documentation Structure

### Color System
**Complete color palette with usage guidelines**
- Forvis Blue palette (50-900 scale)
- Semantic colors (success, error, warning)
- Data visualization palette
- Accessibility compliance (WCAG AA)
- Migration table (old → new colors)

### Gradient System
**Centralized gradient definitions with 3 usage methods**
- CSS classes (e.g., `bg-gradient-dashboard-card`)
- Constants (e.g., `GRADIENTS.dashboard.card`)
- Utility functions (e.g., `getGradient('dashboard', 'card')`)
- Complete gradient reference with examples

### Component Catalog
**All 13 UI components documented**
- Badge, Banner, Button, Card, DashboardCard
- ErrorModal, Input, LoadingSpinner
- MultiSelect, SearchCombobox, SearchMultiCombobox
- SqlEditor, StatCard
- Props reference, variants, code examples, do's/don'ts

### Pattern Library
**Common UI patterns across domains**
- Modal patterns (ConfirmModal, AlertModal, custom)
- Form patterns (standard, multi-step, search)
- Data display patterns (tables, cards, stats)
- Alert/notification patterns
- Button patterns, icon containers

### Migration Guide
**Step-by-step process for migrating domains**
- Pre-migration checklist
- 6-step migration process
- Domain checklist template
- Verification steps
- Common issues and solutions

### Before/After Examples
**Real code examples showing violations and fixes**
- Browser dialog migration
- Gradient centralization
- Button component migration
- Alert/banner migration
- Color class migration
- Form component migration
- Modal, icon, table, and stat card patterns

---

## 🛠️ How to Use This Repository

### As a Developer Building New Features

1. **Check Component Catalog** - Find the right component for your needs
2. **Follow Pattern Library** - Use established patterns for consistency
3. **Use Gradients System** - Never hardcode gradient strings
4. **Use Forvis Colors** - Follow brand color palette

### As a Developer Migrating Code

1. **Read Migration Guide** - Understand the process
2. **Copy Domain Checklist** - Track your progress
3. **Follow Step-by-Step** - Complete each migration step
4. **Reference Examples** - Use before/after examples as templates
5. **Verify Changes** - Run verification checklist

### As a Code Reviewer

1. **Check for Violations**:
   - ❌ Browser dialogs (`window.confirm`, `alert`)
   - ❌ Inline gradient strings
   - ❌ Custom button styling
   - ❌ Old Tailwind colors (`text-red-600`, etc.)
   - ❌ Custom input styling

2. **Verify Compliance**:
   - ✅ Components imported from `@/components/ui`
   - ✅ Gradients use centralized system
   - ✅ Forvis brand colors used
   - ✅ Proper component patterns followed

---

## 🎯 Success Criteria

**A fully migrated domain has:**

- ✅ Zero browser dialogs (`window.confirm`, `alert`, `prompt`)
- ✅ Zero inline gradient strings
- ✅ All buttons use Button component
- ✅ All alerts use Banner component
- ✅ All forms use Input component
- ✅ Forvis brand colors used consistently
- ✅ All patterns follow design system
- ✅ No visual regressions
- ✅ All functionality preserved

---

## 📝 Contributing

### Adding New Gradients

If you need a new gradient:

1. Verify it doesn't already exist in [Gradient System](./03-gradients.md)
2. Add to `src/lib/design-system/gradients.ts`:
   ```typescript
   export const GRADIENTS = {
     // ... existing
     yourCategory: {
       yourVariant: 'linear-gradient(...)',
     }
   }
   ```
3. Add CSS class to `src/app/globals.css`:
   ```css
   .bg-gradient-your-category-your-variant {
     background: linear-gradient(...);
   }
   ```
4. Document in [03-gradients.md](./03-gradients.md)

### Adding New Components

If you need a new UI component:

1. Create in `src/components/ui/YourComponent.tsx`
2. Export from `src/components/ui/index.ts`
3. Document in [Component Catalog](./04-component-catalog.md)
4. Add usage examples to [Pattern Library](./05-pattern-library.md)

### Updating Documentation

Documentation lives in `docs/design-system/`. Update relevant files when:
- Adding new components
- Adding new gradients
- Adding new patterns
- Fixing issues or clarifying examples

---

## 🔗 Related Resources

### Code Locations

- **UI Components**: `src/components/ui/`
- **Gradient Utilities**: `src/lib/design-system/gradients.ts`
- **CSS Classes**: `src/app/globals.css`
- **Shared Components**: `src/components/shared/`
- **Feature Components**: `src/components/features/`

### Design Rules

- **Main Rules**: `.cursor/rules/forvis-design-rules.mdc`
- **Security Rules**: `.cursor/rules/security-rules.mdc`
- **Database Patterns**: `.cursor/rules/database-patterns.mdc`
- **Performance Rules**: `.cursor/rules/performance-rules.mdc`

### External Resources

- **Color Reference**: `docs/color-reference.html` (visual palette)
- **Tailwind Config**: `tailwind.config.ts` (color definitions)
- **Route Review**: `/docs/route-reviews/` (API route standards)

---

## 💡 Tips & Best Practices

### Do's

✅ **Always search before creating** - Check if component/pattern exists first
✅ **Follow established patterns** - Consistency is key
✅ **Use centralized gradients** - Never hardcode gradient strings
✅ **Import from `@/components/ui`** - Single source of truth
✅ **Use Forvis colors** - Brand consistency
✅ **Document as you go** - Help future developers

### Don'ts

❌ **Don't use browser dialogs** - Use ConfirmModal/Banner instead
❌ **Don't hardcode gradients** - Use centralized system
❌ **Don't create custom buttons** - Use Button component
❌ **Don't use toast libraries** - Use Banner component
❌ **Don't use default Tailwind colors** - Use Forvis colors
❌ **Don't copy-paste without understanding** - Learn the patterns

---

## 📞 Getting Help

**Questions about:**

- **Components** → See [Component Catalog](./04-component-catalog.md)
- **Patterns** → See [Pattern Library](./05-pattern-library.md)
- **Migration** → See [Migration Guide](./06-migration-guide.md)
- **Examples** → See [Before/After Examples](./07-before-after-examples.md)
- **Colors** → See [Color System](./02-color-system.md)
- **Gradients** → See [Gradient System](./03-gradients.md)

**Still stuck?** Review the before/after examples or consult the migration guide for step-by-step instructions.

---

## 📜 Version History

**Version 1.0** (January 2026)
- Initial design system repository
- Complete color palette (Forvis brand colors)
- Centralized gradient system (3 usage methods)
- 13 UI components documented
- Common pattern library
- Migration guide with checklist template
- Before/after examples

---

## 🎉 Let's Build Something Great!

This design system is here to help you build consistent, professional, and maintainable UI. Use it as your guide, reference it often, and contribute improvements as you discover better patterns.

**Happy coding! 🚀**
