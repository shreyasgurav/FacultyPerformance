import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasRole, forbiddenResponse } from '@/lib/auth';

// POST bulk create faculty - ADMIN ONLY
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can create faculty');
  }

  try {
    const body = await request.json();
    const { faculty } = body;

    if (!faculty || !Array.isArray(faculty) || faculty.length === 0) {
      return NextResponse.json({ error: 'No faculty provided' }, { status: 400 });
    }

    const now = Date.now();
    const facultyRecords: Array<{
      id: string;
      name: string;
      email: string;
      department_id: string;
      faculty_code: string | null;
    }> = [];

    const userRecords: Array<{
      id: string;
      name: string;
      email: string;
      role: 'faculty';
      faculty_id: string;
    }> = [];

    const errors: string[] = [];

    // Get existing emails to skip duplicates
    const existingFaculty = await prisma.faculty.findMany({
      select: { email: true },
    });
    const existingEmails = new Set(existingFaculty.map(f => f.email.toLowerCase()));

    for (let i = 0; i < faculty.length; i++) {
      const { name, email, code, facultyCode } = faculty[i];
      const fCode = code || facultyCode || null;

      if (!name || !email) {
        errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }

      const normalizedEmail = email.toLowerCase();
      if (existingEmails.has(normalizedEmail)) {
        continue; // Skip duplicates
      }

      const facultyId = `fac_${now}_${i}`;
      const userId = `user_${now}_${i}`;

      facultyRecords.push({
        id: facultyId,
        name,
        email: normalizedEmail,
        department_id: 'dept1',
        faculty_code: fCode,
      });

      userRecords.push({
        id: userId,
        name,
        email: normalizedEmail,
        role: 'faculty',
        faculty_id: facultyId,
      });

      existingEmails.add(normalizedEmail);
    }

    if (facultyRecords.length === 0) {
      return NextResponse.json({
        error: 'No valid faculty to create',
        details: errors.slice(0, 10),
      }, { status: 400 });
    }

    await prisma.faculty.createMany({
      data: facultyRecords,
      skipDuplicates: true,
    });

    await prisma.users.createMany({
      data: userRecords,
      skipDuplicates: true,
    });

    return NextResponse.json({
      message: `Created ${facultyRecords.length} faculty member(s)`,
      count: facultyRecords.length,
      skipped: faculty.length - facultyRecords.length,
      errors: errors.slice(0, 10),
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error bulk creating faculty:', error);
    const message = error instanceof Error ? error.message : 'Failed to create faculty';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE bulk delete faculty - ADMIN ONLY
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can delete faculty');
  }

  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No faculty IDs provided' }, { status: 400 });
    }

    // Delete users linked to these faculty
    await prisma.users.deleteMany({
      where: { faculty_id: { in: ids } },
    });

    // Delete faculty records
    const result = await prisma.faculty.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      message: `Deleted ${result.count} faculty member(s)`,
      count: result.count,
    });

  } catch (error: unknown) {
    console.error('Error bulk deleting faculty:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete faculty';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
