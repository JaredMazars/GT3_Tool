import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardNav from '@/components/DashboardNav';
import UserMenu from '@/components/UserMenu';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // This should be caught by middleware, but as a fallback
  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <div className="bg-forvis-gray-50 min-h-screen">
      {/* Top Header with Logo and User Menu */}
      <header className="bg-white border-b border-forvis-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center">
              <Image 
                src="/Mazars-logo-intranet.jpg" 
                alt="Forvis Mazars" 
                width={160} 
                height={45}
                className="h-10 w-auto"
              />
            </Link>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-forvis-gray-700 font-medium">Welcome</span>
              <UserMenu user={user} />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <DashboardNav />
      
      {/* Main Content */}
      <main className="py-6">
        {children}
      </main>
    </div>
  );
}