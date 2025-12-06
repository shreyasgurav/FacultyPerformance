import { NextRequest } from 'next/server';
import { prisma } from './prisma';

// Fallback admin emails (always have access, even if DB is empty)
const FALLBACK_ADMIN_EMAILS = [
  'shrreyasgurav@gmail.com',
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
 * Verify user authentication from request headers
 * The client sends the user's email in x-user-email header after Firebase auth
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const email = request.headers.get('x-user-email');
  
  if (!email) {
    return { authenticated: false, email: null, role: null };
  }

  const normalizedEmail = email.toLowerCase();

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
