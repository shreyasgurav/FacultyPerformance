import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';

// GET: Load draft progress for a student
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse('Please sign in');
  }

  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
    }

    // Security: only allow students to load their own draft
    if (auth.studentId && auth.studentId !== studentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const draft = await prisma.draft_feedback.findUnique({
      where: { student_id: studentId },
    });

    if (!draft) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      formData: JSON.parse(draft.form_data),
      updatedAt: draft.updated_at,
    });
  } catch (error) {
    console.error('Error loading draft:', error);
    return NextResponse.json(null);
  }
}

// PUT: Save/update draft progress
export async function PUT(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse('Please sign in');
  }

  try {
    const body = await request.json();
    const { studentId, currentFormIndex, allRatings, allComments } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
    }

    // Security: only allow students to save their own draft
    if (auth.studentId && auth.studentId !== studentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = JSON.stringify({
      currentFormIndex,
      allRatings,
      allComments,
    });

    // Upsert: create or update
    await prisma.draft_feedback.upsert({
      where: { student_id: studentId },
      update: { form_data: formData },
      create: { student_id: studentId, form_data: formData },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving draft:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

// DELETE: Clear draft after submission
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse('Please sign in');
  }

  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
    }

    if (auth.studentId && auth.studentId !== studentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.draft_feedback.deleteMany({
      where: { student_id: studentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
