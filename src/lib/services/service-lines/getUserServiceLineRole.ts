import { prisma } from '@/lib/db/prisma';
import { ServiceLineRole } from '@/types';

/**
 * Get user's service line role for a specific sub-service line group
 * @param userId - User ID to lookup
 * @param subServiceLineGroup - Sub-service line group code
 * @returns ServiceLineRole or null if not found
 */
export async function getUserServiceLineRole(
  userId: string,
  subServiceLineGroup: string
): Promise<ServiceLineRole | null> {
  try {
    let actualUserId = userId;

    // If userId looks like an email, look up the User.id first
    if (userId.includes('@')) {
      const user = await prisma.user.findUnique({
        where: { email: userId },
        select: { id: true },
      });

      if (!user) {
        return null;
      }

      actualUserId = user.id;
    }

    const serviceLineUser = await prisma.serviceLineUser.findFirst({
      where: {
        userId: actualUserId,
        subServiceLineGroup,
      },
      select: {
        role: true,
      },
    });

    if (!serviceLineUser) {
      return null;
    }

    // Validate and return the role
    const role = serviceLineUser.role as ServiceLineRole;
    return role;
  } catch (error) {
    console.error('Error fetching user service line role:', error);
    return null;
  }
}
