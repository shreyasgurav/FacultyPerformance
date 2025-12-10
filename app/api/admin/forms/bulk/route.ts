import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasRole, forbiddenResponse } from '@/lib/auth';

// DELETE bulk delete forms - ADMIN ONLY
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can delete forms');
  }

  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No form IDs provided' }, { status: 400 });
    }

    // 1. Find all responses for these forms
    const responses = await prisma.feedback_responses.findMany({
      where: { form_id: { in: ids } },
      select: { id: true },
    });
    const responseIds = responses.map(r => r.id);

    // 2. Delete response items
    if (responseIds.length > 0) {
      await prisma.feedback_response_items.deleteMany({
        where: { response_id: { in: responseIds } },
      });

      // 3. Delete responses
      await prisma.feedback_responses.deleteMany({
        where: { id: { in: responseIds } },
      });
    }

    // 4. Delete form questions
    await prisma.form_questions.deleteMany({
      where: { form_id: { in: ids } },
    });

    // 5. Delete forms
    const result = await prisma.feedback_forms.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      message: `Deleted ${result.count} form(s)`,
      count: result.count,
    });

  } catch (error: unknown) {
    console.error('Error bulk deleting forms:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete forms';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
