import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * POST /api/permissions/seed
 * Re-seed default permissions
 * Requires SYSTEM_ADMIN role
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SYSTEM_ADMIN can re-seed permissions
    if (user.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - SYSTEM_ADMIN access required' },
        { status: 403 }
      );
    }

    // Run the seed script
    const scriptPath = path.join(process.cwd(), 'scripts', 'seed-permissions.ts');
    const { stdout, stderr } = await execAsync(`npx ts-node ${scriptPath}`);

    if (stderr) {
      console.error('Seed stderr:', stderr);
    }

    return NextResponse.json(
      successResponse({
        message: 'Permissions re-seeded successfully',
        output: stdout,
      })
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/permissions/seed');
  }
}



