import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { formId: string } }
) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { formId } = params;

    // First try to get questions from form_questions (snapshot)
    const formQuestions = await prisma.form_questions.findMany({
      where: { form_id: formId },
      orderBy: { position: 'asc' },
    });

    if (formQuestions.length > 0) {
      // Return snapshot questions with original_param_id as the ID for response tracking
      return NextResponse.json(formQuestions.map((q: { original_param_id: string; question_text: string; position: number; question_type: string }) => ({
        id: q.original_param_id,  // Use original parameter ID for response submission
        text: q.question_text,
        position: q.position,
        question_type: q.question_type,
      })));
    }

    // Fallback: Get form to determine type, then fetch from feedback_parameters
    // This handles forms created before the snapshot feature
    const form = await prisma.feedback_forms.findUnique({
      where: { id: formId },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const formType = form.batch ? 'lab' : 'theory';
    const parameters = await prisma.feedback_parameters.findMany({
      where: { form_type: formType },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(parameters.map(p => ({
      id: p.id,
      text: p.text,
      position: p.position,
      question_type: p.question_type,
    })));

  } catch (error) {
    console.error('Error fetching form questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}
