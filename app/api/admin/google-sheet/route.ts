import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole, forbiddenResponse } from '@/lib/auth';

// Default public Google Sheet CSV export URL (used if no custom URL is provided)
// NOTE: Any sheet used here must be accessible without auth ("Anyone with the link can view")
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1WstDNoS9sHgTKeE2CqmRO5-Hqk-iCu9zlBD-GFg88ug/export?format=csv&gid=0';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);

  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can import from the Google Sheet');
  }

  try {
    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get('url');

    let csvUrl = GOOGLE_SHEET_CSV_URL;

    // If a Google Sheets link is provided, derive the CSV export URL from it
    if (urlParam) {
      try {
        const providedUrl = new URL(urlParam);

        if (providedUrl.hostname !== 'docs.google.com') {
          return NextResponse.json(
            { error: 'Only Google Sheets links from docs.google.com are supported' },
            { status: 400 },
          );
        }

        const match = providedUrl.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
        const sheetId = match?.[1];

        if (!sheetId) {
          return NextResponse.json(
            { error: 'Invalid Google Sheets URL' },
            { status: 400 },
          );
        }

        const gid = providedUrl.searchParams.get('gid') || '0';
        csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid Google Sheets URL' },
          { status: 400 },
        );
      }
    }

    const res = await fetch(csvUrl);

    if (!res.ok) {
      console.error('Failed to fetch Google Sheet:', res.status, res.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch Google Sheet data' },
        { status: 502 },
      );
    }

    const csv = await res.text();

    if (!csv || !csv.trim()) {
      return NextResponse.json(
        { error: 'Google Sheet is empty or returned no data' },
        { status: 400 },
      );
    }

    // Return raw CSV text; frontend will parse it using the same logic as file uploads
    return NextResponse.json({ csv });
  } catch (error) {
    console.error('Error fetching Google Sheet:', error);
    return NextResponse.json(
      { error: 'Unexpected error while fetching Google Sheet' },
      { status: 500 },
    );
  }
}
