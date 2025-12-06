'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Toast from '@/components/Toast';
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
  status: string;
}

interface FeedbackResponse {
  id: string;
  form_id: string;
  student_id: string;
}

function FeedbackMonitoringContent() {
  const { authFetch } = useAuth();
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [semesterFilter, setSemesterFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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

  useEffect(() => {
    async function fetchData() {
      try {
        const [formsRes, responsesRes] = await Promise.all([
          authFetch('/api/admin/forms'),
          authFetch('/api/responses'),
        ]);

        if (formsRes.ok) {
          const data = await formsRes.json();
          setForms(data);
        }

        if (responsesRes.ok) {
          const data = await responsesRes.json();
          setResponses(data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const divisions = Array.from(new Set(forms.map(f => f.division)));

  const filteredForms = forms.filter(form => {
    if (semesterFilter && form.semester !== parseInt(semesterFilter)) return false;
    if (courseFilter && form.course !== courseFilter) return false;
    if (divisionFilter && form.division !== divisionFilter) return false;
    return true;
  });

  // Progressive loading
  const ITEMS_PER_PAGE = 20;
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const displayedForms = filteredForms.slice(0, displayCount);
  const hasMore = filteredForms.length > displayCount;
  const loadMore = () => setDisplayCount(prev => prev + ITEMS_PER_PAGE);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [semesterFilter, courseFilter, divisionFilter]);

  const getResponseCount = (formId: string) => {
    return responses.filter(r => r.form_id === formId).length;
  };

  const handleDeleteForm = async (form: FeedbackForm) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this feedback form for ${form.subject_name} (${form.division}${form.batch ? ' / ' + form.batch : ''})?\n\nThis will remove all responses linked to this form.`
    );

    if (!confirmed) return;

    try {
      const res = await authFetch(`/api/admin/forms?id=${encodeURIComponent(form.id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete form');
      }

      setForms(prev => prev.filter(f => f.id !== form.id));
      setToastMessage('Feedback form deleted successfully');
      setShowToast(true);
    } catch (error) {
      console.error('Error deleting form', error);
      setToastMessage(error instanceof Error ? error.message : 'Failed to delete form');
      setShowToast(true);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {showToast && (
        <Toast message={toastMessage} type="success" onClose={() => setShowToast(false)} />
      )}

      <div className="mb-6">
        <Link
          href="/admin/dashboard"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-3"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Feedback Monitoring</h1>
        <p className="text-gray-500 text-sm mt-1">View and analyze feedback responses</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Semester</label>
            <select
              value={semesterFilter}
              onChange={e => setSemesterFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            >
              <option value="">All Semesters</option>
              {semesters.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Course</label>
            <select
              value={courseFilter}
              onChange={e => setCourseFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            >
              <option value="">All Courses</option>
              {courses.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Division</label>
            <select
              value={divisionFilter}
              onChange={e => setDivisionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            >
              <option value="">All Divisions</option>
              {divisions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Forms Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Feedback Forms ({filteredForms.length})
          </h2>
        </div>
        {filteredForms.length === 0 ? (
          <p className="text-gray-400 text-center text-sm py-8">No feedback forms found.</p>
        ) : (
          <>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Subject</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Faculty</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Sem/Course</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Division</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Responses</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayedForms.map(form => {
                    const responseCount = getResponseCount(form.id);
                    
                    return (
                      <tr key={form.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-6">
                          <p className="text-sm font-medium text-gray-900">{form.subject_name}</p>
                          {form.subject_code && <p className="text-xs text-gray-400">{form.subject_code}</p>}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{form.faculty_name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          Sem {form.semester} · {form.course === 'AIDS' ? 'AI&DS' : 'IT'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {form.division}{form.batch ? ` / ${form.batch}` : ''}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {responseCount}
                          </span>
                        </td>
                        <td className="py-3 px-6">
                          <button
                            onClick={() => handleDeleteForm(form)}
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
            {/* Load More Button */}
            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={loadMore}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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
