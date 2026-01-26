export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserServiceLineRole } from '@/lib/services/service-lines/getUserServiceLineRole';
import { successResponse } from '@/lib/utils/apiUtils';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { getUserSubServiceLineGroups } from '@/lib/services/service-lines/serviceLineService';
import { isSystemAdmin } from '@/lib/utils/systemAdmin';

// Query parameter validation schema
const UserRoleQuerySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  subServiceLineGroup: z.string().min(1, 'subServiceLineGroup is required'),
});

/**
 * GET /api/service-lines/user-role
 * Get user's service line role for a specific sub-service line group
 * 
 * Authorization: Users can query their own role or roles of employees in sub-groups they have access to
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user }) => {
    const searchParams = request.nextUrl.searchParams;
    
    // Validate query params with Zod
    const parseResult = UserRoleQuerySchema.safeParse({
      userId: searchParams.get('userId'),
      subServiceLineGroup: searchParams.get('subServiceLineGroup'),
    });
    
    if (!parseResult.success) {
      throw new AppError(400, parseResult.error.errors[0]?.message || 'Invalid parameters', ErrorCodes.VALIDATION_ERROR);
    }
    
    let { userId, subServiceLineGroup } = parseResult.data;

    // IDOR protection: Check if the requesting user has access to this sub-service line group
    // Allow users to query their own role without restriction
    const isOwnRole = userId === user.id;
    const isAdmin = isSystemAdmin(user);
    
    if (!isOwnRole && !isAdmin) {
      // Non-admins can only query roles for users in sub-groups they have access to
      const userSubGroups = await getUserSubServiceLineGroups(user.id);
      if (!userSubGroups.includes(subServiceLineGroup)) {
        throw new AppError(403, 'Access denied to this sub-service line group', ErrorCodes.FORBIDDEN);
      }
    }

    // Handle employee-{id} format
    if (userId.startsWith('employee-')) {
      const idPart = userId.split('-')[1];
      const employeeId = idPart ? parseInt(idPart, 10) : NaN;
      
      if (isNaN(employeeId) || employeeId <= 0) {
        throw new AppError(400, 'Invalid employee ID format', ErrorCodes.VALIDATION_ERROR);
      }
      
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { WinLogon: true },
      });
      
      if (employee?.WinLogon) {
        const emailPrefix = employee.WinLogon.split('@')[0];
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: employee.WinLogon },
              ...(emailPrefix ? [{ email: { startsWith: emailPrefix } }] : []),
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
              userId,
              subServiceLineGroup,
              note: 'Employee has no User account - defaulting to USER',
            })
          );
        }
      } else {
        return NextResponse.json(
          successResponse({
            role: 'USER',
            userId,
            subServiceLineGroup,
            note: 'Employee has no email - defaulting to USER',
          })
        );
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
