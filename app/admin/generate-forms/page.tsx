'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, CheckCircleIcon } from '@/components/Icons';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

type FormType = 'division' | 'batch';
type InputMode = 'csv' | 'timetable';

interface Faculty {
  id: string;
  name: string;
  email: string;
  facultyCode?: string;
}

interface FormEntry {
  subjectName: string;
  facultyName: string;
  facultyEmail: string;
  division: string;
  semester: string;
  course: string;
  batch?: string;
  formType: FormType;
  academicYear: string;
}

// Calculate academic year based on current date
function getDefaultAcademicYear(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  
  if (month >= 5) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

function GenerateFormsContent() {
  const { authFetch } = useAuth();
  const [inputMode, setInputMode] = useState<InputMode>('csv');
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());
  
  // CSV upload state
  const [csvData, setCsvData] = useState<FormEntry[]>([]);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [csvError, setCsvError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Timetable loading state
  const [timetableData, setTimetableData] = useState<FormEntry[]>([]);
  const [isLoadingTimetable, setIsLoadingTimetable] = useState(false);
  const [timetableError, setTimetableError] = useState('');
  
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [generatedForms, setGeneratedForms] = useState<FormEntry[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(true);

  // Fetch faculty list on mount
  useEffect(() => {
    async function fetchFaculty() {
      try {
        const res = await authFetch('/api/admin/faculty');
        if (res.ok) {
          const data = await res.json();
          setFacultyList(data);
        }
      } catch (error) {
        console.error('Error fetching faculty:', error);
      } finally {
        setIsLoadingFaculty(false);
      }
    }
    fetchFaculty();
  }, [authFetch]);

  const courses = [
    { value: 'IT', label: 'Information Technology' },
    { value: 'AIDS', label: 'AI & Data Science' },
  ];

  // CSV file handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setCsvError('Please select a CSV file');
      setTimeout(() => setCsvError(''), 3000);
      return;
    }

    parseCSV(file);
  };

  const parseCSV = (file: File) => {
    setIsParsingCsv(true);
    setCsvError('');
    setCsvData([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setCsvError('CSV file must have a header row and at least one data row');
          setIsParsingCsv(false);
      return;
    }

        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Required columns - faculty_email column contains faculty codes in timetable exports
        const subjectIdx = header.findIndex(h => h === 'subject' || h === 'subject_name');
        const facultyCodeIdx = header.findIndex(h => h === 'faculty_code' || h === 'code' || h === 'faculty_email');
        const semesterIdx = header.findIndex(h => h === 'semester' || h === 'sem');
        const courseIdx = header.findIndex(h => h === 'course');
        const divisionIdx = header.findIndex(h => h === 'division' || h === 'div');
        const batchIdx = header.findIndex(h => h === 'batch');
        const academicYearIdx = header.findIndex(h => h === 'academic_year' || h === 'year' || h === 'ay');

        if (subjectIdx === -1 || facultyCodeIdx === -1 || semesterIdx === -1 || courseIdx === -1 || divisionIdx === -1) {
          setCsvError('Missing required columns: subject, faculty_code (or faculty_email), semester, course, division');
          setIsParsingCsv(false);
      return;
    }

        const parsedForms: FormEntry[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          
          const subject = cols[subjectIdx];
          const facultyCode = cols[facultyCodeIdx];
          const semester = cols[semesterIdx];
          const course = cols[courseIdx];
          const division = cols[divisionIdx];
          const batch = batchIdx !== -1 ? cols[batchIdx] : '';
          const csvAcademicYear = academicYearIdx !== -1 ? cols[academicYearIdx] : academicYear;

          if (!subject || !facultyCode || !semester || !course || !division) {
            errors.push(`Row ${i + 1}: Missing required fields`);
            continue;
          }

          const faculty = facultyList.find(f => f.facultyCode?.toLowerCase() === facultyCode.toLowerCase());
          if (!faculty) {
            errors.push(`Row ${i + 1}: Faculty not found (code: ${facultyCode})`);
            continue;
          }

          const isLabForm = !!batch;
          parsedForms.push({
            subjectName: subject,
            facultyName: faculty.name,
            facultyEmail: faculty.email,
            division: division,
            semester: semester,
            course: course,
            formType: isLabForm ? 'batch' : 'division',
            academicYear: csvAcademicYear || academicYear,
            ...(isLabForm && { batch }),
          });
        }

        if (errors.length > 0) {
          setCsvError(`${errors.length} row(s) skipped: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`);
          setTimeout(() => setCsvError(''), 5000);
        }

        if (parsedForms.length > 0) {
          setCsvData(parsedForms);
          setSuccessMessage(`Parsed ${parsedForms.length} form(s) from CSV`);
          setTimeout(() => setSuccessMessage(''), 3000);
        } else if (errors.length === 0) {
          setCsvError('No valid entries found in CSV');
          setTimeout(() => setCsvError(''), 3000);
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        setCsvError('Failed to parse CSV file');
        setTimeout(() => setCsvError(''), 3000);
      } finally {
        setIsParsingCsv(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      setCsvError('Failed to read file');
      setIsParsingCsv(false);
    };

    reader.readAsText(file);
  };

  const addCsvToForms = () => {
    if (csvData.length === 0) return;

    const newForms = csvData.filter(form => {
      return !generatedForms.some(f =>
        f.subjectName.toLowerCase() === form.subjectName.toLowerCase() &&
        f.facultyEmail.toLowerCase() === form.facultyEmail.toLowerCase() &&
        f.division === form.division &&
        f.semester === form.semester &&
        f.course === form.course &&
        f.batch === form.batch
      );
    });

    if (newForms.length > 0) {
      setGeneratedForms([...generatedForms, ...newForms]);
      setSuccessMessage(`Added ${newForms.length} form(s) to the list`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setErrorMessage('All forms from CSV already exist in the list');
      setTimeout(() => setErrorMessage(''), 3000);
    }

    setCsvData([]);
  };

  const removeFormFromList = (index: number) => {
    setGeneratedForms(generatedForms.filter((_, i) => i !== index));
  };

  const generateAllForms = async () => {
    if (generatedForms.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/admin/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forms: generatedForms }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate forms');
      }

      const data = await res.json();
      setSuccessMessage(data.message || `Successfully generated ${generatedForms.length} feedback form(s)!`);
      setGeneratedForms([]);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate forms');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCourseName = (code: string) => courses.find(c => c.value === code)?.label || code;

  // Load forms from timetable database
  const loadFromTimetable = async () => {
    setIsLoadingTimetable(true);
    setTimetableError('');
    setTimetableData([]);

      try {
      const res = await authFetch(`/api/admin/timetable?academic_year=${encodeURIComponent(academicYear)}`);
        
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load timetable');
      }

      const entries = await res.json();
        
      if (entries.length === 0) {
        setTimetableError(`No timetable entries found for ${academicYear}`);
        setTimeout(() => setTimetableError(''), 5000);
          return;
        }

      // Map timetable entries to form entries
        const parsedForms: FormEntry[] = [];
        const errors: string[] = [];

      for (const entry of entries) {
        const faculty = facultyList.find(f => f.email.toLowerCase() === entry.facultyEmail.toLowerCase());
        
          if (!faculty) {
          errors.push(`Faculty not found: ${entry.facultyEmail}`);
            continue;
          }

          parsedForms.push({
          subjectName: entry.subjectName,
            facultyName: faculty.name,
            facultyEmail: faculty.email,
          division: entry.division,
          semester: entry.semester.toString(),
          course: entry.course,
          formType: entry.batch ? 'batch' : 'division',
          academicYear: entry.academicYear,
          ...(entry.batch && { batch: entry.batch }),
          });
        }

        if (errors.length > 0) {
        setTimetableError(`${errors.length} entry(s) skipped: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`);
        setTimeout(() => setTimetableError(''), 5000);
        }

        if (parsedForms.length > 0) {
        setTimetableData(parsedForms);
        setSuccessMessage(`Loaded ${parsedForms.length} form(s) from timetable`);
          setTimeout(() => setSuccessMessage(''), 3000);
      } else if (errors.length === 0) {
        setTimetableError('No valid entries found in timetable');
        setTimeout(() => setTimetableError(''), 3000);
      }
    } catch (error) {
      console.error('Error loading timetable:', error);
      setTimetableError(error instanceof Error ? error.message : 'Failed to load timetable');
      setTimeout(() => setTimetableError(''), 5000);
    } finally {
      setIsLoadingTimetable(false);
    }
  };

  // Add timetable data to forms list
  const addTimetableToForms = () => {
    if (timetableData.length === 0) return;

    const newForms = timetableData.filter(form => {
      return !generatedForms.some(f =>
        f.subjectName.toLowerCase() === form.subjectName.toLowerCase() &&
        f.facultyEmail.toLowerCase() === form.facultyEmail.toLowerCase() &&
        f.division === form.division &&
        f.semester === form.semester &&
        f.course === form.course &&
        f.batch === form.batch
      );
    });

    if (newForms.length > 0) {
      setGeneratedForms([...generatedForms, ...newForms]);
      setSuccessMessage(`Added ${newForms.length} form(s) to the list`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setErrorMessage('All forms from timetable already exist in the list');
      setTimeout(() => setErrorMessage(''), 3000);
    }

    setTimetableData([]);
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <Link
          href="/admin/dashboard"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-2 sm:mb-3"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Generate Forms</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Create feedback forms for divisions or batches</p>
          </div>
          <Link
            href="/admin/form-editor"
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="hidden sm:inline">Edit Form</span>
            <span className="sm:hidden">Edit</span>
          </Link>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm">
          <CheckCircleIcon className="w-4 h-4 text-green-600" />
          <span className="text-green-700">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Input Mode Toggle */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => { setInputMode('csv'); setTimetableData([]); }}
            className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              inputMode === 'csv'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Upload CSV
          </button>
          <button
            onClick={() => { setInputMode('timetable'); setCsvData([]); }}
            className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              inputMode === 'timetable'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Load from Timetable
          </button>
        </div>
      </div>

      {inputMode === 'timetable' ? (
        /* Timetable Load Mode */
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">Load from Timetable</h2>
          <p className="text-xs text-gray-500 mb-3 sm:mb-4">
            Load faculty-subject mappings from the timetable database for the selected academic year.
          </p>

          {timetableError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {timetableError}
            </div>
          )}

          {/* Academic Year Selection */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Academic Year</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
            >
              <option value="2025-26">2025-26</option>
              <option value="2024-25">2024-25</option>
              <option value="2023-24">2023-24</option>
            </select>
          </div>

          {/* Load Button */}
          <button
            onClick={loadFromTimetable}
            disabled={isLoadingTimetable || isLoadingFaculty}
            className={`w-full py-3 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              isLoadingTimetable || isLoadingFaculty
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
            }`}
          >
            {isLoadingTimetable ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Load Timetable
              </>
            )}
          </button>

          {/* Timetable Preview */}
          {timetableData.length > 0 && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                  Loaded {timetableData.length} form(s)
                </h3>
                <button
                  onClick={() => setTimetableData([])}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Clear
                </button>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {timetableData.map((form, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-900">{form.subjectName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {form.facultyName} • Sem {form.semester} • {form.course} • Div {form.division}
                      {form.batch && ` / ${form.batch}`}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addTimetableToForms}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 active:scale-[0.98] transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                Add All to Forms List
              </button>
            </div>
          )}
        </div>
      ) : (
        /* CSV Upload Mode */
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1.5 sm:mb-2">Upload CSV File</h2>
          <p className="text-xs text-gray-500 mb-3 sm:mb-4">
            Upload a CSV file with columns: subject, faculty_email, semester, course, division, batch (optional), academic_year (optional)
          </p>

          {csvError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {csvError}
            </div>
          )}

          {/* File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
            onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
            className={`w-full py-3 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer border-2 border-dashed ${
              isParsingCsv || isLoadingFaculty
                ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-gray-50 text-gray-600 border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600'
            }`}
          >
            {isParsingCsv ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Parsing...
              </>
            ) : isLoadingFaculty ? (
              'Loading faculty...'
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
                Choose CSV File
              </>
            )}
            </label>

          {/* CSV Preview */}
          {csvData.length > 0 && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                  Parsed {csvData.length} form(s)
                </h3>
                <button
                  onClick={() => setCsvData([])}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Clear
                </button>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {csvData.map((form, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-900">{form.subjectName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {form.facultyName} • Sem {form.semester} • {form.course} • Div {form.division}
                      {form.batch && ` / ${form.batch}`}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addCsvToForms}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 active:scale-[0.98] transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                Add All to Forms List
              </button>
            </div>
          )}
        </div>
      )}

      {generatedForms.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-900">
              Forms to Generate ({generatedForms.length})
            </h2>
            <button
              onClick={generateAllForms}
              disabled={isSubmitting}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 w-full sm:w-auto"
            >
              {isSubmitting ? 'Generating...' : 'Generate All'}
            </button>
          </div>

          <div className="space-y-2">
            {generatedForms.map((form, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {form.subjectName}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {form.academicYear} • {form.facultyName} • Sem {form.semester} • {getCourseName(form.course)} • Div {form.division}{form.batch && ` / ${form.batch}`}
                  </div>
                </div>
                <button
                  onClick={() => removeFormFromList(index)}
                  className="ml-3 text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default function GenerateFormsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <GenerateFormsContent />
    </ProtectedRoute>
  );
}
