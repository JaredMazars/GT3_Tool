/**
 * Page Access Guard
 * Server component that checks page permissions before rendering
 */

import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkPageAccess } from '@/lib/permissions/pageAccess';
import { PageAccessProvider } from '@/components/providers/PageAccessProvider';
import { PageAccessLevel } from '@/types/pagePermissions';

interface PageAccessGuardProps {
  children: ReactNode;
  pathname: string;
}

/**
 * Server component that wraps pages and checks permissions
 * Redirects to dashboard with error if user lacks access
 * Provides access level context to children
 */
export async function PageAccessGuard({ children, pathname }: PageAccessGuardProps) {
  // Get current user
  const user = await getCurrentUser();

  if (!user) {
    // Not authenticated - redirect to login
    redirect('/api/auth/login?callbackUrl=' + encodeURIComponent(pathname));
  }

  // Check page access
  const { canAccess, accessLevel } = await checkPageAccess(user.id, pathname);

  if (!canAccess || accessLevel === PageAccessLevel.NONE) {
    // No access - redirect to dashboard with error message
    redirect('/dashboard?error=access_denied&page=' + encodeURIComponent(pathname));
  }

  // User has access - provide access level to children
  return (
    <PageAccessProvider accessLevel={accessLevel}>
      {children}
    </PageAccessProvider>
  );
}


