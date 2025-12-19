import { NextResponse } from 'next/server';
import { getUserServiceLineRole } from '@/lib/services/service-lines/getUserServiceLineRole';
import { successResponse } from '@/lib/utils/apiUtils';
import { prisma } from '@/lib/db/prisma';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * GET /api/service-lines/user-role
 * Get user's service line role for a specific sub-service line group
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const searchParams = request.nextUrl.searchParams;
    let userId = searchParams.get('userId');
    const subServiceLineGroup = searchParams.get('subServiceLineGroup');

    if (!userId || !subServiceLineGroup) {
      return NextResponse.json({ success: false, error: 'userId and subServiceLineGroup are required' }, { status: 400 });
    }

    // Handle employee-{id} format
    if (userId.startsWith('employee-')) {
      const idPart = userId.split('-')[1];
      const employeeId = idPart ? parseInt(idPart) : NaN;
      
      if (!isNaN(employeeId)) {
        const employee = await prisma.employee.findUnique({
          where: { id: employeeId },
          select: { WinLogon: true },
        });
        
        if (employee?.WinLogon) {
          const existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { email: employee.WinLogon },
                { email: { startsWith: employee.WinLogon.split('@')[0] } },
              ],
            },
            select: { id: true },
          });
          
          if (existingUser) {
            userId = existingUser.id;
          } else {
            return NextResponse.json(
              successResponse({
                role: 'USER',
                userId: userId,
                subServiceLineGroup,
                note: 'Employee has no User account - defaulting to USER',
              })
            );
          }
        } else {
          return NextResponse.json(
            successResponse({
              role: 'USER',
              userId: userId,
              subServiceLineGroup,
              note: 'Employee has no email - defaulting to USER',
            })
          );
        }
      }
    }

    const role = await getUserServiceLineRole(userId, subServiceLineGroup);

    return NextResponse.json(
      successResponse({
        role: role || 'USER',
        userId,
        subServiceLineGroup,
      })
    );
  },
});
