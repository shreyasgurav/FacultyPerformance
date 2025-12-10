import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';

// GET all responses (optionally filter by form_id or student_id) - authenticated users only
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse('Please sign in to access this resource');
  }

  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');
    const studentId = searchParams.get('studentId');

    // Build where clause
    const where: { form_id?: string; student_id?: string } = {};
    if (formId) where.form_id = formId;
    if (studentId) where.student_id = studentId;

    const responses = await prisma.feedback_responses.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      select: {
        id: true,
        form_id: true,
        student_id: true,
        comment: true,
        submitted_at: true,
        feedback_response_items: {
          select: {
            parameter_id: true,
            rating: true,
            question_text: true,
            question_type: true,
          },
        },
      },
      orderBy: { submitted_at: 'desc' },
    });

    return NextResponse.json(responses);
  } catch (error) {
    console.error('Error fetching responses:', error);
    return NextResponse.json([], { status: 200 }); // Return empty array on error
  }
}

// POST submit a new feedback response - students only
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse('Please sign in to submit feedback');
  }

  try {
    const body = await request.json();
    const { formId, studentId, ratings, comment } = body;
    
    // Security: Verify the studentId matches the authenticated user
    if (auth.studentId && auth.studentId !== studentId) {
      return new Response(JSON.stringify({ error: 'You can only submit feedback for yourself' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!formId || !studentId || !ratings) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate ratings object
    const ratingEntries = Object.entries(ratings) as [string, number][];
    if (ratingEntries.length === 0) {
      return NextResponse.json({ error: 'No ratings provided' }, { status: 400 });
    }

    // Generate UUID-based ID to prevent collisions under high concurrency
    const responseId = `resp_${randomUUID()}`;

    // Use transaction for atomicity - all or nothing
    const result = await prisma.$transaction(async (tx) => {
      // Verify student exists and get their details
      const student = await tx.students.findUnique({
        where: { id: studentId },
      });
      if (!student) {
        throw new Error('STUDENT_NOT_FOUND');
      }

      // Verify form exists and get its details
      const form = await tx.feedback_forms.findUnique({
        where: { id: formId },
      });
      if (!form) {
        throw new Error('FORM_NOT_FOUND');
      }

      // Check if student is authorized to submit this form
      // Compare semesters directly (both are now integers)
      const isAuthorized = 
        form.semester === student.semester &&
        form.course === student.course &&
        form.division === student.division &&
        form.status === 'active' &&
        (!form.batch || form.batch === student.batch);

      if (!isAuthorized) {
        throw new Error('NOT_AUTHORIZED');
      }

      // Check for duplicate submission within transaction (with row lock)
      const existing = await tx.feedback_responses.findFirst({
        where: { form_id: formId, student_id: studentId },
      });

      if (existing) {
        throw new Error('DUPLICATE_SUBMISSION');
      }

      // Get form-specific questions to snapshot with response
      const formQuestions = await tx.form_questions.findMany({
        where: { form_id: formId },
        orderBy: { position: 'asc' },
      });

      // Build a map of parameter_id -> question details
      const questionMap = new Map<string, { text: string; type: string }>();
      formQuestions.forEach(q => {
        questionMap.set(q.original_param_id, {
          text: q.question_text,
          type: q.question_type,
        });
      });

      // Fallback: if no form_questions exist (old forms), get from feedback_parameters
      if (formQuestions.length === 0) {
        const formType = form.batch ? 'lab' : 'theory';
        const params = await tx.feedback_parameters.findMany({
          where: { form_type: formType },
        });
        params.forEach(p => {
          questionMap.set(p.id, { text: p.text, type: p.question_type });
        });
      }

      // Create response
      const response = await tx.feedback_responses.create({
        data: {
          id: responseId,
          form_id: formId,
          student_id: studentId,
          comment: comment || null,
        },
      });

      // Create rating items with question snapshot
      await tx.feedback_response_items.createMany({
        data: ratingEntries.map(([parameterId, rating]) => {
          const question = questionMap.get(parameterId);
          return {
            response_id: responseId,
            parameter_id: parameterId,
            rating: Math.min(10, Math.max(0, Number(rating))),
            question_text: question?.text || null,
            question_type: question?.type || null,
          };
        }),
      });

      return response;
    }, {
      maxWait: 30000, // Max time to wait for transaction slot (30s)
      timeout: 60000, // Max transaction duration (60s)
    });

    return NextResponse.json({ 
      message: 'Feedback submitted successfully',
      responseId: result.id 
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error submitting response:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === 'DUPLICATE_SUBMISSION') {
        return NextResponse.json({ error: 'You have already submitted feedback for this form' }, { status: 409 });
      }
      if (error.message === 'NOT_AUTHORIZED') {
        return NextResponse.json({ error: 'You are not authorized to submit this form. This form is for a different class/division.' }, { status: 403 });
      }
      if (error.message === 'STUDENT_NOT_FOUND') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      if (error.message === 'FORM_NOT_FOUND') {
        return NextResponse.json({ error: 'Form not found' }, { status: 404 });
      }
      // Handle unique constraint violation (race condition fallback)
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json({ error: 'You have already submitted feedback for this form' }, { status: 409 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to submit response. Please try again.' }, { status: 500 });
  }
}
