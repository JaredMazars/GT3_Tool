/**
 * Forvis Mazars Design System - Gradient Utilities
 * 
 * Centralized gradient definitions for consistent styling across the application.
 * 
 * Usage:
 * 1. CSS Classes: className="bg-gradient-dashboard-card"
 * 2. Constants: style={{ background: GRADIENTS.dashboard.card }}
 * 3. Utility Functions: style={{ background: getGradient('dashboard', 'card') }}
 * 
 * @see docs/design-system/03-gradients.md for complete documentation
 */

/**
 * Gradient Categories
 * - primary: Main brand gradients for headers and primary surfaces
 * - dashboard: Light gradients for cards and interactive elements
 * - semantic: Status-based gradients (success, error, warning)
 * - premium: Gold gradients for premium/executive features
 * - icon: Gradients specifically for icon containers
 * - data: Gradients for data visualization (status tiles, charts)
 */
export const GRADIENTS = {
  /**
   * Primary Brand Gradients
   * Use for headers, primary buttons, and hero sections
   */
  primary: {
    /** Diagonal blue gradient (135deg) - Primary brand gradient */
    diagonal: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #1C3667 100%)',
    /** Horizontal blue gradient - Alternative primary gradient */
    horizontal: 'linear-gradient(to right, #2E5AAC, #25488A)',
  },

  /**
   * Dashboard & Card Gradients
   * Light, subtle gradients for interactive cards and containers
   */
  dashboard: {
    /** Light blue gradient for card backgrounds */
    card: 'linear-gradient(135deg, #F0F7FD 0%, #E0EDFB 100%)',
    /** Very subtle gradient for hover states on cards */
    hover: 'linear-gradient(135deg, rgba(91,147,215,0.06) 0%, rgba(46,90,172,0.08) 100%)',
  },

  /**
   * Semantic Gradients
   * Status-based gradients for success, error, and warning states
   */
  semantic: {
    /** Success (Teal-Green) gradients */
    success: {
      /** Light background for success containers/alerts */
      light: 'linear-gradient(135deg, #E8F3F1 0%, #C8E3DF 100%)',
      /** Deep gradient for success buttons (3-stop for depth) */
      button: 'linear-gradient(135deg, #4E9B8E 0%, #2F6A5F 50%, #1F4540 100%)',
    },
    /** Error (Burgundy) gradients */
    error: {
      /** Light background for error containers/alerts */
      light: 'linear-gradient(135deg, #F7EBF0 0%, #EDCED9 100%)',
      /** Deep gradient for error/danger buttons (3-stop for depth) */
      button: 'linear-gradient(135deg, #B8546E 0%, #872F48 50%, #581E2F 100%)',
    },
    /** Warning (Ochre/Amber) gradients */
    warning: {
      /** Light background for warning containers/alerts */
      light: 'linear-gradient(135deg, #F8F3E8 0%, #EFE3C8 100%)',
      /** Deep gradient for warning buttons (3-stop for depth) */
      button: 'linear-gradient(135deg, #C09B4E 0%, #8F6A2F 50%, #5E451F 100%)',
    },
  },

  /**
   * Premium/Executive Gradients
   * Gold gradients for shared services and premium features
   */
  premium: {
    /** Gold gradient for premium containers */
    gold: 'linear-gradient(135deg, #D9CBA8 0%, #B0A488 100%)',
    /** Blue to gold gradient for hybrid sections */
    blueToGold: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 50%, #D9CBA8 100%)',
    /** Workspace gradient for data-heavy sections */
    workspace: 'linear-gradient(135deg, #F0EAE0 0%, #E0D5C3 100%)',
  },

  /**
   * Icon Container Gradients
   * Specifically designed for icon containers in cards
   */
  icon: {
    /** Standard icon gradient (lighter blue) - 12×12 or 10×10 containers */
    standard: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
    /** DEPRECATED: Dark gradient - DO NOT USE */
    dark: 'linear-gradient(to bottom right, #2E5AAC, #1C3667)',
  },

  /**
   * Data Visualization Gradients
   * For status tiles, allocation badges, and data elements
   */
  data: {
    /** Red gradient for critical/overdue status */
    red: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
    /** Orange gradient for warning/attention status */
    orange: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    /** Purple gradient for review/special status */
    purple: 'linear-gradient(135deg, #C084FC 0%, #9333EA 100%)',
    /** Green gradient for complete/approved status */
    green: 'linear-gradient(135deg, #4ADE80 0%, #16A34A 100%)',
    /** Blue gradient for active/in-progress status */
    blue: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
    /** Gray gradient for inactive/unassigned status */
    gray: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)',
  },
} as const;

/**
 * Type definitions for gradient categories and variants
 */
export type GradientCategory = keyof typeof GRADIENTS;
export type PrimaryVariant = keyof typeof GRADIENTS.primary;
export type DashboardVariant = keyof typeof GRADIENTS.dashboard;
export type SemanticType = keyof typeof GRADIENTS.semantic;
export type SemanticVariant = keyof typeof GRADIENTS.semantic.success;
export type PremiumVariant = keyof typeof GRADIENTS.premium;
export type IconVariant = keyof typeof GRADIENTS.icon;
export type DataVariant = keyof typeof GRADIENTS.data;

/**
 * Get a gradient by category and optional variant
 * 
 * @param category - The gradient category (primary, dashboard, semantic, etc.)
 * @param variant - The variant within the category (optional for some categories)
 * @returns The gradient CSS string
 * 
 * @example
 * // Get dashboard card gradient
 * const gradient = getGradient('dashboard', 'card');
 * <div style={{ background: gradient }}>Content</div>
 * 
 * @example
 * // Get primary diagonal gradient
 * const gradient = getGradient('primary', 'diagonal');
 */
export function getGradient(category: 'primary', variant: PrimaryVariant): string;
export function getGradient(category: 'dashboard', variant: DashboardVariant): string;
export function getGradient(category: 'premium', variant: PremiumVariant): string;
export function getGradient(category: 'icon', variant: IconVariant): string;
export function getGradient(category: 'data', variant: DataVariant): string;
export function getGradient(category: GradientCategory, variant?: string): string {
  const categoryGradients = GRADIENTS[category];
  
  if (!categoryGradients) {
    console.warn(`[getGradient] Unknown gradient category: ${category}`);
    return GRADIENTS.primary.diagonal;
  }

  if (variant && typeof categoryGradients === 'object') {
    const gradientValue = (categoryGradients as Record<string, unknown>)[variant];
    if (typeof gradientValue === 'string') {
      return gradientValue;
    }
    console.warn(`[getGradient] Unknown variant "${variant}" for category "${category}"`);
  }

  // If no variant specified or found, return first available gradient
  const firstKey = Object.keys(categoryGradients)[0];
  if (!firstKey) {
    return GRADIENTS.primary.diagonal;
  }
  return (categoryGradients as Record<string, string>)[firstKey] || GRADIENTS.primary.diagonal;
}

/**
 * Get a semantic gradient (success, error, warning)
 * 
 * @param type - The semantic type (success, error, warning)
 * @param usage - The usage context (light for backgrounds, button for buttons)
 * @returns The gradient CSS string
 * 
 * @example
 * // Get success button gradient
 * const gradient = getSemanticGradient('success', 'button');
 * <Button style={{ background: gradient }}>Approve</Button>
 * 
 * @example
 * // Get error light background gradient
 * const gradient = getSemanticGradient('error', 'light');
 * <div style={{ background: gradient }}>Error message</div>
 */
export function getSemanticGradient(
  type: SemanticType,
  usage: SemanticVariant
): string {
  const semanticGradient = GRADIENTS.semantic[type];
  
  if (!semanticGradient) {
    console.warn(`[getSemanticGradient] Unknown semantic type: ${type}`);
    return GRADIENTS.primary.diagonal;
  }

  const gradient = semanticGradient[usage];
  if (!gradient) {
    console.warn(`[getSemanticGradient] Unknown usage "${usage}" for type "${type}"`);
    // Fallback to light variant if available, otherwise use primary gradient
    return (semanticGradient as { light?: string; button?: string }).light || GRADIENTS.primary.diagonal;
  }

  return gradient;
}

/**
 * Get a data visualization gradient by color name
 * 
 * @param color - The color name (red, orange, purple, green, blue, gray)
 * @returns The gradient CSS string
 * 
 * @example
 * // Get red gradient for critical status
 * const gradient = getDataGradient('red');
 * <div style={{ background: gradient }}>Critical</div>
 */
export function getDataGradient(color: DataVariant): string {
  const gradient = GRADIENTS.data[color];
  
  if (!gradient) {
    console.warn(`[getDataGradient] Unknown color: ${color}`);
    return GRADIENTS.data.gray;
  }

  return gradient;
}

/**
 * Check if a gradient string matches any of the defined gradients
 * Useful for validation and migration scripts
 * 
 * @param gradientString - The gradient CSS string to check
 * @returns True if the gradient is defined in the system
 */
export function isDefinedGradient(gradientString: string): boolean {
  const allGradients = Object.values(GRADIENTS).flatMap((category) =>
    typeof category === 'object' ? Object.values(category) : [category]
  );

  return allGradients.flat().includes(gradientString);
}

/**
 * Get all gradients as a flat array
 * Useful for documentation and testing
 * 
 * @returns Array of all gradient CSS strings
 */
export function getAllGradients(): string[] {
  const allGradients: string[] = [];

  function collectGradients(obj: unknown) {
    if (typeof obj === 'string') {
      allGradients.push(obj);
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(collectGradients);
    }
  }

  collectGradients(GRADIENTS);
  return allGradients;
}

/**
 * Export individual gradient groups for direct access
 */
export const primaryGradients = GRADIENTS.primary;
export const dashboardGradients = GRADIENTS.dashboard;
export const semanticGradients = GRADIENTS.semantic;
export const premiumGradients = GRADIENTS.premium;
export const iconGradients = GRADIENTS.icon;
export const dataGradients = GRADIENTS.data;
