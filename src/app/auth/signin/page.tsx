import { redirect } from 'next/navigation';
import { getSession } from '@/lib/services/auth/auth';
import { API_ROUTES } from '@/constants/routes';

/**
 * Sign In Page
 * Redirects to Azure AD login
 */
export default async function SignInPage() {
  // Check if user is already authenticated
  const session = await getSession();
  
  if (session) {
    // Already signed in, redirect to dashboard
    redirect('/dashboard');
  }

  // Redirect to API login endpoint which will redirect to Azure AD
  redirect(API_ROUTES.AUTH.LOGIN);
}
