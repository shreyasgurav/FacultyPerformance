'use client';

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CheckCircleIcon } from '@/components/Icons';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmDialog from '@/components/ConfirmDialog';

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
  formType: 'division' | 'batch';
  academicYear: string;
  isHonours?: boolean;
}

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
  const defaultAcademicYear = useMemo(() => getDefaultAcademicYear(), []);

  // Faculty
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(true);

  // Parsed forms (the preview list)
  const [forms, setForms] = useState<FormEntry[]>([]);

  // CSV state
  const [csvError, setCsvError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV raw data for preview panel
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch faculty
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

  // CSV parsing
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
    setIsParsing(true);
    setCsvError('');
    setForms([]);
    setCsvHeaders([]);
    setCsvRows([]);
    setSuccessMessage('');
    setErrorMessage('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          setCsvError('CSV must have a header row and at least one data row');
          setIsParsing(false);
          return;
        }

        const header = lines[0].split(',').map(h => h.trim());
        const headerLower = header.map(h => h.toLowerCase());

        // Store raw CSV data for preview
        const rawRows = lines.slice(1).map(line => line.split(',').map(c => c.trim()));
        setCsvHeaders(header);
        setCsvRows(rawRows);

        const subjectIdx = headerLower.findIndex(h => h === 'subject' || h === 'subject_name');
        const facultyCodeIdx = headerLower.findIndex(h => h === 'faculty_code' || h === 'code' || h === 'faculty_email');
        const semesterIdx = headerLower.findIndex(h => h === 'semester' || h === 'sem');
        const courseIdx = headerLower.findIndex(h => h === 'course');
        const divisionIdx = headerLower.findIndex(h => h === 'division' || h === 'div');
        const batchIdx = headerLower.findIndex(h => h === 'batch');
        const honoursCourseIdx = headerLower.findIndex(h => h === 'honours_course' || h === 'honours course');
        const honoursBatchIdx = headerLower.findIndex(h => h === 'honours_batch' || h === 'honours batch');
        const academicYearIdx = headerLower.findIndex(h => h === 'academic_year' || h === 'year' || h === 'ay');

        if (subjectIdx === -1 || facultyCodeIdx === -1 || semesterIdx === -1) {
          setCsvError('Missing required columns: subject, faculty_code, semester');
          setIsParsing(false);
          // Still open sidebar to show the raw CSV
          setSidebarOpen(true);
          return;
        }

        const parsedForms: FormEntry[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          const subject = cols[subjectIdx];
          const facultyCode = cols[facultyCodeIdx];
          const semester = cols[semesterIdx];
          const course = courseIdx !== -1 ? cols[courseIdx] : '';
          const division = divisionIdx !== -1 ? cols[divisionIdx] : '';
          const batch = batchIdx !== -1 ? cols[batchIdx] : '';
          const honoursCourse = honoursCourseIdx !== -1 ? cols[honoursCourseIdx] : '';
          const honoursBatch = honoursBatchIdx !== -1 ? cols[honoursBatchIdx] : '';
          const csvAcademicYear = academicYearIdx !== -1 ? cols[academicYearIdx] : defaultAcademicYear;

          if (!subject || !facultyCode || !semester) {
            errors.push(`Row ${i + 1}: Missing required fields`);
            continue;
          }
          const isHonoursRow = !!honoursCourse;
          if (!isHonoursRow && (!course || !division)) {
            errors.push(`Row ${i + 1}: Need course+division or honours_course`);
            continue;
          }
          const faculty = facultyList.find(f => f.facultyCode?.toLowerCase() === facultyCode.toLowerCase());
          if (!faculty) {
            errors.push(`Row ${i + 1}: Faculty not found (code: ${facultyCode})`);
            continue;
          }

          if (isHonoursRow) {
            const isLabForm = !!honoursBatch;
            parsedForms.push({
              subjectName: subject, facultyName: faculty.name, facultyEmail: faculty.email,
              division: '', semester, course: honoursCourse,
              formType: isLabForm ? 'batch' : 'division',
              academicYear: csvAcademicYear || defaultAcademicYear,
              isHonours: true,
              ...(isLabForm && { batch: honoursBatch }),
            });
          } else {
            const isLabForm = !!batch;
            parsedForms.push({
              subjectName: subject, facultyName: faculty.name, facultyEmail: faculty.email,
              division, semester, course,
              formType: isLabForm ? 'batch' : 'division',
              academicYear: csvAcademicYear || defaultAcademicYear,
              ...(isLabForm && { batch }),
            });
          }
        }

        if (errors.length > 0) {
          setCsvError(`${errors.length} row(s) skipped: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`);
        }
        if (parsedForms.length > 0) {
          setForms(parsedForms);
          // Auto-open CSV preview sidebar
          setSidebarOpen(true);
        } else if (errors.length === 0) {
          setCsvError('No valid entries found in CSV');
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        setCsvError('Failed to parse CSV file');
      } finally {
        setIsParsing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => { setCsvError('Failed to read file'); setIsParsing(false); };
    reader.readAsText(file);
  };

  const removeForm = (index: number) => {
    setForms(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (forms.length === 0 || isSubmitting) return;
    setShowConfirm(false);
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await authFetch('/api/admin/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forms }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate forms');
      }
      const data = await res.json();
      setSuccessMessage(data.message || `Successfully generated ${forms.length} feedback form(s)!`);
      setForms([]);
      setCsvHeaders([]);
      setCsvRows([]);
      setSidebarOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate forms');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearAll = useCallback(() => {
    setForms([]);
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvError('');
    setSidebarOpen(false);
  }, []);

  const stats = useMemo(() => {
    const theoryCount = forms.filter(f => !f.batch).length;
    const labCount = forms.filter(f => !!f.batch).length;
    const honoursCount = forms.filter(f => f.isHonours).length;
    return { theoryCount, labCount, honoursCount };
  }, [forms]);

  const showSuccess = !!successMessage && forms.length === 0;

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Main content - independent scroll */}
      <div className={`overflow-y-auto flex-shrink-0 ${sidebarOpen ? 'w-1/2' : 'w-full'}`} style={{ transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <div className={`py-4 sm:py-6 ${sidebarOpen ? 'max-w-3xl ml-auto mr-4 px-3 sm:px-4' : 'max-w-6xl mx-auto px-3 sm:px-4'}`}>
          {/* Header */}
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
                <p className="text-gray-500 text-xs sm:text-sm mt-1">Upload a timetable CSV to create feedback forms</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href="/timetable-template.csv"
                  download="timetable.csv"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-gray-200 text-xs sm:text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  CSV template
                </a>
                <Link
                  href="/admin/form-editor"
                  className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3 sm:py-2 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-xs font-medium hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="hidden sm:inline">Edit Questions</span>
                  <span className="sm:hidden">Edit</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Confirm dialog */}
          <ConfirmDialog
            isOpen={showConfirm}
            title="Generate Feedback Forms"
            message={`You are about to generate ${forms.length} feedback form${forms.length !== 1 ? 's' : ''} (${stats.theoryCount} theory, ${stats.labCount} lab${stats.honoursCount > 0 ? `, ${stats.honoursCount} honours` : ''}). This action cannot be undone. Continue?`}
            confirmText="Generate"
            onConfirm={handleGenerate}
            onCancel={() => setShowConfirm(false)}
            isLoading={isSubmitting}
          />

          {/* Error */}
          {errorMessage && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {/* Success state */}
          {showSuccess ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">{successMessage}</h2>
              <p className="text-sm text-gray-500 mb-6">Forms are now active and visible to students.</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setSuccessMessage('')}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Generate More
                </button>
                <Link
                  href="/admin/feedback"
                  className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View Forms
                </Link>
              </div>
            </div>
          ) : forms.length === 0 ? (
            /* Upload step */
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-8">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-gray-900 mb-1">Upload Timetable CSV</h2>
                </div>
              </div>

              {csvError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700">
                  {csvError}
                </div>
              )}

              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" id="csv-upload" />
              <label
                htmlFor="csv-upload"
                className={`block w-full py-10 px-4 rounded-xl text-sm font-medium text-center cursor-pointer border-2 border-dashed transition-all ${
                  isParsing || isLoadingFaculty
                    ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-gray-50/50 text-gray-500 border-gray-200 hover:border-gray-900 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {isParsing ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Parsing CSV...
                  </div>
                ) : isLoadingFaculty ? (
                  'Loading faculty data...'
                ) : (
                  <div>
                    <p className="mb-1">Click to select a CSV file</p>
                    <p className="text-xs text-gray-400 font-normal">or drag and drop</p>
                  </div>
                )}
              </label>
            </div>
          ) : (
            /* Preview & Confirm step */
            <div>
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                    {forms.length} form{forms.length !== 1 ? 's' : ''}
                  </span>
                  {stats.theoryCount > 0 && (
                    <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                      {stats.theoryCount} Theory
                    </span>
                  )}
                  {stats.labCount > 0 && (
                    <span className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
                      {stats.labCount} Lab
                    </span>
                  )}
                  {stats.honoursCount > 0 && (
                    <span className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium">
                      {stats.honoursCount} Honours
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors ${
                      sidebarOpen
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } flex-shrink-0`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    CSV Preview
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              {csvError && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs sm:text-sm text-amber-700">
                  {csvError}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
                <div className="divide-y divide-gray-50">
                  {forms.map((form, index) => (
                    <div key={index} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors group">
                      <div className={`w-1 h-8 rounded-full flex-shrink-0 ${
                        form.isHonours ? 'bg-purple-400' : form.batch ? 'bg-amber-400' : 'bg-blue-400'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900 truncate">{form.subjectName}</p>
                          {form.isHonours && (
                            <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Honours</span>
                          )}
                          {form.batch && !form.isHonours && (
                            <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Lab</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {form.facultyName} · Sem {form.semester} · {form.course === 'AIDS' ? 'AI&DS' : form.course}
                          {form.division && ` · Div ${form.division}`}
                          {form.batch && ` / ${form.batch}`}
                          {' · '}{form.academicYear}
                        </p>
                      </div>
                      <button
                        onClick={() => removeForm(index)}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Remove"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowConfirm(true)}
                disabled={isSubmitting || forms.length === 0}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                  isSubmitting || forms.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  `Generate ${forms.length} Form${forms.length !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CSV Preview Sidebar */}
      <div className={`overflow-hidden border-l bg-gray-50/80 sticky top-0 h-[calc(100vh-64px)] flex-shrink-0 ${
        sidebarOpen ? 'w-1/2 border-gray-200' : 'w-0 border-transparent'
      }`} style={{ transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1), border-color 400ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <div className="w-full h-full flex flex-col min-w-0 overflow-hidden">
          {/* Sidebar Toolbar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white/80 backdrop-blur-sm border-b border-gray-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-semibold text-gray-700 truncate">CSV Preview</span>
              {csvRows.length > 0 && (
                <span className="text-[10px] text-gray-400 ml-1">{csvRows.length} row{csvRows.length !== 1 ? 's' : ''} · {csvHeaders.length} col{csvHeaders.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* CSV Table */}
          <div className="flex-1 overflow-auto">
            {csvHeaders.length > 0 ? (
              <table className="w-full text-xs border-collapse min-w-max">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100/95 backdrop-blur-sm">
                    <th className="px-2.5 py-2 text-left font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap">#</th>
                    {csvHeaders.map((h, i) => (
                      <th key={i} className="px-2.5 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-white/60 transition-colors border-b border-gray-100/60">
                      <td className="px-2.5 py-2 text-gray-400 font-mono whitespace-nowrap">{rowIdx + 1}</td>
                      {csvHeaders.map((_, colIdx) => (
                        <td key={colIdx} className="px-2.5 py-2 text-gray-700 whitespace-nowrap">
                          {row[colIdx] || <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 mb-1">No CSV data yet</p>
                <p className="text-[11px] text-gray-400">Upload a CSV to see a preview here</p>
              </div>
            )}
          </div>
        </div>
      </div>
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
