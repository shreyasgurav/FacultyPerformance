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

// GET all faculty (authenticated users only)
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse('Please sign in to access this resource');
  }

  try {
    const allFaculty = await prisma.faculty.findMany({
      orderBy: { name: 'asc' },
    });
    
    // Map to frontend format
    const mapped = allFaculty.map((f) => ({
      id: f.id,
      name: f.name,
      email: f.email,
      departmentId: f.department_id,
      facultyCode: (f as { faculty_code?: string | null }).faculty_code ?? null,
    }));
    
    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching faculty:', error);
    return NextResponse.json({ error: 'Failed to fetch faculty' }, { status: 500 });
  }
}

// POST create new faculty + user - ADMIN ONLY
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can create faculty');
  }

  try {
    const body = await request.json();
    const { name, email, facultyCode } = body;

    if (!name || !email || !facultyCode) {
      return NextResponse.json({ error: 'Missing required fields (name, email, facultyCode)' }, { status: 400 });
    }

    // Check if email already exists as faculty
    const existingFaculty = await prisma.faculty.findUnique({
      where: { email },
    });
    if (existingFaculty) {
      return NextResponse.json({ error: 'A faculty with this email already exists' }, { status: 409 });
    }

    // Check if email exists in other roles (student or admin)
    const otherRole = await checkEmailInOtherRoles(email, 'faculty');
    if (otherRole.exists) {
      return NextResponse.json({ 
        error: `This email is already registered as ${otherRole.role}. Please remove them from ${otherRole.role} first before adding as faculty.` 
      }, { status: 409 });
    }

    // Generate unique IDs
    const facultyId = `fac_${Date.now()}`;
    const userId = `user_${Date.now()}_f`;

    // Create user record first
    const user = await prisma.users.create({
      data: {
        id: userId,
        name,
        email,
        role: 'faculty',
      },
    });

    // Create faculty record with user_id reference
    const faculty = await prisma.faculty.create({
      data: {
        id: facultyId,
        name,
        email,
        department_id: 'dept1', // IT department
        faculty_code: facultyCode,
        user_id: user.id,
      } as { id: string; name: string; email: string; department_id: string; faculty_code?: string; user_id?: string },
    });

    // Return in frontend format
    return NextResponse.json({
      id: faculty.id,
      name: faculty.name,
      email: faculty.email,
      departmentId: faculty.department_id,
      facultyCode: (faculty as { faculty_code?: string | null }).faculty_code ?? null,
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error creating faculty:', error);
    const message = error instanceof Error ? error.message : 'Failed to create faculty';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE faculty by ID - ADMIN ONLY
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can delete faculty');
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing faculty ID' }, { status: 400 });
    }

    // Get faculty to find user_id
    const faculty = await prisma.faculty.findUnique({
      where: { id },
    });

    if (!faculty) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
    }

    // Store user_id before deleting faculty
    const userIdToDelete = faculty.user_id;
    const emailToDelete = faculty.email;

    // Delete faculty record FIRST (removes FK reference to user)
    await prisma.faculty.delete({
      where: { id },
    });

    // THEN delete the associated user record
    if (userIdToDelete) {
      await prisma.users.delete({
        where: { id: userIdToDelete },
      }).catch(() => {
        // Ignore if user doesn't exist
      });
    }
    // Also delete by email as fallback for old data
    await prisma.users.deleteMany({
      where: { email: emailToDelete },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting faculty:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete faculty';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
