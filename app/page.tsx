'use client';

import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const { user, userRole, loading, signInWithGoogle, signOut } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Redirect based on role when authenticated
  useEffect(() => {
    if (!loading && user && userRole?.role) {
      switch (userRole.role) {
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'faculty':
          router.push('/faculty/dashboard');
          break;
        case 'student':
          router.push('/student/dashboard');
          break;
      }
    }
  }, [user, userRole, loading, router]);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      console.error(err);
    } finally {
      setIsSigningIn(false);
    }
  };

  // If user is logged in but has no role, show unauthorized message
  if (user && userRole && !userRole.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm mb-2">
            Your email <span className="font-medium text-gray-700">{user.email}</span> is not registered in the system.
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Please contact your administrator to get access.
          </p>
          <button
            onClick={signOut}
            className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-48px)] sm:h-[calc(100vh-56px)] flex overflow-hidden">
      {/* Left Side - Campus Image */}
      <div className="hidden lg:block lg:w-[55%] relative">
        <Image
          src="/somaiyacampus.png"
          alt="Somaiya Campus"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Right Side - Login Options */}
      <div className="w-full lg:w-[45%] flex flex-col bg-white">
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-8">
          {/* Logo/Title Section */}
          <div className="text-center mb-2 sm:mb-4">
            <div className="flex flex-row items-center justify-center mb-2 sm:mb-3">
              <Image
                src="/SomaiyaLogos.png"
                alt="Somaiya Logos"
                width={800}
                height={124}
                className="object-contain w-[280px] sm:w-[340px] md:w-[400px] lg:w-[480px] h-auto"
              />
            </div>
          </div>

          {/* Sign In Section */}
          <div className="w-full max-w-[280px] sm:max-w-xs text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Faculty Feedback</h2>
            <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">Sign in with your Somaiya Email to continue</p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            )}

            <button 
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="flex items-center justify-center gap-2 sm:gap-3 w-full px-4 sm:px-6 py-2.5 sm:py-3.5 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:shadow-sm transition-all text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigningIn ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-700 font-medium">Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-gray-700 font-medium">Continue with Google</span>
                </>
              )}
            </button>

            {/* Separator line */}
            <div className="w-full h-px bg-gray-200 opacity-50 mt-8"></div>
            
            {/* College name */}
            <p className="text-gray-400 text-xs mt-4">K. J. Somaiya College of Engineering</p>
          </div>

          </div>
      </div>
    </div>
  );
}
