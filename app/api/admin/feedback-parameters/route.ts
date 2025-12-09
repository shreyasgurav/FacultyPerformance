import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasRole, forbiddenResponse } from '@/lib/auth';

// GET all feedback parameters
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can view feedback parameters');
  }

  try {
    const { searchParams } = new URL(request.url);
    const formType = searchParams.get('formType');

    const where = formType ? { form_type: formType } : {};

    const parameters = await prisma.feedback_parameters.findMany({
      where,
      orderBy: [
        { form_type: 'asc' },
        { position: 'asc' },
      ],
    });

    return NextResponse.json(parameters);
  } catch (error) {
    console.error('Error fetching parameters:', error);
    return NextResponse.json({ error: 'Failed to fetch parameters' }, { status: 500 });
  }
}

// POST create new parameter
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can create parameters');
  }

  try {
    const body = await request.json();
    const { text, position, form_type, question_type } = body;

    if (!text || position === undefined || !form_type || !question_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = `${form_type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const parameter = await prisma.feedback_parameters.create({
      data: {
        id,
        text,
        position,
        form_type,
        question_type,
      },
    });

    return NextResponse.json(parameter, { status: 201 });
  } catch (error) {
    console.error('Error creating parameter:', error);
    return NextResponse.json({ error: 'Failed to create parameter' }, { status: 500 });
  }
}

// PUT update parameter
export async function PUT(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can update parameters');
  }

  try {
    const body = await request.json();
    const { id, text, position, question_type } = body;

    if (!id) {
      return NextResponse.json({ error: 'Parameter ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (text !== undefined) updateData.text = text;
    if (position !== undefined) updateData.position = position;
    if (question_type !== undefined) updateData.question_type = question_type;

    const parameter = await prisma.feedback_parameters.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(parameter);
  } catch (error) {
    console.error('Error updating parameter:', error);
    return NextResponse.json({ error: 'Failed to update parameter' }, { status: 500 });
  }
}

// DELETE parameter
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can delete parameters');
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Parameter ID is required' }, { status: 400 });
    }

    // Check if parameter has responses
    const responseCount = await prisma.feedback_response_items.count({
      where: { parameter_id: id },
    });

    if (responseCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete parameter with existing responses. Delete responses first or archive the parameter.',
        responseCount 
      }, { status: 400 });
    }

    await prisma.feedback_parameters.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Parameter deleted successfully' });
  } catch (error) {
    console.error('Error deleting parameter:', error);
    return NextResponse.json({ error: 'Failed to delete parameter' }, { status: 500 });
  }
}

// PATCH - Bulk update positions (for reordering)
export async function PATCH(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can reorder parameters');
  }

  try {
    const body = await request.json();
    const { updates } = body; // Array of { id, position }

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Updates array is required' }, { status: 400 });
    }

    // Update positions in a transaction
    await prisma.$transaction(
      updates.map((update: { id: string; position: number }) =>
        prisma.feedback_parameters.update({
          where: { id: update.id },
          data: { position: update.position },
        })
      )
    );

    return NextResponse.json({ message: 'Positions updated successfully' });
  } catch (error) {
    console.error('Error updating positions:', error);
    return NextResponse.json({ error: 'Failed to update positions' }, { status: 500 });
  }
}
