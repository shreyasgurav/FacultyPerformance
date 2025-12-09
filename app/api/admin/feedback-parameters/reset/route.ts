import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasRole, forbiddenResponse } from '@/lib/auth';

// Default theory questions
const DEFAULT_THEORY_QUESTIONS = [
  {
    id: 'theory_1',
    text: 'Interaction with students regarding the subject taught and query-handling during lectures',
    position: 1,
    form_type: 'theory',
    question_type: 'scale_3',
  },
  {
    id: 'theory_2',
    text: 'Number of numerical problems solved/case studies and practical applications discussed',
    position: 2,
    form_type: 'theory',
    question_type: 'scale_3',
  },
  {
    id: 'theory_3',
    text: 'Audibility and overall command on verbal communication',
    position: 3,
    form_type: 'theory',
    question_type: 'scale_3',
  },
  {
    id: 'theory_4',
    text: 'Command on the subject taught',
    position: 4,
    form_type: 'theory',
    question_type: 'scale_3',
  },
  {
    id: 'theory_5',
    text: 'Use of audio/visuals aids (e.g. OHP slides, LCD projector, PA system, charts, models etc.)',
    position: 5,
    form_type: 'theory',
    question_type: 'scale_3',
  },
  {
    id: 'theory_6',
    text: 'Whether the test-syllabus was covered satisfactorily before the term tests?',
    position: 6,
    form_type: 'theory',
    question_type: 'scale_3',
  },
  {
    id: 'theory_7',
    text: 'Evaluation of the faculty in the scale of 1-10',
    position: 7,
    form_type: 'theory',
    question_type: 'scale_1_10',
  },
];

// Default lab questions
const DEFAULT_LAB_QUESTIONS = [
  {
    id: 'lab_1',
    text: 'The practical/tutorial sessions/assignments were well explained and planned to cover the syllabus thoroughly',
    position: 1,
    form_type: 'lab',
    question_type: 'yes_no',
  },
  {
    id: 'lab_2',
    text: 'The practical/tutorial sessions/assignments were useful for conceptual understanding of the topics',
    position: 2,
    form_type: 'lab',
    question_type: 'yes_no',
  },
  {
    id: 'lab_3',
    text: 'Evaluation of the faculty in the scale of 1-10',
    position: 3,
    form_type: 'lab',
    question_type: 'scale_1_10',
  },
];

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can reset parameters');
  }

  try {
    // Delete all existing parameters
    // Note: This no longer affects feedback_response_items because:
    // 1. We removed the FK constraint
    // 2. Response items now have embedded question_text and question_type
    await prisma.feedback_parameters.deleteMany({});

    // Insert default questions
    const allQuestions = [...DEFAULT_THEORY_QUESTIONS, ...DEFAULT_LAB_QUESTIONS];
    
    for (const q of allQuestions) {
      await prisma.feedback_parameters.create({
        data: q,
      });
    }

    return NextResponse.json({ 
      message: 'Parameters reset to default successfully',
      theoryCount: DEFAULT_THEORY_QUESTIONS.length,
      labCount: DEFAULT_LAB_QUESTIONS.length,
    });
  } catch (error) {
    console.error('Error resetting parameters:', error);
    return NextResponse.json({ error: 'Failed to reset parameters' }, { status: 500 });
  }
}
