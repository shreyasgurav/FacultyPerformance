'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, CheckCircleIcon } from '@/components/Icons';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

type FormType = 'division' | 'batch';
type InputMode = 'manual' | 'timetable';

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

interface ParseResult {
  entries: ExtractedEntry[];
  skippedEntries: ExtractedEntry[];
  rawText?: string;
}

function GenerateFormsContent() {
  const { authFetch } = useAuth();
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [formType, setFormType] = useState<FormType>('division');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [facultySearch, setFacultySearch] = useState('');
  
  // Timetable parsing state
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedExtracted, setSelectedExtracted] = useState<Set<number>>(new Set());
  const [showSkippedEntries, setShowSkippedEntries] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFacultyDropdown, setShowFacultyDropdown] = useState(false);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [generatedForms, setGeneratedForms] = useState<FormEntry[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(true);
  const facultyDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (facultyDropdownRef.current && !facultyDropdownRef.current.contains(event.target as Node)) {
        setShowFacultyDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Get selected faculty details
  const selectedFaculty = facultyList.find(f => f.id === selectedFacultyId);

  // Filter faculty based on search
  const filteredFaculty = facultyList.filter(f =>
    f.name.toLowerCase().includes(facultySearch.toLowerCase()) ||
    f.email.toLowerCase().includes(facultySearch.toLowerCase())
  );

  const handleFacultySelect = (faculty: Faculty) => {
    setSelectedFacultyId(faculty.id);
    setFacultySearch(faculty.name);
    setShowFacultyDropdown(false);
  };

  const divisions = ['A', 'B', 'C', 'D'];
  const semesters = [
    { value: '1', label: 'Semester 1' },
    { value: '2', label: 'Semester 2' },
    { value: '3', label: 'Semester 3' },
    { value: '4', label: 'Semester 4' },
    { value: '5', label: 'Semester 5' },
    { value: '6', label: 'Semester 6' },
    { value: '7', label: 'Semester 7' },
    { value: '8', label: 'Semester 8' },
  ];
  const courses = [
    { value: 'IT', label: 'Information Technology' },
    { value: 'AIDS', label: 'AI & Data Science' },
  ];
  const batches = selectedDivision
    ? [`${selectedDivision}1`, `${selectedDivision}2`, `${selectedDivision}3`]
    : [];

  const resetForm = () => {
    setSubjectName('');
    setSelectedFacultyId('');
    setFacultySearch('');
  };

  const handleDivisionChange = (division: string) => {
    setSelectedDivision(division);
    setSelectedBatch('');
  };

  const canAddForm = () => {
    // Required: semester, course, division, subject, faculty
    if (!selectedSemester || !selectedCourse || !selectedDivision || !subjectName.trim() || !selectedFacultyId) {
      return false;
    }
    // Batch is optional - if selected, it's a lab form; if not, it's a theory form
    return true;
  };

  const addFormToList = () => {
    if (!canAddForm()) {
      setErrorMessage('Please fill all required fields');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (!selectedFaculty) {
      setErrorMessage('Please select a faculty');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    // Determine form type based on whether batch is selected
    const isLabForm = !!selectedBatch;
    const actualFormType: FormType = isLabForm ? 'batch' : 'division';

    const isDuplicate = generatedForms.some(f =>
      f.subjectName.toLowerCase() === subjectName.toLowerCase().trim() &&
      f.facultyEmail.toLowerCase() === selectedFaculty.email.toLowerCase() &&
      f.division === selectedDivision && f.semester === selectedSemester && f.course === selectedCourse &&
      (isLabForm ? f.batch === selectedBatch : !f.batch)
    );

    if (isDuplicate) {
      setErrorMessage('This form already exists in the list!');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const newEntry: FormEntry = {
      subjectName: subjectName.trim(),
      facultyName: selectedFaculty.name,
      facultyEmail: selectedFaculty.email,
      division: selectedDivision,
      semester: selectedSemester,
      course: selectedCourse,
      formType: actualFormType,
      ...(isLabForm && { batch: selectedBatch }),
    };

    setGeneratedForms([...generatedForms, newEntry]);
    resetForm();
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

  // Handle PDF file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please upload a PDF file');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    setIsParsingPdf(true);
    setParseResult(null);
    setSelectedExtracted(new Set());
    setShowSkippedEntries(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await authFetch('/api/admin/parse-timetable', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to parse timetable');
      }

      const data = await res.json();
      setParseResult({
        entries: data.entries || [],
        skippedEntries: data.skippedEntries || [],
        rawText: data.rawText,
      });

      // Auto-select all valid entries
      const allIndices = new Set<number>(data.entries.map((_: ExtractedEntry, i: number) => i));
      setSelectedExtracted(allIndices);

      if (data.entries.length === 0) {
        setErrorMessage('No valid faculty-subject mappings found in the timetable. Make sure faculty codes in the PDF match the codes in your faculty database.');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to parse timetable');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsParsingPdf(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Toggle selection of an extracted entry
  const toggleExtractedSelection = (index: number) => {
    const newSelected = new Set(selectedExtracted);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedExtracted(newSelected);
  };

  // Add selected extracted entries to the form list
  const addExtractedToForms = () => {
    if (!parseResult || !selectedSemester || !selectedCourse || !selectedDivision) {
      setErrorMessage('Please select semester, course, and division first');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const selectedEntries = parseResult.entries.filter((_, i) => selectedExtracted.has(i));
    
    if (selectedEntries.length === 0) {
      setErrorMessage('Please select at least one entry to add');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const newForms: FormEntry[] = [];
    
    for (const entry of selectedEntries) {
      if (!entry.facultyName || !entry.facultyEmail) continue;

      const formEntry: FormEntry = {
        subjectName: entry.subjectCode,
        facultyName: entry.facultyName,
        facultyEmail: entry.facultyEmail,
        division: selectedDivision,
        semester: selectedSemester,
        course: selectedCourse,
        formType: entry.isLab ? 'batch' : 'division',
        ...(entry.isLab && entry.batch && { batch: `${selectedDivision}${entry.batch.slice(-1)}` }),
      };

      // Check for duplicates
      const isDuplicate = [...generatedForms, ...newForms].some(f =>
        f.subjectName.toLowerCase() === formEntry.subjectName.toLowerCase() &&
        f.facultyEmail.toLowerCase() === formEntry.facultyEmail.toLowerCase() &&
        f.division === formEntry.division &&
        f.semester === formEntry.semester &&
        f.course === formEntry.course &&
        f.batch === formEntry.batch
      );

      if (!isDuplicate) {
        newForms.push(formEntry);
      }
    }

    if (newForms.length > 0) {
      setGeneratedForms([...generatedForms, ...newForms]);
      setSuccessMessage(`Added ${newForms.length} form(s) to the list`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setErrorMessage('All selected entries already exist in the list');
      setTimeout(() => setErrorMessage(''), 3000);
    }

    // Clear parse result after adding
    setParseResult(null);
    setSelectedExtracted(new Set());
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href="/admin/dashboard"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-3"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Generate Forms</h1>
        <p className="text-gray-500 text-sm mt-1">Create feedback forms for divisions or batches</p>
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
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => { setInputMode('manual'); setParseResult(null); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              inputMode === 'manual'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setInputMode('timetable')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              inputMode === 'timetable'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Upload Timetable
          </button>
        </div>
      </div>

      {inputMode === 'timetable' ? (
        /* Timetable Upload Mode */
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Upload Timetable PDF</h2>
          <p className="text-xs text-gray-500 mb-4">
            Upload your timetable PDF. The system will extract subject-faculty mappings automatically.
            <br />
            <span className="text-gray-400">Format: &quot;ML B305 PPM&quot; (Theory) or &quot;B2 ML B307C PPM&quot; (Lab)</span>
          </p>

          {/* Semester, Course, Division Selection */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select</option>
                {semesters.map(s => (
                  <option key={s.value} value={s.value}>Sem {s.value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select</option>
                {courses.map(c => (
                  <option key={c.value} value={c.value}>{c.value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Division</label>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select</option>
                {divisions.map(div => (
                  <option key={div} value={div}>Div {div}</option>
                ))}
              </select>
            </div>
          </div>

          {/* File Upload - Only enabled when semester, course, division are selected */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="timetable-upload"
              disabled={!selectedSemester || !selectedCourse || !selectedDivision}
            />
            <label
              htmlFor="timetable-upload"
              className={`flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed rounded-xl transition-colors ${
                !selectedSemester || !selectedCourse || !selectedDivision
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : isParsingPdf
                    ? 'border-gray-200 bg-gray-50 cursor-wait'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
              }`}
            >
              {!selectedSemester || !selectedCourse || !selectedDivision ? (
                <>
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm text-gray-400">Select semester, course & division first</span>
                </>
              ) : isParsingPdf ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600">Parsing PDF...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm text-gray-600">Click to upload timetable PDF</span>
                </>
              )}
            </label>
          </div>

          {/* Parse Results */}
          {parseResult && (
            <div className="space-y-4">
              {parseResult.entries.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      Found {parseResult.entries.length} valid mapping(s)
                    </h3>
                    <button
                      onClick={() => {
                        if (selectedExtracted.size === parseResult.entries.length) {
                          setSelectedExtracted(new Set());
                        } else {
                          setSelectedExtracted(new Set(parseResult.entries.map((_, i) => i)));
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      {selectedExtracted.size === parseResult.entries.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {parseResult.entries.map((entry, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                          selectedExtracted.has(idx) 
                            ? 'bg-blue-50' 
                            : 'bg-gray-50/80 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedExtracted.has(idx)}
                          onChange={() => toggleExtractedSelection(idx)}
                          className="w-4 h-4 text-blue-600 rounded-md border-gray-300 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-800">{entry.subjectCode}</span>
                            <span className="text-gray-300">→</span>
                            <span className="text-sm text-gray-600">{entry.facultyName}</span>
                            {entry.batch && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded ml-1">Batch {entry.batch}</span>}
                          </div>
                          <div className={`text-xs mt-0.5 ${entry.isLab ? 'text-purple-500' : 'text-emerald-500'}`}>
                            {entry.isLab ? 'Lab' : 'Theory'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {parseResult.skippedEntries.length > 0 && (
                <div className="border border-red-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowSkippedEntries(!showSkippedEntries)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-red-50/50 hover:bg-red-50 transition-colors"
                  >
                    <span className="text-xs font-medium text-red-500">
                      {parseResult.skippedEntries.length} skipped (unknown faculty codes)
                    </span>
                    <svg 
                      className={`w-4 h-4 text-red-400 transition-transform ${showSkippedEntries ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showSkippedEntries && (
                    <div className="px-3 py-2 space-y-1.5 max-h-40 overflow-y-auto bg-white">
                      {parseResult.skippedEntries.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="text-red-400">•</span>
                          <span className="text-gray-600">{entry.subjectCode}</span>
                          <span className="text-gray-300">→</span>
                          <span className="text-red-500 font-medium">{entry.facultyCode}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {parseResult.entries.length > 0 && (
                <button
                  onClick={addExtractedToForms}
                  disabled={selectedExtracted.size === 0 || !selectedSemester || !selectedCourse || !selectedDivision}
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    selectedExtracted.size > 0 && selectedSemester && selectedCourse && selectedDivision
                      ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <PlusIcon className="w-4 h-4" />
                  Add {selectedExtracted.size} Selected to Forms
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Manual Entry Mode - Single unified form */
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="space-y-4">
            {/* Row 1: Semester & Course */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Semester</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                >
                  <option value="">Select</option>
                  {semesters.map(s => (
                    <option key={s.value} value={s.value}>Sem {s.value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                >
                  <option value="">Select</option>
                  {courses.map(c => (
                    <option key={c.value} value={c.value}>{c.value}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Division & Batch (optional) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Division</label>
                <select
                  value={selectedDivision}
                  onChange={(e) => handleDivisionChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                >
                  <option value="">Select</option>
                  {divisions.map(div => (
                    <option key={div} value={div}>Div {div}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Batch <span className="text-gray-400 font-normal">(optional - for lab)</span>
                </label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  disabled={!selectedDivision}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors disabled:opacity-50"
                >
                  <option value="">None (Theory)</option>
                  {batches.map(batch => (
                    <option key={batch} value={batch}>{batch} (Lab)</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Subject Name</label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g., Machine Learning"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            {/* Faculty Search */}
            <div className="relative" ref={facultyDropdownRef}>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Faculty</label>
              <input
                type="text"
                value={facultySearch}
                onChange={(e) => {
                  setFacultySearch(e.target.value);
                  setSelectedFacultyId('');
                  setShowFacultyDropdown(true);
                }}
                onFocus={() => setShowFacultyDropdown(true)}
                disabled={isLoadingFaculty}
                placeholder={isLoadingFaculty ? 'Loading faculty...' : 'Search faculty by name...'}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors disabled:opacity-50"
              />
              {showFacultyDropdown && !isLoadingFaculty && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredFaculty.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-400">No faculty found</div>
                  ) : (
                    filteredFaculty.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleFacultySelect(f)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          selectedFacultyId === f.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <div className="font-medium">{f.name}</div>
                        <div className="text-xs text-gray-400">{f.email}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
              {selectedFaculty && (
                <p className="text-xs text-green-600 mt-1">✓ {selectedFaculty.email}</p>
              )}
            </div>

            {/* Form Type Indicator */}
            {selectedDivision && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  selectedBatch 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {selectedBatch ? 'Lab Form' : 'Theory Form'}
                </span>
                <span className="text-xs text-gray-500">
                  {selectedBatch 
                    ? `Will create lab feedback form for Batch ${selectedBatch}` 
                    : `Will create theory feedback form for Division ${selectedDivision}`}
                </span>
              </div>
            )}

            {/* Add Button */}
            <button
              onClick={addFormToList}
              disabled={!canAddForm()}
              className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                canAddForm()
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <PlusIcon className="w-4 h-4" />
              Add to List
            </button>
          </div>
        </div>
      )}

      {generatedForms.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Forms to Generate ({generatedForms.length})
            </h2>
            <button
              onClick={generateAllForms}
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
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
                    {form.facultyName} • Sem {form.semester} • {getCourseName(form.course)} • Div {form.division}{form.batch && ` / ${form.batch}`}
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

      <div className="text-center text-sm text-gray-500">
        <Link href="/admin/feedback" className="text-blue-600 hover:text-blue-700">
          View all forms
        </Link>
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
