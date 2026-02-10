import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasRole, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET monitor data: forms + eligible students + submission status
// Query params: semester (required), course (required), batch (optional)
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse('Please sign in to access this resource');
  }
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can access monitoring data');
  }

  try {
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester');
    const course = searchParams.get('course');
    const batch = searchParams.get('batch');

    if (!semester || !course) {
      return NextResponse.json({ error: 'Semester and course are required' }, { status: 400 });
    }

    const semesterNum = parseInt(semester, 10);

    // Build form filter
    const formWhere: Record<string, unknown> = {
      semester: semesterNum,
      course: course,
    };
    if (batch) {
      formWhere.batch = batch;
    }

    // Fetch forms matching criteria
    const forms = await prisma.feedback_forms.findMany({
      where: formWhere,
      orderBy: { created_at: 'desc' },
    });

    if (forms.length === 0) {
      return NextResponse.json({ forms: [], students: [], responses: [] });
    }

    const formIds = forms.map(f => f.id);

    // Fetch all responses for these forms (just form_id and student_id)
    const responses = await prisma.feedback_responses.findMany({
      where: { form_id: { in: formIds } },
      select: {
        id: true,
        form_id: true,
        student_id: true,
        submitted_at: true,
      },
    });

    // Fetch all students in the same semester
    // We need to check both regular and honours eligibility
    const allStudents = await prisma.students.findMany({
      where: { semester: semesterNum },
      select: {
        id: true,
        name: true,
        email: true,
        semester: true,
        course: true,
        division: true,
        batch: true,
        honours_course: true,
        honours_batch: true,
      },
    });

    // Map forms to a simplified structure
    const formData = forms.map(f => ({
      id: f.id,
      subject_name: f.subject_name,
      subject_code: f.subject_code,
      faculty_name: f.faculty_name,
      division: f.division,
      batch: f.batch,
      semester: f.semester,
      course: f.course,
      academic_year: f.academic_year,
      status: f.status,
    }));

    // Map students
    const studentData = allStudents.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      semester: s.semester,
      course: s.course,
      division: s.division,
      batch: s.batch || null,
      honours_course: s.honours_course || null,
      honours_batch: s.honours_batch || null,
    }));

    // Map responses
    const responseData = responses.map(r => ({
      id: r.id,
      form_id: r.form_id,
      student_id: r.student_id,
      submitted_at: r.submitted_at,
    }));

    return NextResponse.json({
      forms: formData,
      students: studentData,
      responses: responseData,
    });
  } catch (error) {
    console.error('Error fetching monitor data:', error);
    return NextResponse.json({ error: 'Failed to fetch monitor data' }, { status: 500 });
  }
}
