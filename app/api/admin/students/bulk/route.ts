import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasRole, forbiddenResponse } from '@/lib/auth';

// POST bulk create students - ADMIN ONLY
// DELETE bulk delete students - ADMIN ONLY
// Accepts an array of students and creates them all at once using createMany
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can create students');
  }

  try {
    const body = await request.json();
    const { students } = body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'No students provided' }, { status: 400 });
    }

    // Validate and prepare student data
    const now = Date.now();
    const studentRecords: Array<{
      id: string;
      name: string;
      email: string;
      department_id: string;
      semester: number;
      course: string;
      division: string;
      batch: string | null;
    }> = [];

    const userRecords: Array<{
      id: string;
      name: string;
      email: string;
      role: 'student';
      student_id: string;
    }> = [];

    const errors: string[] = [];

    // Get existing emails to skip duplicates
    const existingStudents = await prisma.students.findMany({
      select: { email: true },
    });
    const existingEmails = new Set(existingStudents.map(s => s.email.toLowerCase()));

    for (let i = 0; i < students.length; i++) {
      const { name, email, semester, course, division, batch } = students[i];

      if (!name || !email || !semester || !division) {
        errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }

      const normalizedEmail = email.toLowerCase();
      if (existingEmails.has(normalizedEmail)) {
        // Skip duplicates silently (they already exist)
        continue;
      }

      const semesterNum = parseInt(semester, 10);
      if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
        errors.push(`Row ${i + 1}: Invalid semester`);
        continue;
      }

      const studentId = `stu_${now}_${i}`;
      const userId = `user_${now}_${i}`;

      studentRecords.push({
        id: studentId,
        name,
        email: normalizedEmail,
        department_id: 'dept1',
        semester: semesterNum,
        course: course || 'IT',
        division,
        batch: batch || null,
      });

      userRecords.push({
        id: userId,
        name,
        email: normalizedEmail,
        role: 'student',
        student_id: studentId,
      });

      // Mark as used to prevent duplicates within the same batch
      existingEmails.add(normalizedEmail);
    }

    if (studentRecords.length === 0) {
      return NextResponse.json({
        error: 'No valid students to create',
        details: errors.slice(0, 10),
      }, { status: 400 });
    }

    // Bulk create students
    await prisma.students.createMany({
      data: studentRecords,
      skipDuplicates: true,
    });

    // Bulk create users
    await prisma.users.createMany({
      data: userRecords,
      skipDuplicates: true,
    });

    return NextResponse.json({
      message: `Created ${studentRecords.length} student(s)`,
      count: studentRecords.length,
      skipped: students.length - studentRecords.length,
      errors: errors.slice(0, 10),
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error bulk creating students:', error);
    const message = error instanceof Error ? error.message : 'Failed to create students';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE bulk delete students - ADMIN ONLY
// Fast version: skips response preservation for speed
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can delete students');
  }

  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No student IDs provided' }, { status: 400 });
    }

    // For speed, we do simple bulk deletes (3 queries total, not 2000+)
    // Note: This will delete associated responses too via cascade or leave them orphaned
    
    // 1. Delete all response items for responses by these students
    const responses = await prisma.feedback_responses.findMany({
      where: { student_id: { in: ids } },
      select: { id: true },
    });
    const responseIds = responses.map(r => r.id);
    
    if (responseIds.length > 0) {
      await prisma.feedback_response_items.deleteMany({
        where: { response_id: { in: responseIds } },
      });
      await prisma.feedback_responses.deleteMany({
        where: { id: { in: responseIds } },
      });
    }

    // 2. Delete users linked to these students
    await prisma.users.deleteMany({
      where: { student_id: { in: ids } },
    });

    // 3. Delete student records
    const result = await prisma.students.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      message: `Deleted ${result.count} student(s)`,
      count: result.count,
    });

  } catch (error: unknown) {
    console.error('Error bulk deleting students:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete students';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
