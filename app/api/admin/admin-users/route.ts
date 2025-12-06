import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasRole, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// Helper: Check if email exists in any role (student, faculty, or admin)
async function checkEmailInOtherRoles(email: string, excludeRole: 'student' | 'faculty' | 'admin'): Promise<{ exists: boolean; role?: string }> {
  const normalizedEmail = email.toLowerCase();
  
  if (excludeRole !== 'student') {
    const students = await prisma.students.findMany();
    const studentMatch = students.find(s => s.email.toLowerCase() === normalizedEmail);
    if (studentMatch) return { exists: true, role: 'student' };
  }
  
  if (excludeRole !== 'faculty') {
    const facultyList = await prisma.faculty.findMany();
    const facultyMatch = facultyList.find(f => f.email.toLowerCase() === normalizedEmail);
    if (facultyMatch) return { exists: true, role: 'faculty' };
  }
  
  if (excludeRole !== 'admin') {
    const admins = await prisma.admin_users.findMany();
    const adminMatch = admins.find(a => a.email.toLowerCase() === normalizedEmail);
    if (adminMatch) return { exists: true, role: 'admin' };
  }
  
  return { exists: false };
}

// GET all admin users - ADMIN ONLY
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can view admin users');
  }

  try {
    const admins = await prisma.admin_users.findMany({
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(admins.map(a => ({
      id: a.id,
      email: a.email,
      name: a.name,
      createdAt: a.created_at,
    })));
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: 'Failed to fetch admin users' }, { status: 500 });
  }
}

// POST create new admin user - ADMIN ONLY
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can add admin users');
  }

  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if already exists as admin
    const existing = await prisma.admin_users.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json({ error: 'This email is already an admin' }, { status: 409 });
    }

    // Check if email exists in other roles (student or faculty)
    const otherRole = await checkEmailInOtherRoles(email, 'admin');
    if (otherRole.exists) {
      return NextResponse.json({ 
        error: `This email is already registered as ${otherRole.role}. Please remove them from ${otherRole.role} first before adding as admin.` 
      }, { status: 409 });
    }

    const adminId = `admin_${Date.now()}`;
    const admin = await prisma.admin_users.create({
      data: {
        id: adminId,
        email: email.toLowerCase(),
        name: name || null,
      },
    });

    return NextResponse.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      createdAt: admin.created_at,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 });
  }
}

// DELETE admin user by ID - ADMIN ONLY
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can remove admin users');
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
    }

    // Prevent removing yourself
    const adminToDelete = await prisma.admin_users.findUnique({
      where: { id },
    });

    if (adminToDelete && adminToDelete.email.toLowerCase() === auth.email?.toLowerCase()) {
      return NextResponse.json({ error: 'You cannot remove yourself as admin' }, { status: 400 });
    }

    await prisma.admin_users.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return NextResponse.json({ error: 'Failed to delete admin user' }, { status: 500 });
  }
}
