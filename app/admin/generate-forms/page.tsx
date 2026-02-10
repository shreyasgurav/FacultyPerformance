'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CheckCircleIcon } from '@/components/Icons';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';

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

interface TimetableImage {
  id: string;
  label: string;
  mime_type: string;
  created_at: string;
  image_data?: string;
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

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Timetable sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timetableImages, setTimetableImages] = useState<TimetableImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageData, setSelectedImageData] = useState<string | null>(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [isLoadingImageData, setIsLoadingImageData] = useState(false);

  // Add image modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLabel, setAddLabel] = useState('');
  const [addImageFile, setAddImageFile] = useState<File | null>(null);
  const [addImagePreview, setAddImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Fetch timetable image list
  const fetchImages = useCallback(async () => {
    setIsLoadingImages(true);
    try {
      const res = await authFetch('/api/admin/timetable-images');
      if (res.ok) {
        const data = await res.json();
        setTimetableImages(data);
        // Auto-select first image if none selected
        if (data.length > 0 && !selectedImageId) {
          setSelectedImageId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching timetable images:', error);
    } finally {
      setIsLoadingImages(false);
    }
  }, [authFetch, selectedImageId]);

  // Fetch image list when sidebar opens
  useEffect(() => {
    if (sidebarOpen) {
      fetchImages();
    }
  }, [sidebarOpen, fetchImages]);

  // Fetch full image data when selected image changes
  useEffect(() => {
    if (!selectedImageId) {
      setSelectedImageData(null);
      return;
    }
    let cancelled = false;
    setIsLoadingImageData(true);
    authFetch(`/api/admin/timetable-images?id=${selectedImageId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data) {
          setSelectedImageData(data.image_data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingImageData(false);
      });
    return () => { cancelled = true; };
  }, [selectedImageId, authFetch]);

  // Handle add image file selection
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return;
    }
    setAddImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAddImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload new timetable image
  const handleUploadImage = async () => {
    if (!addLabel.trim() || !addImageFile || !addImagePreview) return;
    setIsUploading(true);
    try {
      // Extract base64 data
      const base64 = addImagePreview.split(',')[1];
      const res = await authFetch('/api/admin/timetable-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: addLabel.trim(),
          image_data: base64,
          mime_type: addImageFile.type,
        }),
      });
      if (res.ok) {
        const newImg = await res.json();
        setTimetableImages(prev => [newImg, ...prev]);
        setSelectedImageId(newImg.id);
        setShowAddModal(false);
        setAddLabel('');
        setAddImageFile(null);
        setAddImagePreview(null);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete timetable image
  const handleDeleteImage = async () => {
    if (!deleteConfirm.id) return;
    setIsDeleting(true);
    try {
      const res = await authFetch(`/api/admin/timetable-images?id=${deleteConfirm.id}`, { method: 'DELETE' });
      if (res.ok) {
        setTimetableImages(prev => prev.filter(i => i.id !== deleteConfirm.id));
        if (selectedImageId === deleteConfirm.id) {
          const remaining = timetableImages.filter(i => i.id !== deleteConfirm.id);
          setSelectedImageId(remaining.length > 0 ? remaining[0].id : null);
          setSelectedImageData(null);
        }
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    } finally {
      setIsDeleting(false);
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

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

        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const subjectIdx = header.findIndex(h => h === 'subject' || h === 'subject_name');
        const facultyCodeIdx = header.findIndex(h => h === 'faculty_code' || h === 'code' || h === 'faculty_email');
        const semesterIdx = header.findIndex(h => h === 'semester' || h === 'sem');
        const courseIdx = header.findIndex(h => h === 'course');
        const divisionIdx = header.findIndex(h => h === 'division' || h === 'div');
        const batchIdx = header.findIndex(h => h === 'batch');
        const honoursCourseIdx = header.findIndex(h => h === 'honours_course' || h === 'honours course');
        const honoursBatchIdx = header.findIndex(h => h === 'honours_batch' || h === 'honours batch');
        const academicYearIdx = header.findIndex(h => h === 'academic_year' || h === 'year' || h === 'ay');

        if (subjectIdx === -1 || facultyCodeIdx === -1 || semesterIdx === -1) {
          setCsvError('Missing required columns: subject, faculty_code, semester');
          setIsParsing(false);
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate forms');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const theoryCount = forms.filter(f => !f.batch).length;
    const labCount = forms.filter(f => !!f.batch).length;
    const honoursCount = forms.filter(f => f.isHonours).length;
    return { theoryCount, labCount, honoursCount };
  }, [forms]);

  const showSuccess = !!successMessage && forms.length === 0;
  const selectedImageMeta = timetableImages.find(i => i.id === selectedImageId);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Main content - independent scroll */}
      <div className={`overflow-y-auto flex-shrink-0 ${sidebarOpen ? 'w-1/2' : 'w-full'}`} style={{ transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <div className={`px-3 sm:px-4 py-4 sm:py-8 ${sidebarOpen ? 'max-w-lg ml-auto mr-4' : 'max-w-2xl mx-auto'}`}>
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
                {/* CSV template button (moved to header) */}
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

          {/* Delete image confirm */}
          <ConfirmDialog
            isOpen={deleteConfirm.isOpen}
            title="Delete Timetable Image"
            message="Are you sure you want to delete this timetable image? This action cannot be undone."
            confirmText="Delete"
            onConfirm={handleDeleteImage}
            onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
            isLoading={isDeleting}
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
                {/* Timetable toggle (moved down from header) */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors ${
                    sidebarOpen
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } flex-shrink-0`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Timetable
                </button>
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
                <button
                  onClick={() => { setForms([]); setCsvError(''); }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
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

      {/* Timetable Sidebar - Finder-inspired */}
      <div className={`overflow-hidden border-l bg-gray-50/80 sticky top-0 h-[calc(100vh-64px)] flex-shrink-0 ${
        sidebarOpen ? 'w-1/2 border-gray-200' : 'w-0 border-transparent'
      }`} style={{ transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1), border-color 400ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <div className="w-full h-full flex flex-col min-w-0 overflow-hidden">
          {/* Sidebar Toolbar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white/80 backdrop-blur-sm border-b border-gray-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-semibold text-gray-700 truncate">Timetable Images</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAddModal(true)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Add timetable image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
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
          </div>

          {/* Image tabs */}
          {timetableImages.length > 0 && (
            <div className="flex items-center gap-1 px-3 py-2 bg-white/60 border-b border-gray-100 overflow-x-auto">
              {timetableImages.map(img => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageId(img.id)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    selectedImageId === img.id
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-200/80'
                  }`}
                >
                  {img.label}
                </button>
              ))}
            </div>
          )}

          {/* Image display area */}
          <div className="flex-1 overflow-auto p-3">
            {isLoadingImages ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              </div>
            ) : timetableImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 mb-1">No timetable images yet</p>
                <p className="text-[11px] text-gray-400 mb-3">Add timetable images for reference while creating forms</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Add Timetable
                </button>
              </div>
            ) : isLoadingImageData ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              </div>
            ) : selectedImageData ? (
              <div>
                {/* Image info bar */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-gray-500 font-medium">{selectedImageMeta?.label}</p>
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, id: selectedImageId })}
                    className="text-[11px] text-red-500 hover:text-red-600 font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
                {/* Image */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <img
                    src={`data:${selectedImageMeta?.mime_type || 'image/png'};base64,${selectedImageData}`}
                    alt={selectedImageMeta?.label || 'Timetable'}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                Select a timetable to preview
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Timetable Image Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setAddLabel(''); setAddImageFile(null); setAddImagePreview(null); }} title="Add Timetable Image">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Label</label>
            <input
              type="text"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              placeholder="e.g. IT Sem 6 Div A"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-colors outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Image</label>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageFileSelect} className="hidden" id="timetable-image-upload" />

            {addImagePreview ? (
              <div className="relative">
                <img src={addImagePreview} alt="Preview" className="w-full rounded-lg border border-gray-200" />
                <button
                  onClick={() => { setAddImageFile(null); setAddImagePreview(null); if (imageInputRef.current) imageInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label
                htmlFor="timetable-image-upload"
                className="block w-full py-8 px-4 rounded-lg text-sm text-center cursor-pointer border-2 border-dashed border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6 mx-auto mb-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Click to select image
              </label>
            )}
          </div>

          <button
            onClick={handleUploadImage}
            disabled={!addLabel.trim() || !addImageFile || isUploading}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
              !addLabel.trim() || !addImageFile || isUploading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Add Timetable'}
          </button>
        </div>
      </Modal>
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
