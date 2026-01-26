/**
 * View Only Badge
 * Displays when user has read-only access to a page
 */

'use client';

import { Eye } from 'lucide-react';

/**
 * Badge component to indicate read-only access
 * Use this to inform users they cannot edit content on the page
 */
export function ViewOnlyBadge() {
  return (
    <div
      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border-2 shadow-sm"
      style={{
        background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
        borderColor: '#F59E0B',
        color: '#92400E',
      }}
    >
      <Eye className="h-4 w-4 mr-1.5" />
      Read-Only Access
    </div>
  );
}

/**
 * Inline text variant for smaller spaces
 */
export function ViewOnlyText() {
  return (
    <span className="inline-flex items-center text-sm font-medium text-amber-700">
      <Eye className="h-3.5 w-3.5 mr-1" />
      View Only
    </span>
  );
}






















