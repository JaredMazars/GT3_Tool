import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { BudgetCategory, BudgetMember, TaskBudgetData, BudgetSummary } from '@/types/budget';

/**
 * GET /api/tasks/[id]/budget
 * Calculate and return the complete budget breakdown based on team allocations
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = toTaskId(parseTaskId(params.id));

    // Check task access
    const accessResult = await checkTaskAccess(user.id, taskId, 'VIEWER');
    if (!accessResult.canAccess) {
      throw new AppError(403, 'Access denied', ErrorCodes.FORBIDDEN);
    }

    // Fetch task team allocations with employee data
    const taskTeam = await prisma.taskTeam.findMany({
      where: { taskId },
      select: {
        id: true,
        userId: true,
        allocatedHours: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { User: { name: 'asc' } },
        { id: 'asc' }
      ],
      take: 200
    });

    // Get user emails
    const userEmails = taskTeam
      .map(member => member.User.email?.toLowerCase())
      .filter((email): email is string => !!email);

    // Find employees matching these users
    const employees = await prisma.employee.findMany({
      where: {
        WinLogon: { in: userEmails },
        Active: 'Yes'
      },
      select: {
        WinLogon: true,
        EmpCatCode: true,
        EmpCatDesc: true,
        RateValue: true
      },
      take: 200
    });

    // Create email to employee mapping
    const emailToEmployee = new Map(
      employees.map(emp => [
        emp.WinLogon?.toLowerCase() || '',
        emp
      ])
    );

    // Calculate budget by category
    const categoryMap = new Map<string, BudgetCategory>();

    for (const member of taskTeam) {
      const userEmail = member.User.email?.toLowerCase();
      if (!userEmail) continue;

      const employee = emailToEmployee.get(userEmail);
      if (!employee) continue;

      const allocatedHours = member.allocatedHours 
        ? parseFloat(member.allocatedHours.toString())
        : 0;
      
      if (allocatedHours === 0) continue;

      const rate = employee.RateValue;
      const amount = allocatedHours * rate;

      const categoryKey = employee.EmpCatCode;

      // Get or create category
      let category = categoryMap.get(categoryKey);
      if (!category) {
        category = {
          empCatCode: employee.EmpCatCode,
          empCatDesc: employee.EmpCatDesc,
          totalHours: 0,
          averageRate: 0,
          totalAmount: 0,
          members: []
        };
        categoryMap.set(categoryKey, category);
      }

      // Add member to category
      category.members.push({
        teamMemberId: member.id,
        userId: member.User.id,
        userName: member.User.name || 'Unknown',
        allocatedHours,
        rate,
        amount
      });

      // Update category totals
      category.totalHours += allocatedHours;
      category.totalAmount += amount;
    }

    // Calculate weighted average rates for each category
    const categories = Array.from(categoryMap.values()).map(cat => ({
      ...cat,
      averageRate: cat.totalHours > 0 ? cat.totalAmount / cat.totalHours : 0
    }));

    // Sort categories by total amount (descending)
    categories.sort((a, b) => b.totalAmount - a.totalAmount);

    // Fetch disbursements
    const disbursements = await prisma.taskBudgetDisbursement.findMany({
      where: { taskId },
      select: {
        id: true,
        description: true,
        amount: true,
        expectedDate: true,
        createdBy: true,
        createdAt: true
      },
      orderBy: { expectedDate: 'asc' },
      take: 100
    });

    // Fetch fees
    const fees = await prisma.taskBudgetFee.findMany({
      where: { taskId },
      select: {
        id: true,
        description: true,
        amount: true,
        expectedDate: true,
        createdBy: true,
        createdAt: true
      },
      orderBy: { expectedDate: 'asc' },
      take: 100
    });

    // Convert Decimal to number for disbursements and fees
    const disbursementsData = disbursements.map(d => ({
      id: d.id,
      description: d.description,
      amount: parseFloat(d.amount.toString()),
      expectedDate: d.expectedDate.toISOString(),
      createdBy: d.createdBy,
      createdAt: d.createdAt.toISOString()
    }));

    const feesData = fees.map(f => ({
      id: f.id,
      description: f.description,
      amount: parseFloat(f.amount.toString()),
      expectedDate: f.expectedDate.toISOString(),
      createdBy: f.createdBy,
      createdAt: f.createdAt.toISOString()
    }));

    // Calculate summary
    const totalStaffHours = categories.reduce((sum, cat) => sum + cat.totalHours, 0);
    const totalStaffAmount = categories.reduce((sum, cat) => sum + cat.totalAmount, 0);
    const totalDisbursements = disbursementsData.reduce((sum, d) => sum + d.amount, 0);
    const totalFees = feesData.reduce((sum, f) => sum + f.amount, 0);
    
    // Calculate adjustment: Time + Disbursements - Fees
    const adjustment = totalStaffAmount + totalDisbursements - totalFees;
    const adjustmentPercentage = totalStaffAmount > 0 ? (adjustment / totalStaffAmount) * 100 : 0;
    
    // Grand total includes everything
    const grandTotal = totalStaffAmount + totalDisbursements + totalFees;

    const summary: BudgetSummary = {
      totalStaffHours,
      totalStaffAmount,
      totalDisbursements,
      totalFees,
      adjustment,
      adjustmentPercentage,
      grandTotal
    };

    const budgetData: TaskBudgetData = {
      categories,
      disbursements: disbursementsData,
      fees: feesData,
      summary
    };

    return NextResponse.json(successResponse(budgetData));
  }
});
