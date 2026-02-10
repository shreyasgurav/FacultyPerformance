import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasRole, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET all timetable images (metadata only, or with data if ?full=true)
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse('Please sign in to access this resource');
  }
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can access timetable images');
  }

  try {
    const { searchParams } = new URL(request.url);
    const full = searchParams.get('full') === 'true';
    const id = searchParams.get('id');

    // Single image fetch by id
    if (id) {
      const image = await prisma.timetable_images.findUnique({
        where: { id: BigInt(id) },
      });
      if (!image) {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 });
      }
      return NextResponse.json({
        id: image.id.toString(),
        label: image.label,
        image_data: image.image_data,
        mime_type: image.mime_type,
        created_at: image.created_at,
      });
    }

    // List all
    const images = await prisma.timetable_images.findMany({
      select: {
        id: true,
        label: true,
        mime_type: true,
        created_at: true,
        ...(full ? { image_data: true } : {}),
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(images.map(img => ({
      id: img.id.toString(),
      label: img.label,
      mime_type: img.mime_type,
      created_at: img.created_at,
      ...(full && 'image_data' in img ? { image_data: (img as typeof img & { image_data: string }).image_data } : {}),
    })));
  } catch (error) {
    console.error('Error fetching timetable images:', error);
    return NextResponse.json({ error: 'Failed to fetch timetable images' }, { status: 500 });
  }
}

// POST upload a new timetable image
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse('Please sign in');
  }
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can upload timetable images');
  }

  try {
    const body = await request.json();
    const { label, image_data, mime_type } = body;

    if (!label || !image_data || !mime_type) {
      return NextResponse.json({ error: 'label, image_data, and mime_type are required' }, { status: 400 });
    }

    // Validate mime type
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(mime_type)) {
      return NextResponse.json({ error: 'Only PNG, JPEG, and WebP images are allowed' }, { status: 400 });
    }

    const image = await prisma.timetable_images.create({
      data: { label, image_data, mime_type },
    });

    return NextResponse.json({
      id: image.id.toString(),
      label: image.label,
      mime_type: image.mime_type,
      created_at: image.created_at,
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading timetable image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}

// DELETE a timetable image by id
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse('Please sign in');
  }
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can delete timetable images');
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Image id is required' }, { status: 400 });
    }

    await prisma.timetable_images.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({ message: 'Image deleted' });
  } catch (error) {
    console.error('Error deleting timetable image:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
