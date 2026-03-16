import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyFirebaseToken } from '@/lib/firebase-admin';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Fallback admin emails (always have access, even if DB is empty)
const FALLBACK_ADMIN_EMAILS = [
  'shrreyasgurav@gmail.com',
  'atharvanmane22@gmail.com',
  'parekhsachi04@gmail.com',
  'mishrasoham.uni@gmail.com',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let normalizedEmail: string | null = null;

    // Primary: Verify Firebase ID token
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.substring(7);
      const verified = await verifyFirebaseToken(idToken);
      if (verified) {
        normalizedEmail = verified.email;
      }
    }

    // Fallback: email query param (only if no FIREBASE_SERVICE_ACCOUNT = local dev)
    if (!normalizedEmail) {
      const emailParam = searchParams.get('email');
      if (emailParam && !process.env.FIREBASE_SERVICE_ACCOUNT) {
        normalizedEmail = emailParam.toLowerCase();
      } else if (!emailParam) {
        return NextResponse.json({ role: null }, { status: 400 });
      } else {
        // Service account configured but no valid token — reject
        return NextResponse.json({ role: null, error: 'Invalid or missing authentication token' }, { status: 401 });
      }
    }

    // Check if admin in DB first
    const dbAdmin = await prisma.admin_users.findUnique({
      where: { email: normalizedEmail }
    });
    if (dbAdmin) {
      return NextResponse.json({
        role: 'admin',
        email: normalizedEmail,
        name: dbAdmin.name || 'Admin'
      });
    }

    // Fallback admin check
    if (FALLBACK_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(normalizedEmail)) {
      return NextResponse.json({
        role: 'admin',
        email: normalizedEmail,
        name: 'Admin'
      });
    }

    // Check if faculty
    const faculty = await prisma.faculty.findUnique({
      where: { email: normalizedEmail }
    });

    if (faculty) {
      return NextResponse.json({
        role: 'faculty',
        facultyId: faculty.id,
        email: faculty.email,
        name: faculty.name
      });
    }

    // Check if student
    const student = await prisma.students.findUnique({
      where: { email: normalizedEmail }
    });

    if (student) {
      return NextResponse.json({
        role: 'student',
        studentId: student.id,
        email: student.email,
        name: student.name
      });
    }

    // User not found in any role
    return NextResponse.json({ 
      role: null,
      email: normalizedEmail,
      message: 'User not registered in the system'
    });

  } catch (error) {
    console.error('Error fetching user role:', error);
    return NextResponse.json({ role: null, error: 'Server error' }, { status: 500 });
  }
}
