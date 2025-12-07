import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasRole, forbiddenResponse } from '@/lib/auth';

interface Faculty {
  id: string;
  name: string;
  email: string;
  faculty_code: string | null;
}

interface ExtractedEntry {
  subjectCode: string;
  facultyCode: string;
  facultyName: string | null;
  facultyEmail: string | null;
  facultyId: string | null;
  batch: string | null;
  isLab: boolean;
  isValid: boolean;
}

// Parse timetable text and extract subject-faculty mappings
function parseTimetableText(text: string, facultyList: Faculty[]): ExtractedEntry[] {
  const entries: ExtractedEntry[] = [];
  const seenCombinations = new Set<string>();
  
  // Create a map of faculty codes to faculty details (case-insensitive)
  const facultyByCode = new Map<string, Faculty>();
  const allFacultyCodes: string[] = [];
  facultyList.forEach(f => {
    if (f.faculty_code) {
      facultyByCode.set(f.faculty_code.toLowerCase(), f);
      allFacultyCodes.push(f.faculty_code.toUpperCase());
    }
  });
  
  // Known subject codes (common patterns)
  const knownSubjects = ['ML', 'SC', 'PL', 'ITA', 'OOOSE', 'CFI', 'ACS', 'AIACS', 'WSAPI', 'DE'];
  
  // Helper function to check if a string is likely a faculty code
  const isFacultyCode = (str: string): boolean => {
    return allFacultyCodes.includes(str.toUpperCase()) || /^[A-Z]{2,4}$/i.test(str);
  };
  
  // Helper function to check if a string is a room number
  const isRoomNumber = (str: string): boolean => {
    return /^[A-Z]?\d{3}[A-Z]?$/i.test(str);
  };
  
  // Helper function to check if a string is a batch
  const isBatch = (str: string): boolean => {
    return /^[A-D][1-3]$/i.test(str);
  };
  
  // Primary pattern: SUBJECT ROOM FACULTY (e.g., "ML B305 PPM")
  // This regex looks for: word + space + room number + space + word
  const theoryPattern = /\b([A-Z]{2,6})\s+([A-Z]?\d{3}[A-Z]?)\s+([A-Z]{2,4})\b/gi;
  let match;
  
  while ((match = theoryPattern.exec(text)) !== null) {
    const [fullMatch, subject, room, facultyCode] = match;
    
    // Skip if subject looks like it contains a faculty code prefix (e.g., "SAPOOOSE")
    const skipWords = ['THE', 'AND', 'FOR', 'WITH', 'FROM', 'ROOM', 'LAB', 'THEORY', 'TIME', 'DAY', 'LUNCH', 'BREAK'];
    if (skipWords.includes(subject.toUpperCase())) continue;
    
    // Check if subject is concatenated (faculty code + subject)
    // e.g., "SAPOOOSE" should be split to faculty "SAP" and we skip it
    let cleanSubject = subject.toUpperCase();
    for (const code of allFacultyCodes) {
      if (cleanSubject.startsWith(code) && cleanSubject.length > code.length) {
        // This is a concatenated string, extract the actual subject
        cleanSubject = cleanSubject.substring(code.length);
        break;
      }
    }
    
    // Skip if the "subject" is actually just a faculty code
    if (allFacultyCodes.includes(cleanSubject) && cleanSubject.length <= 4) continue;
    
    const faculty = facultyByCode.get(facultyCode.toLowerCase());
    const key = `theory-${cleanSubject}-${facultyCode.toUpperCase()}`;
    
    if (!seenCombinations.has(key)) {
      seenCombinations.add(key);
      entries.push({
        subjectCode: cleanSubject,
        facultyCode: facultyCode.toUpperCase(),
        facultyName: faculty?.name || null,
        facultyEmail: faculty?.email || null,
        facultyId: faculty?.id || null,
        batch: null,
        isLab: false,
        isValid: !!faculty,
      });
    }
  }
  
  // Lab pattern: BATCH SUBJECT ROOM FACULTY (e.g., "B1 ML B307C PPM")
  const labPattern = /\b([A-D][1-3])\s+([A-Z]{2,6})\s+([A-Z]?\d{3}[A-Z]?)\s+([A-Z]{2,4})\b/gi;
  
  while ((match = labPattern.exec(text)) !== null) {
    const [, batch, subject, room, facultyCode] = match;
    
    let cleanSubject = subject.toUpperCase();
    // Check for concatenated subjects
    for (const code of allFacultyCodes) {
      if (cleanSubject.startsWith(code) && cleanSubject.length > code.length) {
        cleanSubject = cleanSubject.substring(code.length);
        break;
      }
    }
    
    const faculty = facultyByCode.get(facultyCode.toLowerCase());
    const key = `lab-${batch.toUpperCase()}-${cleanSubject}-${facultyCode.toUpperCase()}`;
    
    if (!seenCombinations.has(key)) {
      seenCombinations.add(key);
      entries.push({
        subjectCode: cleanSubject,
        facultyCode: facultyCode.toUpperCase(),
        facultyName: faculty?.name || null,
        facultyEmail: faculty?.email || null,
        facultyId: faculty?.id || null,
        batch: batch.toUpperCase(),
        isLab: true,
        isValid: !!faculty,
      });
    }
  }
  
  return entries;
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!hasRole(auth, ['admin'])) {
    return forbiddenResponse('Only admins can parse timetables');
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use require for pdf-parse (CommonJS module)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse');
    
    // Parse PDF
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
    }

    // Fetch all faculty with their codes
    const facultyList = await prisma.faculty.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        faculty_code: true,
      },
    });

    // Parse the timetable text
    const entries = parseTimetableText(text, facultyList as Faculty[]);

    // Separate valid and invalid entries
    const validEntries = entries.filter(e => e.isValid);
    const invalidEntries = entries.filter(e => !e.isValid);

    return NextResponse.json({
      success: true,
      rawText: text.substring(0, 2000),
      entries: validEntries,
      skippedEntries: invalidEntries,
      totalFound: entries.length,
      validCount: validEntries.length,
      skippedCount: invalidEntries.length,
    });

  } catch (error) {
    console.error('Error parsing timetable:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to parse timetable' 
    }, { status: 500 });
  }
}
