import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper: Calculate year from semester (1-2 = Year 1, 3-4 = Year 2, etc.)
function semesterToYear(semester: number): number {
  return Math.ceil(semester / 2);
}

// GET all students
export async function GET() {
  try {
    const allStudents = await prisma.students.findMany({
      orderBy: { name: 'asc' },
    });
    
    // Map to frontend format
    const mapped = allStudents.map((s: { id: string; name: string; email: string; department_id: string; semester: number; course: string; division: string; batch: string | null }) => ({
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

// POST create new student + user
export async function POST(request: NextRequest) {
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

    // Check if email already exists
    const existingStudent = await prisma.students.findUnique({
      where: { email },
    });
    if (existingStudent) {
      return NextResponse.json({ error: 'A student with this email already exists' }, { status: 409 });
    }

    // Generate unique IDs
    const studentId = `stu_${Date.now()}`;
    const userId = `user_${Date.now()}`;

    // Create student record
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
      },
    });

    // Create user record with role 'student'
    await prisma.users.create({
      data: {
        id: userId,
        name,
        email,
        role: 'student',
        student_id: studentId,
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
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error creating student:', error);
    const message = error instanceof Error ? error.message : 'Failed to create student';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT update student details
export async function PUT(request: NextRequest) {
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

// DELETE student by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing student ID' }, { status: 400 });
    }

    // Delete associated user record first
    await prisma.users.deleteMany({
      where: { student_id: id },
    });

    // Delete feedback responses for this student
    await prisma.feedback_responses.deleteMany({
      where: { student_id: id },
    });

    // Delete student record
    await prisma.students.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting student:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete student';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
