import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all feedback forms
export async function GET() {
  try {
    const forms = await prisma.feedback_forms.findMany({
      orderBy: { created_at: 'desc' },
    });
    
    return NextResponse.json(forms);
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 });
  }
}

// DELETE a single feedback form by id (and its responses)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Form id is required' }, { status: 400 });
    }

    // Find all responses for this form
    const responses = await prisma.feedback_responses.findMany({
      where: { form_id: id },
      select: { id: true },
    });

    const responseIds = responses.map(r => r.id);

    if (responseIds.length > 0) {
      // Delete response items first
      await prisma.feedback_response_items.deleteMany({
        where: { response_id: { in: responseIds } },
      });

      // Delete responses
      await prisma.feedback_responses.deleteMany({
        where: { id: { in: responseIds } },
      });
    }

    // Finally delete the form
    await prisma.feedback_forms.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting form:', error);
    return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 });
  }
}

// POST create new feedback form(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { forms } = body; // Array of form entries

    if (!forms || !Array.isArray(forms) || forms.length === 0) {
      return NextResponse.json({ error: 'No forms provided' }, { status: 400 });
    }

    const createdForms = [];

    for (const form of forms) {
      const { subjectName, subjectCode, facultyName, facultyEmail, division, batch, year, course } = form;

      if (!subjectName || !facultyName || !facultyEmail || !division || !year) {
        continue; // Skip invalid entries
      }

      const formId = `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const created = await prisma.feedback_forms.create({
        data: {
          id: formId,
          subject_name: subjectName,
          subject_code: subjectCode || null,
          faculty_name: facultyName,
          faculty_email: facultyEmail.toLowerCase(),
          division,
          batch: batch || null,
          year,
          course: course || 'IT',
          status: 'active',
        },
      });

      createdForms.push(created);
    }

    return NextResponse.json({ 
      message: `Created ${createdForms.length} form(s)`,
      forms: createdForms 
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error creating forms:', error);
    const message = error instanceof Error ? error.message : 'Failed to create forms';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
