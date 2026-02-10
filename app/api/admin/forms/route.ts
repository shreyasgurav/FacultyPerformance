import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasRole, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET feedback forms (admin, faculty, student can view)
// Supports optional filtering via query params: semester, course, division, batch, status
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse('Please sign in to access this resource');
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester');
    const course = searchParams.get('course');
    const division = searchParams.get('division');
    const batch = searchParams.get('batch');
    const status = searchParams.get('status');
    const facultyEmail = searchParams.get('facultyEmail');

    // Build where clause for server-side filtering
    const where: {
      semester?: number;
      course?: string;
      division?: string;
      batch?: string | null;
      status?: 'active' | 'closed';
      faculty_email?: string;
    } = {};

    if (semester) where.semester = parseInt(semester, 10);
    if (course) where.course = course;
    if (division) where.division = division;
    if (status) where.status = status as 'active' | 'closed';
    if (facultyEmail) where.faculty_email = facultyEmail.toLowerCase();
    
    // For batch: if specified, filter by it; for students with batch, also get division-level forms
    // This is handled client-side for flexibility, but batch filter works server-side too
    if (batch) where.batch = batch;

    const forms = await prisma.feedback_forms.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { created_at: 'desc' },
    });
    
    return NextResponse.json(forms);
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 });
  }
}

// DELETE a single feedback form by id (and its responses) - ADMIN ONLY
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can delete forms');
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Form id is required' }, { status: 400 });
    }

    // Find all responses for this form
    const responses = await prisma.feedback_responses.findMany({
      where: { form_id: id },
      select: { id: true },
    });

    const responseIds = responses.map(r => r.id);

    if (responseIds.length > 0) {
      // Delete response items first
      await prisma.feedback_response_items.deleteMany({
        where: { response_id: { in: responseIds } },
      });

      // Delete responses
      await prisma.feedback_responses.deleteMany({
        where: { id: { in: responseIds } },
      });
    }

    // Finally delete the form
    await prisma.feedback_forms.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting form:', error);
    return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 });
  }
}

// POST create new feedback form(s) - ADMIN ONLY
// Optimized for bulk creation with parallel processing
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can create forms');
  }

  try {
    const body = await request.json();
    const { forms } = body; // Array of form entries

    if (!forms || !Array.isArray(forms) || forms.length === 0) {
      return NextResponse.json({ error: 'No forms provided' }, { status: 400 });
    }

    // Calculate default academic year once
    const defaultAcademicYear = (() => {
      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();
      if (month >= 5) {
        return `${year}-${(year + 1).toString().slice(-2)}`;
      } else {
        return `${year - 1}-${year.toString().slice(-2)}`;
      }
    })();

    // Pre-fetch question templates for both form types (only 2 queries instead of N)
    const [theoryQuestions, labQuestions] = await Promise.all([
      prisma.feedback_parameters.findMany({
        where: { form_type: 'theory' },
        orderBy: { position: 'asc' },
      }),
      prisma.feedback_parameters.findMany({
        where: { form_type: 'lab' },
        orderBy: { position: 'asc' },
      }),
    ]);

    // Prepare all form data and question data in memory first
    const formDataList: Array<{
      id: string;
      subject_name: string;
      subject_code: string | null;
      faculty_name: string;
      faculty_email: string;
      division: string;
      batch: string | null;
      semester: number;
      course: string;
      academic_year: string;
      status: 'active';
    }> = [];

    const allQuestionData: Array<{
      form_id: string;
      original_param_id: string;
      question_text: string;
      position: number;
      question_type: string;
    }> = [];

    // Process all forms in memory (no DB calls yet)
    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      const { subjectName, subjectCode, facultyName, facultyEmail, division, batch, semester, course, academicYear, isHonours } = form;

      // Honours forms don't need division; regular forms do
      if (!subjectName || !facultyName || !facultyEmail || !semester) {
        continue; // Skip invalid entries
      }
      if (!isHonours && !division) {
        continue; // Regular forms need division
      }

      const semesterNum = parseInt(semester, 10);
      if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
        continue; // Skip invalid semester
      }

      // Generate unique form ID using index to ensure uniqueness
      const formId = `form_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`;
      const isLab = !!batch;
      const questionTemplates = isLab ? labQuestions : theoryQuestions;

      // Add form data
      formDataList.push({
        id: formId,
        subject_name: subjectName,
        subject_code: subjectCode || null,
        faculty_name: facultyName,
        faculty_email: facultyEmail.toLowerCase(),
        division: division || '',
        batch: batch || null,
        semester: semesterNum,
        course: course || 'IT',
        academic_year: academicYear || defaultAcademicYear,
        status: 'active',
      });

      // Add question data for this form
      for (const q of questionTemplates) {
        allQuestionData.push({
          form_id: formId,
          original_param_id: q.id,
          question_text: q.text,
          position: q.position,
          question_type: q.question_type,
        });
      }
    }

    if (formDataList.length === 0) {
      return NextResponse.json({ error: 'No valid forms to create' }, { status: 400 });
    }

    // Bulk create all forms at once
    await prisma.feedback_forms.createMany({
      data: formDataList,
    });

    // Bulk create all questions at once
    if (allQuestionData.length > 0) {
      await prisma.form_questions.createMany({
        data: allQuestionData,
      });
    }

    return NextResponse.json({ 
      message: `Created ${formDataList.length} form(s)`,
      count: formDataList.length,
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error creating forms:', error);
    const message = error instanceof Error ? error.message : 'Failed to create forms';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
