'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('student' | 'faculty' | 'admin')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Not logged in - redirect to login
      if (!user) {
        router.push('/');
        return;
      }

      // Logged in but no role or role not allowed
      if (!userRole?.role || !allowedRoles.includes(userRole.role)) {
        router.push('/');
        return;
      }
    }
  }, [user, userRole, loading, router, allowedRoles]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authorized
  if (!user || !userRole?.role || !allowedRoles.includes(userRole.role)) {
    return null;
  }

  return <>{children}</>;
}
