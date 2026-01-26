'use client';

import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UserCircle, LogOut } from 'lucide-react';
import type { SessionUser } from '@/lib/services/auth/auth';

interface UserMenuProps {
  user: SessionUser;
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    
    return undefined;
  }, [isOpen]);

  // Optional: Add visibility change listener to help detect when user leaves
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User switched tabs or minimized - could optionally show a warning
        // This is informational and doesn't log them out
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    // CRITICAL: Clear React Query cache to prevent permission data from persisting
    // between user sessions. Without this, permissions from the previous user
    // (e.g., admin access) can leak to the next user (security issue).
    queryClient.clear();
    
    // Small delay to ensure cache clearing completes before redirect
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Use GET endpoint for server-side redirect instead of POST with client-side redirect
    // This ensures browser processes Set-Cookie headers before following redirect
    window.location.href = '/api/auth/logout';
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-forvis-gray-100 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <UserCircle className="h-6 w-6 text-forvis-gray-600" />
        <span className="text-sm font-medium text-forvis-gray-700 hidden sm:block">
          {user.name}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-corporate-lg border border-forvis-gray-200 py-1 z-50">
          <div className="px-4 py-3 border-b border-forvis-gray-200">
            <p className="text-sm font-medium text-forvis-gray-900">{user.name}</p>
            <p className="text-xs text-forvis-gray-600 mt-1 truncate">{user.email}</p>
          </div>
          
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-3"></div>
                Signing out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-3" />
                Sign out
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

