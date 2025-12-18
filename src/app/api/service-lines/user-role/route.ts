import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getUserServiceLineRole } from '@/lib/services/service-lines/getUserServiceLineRole';
import { successResponse, errorResponse } from '@/lib/utils/apiUtils';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/service-lines/user-role
 * Get user's service line role for a specific sub-service line group
 * Handles both direct User IDs and employee-{id} format
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    let userId = searchParams.get('userId');
    const subServiceLineGroup = searchParams.get('subServiceLineGroup');

    if (!userId || !subServiceLineGroup) {
      return NextResponse.json(
        errorResponse('userId and subServiceLineGroup are required'),
        { status: 400 }
      );
    }

    // Handle employee-{id} format - look up the User account
    if (userId.startsWith('employee-')) {
      const idPart = userId.split('-')[1];
      const employeeId = idPart ? parseInt(idPart) : NaN;
      
      if (!isNaN(employeeId)) {
        // Look up employee and find their User account
        const employee = await prisma.employee.findUnique({
          where: { id: employeeId },
          select: {
            WinLogon: true,
          },
        });
        
        if (employee?.WinLogon) {
          // Try to find existing user by email
          const existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { email: employee.WinLogon },
                { email: { startsWith: employee.WinLogon.split('@')[0] } },
              ],
            },
            select: {
              id: true,
            },
          });
          
          if (existingUser) {
            userId = existingUser.id;
          } else {
            // Employee has no User account yet - default to USER
            return NextResponse.json(
              successResponse({
                role: 'USER',
                userId: userId, // Return original employee-{id}
                subServiceLineGroup,
                note: 'Employee has no User account - defaulting to USER',
              })
            );
          }
        } else {
          // Employee has no WinLogon - default to USER
          return NextResponse.json(
            successResponse({
              role: 'USER',
              userId: userId, // Return original employee-{id}
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
        role: role || 'USER', // Default to USER if no role found
        userId,
        subServiceLineGroup,
      })
    );
  } catch (error) {
    console.error('Error fetching user service line role:', error);
    return NextResponse.json(
      errorResponse('Failed to fetch user service line role'),
      { status: 500 }
    );
  }
}
