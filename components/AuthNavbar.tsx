'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function AuthNavbar() {
  const { user, userRole, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!user || !userRole?.role) {
    return null;
  }

  const getRoleLabel = () => {
    switch (userRole.role) {
      case 'admin': return 'Committee';
      case 'faculty': return 'Faculty';
      case 'student': return 'Student';
      default: return '';
    }
  };

  const getDashboardLink = () => {
    switch (userRole.role) {
      case 'admin': return '/admin/dashboard';
      case 'faculty': return '/faculty/dashboard';
      case 'student': return '/student/dashboard';
      default: return '/';
    }
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href={getDashboardLink()} className="flex items-center gap-2">
            <Image
              src="/somaiyatitlelogo.png"
              alt="Somaiya"
              width={28}
              height={28}
              className="object-contain"
            />
            <span className="text-sm font-semibold text-gray-900 hidden sm:block">
              Faculty Feedback
            </span>
          </Link>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-medium">
                  {(userRole.name || user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900 leading-tight">
                  {userRole.name || user.displayName || 'User'}
                </p>
                <p className="text-xs text-gray-400">{getRoleLabel()}</p>
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{userRole.name || user.displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href={getDashboardLink()}
                      onClick={() => setShowDropdown(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        signOut();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
