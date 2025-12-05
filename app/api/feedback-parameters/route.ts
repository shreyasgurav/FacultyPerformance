import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET feedback parameters (optionally filter by form_type: theory or lab)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formType = searchParams.get('formType'); // 'theory' or 'lab'

    const parameters = await prisma.feedback_parameters.findMany({
      where: formType ? { form_type: formType } : undefined,
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(parameters);
  } catch (error) {
    console.error('Error fetching parameters:', error);
    return NextResponse.json({ error: 'Failed to fetch parameters' }, { status: 500 });
  }
}
