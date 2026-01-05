'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { getAuthInstance, getGoogleProviderInstance } from '@/lib/firebase';

interface UserRole {
  role: 'student' | 'faculty' | 'admin' | null;
  studentId?: string;
  facultyId?: string;
  name?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user role from database based on email
  const fetchUserRole = async (email: string): Promise<UserRole> => {
    try {
      const res = await fetch(`/api/auth/role?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      return { role: null };
    } catch (error) {
      console.error('Error fetching user role:', error);
      return { role: null };
    }
  };

  useEffect(() => {
    const authInstance = getAuthInstance();
    if (!authInstance) return;
    
    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser?.email) {
        const role = await fetchUserRole(firebaseUser.email);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const authInstance = getAuthInstance();
      const providerInstance = getGoogleProviderInstance();
      if (!authInstance || !providerInstance) {
        throw new Error('Firebase is not initialized');
      }
      
      setLoading(true);
      const result = await signInWithPopup(authInstance, providerInstance);
      if (result.user?.email) {
        const role = await fetchUserRole(result.user.email);
        setUserRole(role);
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const authInstance = getAuthInstance();
      if (!authInstance) {
        throw new Error('Firebase is not initialized');
      }
      await firebaseSignOut(authInstance);
      setUser(null);
      setUserRole(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Authenticated fetch - adds user email header to all requests
  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers);
    
    if (user?.email) {
      headers.set('x-user-email', user.email);
    }
    
    return fetch(url, {
      ...options,
      headers,
    });
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, signInWithGoogle, signOut, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
