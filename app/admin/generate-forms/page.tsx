'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, CheckCircleIcon } from '@/components/Icons';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

type FormType = 'division' | 'batch';
type InputMode = 'manual' | 'csv';

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
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [facultySearch, setFacultySearch] = useState('');
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());
  
  // CSV upload state
  const [csvData, setCsvData] = useState<FormEntry[]>([]);
  const [csvError, setCsvError] = useState('');
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

  const selectedFaculty = facultyList.find(f => f.id === selectedFacultyId);

  const filteredFaculty = facultyList.filter(f => {
    const search = facultySearch.toLowerCase();
    return (
      f.name.toLowerCase().includes(search) ||
      f.email.toLowerCase().includes(search) ||
      (f.facultyCode && f.facultyCode.toLowerCase().includes(search))
    );
  });

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
    if (!selectedSemester || !selectedCourse || !selectedDivision || !subjectName.trim() || !selectedFacultyId) {
      return false;
    }
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
      academicYear: academicYear,
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

  // Parse CSV text (from file upload or Google Sheet) into FormEntry[] using the same rules
  const parseCsvText = (text: string, source: 'csv' | 'sheet' = 'csv') => {
    const stripQuotes = (value: string) => value.replace(/^"|"$/g, '').trim();

    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      setCsvError('CSV must have a header row and at least one data row');
      setTimeout(() => setCsvError(''), 3000);
      return;
    }

    const header = lines[0]
      .split(',')
      .map(h => stripQuotes(h).toLowerCase());
    const requiredFields = ['subject', 'faculty_email', 'semester', 'course', 'division'];
    const missingFields = requiredFields.filter(f => !header.includes(f));

    if (missingFields.length > 0) {
      setCsvError(`Missing required columns: ${missingFields.join(', ')}`);
      setTimeout(() => setCsvError(''), 5000);
      return;
    }

    const subjectIdx = header.indexOf('subject');
    const emailIdx = header.indexOf('faculty_email');
    const semesterIdx = header.indexOf('semester');
    const courseIdx = header.indexOf('course');
    const divisionIdx = header.indexOf('division');
    const batchIdx = header.indexOf('batch');
    const yearIdx = header.indexOf('academic_year');

    const parsedForms: FormEntry[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rawValues = lines[i].split(',');

      const subject = stripQuotes(rawValues[subjectIdx] ?? '');
      const email = stripQuotes(rawValues[emailIdx] ?? '');
      const semester = stripQuotes(rawValues[semesterIdx] ?? '');
      const course = stripQuotes(rawValues[courseIdx] ?? '');
      const division = stripQuotes(rawValues[divisionIdx] ?? '');
      const batch = batchIdx >= 0 ? stripQuotes(rawValues[batchIdx] ?? '') : '';
      const year = yearIdx >= 0 ? stripQuotes(rawValues[yearIdx] ?? '') : academicYear;

      if (!subject || !email || !semester || !course || !division) {
        errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }

      const faculty = facultyList.find(f => f.email.toLowerCase() === email.toLowerCase());
      if (!faculty) {
        errors.push(`Row ${i + 1}: Faculty not found for email ${email}`);
        continue;
      }

      parsedForms.push({
        subjectName: subject,
        facultyName: faculty.name,
        facultyEmail: faculty.email,
        division: division.toUpperCase(),
        semester: semester,
        course: course.toUpperCase(),
        formType: batch ? 'batch' : 'division',
        academicYear: year || academicYear,
        ...(batch && { batch: batch.toUpperCase() }),
      });
    }

    if (errors.length > 0) {
      setCsvError(`${errors.length} row(s) skipped: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`);
      setTimeout(() => setCsvError(''), 5000);
    }

    if (parsedForms.length > 0) {
      setCsvData(parsedForms);
      const label = source === 'csv' ? 'CSV' : 'Google Sheet';
      const totalRows = lines.length - 1; // exclude header
      setSuccessMessage(`Parsed ${parsedForms.length} form(s) out of ${totalRows} row(s) from ${label}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } else if (errors.length === 0) {
      setCsvError('No valid rows found in CSV');
      setTimeout(() => setCsvError(''), 3000);
    }
  };

  // Handle CSV file upload
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError('Please upload a CSV file');
      setTimeout(() => setCsvError(''), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        parseCsvText(text, 'csv');
      } catch {
        setCsvError('Failed to parse CSV file');
        setTimeout(() => setCsvError(''), 3000);
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Import from public Google Sheet via backend proxy
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
            onClick={() => { setInputMode('manual'); setCsvData([]); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              inputMode === 'manual'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setInputMode('csv')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              inputMode === 'csv'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Upload CSV
          </button>
        </div>
      </div>

      {inputMode === 'csv' ? (
        /* CSV Upload Mode */
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Upload CSV File</h2>
          <p className="text-xs text-gray-500 mb-4">
            Upload your CSV file using the template headers expected by the parser.
          </p>

          {csvError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {csvError}
            </div>
          )}

          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
              id="csv-upload"
              disabled={isLoadingFaculty}
            />
            <label
              htmlFor="csv-upload"
              className={`flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed rounded-xl transition-colors ${
                isLoadingFaculty
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
              }`}
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm text-gray-600">
                {isLoadingFaculty ? 'Loading faculty list...' : 'Click to upload CSV file'}
              </span>
            </label>
          </div>

          {/* CSV Preview */}
          {csvData.length > 0 && (
            <div className="space-y-4">
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
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                Add All to Forms List
              </button>
            </div>
          )}

          {/* Sample CSV Download removed per request */}
        </div>
      ) : (
        /* Manual Entry Mode */
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
            <div className="grid grid-cols-3 gap-3">
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
                  Batch <span className="text-gray-400 font-normal">(for lab)</span>
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
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Academic Year</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g., 2025-26"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                />
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

      <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
        <Link href="/admin/feedback" className="text-blue-600 hover:text-blue-700">
          View all forms
        </Link>
        <span className="text-gray-300">|</span>
        <Link href="/admin/form-editor" className="text-blue-600 hover:text-blue-700">
          Edit form questions
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
