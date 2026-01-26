/**
 * Role-based gradient colors for UI components
 * Matches the color scheme used in the Team Planner
 */

export function getRoleGradient(role: string): string {
  switch (role) {
    case 'ADMINISTRATOR':
      return 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)';
    case 'PARTNER':
      return 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)';
    case 'MANAGER':
      return 'linear-gradient(135deg, #C084FC 0%, #9333EA 100%)';
    case 'SUPERVISOR':
      return 'linear-gradient(135deg, #4ADE80 0%, #16A34A 100%)';
    case 'USER':
      return 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)';
    case 'VIEWER':
      return 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)';
    default:
      return 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)'; // Default to user blue
  }
}


