import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';

interface FormSubmission {
  formId: string;
  ratings: Record<string, number>;
  comment?: string;
}

// POST: Submit all feedback forms at once
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse('Please sign in to submit feedback');
  }

  try {
    const body = await request.json();
    const { studentId, submissions } = body as {
      studentId: string;
      submissions: FormSubmission[];
    };

    // Security: Verify the studentId matches the authenticated user
    if (auth.studentId && auth.studentId !== studentId) {
      return NextResponse.json(
        { error: 'You can only submit feedback for yourself' },
        { status: 403 }
      );
    }

    if (!studentId || !submissions || submissions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate each submission has ratings
    for (const sub of submissions) {
      if (!sub.formId || !sub.ratings || Object.keys(sub.ratings).length === 0) {
        return NextResponse.json(
          { error: `Invalid submission for form ${sub.formId}` },
          { status: 400 }
        );
      }
    }

    // Submit all forms in a single transaction
    const result = await prisma.$transaction(
      async (tx) => {
        // Verify student exists
        const student = await tx.students.findUnique({
          where: { id: studentId },
        });
        if (!student) {
          throw new Error('STUDENT_NOT_FOUND');
        }

        const createdResponses: string[] = [];

        for (const sub of submissions) {
          // Verify form exists
          const form = await tx.feedback_forms.findUnique({
            where: { id: sub.formId },
          });
          if (!form) {
            throw new Error(`FORM_NOT_FOUND:${sub.formId}`);
          }

          // Check authorization - regular course OR honours course
          const isRegularAuthorized =
            form.semester === student.semester &&
            form.course === student.course &&
            form.division === student.division &&
            form.status === 'active' &&
            (!form.batch || form.batch === student.batch);

          const isHonoursAuthorized =
            !!student.honours_course &&
            form.semester === student.semester &&
            form.course === student.honours_course &&
            form.status === 'active' &&
            (!form.batch || form.batch === (student.honours_batch || ''));

          if (!isRegularAuthorized && !isHonoursAuthorized) {
            throw new Error(`NOT_AUTHORIZED:${sub.formId}`);
          }

          // Check for duplicate
          const existing = await tx.feedback_responses.findFirst({
            where: { form_id: sub.formId, student_id: studentId },
          });
          if (existing) {
            // Skip already submitted forms silently
            continue;
          }

          // Get form questions for snapshot
          const formQuestions = await tx.form_questions.findMany({
            where: { form_id: sub.formId },
            orderBy: { position: 'asc' },
          });

          const questionMap = new Map<string, { text: string; type: string }>();
          formQuestions.forEach((q) => {
            questionMap.set(q.original_param_id, {
              text: q.question_text,
              type: q.question_type,
            });
          });

          // Fallback for old forms
          if (formQuestions.length === 0) {
            const formType = form.batch ? 'lab' : 'theory';
            const params = await tx.feedback_parameters.findMany({
              where: { form_type: formType },
            });
            params.forEach((p) => {
              questionMap.set(p.id, { text: p.text, type: p.question_type });
            });
          }

          const responseId = `resp_${randomUUID()}`;

          // Create response
          await tx.feedback_responses.create({
            data: {
              id: responseId,
              form_id: sub.formId,
              student_id: studentId,
              comment: sub.comment || null,
            },
          });

          // Create rating items
          const ratingEntries = Object.entries(sub.ratings) as [string, number][];
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

          createdResponses.push(responseId);
        }

        return createdResponses;
      },
      {
        maxWait: 30000,
        timeout: 120000, // 2 min for bulk
      }
    );

    return NextResponse.json(
      {
        message: 'All feedback submitted successfully',
        count: result.length,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error submitting bulk responses:', error);

    if (error instanceof Error) {
      if (error.message === 'STUDENT_NOT_FOUND') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      if (error.message.startsWith('FORM_NOT_FOUND')) {
        return NextResponse.json({ error: 'One or more forms not found' }, { status: 404 });
      }
      if (error.message.startsWith('NOT_AUTHORIZED')) {
        return NextResponse.json(
          { error: 'Not authorized for one or more forms' },
          { status: 403 }
        );
      }
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'Some forms were already submitted' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to submit feedback. Please try again.' },
      { status: 500 }
    );
  }
}
