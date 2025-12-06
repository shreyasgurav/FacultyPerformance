import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasRole, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

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

    // Check if email already exists
    const existingFaculty = await prisma.faculty.findUnique({
      where: { email },
    });
    if (existingFaculty) {
      return NextResponse.json({ error: 'A faculty with this email already exists' }, { status: 409 });
    }

    // Generate unique IDs
    const facultyId = `fac_${Date.now()}`;
    const userId = `user_${Date.now()}_f`;

    // Create faculty record, including faculty code
    const faculty = await prisma.faculty.create({
      data: {
        id: facultyId,
        name,
        email,
        department_id: 'dept1', // IT department
        faculty_code: facultyCode,
      } as { id: string; name: string; email: string; department_id: string; faculty_code?: string },
    });

    // Create user record with role 'faculty'
    await prisma.users.create({
      data: {
        id: userId,
        name,
        email,
        role: 'faculty',
        faculty_id: facultyId,
      },
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

    // Delete associated user record first
    await prisma.users.deleteMany({
      where: { faculty_id: id },
    });

    // Delete faculty record
    await prisma.faculty.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting faculty:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete faculty';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
