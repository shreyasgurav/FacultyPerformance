import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasRole, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// Helper: Calculate year from semester (1-2 = Year 1, 3-4 = Year 2, etc.)
function semesterToYear(semester: number): number {
  return Math.ceil(semester / 2);
}

// Helper: Check if email exists in any role (student, faculty, or admin)
async function checkEmailInOtherRoles(email: string, excludeRole: 'student' | 'faculty' | 'admin'): Promise<{ exists: boolean; role?: string }> {
  const normalizedEmail = email.toLowerCase();
  
  if (excludeRole !== 'student') {
    // Check students table
    const students = await prisma.students.findMany();
    const studentMatch = students.find(s => s.email.toLowerCase() === normalizedEmail);
    if (studentMatch) return { exists: true, role: 'student' };
  }
  
  if (excludeRole !== 'faculty') {
    // Check faculty table
    const facultyList = await prisma.faculty.findMany();
    const facultyMatch = facultyList.find(f => f.email.toLowerCase() === normalizedEmail);
    if (facultyMatch) return { exists: true, role: 'faculty' };
  }
  
  if (excludeRole !== 'admin') {
    // Check admin_users table
    const admins = await prisma.admin_users.findMany();
    const adminMatch = admins.find(a => a.email.toLowerCase() === normalizedEmail);
    if (adminMatch) return { exists: true, role: 'admin' };
  }
  
  return { exists: false };
}

// GET all students (authenticated users only)
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse('Please sign in to access this resource');
  }

  try {
    const allStudents = await prisma.students.findMany({
      where: {
        // Exclude the placeholder student used for preserving deleted students' responses
        id: { not: 'placeholder_deleted_students' },
      },
      orderBy: { name: 'asc' },
    });
    
    // Map to frontend format
    const mapped = allStudents.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      departmentId: s.department_id,
      semester: s.semester,
      year: semesterToYear(s.semester),
      course: s.course,
      division: s.division,
      batch: s.batch || '',
    }));
    
    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

// POST create new student + user - ADMIN ONLY
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can create students');
  }

  try {
    const body = await request.json();
    const { name, email, semester, course, division, batch } = body;

    if (!name || !email || !semester || !division) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const semesterNum = parseInt(semester, 10);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      return NextResponse.json({ error: 'Semester must be between 1 and 8' }, { status: 400 });
    }

    // Check if email already exists as student - if so, update instead of reject
    const existingStudent = await prisma.students.findUnique({
      where: { email },
    });
    
    if (existingStudent) {
      // Ensure user record exists (upsert) - fixes login issues after re-adding student
      const user = await prisma.users.upsert({
        where: { email },
        update: { name },
        create: {
          id: `user_${Date.now()}`,
          name,
          email,
          role: 'student',
        },
      });

      // Update existing student with new data and link to user
      const updatedStudent = await prisma.students.update({
        where: { email },
        data: {
          name,
          semester: semesterNum,
          course: course || 'IT',
          division,
          batch: batch || null,
          user_id: user.id,
        },
      });

      // Return updated student
      return NextResponse.json({
        id: updatedStudent.id,
        name: updatedStudent.name,
        email: updatedStudent.email,
        departmentId: updatedStudent.department_id,
        semester: updatedStudent.semester,
        year: semesterToYear(updatedStudent.semester),
        course: updatedStudent.course,
        division: updatedStudent.division,
        batch: updatedStudent.batch || '',
        updated: true,
      });
    }

    // Check if email exists in other roles (faculty or admin)
    const otherRole = await checkEmailInOtherRoles(email, 'student');
    if (otherRole.exists) {
      return NextResponse.json({ 
        error: `This email is already registered as ${otherRole.role}. Please remove them from ${otherRole.role} first before adding as student.` 
      }, { status: 409 });
    }

    // Generate unique IDs for new student
    const studentId = `stu_${Date.now()}`;
    const userId = `user_${Date.now()}`;

    // Create user record first
    const user = await prisma.users.create({
      data: {
        id: userId,
        name,
        email,
        role: 'student',
      },
    });

    // Create student record with user_id reference
    const student = await prisma.students.create({
      data: {
        id: studentId,
        name,
        email,
        department_id: 'dept1', // IT department
        semester: semesterNum,
        course: course || 'IT',
        division,
        batch: batch || null,
        user_id: user.id,
      },
    });

    // Check for orphaned responses from when this student was previously deleted
    // These are stored in the placeholder student with the email marker in the comment
    const placeholderId = 'placeholder_deleted_students';
    const emailMarker = `__original_student_email:${email}`;
    
    // Find responses that belong to this email
    const orphanedResponses = await prisma.feedback_responses.findMany({
      where: {
        student_id: placeholderId,
        comment: { contains: emailMarker },
      },
    });

    // Re-link orphaned responses to the new student
    for (const resp of orphanedResponses) {
      // Remove the email marker from comment since student is restored
      const cleanedComment = resp.comment?.replace(`\n${emailMarker}`, '').replace(emailMarker, '') || null;
      await prisma.feedback_responses.update({
        where: { id: resp.id },
        data: {
          student_id: studentId,
          comment: cleanedComment || null,
        },
      });
    }

    // Return in frontend format
    return NextResponse.json({
      id: student.id,
      name: student.name,
      email: student.email,
      departmentId: student.department_id,
      semester: student.semester,
      year: semesterToYear(student.semester),
      course: student.course,
      division: student.division,
      batch: student.batch || '',
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error creating student:', error);
    const message = error instanceof Error ? error.message : 'Failed to create student';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT update student details - ADMIN ONLY
export async function PUT(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can update students');
  }

  try {
    const body = await request.json();
    const { id, semester, course, division, batch } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing student ID' }, { status: 400 });
    }

    const semesterNum = parseInt(semester, 10);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      return NextResponse.json({ error: 'Semester must be between 1 and 8' }, { status: 400 });
    }

    // Update student record
    const student = await prisma.students.update({
      where: { id },
      data: {
        semester: semesterNum,
        course: course || 'IT',
        division,
        batch: batch || null,
      },
    });

    // Return in frontend format
    return NextResponse.json({
      id: student.id,
      name: student.name,
      email: student.email,
      departmentId: student.department_id,
      semester: student.semester,
      year: semesterToYear(student.semester),
      course: student.course,
      division: student.division,
      batch: student.batch || '',
    });

  } catch (error: unknown) {
    console.error('Error updating student:', error);
    const message = error instanceof Error ? error.message : 'Failed to update student';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE student by ID - ADMIN ONLY
// Note: Feedback responses are preserved by moving them to a placeholder student.
// The original email is stored in the comment field for re-linking if the student is re-added.
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can delete students');
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing student ID' }, { status: 400 });
    }

    // Get student info before deletion
    const student = await prisma.students.findUnique({
      where: { id },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Store the student email in the comment field of responses for future re-linking
    const responses = await prisma.feedback_responses.findMany({
      where: { student_id: id },
    });

    const emailMarker = `__original_student_email:${student.email}`;
    
    for (const resp of responses) {
      // Only add marker if not already present
      if (!resp.comment?.includes('__original_student_email:')) {
        const newComment = resp.comment ? `${resp.comment}\n${emailMarker}` : emailMarker;
        await prisma.feedback_responses.update({
          where: { id: resp.id },
          data: { comment: newComment },
        });
      }
    }

    // Create or find a placeholder student to maintain FK integrity
    const placeholderId = 'placeholder_deleted_students';
    let placeholder = await prisma.students.findUnique({
      where: { id: placeholderId },
    });

    if (!placeholder) {
      placeholder = await prisma.students.create({
        data: {
          id: placeholderId,
          name: '[Deleted Students]',
          email: 'deleted_placeholder@system.local',
          department_id: student.department_id,
          semester: 1,
          course: 'IT',
          division: 'X',
        },
      });
    }

    // Move responses to the placeholder student
    await prisma.feedback_responses.updateMany({
      where: { student_id: id },
      data: { student_id: placeholderId },
    });

    // Store user_id before deleting student
    const userIdToDelete = student.user_id;
    const emailToDelete = student.email;

    // Delete student record FIRST (removes FK reference to user)
    await prisma.students.delete({
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
    console.error('Error deleting student:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete student';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
