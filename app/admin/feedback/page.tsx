'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Toast from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ArrowLeftIcon } from '@/components/Icons';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackForm {
  id: string;
  subject_name: string;
  subject_code: string | null;
  faculty_name: string;
  faculty_email: string;
  division: string;
  batch: string | null;
  semester: number;
  course: string;
  academic_year: string;
  status: string;
}

interface FeedbackResponse {
  id: string;
  form_id: string;
  student_id: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  semester: number;
  course: string;
  division: string;
  batch: string;
  honours_course?: string;
  honours_batch?: string;
}

function FeedbackMonitoringContent() {
  const { authFetch } = useAuth();
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selection state
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [hasSelected, setHasSelected] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [formsRes, responsesRes, studentsRes] = await Promise.all([
          authFetch('/api/admin/forms'),
          authFetch('/api/responses'),
          authFetch('/api/admin/students'),
        ]);

        if (formsRes.ok) setForms(await formsRes.json());
        if (responsesRes.ok) setResponses(await responsesRes.json());
        if (studentsRes.ok) setStudents(await studentsRes.json());
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [authFetch]);

  // Derive unique semesters from existing forms
  const availableSemesters = useMemo(() => {
    const sems = Array.from(new Set(forms.map(f => f.semester))).sort((a, b) => a - b);
    return sems.map(s => ({ value: s.toString(), label: `Semester ${s}` }));
  }, [forms]);

  // Derive unique courses from existing forms (for the selected semester)
  const availableCourses = useMemo(() => {
    let filtered = forms;
    if (selectedSemester) {
      filtered = filtered.filter(f => f.semester === parseInt(selectedSemester));
    }
    const courses = Array.from(new Set(filtered.map(f => f.course))).sort();
    return courses.map(c => {
      let label = c;
      if (c === 'IT') label = 'Information Technology';
      else if (c === 'AIDS') label = 'AI & Data Science';
      // Honours courses use their name as-is
      return { value: c, label, short: c === 'AIDS' ? 'AI&DS' : c };
    });
  }, [forms, selectedSemester]);

  // Derive unique batches from existing forms (for selected semester + course)
  // This includes both regular batches and honours batches
  const availableBatches = useMemo(() => {
    let filtered = forms;
    if (selectedSemester) {
      filtered = filtered.filter(f => f.semester === parseInt(selectedSemester));
    }
    if (selectedCourse) {
      filtered = filtered.filter(f => f.course === selectedCourse);
    }
    // Collect all unique batch values (skip null/empty - those are theory forms)
    const batches = Array.from(new Set(filtered.map(f => f.batch).filter((b): b is string => !!b))).sort();
    return batches;
  }, [forms, selectedSemester, selectedCourse]);

  // Reset downstream selections when upstream changes
  useEffect(() => {
    setSelectedCourse('');
    setSelectedBatch('');
  }, [selectedSemester]);

  useEffect(() => {
    setSelectedBatch('');
  }, [selectedCourse]);

  // Filtered forms after selection
  const filteredForms = useMemo(() => {
    return forms.filter(form => {
      if (selectedSemester && form.semester !== parseInt(selectedSemester)) return false;
      if (selectedCourse && form.course !== selectedCourse) return false;
      if (selectedBatch && form.batch !== selectedBatch) return false;
      return true;
    });
  }, [forms, selectedSemester, selectedCourse, selectedBatch]);

  // Progressive loading
  const ITEMS_PER_PAGE = 20;
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const displayedForms = filteredForms.slice(0, displayCount);
  const hasMore = filteredForms.length > displayCount;
  const loadMore = () => setDisplayCount(prev => prev + ITEMS_PER_PAGE);

  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [selectedSemester, selectedCourse, selectedBatch]);

  const getResponseCount = (formId: string) => {
    return responses.filter(r => r.form_id === formId).length;
  };

  const getTotalStudentsForForm = (form: FeedbackForm): number => {
    return students.filter(student => {
      const matchesSemester = student.semester === form.semester;

      // Regular course match
      const matchesCourse = student.course.toUpperCase() === form.course.toUpperCase();
      const matchesDivision = form.division ? student.division.toUpperCase() === form.division.toUpperCase() : true;

      let regularMatch = false;
      if (form.batch) {
        const matchesBatch = student.batch?.toUpperCase() === form.batch.toUpperCase();
        regularMatch = matchesSemester && matchesCourse && matchesDivision && matchesBatch;
      } else {
        regularMatch = matchesSemester && matchesCourse && matchesDivision;
      }

      // Honours course match
      let honoursMatch = false;
      if (student.honours_course) {
        const matchesHonoursCourse = student.honours_course.toUpperCase() === form.course.toUpperCase();
        if (form.batch) {
          const matchesHonoursBatch = (student.honours_batch || '').toUpperCase() === form.batch.toUpperCase();
          honoursMatch = matchesSemester && matchesHonoursCourse && matchesHonoursBatch;
        } else {
          honoursMatch = matchesSemester && matchesHonoursCourse;
        }
      }

      return regularMatch || honoursMatch;
    }).length;
  };

  // Is the selected course an honours course? (not IT or AIDS)
  const isHonoursCourse = (course: string) => {
    return course !== '' && course !== 'IT' && course !== 'AIDS';
  };

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    form: FeedbackForm | null;
    bulk?: boolean;
    ids?: string[];
  }>({ isOpen: false, form: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const openDeleteConfirm = (form: FeedbackForm) => {
    setDeleteConfirm({ isOpen: true, form });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ isOpen: false, form: null, bulk: false, ids: [] });
  };

  const handleBulkDeleteForms = () => {
    if (filteredForms.length === 0) return;
    const ids = filteredForms.map(f => f.id);
    setDeleteConfirm({ isOpen: true, form: null, bulk: true, ids });
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      if (deleteConfirm.bulk && deleteConfirm.ids && deleteConfirm.ids.length > 0) {
        const res = await authFetch('/api/admin/forms/bulk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: deleteConfirm.ids }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to delete forms');
        }

        const result = await res.json();
        const idsSet = new Set(deleteConfirm.ids);
        setForms(prev => prev.filter(f => !idsSet.has(f.id)));
        setResponses(prev => prev.filter(r => !idsSet.has(r.form_id)));
        setToastMessage(result.message || `Deleted ${deleteConfirm.ids.length} form(s)`);
        setShowToast(true);
        closeDeleteConfirm();
        return;
      }

      if (!deleteConfirm.form) return;

      const res = await authFetch(`/api/admin/forms?id=${encodeURIComponent(deleteConfirm.form.id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete form');
      }

      setForms(prev => prev.filter(f => f.id !== deleteConfirm.form!.id));
      setToastMessage('Feedback form deleted successfully');
      setShowToast(true);
      closeDeleteConfirm();
    } catch (error) {
      console.error('Error deleting form', error);
      setToastMessage(error instanceof Error ? error.message : 'Failed to delete form');
      setShowToast(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleContinue = () => {
    setHasSelected(true);
  };

  const handleBack = () => {
    setHasSelected(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="animate-pulse">
          <div className="mb-4 sm:mb-6">
            <div className="w-8 h-8 bg-gray-200 rounded-lg mb-2 sm:mb-3"></div>
            <div className="h-6 sm:h-7 bg-gray-200 rounded w-40 sm:w-48 mb-2"></div>
            <div className="h-3 sm:h-4 bg-gray-100 rounded w-52 sm:w-64"></div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md mx-auto">
            <div className="space-y-4">
              <div className="h-10 bg-gray-100 rounded-lg"></div>
              <div className="h-10 bg-gray-100 rounded-lg"></div>
              <div className="h-10 bg-gray-100 rounded-lg"></div>
              <div className="h-11 bg-gray-200 rounded-xl mt-6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Selection Screen
  if (!hasSelected) {
    const canContinue = selectedSemester && selectedCourse;

    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-6 sm:mb-8">
          <Link
            href="/admin/dashboard"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-2 sm:mb-3"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Feedback Monitoring</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Select criteria to view feedback forms</p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-8">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Select Forms to Monitor</h2>
            <p className="text-xs text-gray-500 mb-6">Choose semester, course and optionally batch to view forms</p>

            <div className="space-y-4">
              {/* Semester */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Semester</label>
                <select
                  value={selectedSemester}
                  onChange={e => setSelectedSemester(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-colors outline-none"
                >
                  <option value="">Select Semester</option>
                  {availableSemesters.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Course */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Course</label>
                <select
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(e.target.value)}
                  disabled={!selectedSemester}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-colors outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select Course</option>
                  {availableCourses.map(c => (
                    <option key={c.value} value={c.value}>
                      {c.short}{isHonoursCourse(c.value) ? ' (Honours)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch - optional, only shown if batches exist */}
              {availableBatches.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Batch <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={selectedBatch}
                    onChange={e => setSelectedBatch(e.target.value)}
                    disabled={!selectedCourse}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-colors outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">All (Theory + Lab)</option>
                    {availableBatches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Preview count */}
            {selectedSemester && selectedCourse && (
              <p className="text-xs text-gray-400 mt-4">
                {filteredForms.length} form{filteredForms.length !== 1 ? 's' : ''} found
              </p>
            )}

            {/* Continue */}
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className={`w-full mt-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                canContinue
                  ? 'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </div>

          {forms.length === 0 && (
            <p className="text-center text-xs text-gray-400 mt-6">
              No forms have been generated yet. Go to Generate Forms to create some.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Forms List Screen
  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {showToast && (
        <Toast message={toastMessage} type="success" onClose={() => setShowToast(false)} />
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.bulk ? "Delete All Forms" : "Delete Feedback Form"}
        message={
          deleteConfirm.bulk
            ? `Are you sure you want to delete ${deleteConfirm.ids?.length || 0} form(s)? This will remove all responses linked to these forms. This action cannot be undone.`
            : deleteConfirm.form
            ? `Are you sure you want to delete the form for "${deleteConfirm.form.subject_name}"? This will remove all responses linked to this form.`
            : ''
        }
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={closeDeleteConfirm}
        isLoading={isDeleting}
      />

      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <button
          onClick={handleBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-2 sm:mb-3"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Feedback Monitoring</h1>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  Sem {selectedSemester}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  isHonoursCourse(selectedCourse) ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {selectedCourse === 'AIDS' ? 'AI&DS' : selectedCourse}
                  {isHonoursCourse(selectedCourse) && ' (Honours)'}
                </span>
                {selectedBatch && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {selectedBatch}
                  </span>
                )}
              </div>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              {filteredForms.length} form{filteredForms.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <Link
            href={`/admin/feedback/monitor?semester=${selectedSemester}&course=${encodeURIComponent(selectedCourse)}${selectedBatch ? `&batch=${encodeURIComponent(selectedBatch)}` : ''}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-gray-900 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Monitor Students
          </Link>
        </div>
      </div>

      {/* Forms Table */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-base font-semibold text-gray-900">
            Feedback Forms ({filteredForms.length})
          </h2>
          {filteredForms.length > 0 && (
            <button
              onClick={handleBulkDeleteForms}
              className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-red-50 text-red-600 text-xs sm:text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
            >
              Delete All ({filteredForms.length})
            </button>
          )}
        </div>
        {filteredForms.length === 0 ? (
          <p className="text-gray-400 text-center text-sm py-8">No feedback forms found for this selection.</p>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
              {displayedForms.map(form => {
                const responseCount = getResponseCount(form.id);
                const totalStudents = getTotalStudentsForForm(form);

                return (
                  <Link
                    href={`/report/${form.id}`}
                    key={form.id}
                    className="block p-3 rounded-lg border border-gray-100 bg-gray-50/30 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900 truncate">{form.subject_name}</p>
                          {!form.division && (
                            <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Honours</span>
                          )}
                        </div>
                        {form.subject_code && <p className="text-xs text-gray-400">{form.subject_code}</p>}
                      </div>
                      <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {responseCount} / {totalStudents}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{form.faculty_name}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {form.academic_year} · Sem {form.semester} · {form.course === 'AIDS' ? 'AI&DS' : form.course}
                        {form.division && ` · Div ${form.division}`}
                        {form.batch && ` / ${form.batch}`}
                      </p>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDeleteConfirm(form); }}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto -mx-6">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Subject</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Faculty</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Details</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Responses</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayedForms.map(form => {
                    const responseCount = getResponseCount(form.id);
                    const totalStudents = getTotalStudentsForForm(form);

                    return (
                      <tr key={form.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-6">
                          <Link href={`/report/${form.id}`} className="hover:underline">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-gray-900">{form.subject_name}</p>
                              {!form.division && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Honours</span>
                              )}
                            </div>
                            {form.subject_code && <p className="text-xs text-gray-400">{form.subject_code}</p>}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{form.faculty_name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          <span>{form.academic_year} · {form.course === 'AIDS' ? 'AI&DS' : form.course}</span>
                          {form.division && <span> · Div {form.division}</span>}
                          {form.batch && <span> / {form.batch}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {responseCount} / {totalStudents}
                          </span>
                        </td>
                        <td className="py-3 px-6">
                          <button
                            onClick={() => openDeleteConfirm(form)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={loadMore}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Load More ({filteredForms.length - displayCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function FeedbackMonitoringPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <FeedbackMonitoringContent />
    </ProtectedRoute>
  );
}
