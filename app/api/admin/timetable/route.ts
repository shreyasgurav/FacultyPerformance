import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasRole, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET all timetable entries - ADMIN ONLY
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse('Please sign in to access this resource');
  }
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can access timetable');
  }

  try {
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get('academic_year');

    const where = academicYear ? { academic_year: academicYear } : {};

    const timetableEntries = await prisma.timetable.findMany({
      where,
      orderBy: [
        { semester: 'asc' },
        { course: 'asc' },
        { division: 'asc' },
        { subject_name: 'asc' },
      ],
    });

    // Map to frontend format
    const mapped = timetableEntries.map(entry => ({
      id: entry.id.toString(),
      subjectName: entry.subject_name,
      facultyEmail: entry.faculty_email,
      semester: entry.semester,
      course: entry.course,
      division: entry.division,
      batch: entry.batch,
      honoursCourse: entry.honours_course,
      honoursBatch: entry.honours_batch,
      academicYear: entry.academic_year,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching timetable:', error);
    return NextResponse.json({ error: 'Failed to fetch timetable' }, { status: 500 });
  }
}

// POST create timetable entries (bulk) - ADMIN ONLY
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can modify timetable');
  }

  try {
    const body = await request.json();
    const { entries } = body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'No entries provided' }, { status: 400 });
    }

    const records = entries.map((entry: {
      subjectName: string;
      facultyEmail: string;
      semester: number;
      course: string;
      division: string;
      batch?: string;
      honoursCourse?: string;
      honoursBatch?: string;
      academicYear: string;
    }) => ({
      subject_name: entry.subjectName,
      faculty_email: entry.facultyEmail.toLowerCase(),
      semester: entry.semester,
      course: entry.course ? entry.course.toUpperCase() : '',
      division: entry.division ? entry.division.toUpperCase() : '',
      batch: entry.batch?.toUpperCase() || null,
      honours_course: entry.honoursCourse || null,
      honours_batch: entry.honoursBatch || null,
      academic_year: entry.academicYear,
    }));

    await prisma.timetable.createMany({
      data: records,
      skipDuplicates: true,
    });

    return NextResponse.json({
      message: `Added ${records.length} timetable entries`,
      count: records.length,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating timetable entries:', error);
    return NextResponse.json({ error: 'Failed to create timetable entries' }, { status: 500 });
  }
}

// DELETE clear timetable entries - ADMIN ONLY
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can modify timetable');
  }

  try {
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get('academic_year');

    if (academicYear) {
      // Delete only for specific academic year
      const result = await prisma.timetable.deleteMany({
        where: { academic_year: academicYear },
      });
      return NextResponse.json({
        message: `Deleted ${result.count} timetable entries for ${academicYear}`,
        count: result.count,
      });
    } else {
      // Delete all
      const result = await prisma.timetable.deleteMany({});
      return NextResponse.json({
        message: `Deleted all ${result.count} timetable entries`,
        count: result.count,
      });
    }

  } catch (error) {
    console.error('Error deleting timetable entries:', error);
    return NextResponse.json({ error: 'Failed to delete timetable entries' }, { status: 500 });
  }
}



