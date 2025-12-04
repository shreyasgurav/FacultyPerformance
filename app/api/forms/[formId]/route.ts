import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single form by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { formId: string } }
) {
  try {
    const form = await prisma.feedback_forms.findUnique({
      where: { id: params.formId },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    return NextResponse.json(form);
  } catch (error) {
    console.error('Error fetching form:', error);
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 });
  }
}
