import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ role: null }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

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
      where: { email: email }
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
      where: { email: email }
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
      email: email,
      message: 'User not registered in the system'
    });

  } catch (error) {
    console.error('Error fetching user role:', error);
    return NextResponse.json({ role: null, error: 'Server error' }, { status: 500 });
  }
}
