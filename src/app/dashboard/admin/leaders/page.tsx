/**
 * Leaders Management Page
 * Admin page for managing firm-wide leader groups
 * Used for communication routing throughout the application
 */

import LeadersPageClient from './LeadersPageClient';

export const metadata = {
  title: 'Leaders - Admin',
  description: 'Manage firm-wide leader groups for communication routing',
};

export default function LeadersPage() {
  return <LeadersPageClient />;
}
