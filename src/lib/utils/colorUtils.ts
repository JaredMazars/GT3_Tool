/**
 * Color utility functions for calculating luminance and adaptive text colors
 * Used for ensuring proper contrast on role-based gradient backgrounds
 */

/**
 * Convert hex color to RGB values
 * Supports both #RGB and #RRGGBB formats
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Handle 3-character hex
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  if (hex.length !== 6) {
    return null;
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
}

/**
 * Calculate relative luminance of a color using WCAG formula
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
export function getLuminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;
  
  // Convert to sRGB
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;
  
  // Apply gamma correction
  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  // Calculate relative luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determine if light text should be used on a given background color
 * Uses WCAG AA standard (4.5:1 for normal text)
 */
export function shouldUseLightText(backgroundColor: string): boolean {
  const whiteContrast = getContrastRatio(backgroundColor, '#FFFFFF');
  const blackContrast = getContrastRatio(backgroundColor, '#212529'); // forvis-gray-900
  
  // Use light text if it has better contrast
  return whiteContrast > blackContrast;
}

/**
 * Extract the first color from a CSS gradient string
 * Handles linear-gradient format: linear-gradient(135deg, #COLOR1 0%, #COLOR2 100%)
 */
export function extractFirstGradientColor(gradient: string): string {
  // Match hex colors in the gradient
  const hexMatch = gradient.match(/#[0-9A-Fa-f]{6}/);
  if (hexMatch) {
    return hexMatch[0];
  }
  
  // Fallback to a neutral gray if no match
  return '#94A3B8';
}

/**
 * Darken a hex color by a percentage
 * @param color - Hex color string (e.g., "#5B93D7")
 * @param amount - Amount to darken (0-100), where 0 = no change, 100 = black
 * @returns Darkened hex color
 */
export function darkenColor(color: string, amount: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  // Clamp amount between 0 and 100
  amount = Math.max(0, Math.min(100, amount));
  
  // Calculate darkening factor (0 = no change, 1 = black)
  const factor = 1 - (amount / 100);
  
  // Apply darkening
  const r = Math.round(rgb.r * factor);
  const g = Math.round(rgb.g * factor);
  const b = Math.round(rgb.b * factor);
  
  // Convert back to hex
  const toHex = (n: number) => {
    const hex = n.toString(16).padStart(2, '0');
    return hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Get appropriate text color class for a gradient background
 * @param gradient - CSS gradient string
 * @returns Tailwind text color class
 */
export function getTextColorForGradient(gradient: string): 'text-white' | 'text-forvis-gray-900' {
  const baseColor = extractFirstGradientColor(gradient);
  return shouldUseLightText(baseColor) ? 'text-white' : 'text-forvis-gray-900';
}

/**
 * Darken a gradient's first color based on utilization percentage
 * Used for the utilization fill layer to show planning level
 * Increased darkening for better contrast with white text
 * @param gradient - CSS gradient string
 * @param utilizationPercentage - Utilization percentage (0-100+)
 * @returns Darkened hex color (solid, not gradient)
 */
export function darkenGradientForUtilization(gradient: string, utilizationPercentage: number): string {
  const baseColor = extractFirstGradientColor(gradient);
  
  // Determine darkening amount based on utilization - increased for better contrast
  let darkenAmount: number;
  if (utilizationPercentage < 50) {
    darkenAmount = 30; // Darker for under-utilized (was 15)
  } else if (utilizationPercentage <= 80) {
    darkenAmount = 35; // More darker for normal utilization (was 20)
  } else if (utilizationPercentage <= 100) {
    darkenAmount = 40; // Even darker for high utilization (was 25)
  } else {
    darkenAmount = 45; // Most darker for over-utilization (was 30)
  }
  
  return darkenColor(baseColor, darkenAmount);
}
