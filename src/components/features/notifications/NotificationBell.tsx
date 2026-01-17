'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useUnreadCount } from '@/hooks/notifications/useNotifications';
import { NotificationDropdown } from './NotificationDropdown';
import { ApproveChangeRequestModal } from '@/components/features/clients/ApproveChangeRequestModal';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalRequestId, setModalRequestId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: unreadCount } = useUnreadCount();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      <div className="relative" ref={menuRef}>
        {/* Bell Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          
          {/* Unread Badge */}
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[20px]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <NotificationDropdown 
            onClose={() => setIsOpen(false)} 
            onOpenChangeRequestModal={setModalRequestId}
          />
        )}
      </div>

      {/* Change Request Modal - rendered outside dropdown so it persists when dropdown closes */}
      {modalRequestId && (
        <ApproveChangeRequestModal
          isOpen={modalRequestId !== null}
          onClose={() => setModalRequestId(null)}
          requestId={modalRequestId}
        />
      )}
    </>
  );
}

