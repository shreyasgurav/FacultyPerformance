import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse('Please sign in to access this resource');
  }

  // Faculty can only access their own data (unless admin)
  if (auth.role === 'faculty' && auth.facultyId !== params.id) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const faculty = await prisma.faculty.findUnique({
      where: { id: params.id }
    });

    if (!faculty) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
    }

    return NextResponse.json(faculty);
  } catch (error) {
    console.error('Error fetching faculty:', error);
    return NextResponse.json({ error: 'Failed to fetch faculty' }, { status: 500 });
  }
}
