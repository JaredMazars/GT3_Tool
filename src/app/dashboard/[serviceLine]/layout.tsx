import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkServiceLineAccess } from '@/lib/services/service-lines/serviceLineService';
import { isValidServiceLine } from '@/lib/utils/serviceLineUtils';
import { prisma } from '@/lib/db/prisma';

interface ServiceLineLayoutProps {
  children: ReactNode;
  params: Promise<{ serviceLine: string }>;
}

export default async function ServiceLineLayout({
  children,
  params,
}: ServiceLineLayoutProps) {
  // Get current user
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/signin');
  }

  // Get service line from params
  const { serviceLine } = await params;
  const serviceLineUpper = serviceLine.toUpperCase();

  // Validate service line exists
  if (!isValidServiceLine(serviceLineUpper)) {
    redirect('/dashboard?error=invalid_service_line');
  }

  // Check if user is SYSTEM_ADMIN (automatic access to all service lines)
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  const isSystemAdmin = dbUser?.role === 'SYSTEM_ADMIN';

  // For regular users, check service line access
  if (!isSystemAdmin) {
    const hasAccess = await checkServiceLineAccess(user.id, serviceLineUpper);
    
    if (!hasAccess) {
      redirect(`/dashboard?error=no_service_line_access&serviceLine=${serviceLineUpper}`);
    }
  }

  // User has access, render the page
  return <>{children}</>;
}


