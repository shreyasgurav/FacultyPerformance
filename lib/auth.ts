import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { verifyFirebaseToken } from './firebase-admin';

// Fallback admin emails (always have access, even if DB is empty)
const FALLBACK_ADMIN_EMAILS = [
  'shrreyasgurav@gmail.com',
  'atharvanmane22@gmail.com',
  'parekhsachi04@gmail.com',
  'mishrasoham.uni@gmail.com',
];

export type UserRole = 'admin' | 'faculty' | 'student' | null;

export interface AuthResult {
  authenticated: boolean;
  email: string | null;
  role: UserRole;
  studentId?: string;
  facultyId?: string;
}

/**
 * Verify user authentication from request headers.
 * Primary: Verify Firebase ID token from Authorization header.
 * Fallback: Accept x-user-email header only if FIREBASE_SERVICE_ACCOUNT is not configured
 * (for local development without service account).
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  let normalizedEmail: string | null = null;

  // Primary: Check for Firebase ID token in Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const idToken = authHeader.substring(7);
    const verified = await verifyFirebaseToken(idToken);
    if (verified) {
      normalizedEmail = verified.email;
    } else {
      // Token provided but invalid/expired — reject
      return { authenticated: false, email: null, role: null };
    }
  }

  // Fallback: x-user-email header (only if no service account configured = local dev)
  if (!normalizedEmail) {
    const emailHeader = request.headers.get('x-user-email');
    if (emailHeader) {
      if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        // No service account = local dev mode, trust the header
        normalizedEmail = emailHeader.toLowerCase();
      } else {
        // Service account is configured but no valid token provided — reject
        return { authenticated: false, email: null, role: null };
      }
    }
  }

  if (!normalizedEmail) {
    return { authenticated: false, email: null, role: null };
  }

  // Check if admin (first check DB, then fallback list)
  const dbAdmin = await prisma.admin_users.findUnique({
    where: { email: normalizedEmail }
  });
  if (dbAdmin) {
    return { authenticated: true, email: normalizedEmail, role: 'admin' };
  }

  // Fallback admin check (hardcoded list for initial access)
  if (FALLBACK_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(normalizedEmail)) {
    return { authenticated: true, email: normalizedEmail, role: 'admin' };
  }

  // Check if faculty
  const faculty = await prisma.faculty.findUnique({
    where: { email: normalizedEmail }
  });
  if (faculty) {
    return { authenticated: true, email: normalizedEmail, role: 'faculty', facultyId: faculty.id };
  }

  // Check if student
  const student = await prisma.students.findUnique({
    where: { email: normalizedEmail }
  });
  if (student) {
    return { authenticated: true, email: normalizedEmail, role: 'student', studentId: student.id };
  }

  // Email not found in system
  return { authenticated: false, email: normalizedEmail, role: null };
}

/**
 * Check if user has required role
 */
export function hasRole(auth: AuthResult, allowedRoles: UserRole[]): boolean {
  return auth.authenticated && auth.role !== null && allowedRoles.includes(auth.role);
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized') {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message: string = 'Forbidden') {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' }
  });
}
