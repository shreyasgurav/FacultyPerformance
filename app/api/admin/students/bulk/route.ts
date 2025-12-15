import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasRole, forbiddenResponse } from '@/lib/auth';

// POST bulk create/update students - ADMIN ONLY
// Accepts an array of students - creates new ones and updates existing ones
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

    const now = Date.now();
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    // Get existing students by email for upsert logic
    const existingStudents = await prisma.students.findMany({
      select: { id: true, email: true },
    });
    const existingByEmail = new Map(existingStudents.map(s => [s.email.toLowerCase(), s.id]));

    // Separate new students from updates
    const newStudentRecords: Array<{
      id: string;
      name: string;
      email: string;
      department_id: string;
      semester: number;
      course: string;
      division: string;
      batch: string | null;
      user_id: string;
    }> = [];

    const newUserRecords: Array<{
      id: string;
      name: string;
      email: string;
      role: 'student';
    }> = [];

    const updatePromises: Promise<unknown>[] = [];
    const processedEmails = new Set<string>();

    for (let i = 0; i < students.length; i++) {
      const { name, email, semester, course, division, batch } = students[i];

      if (!name || !email || !semester || !division) {
        errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }

      const normalizedEmail = email.toLowerCase();
      
      // Skip if we've already processed this email in this batch
      if (processedEmails.has(normalizedEmail)) {
        continue;
      }
      processedEmails.add(normalizedEmail);

      const semesterNum = parseInt(semester, 10);
      if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
        errors.push(`Row ${i + 1}: Invalid semester`);
        continue;
      }

      const existingId = existingByEmail.get(normalizedEmail);
      
      if (existingId) {
        // Update existing student
        const userId = `user_${now}_upd_${i}`;
        updatePromises.push(
          // First ensure user exists
          prisma.users.upsert({
            where: { email: normalizedEmail },
            update: { name },
            create: {
              id: userId,
              name,
              email: normalizedEmail,
              role: 'student',
            },
          }).then((user) => {
            // Then update student with user_id link
            return prisma.students.update({
              where: { id: existingId },
              data: {
                name,
                semester: semesterNum,
                course: course || 'IT',
                division,
                batch: batch || null,
                user_id: user.id,
              },
            });
          })
        );
        updated++;
      } else {
        // New student - generate IDs
        const studentId = `stu_${now}_${i}`;
        const userId = `user_${now}_${i}`;

        // User record (created first)
        newUserRecords.push({
          id: userId,
          name,
          email: normalizedEmail,
          role: 'student',
        });

        // Student record with user_id reference
        newStudentRecords.push({
          id: studentId,
          name,
          email: normalizedEmail,
          department_id: 'dept1',
          semester: semesterNum,
          course: course || 'IT',
          division,
          batch: batch || null,
          user_id: userId,
        });

        // Mark as existing for rest of batch
        existingByEmail.set(normalizedEmail, studentId);
        created++;
      }
    }

    // Execute all updates in parallel
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    // Bulk create - users first, then students (students reference users)
    if (newUserRecords.length > 0) {
      await prisma.users.createMany({
        data: newUserRecords,
        skipDuplicates: true,
      });
    }

    if (newStudentRecords.length > 0) {
      await prisma.students.createMany({
        data: newStudentRecords,
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      message: `Created ${created} student(s), updated ${updated} student(s)`,
      created,
      updated,
      total: created + updated,
      errors: errors.slice(0, 10),
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error bulk creating/updating students:', error);
    const message = error instanceof Error ? error.message : 'Failed to create/update students';
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

    // 2. Get emails of students to delete, then delete associated users
    const studentsToDelete = await prisma.students.findMany({
      where: { id: { in: ids } },
      select: { email: true, user_id: true },
    });
    const emailsToDelete = studentsToDelete.map(s => s.email);
    const userIdsToDelete = studentsToDelete.map(s => s.user_id).filter((id): id is string => id !== null);

    // Delete users by user_id (new FK direction)
    if (userIdsToDelete.length > 0) {
      await prisma.users.deleteMany({
        where: { id: { in: userIdsToDelete } },
      });
    }
    // Fallback: delete by email for old data without user_id
    if (emailsToDelete.length > 0) {
      await prisma.users.deleteMany({
        where: { email: { in: emailsToDelete } },
      });
    }

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
