import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all feedback parameters
export async function GET() {
  try {
    const parameters = await prisma.feedback_parameters.findMany({
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(parameters);
  } catch (error) {
    console.error('Error fetching parameters:', error);
    return NextResponse.json({ error: 'Failed to fetch parameters' }, { status: 500 });
  }
}
