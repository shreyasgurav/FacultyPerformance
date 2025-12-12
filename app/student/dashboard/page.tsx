'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

interface StudentRecord {
  id: string;
  name: string;
  email: string;
  semester: number;
  year: number;
  course: string;
  division: string;
  batch: string;
}

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
  submitted_at: string;
}

function StudentDashboardContent() {
  const { userRole, signOut, authFetch } = useAuth();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!userRole?.studentId) return;
      
      try {
        // Step 1: Fetch student data first (needed for filtering)
        const studentRes = await authFetch(`/api/admin/students/${userRole.studentId}`);
        
        if (!studentRes.ok) {
          console.error('Failed to fetch student data');
          setIsLoading(false);
          return;
        }
        
        const studentData = await studentRes.json();
        setStudent(studentData);
        
        // Step 2: Fetch forms and responses with server-side filtering (in parallel)
        // Forms: filter by semester, course, division, status=active
        // Responses: filter by studentId only
        const formsQuery = new URLSearchParams({
          semester: studentData.semester.toString(),
          course: studentData.course,
          division: studentData.division,
          status: 'active',
        });
        
        const [formsRes, responsesRes] = await Promise.all([
          authFetch(`/api/admin/forms?${formsQuery}`),
          authFetch(`/api/responses?studentId=${userRole.studentId}`),
        ]);
        
        if (formsRes.ok) {
          const formsData = await formsRes.json();
          setForms(formsData);
        }

        if (responsesRes.ok) {
          const responsesData = await responsesRes.json();
          setResponses(responsesData);
        }
      } catch (error) {
        console.error('Error loading data', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [userRole?.studentId, authFetch]);

  // Filter forms for batch (server filtered by semester/course/division already)
  // Include forms with no batch (theory) or matching batch (lab)
  const studentForms = student ? forms.filter(f => 
    !f.batch || f.batch === student.batch
  ) : [];

  // Check which forms student has already submitted
  const submittedFormIds = new Set(
    responses.map(r => r.form_id)
  );

  const pendingForms = studentForms.filter(f => !submittedFormIds.has(f.id));
  const completedForms = studentForms.filter(f => submittedFormIds.has(f.id));

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="h-6 sm:h-7 bg-gray-200 rounded w-32 sm:w-40"></div>
            <div className="h-8 sm:h-10 w-8 sm:w-10 bg-gray-200 rounded-full"></div>
          </div>
          {/* Cards skeleton */}
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex justify-between items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="h-4 sm:h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 sm:h-4 bg-gray-100 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                  </div>
                  <div className="h-8 sm:h-9 bg-gray-200 rounded-lg w-20 sm:w-24 flex-shrink-0"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return <div className="p-6 text-gray-500">Student profile not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Title row with profile */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Feedback Forms</h2>

        {/* Profile button + dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfile(prev => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-medium">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-tight">{student.name}</p>
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showProfile ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Student Profile</p>
              </div>
              <div className="px-4 py-3 space-y-2.5 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Name</span>
                  <span className="font-medium text-gray-900 text-right">{student.name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Email</span>
                  <span className="font-medium text-gray-900 text-right text-xs break-all">{student.email}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Course</span>
                  <span className="font-medium text-gray-900 text-right">{student.course === 'AIDS' ? 'AI & DS' : 'IT'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Semester / Division</span>
                  <span className="font-medium text-gray-900 text-right">Sem {student.semester} · Div {student.division}</span>
                </div>
                {student.batch && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Batch</span>
                    <span className="font-medium text-gray-900 text-right">{student.batch}</span>
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t border-gray-100">
                <button
                  onClick={signOut}
                  className="w-full text-left text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {pendingForms.map((form) => (
          <div key={form.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{form.subject_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{form.faculty_name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Div {form.division}{form.batch ? ` · Batch ${form.batch}` : ''}
                </p>
              </div>
              <Link
                href={`/student/feedback/${form.id}`}
                className="flex-shrink-0 inline-flex items-center px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Fill Form
              </Link>
            </div>
          </div>
        ))}
        {completedForms.map((form) => (
          <div key={form.id} className="bg-green-50/50 rounded-xl border border-green-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{form.subject_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{form.faculty_name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Div {form.division}{form.batch ? ` · Batch ${form.batch}` : ''}
                </p>
              </div>
              <span className="flex-shrink-0 inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Submitted
              </span>
            </div>
          </div>
        ))}
        {studentForms.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-sm text-gray-400">No feedback forms available for you.</p>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-400 uppercase tracking-wider">Subject</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Faculty</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Class</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pendingForms.map((form) => (
                <tr key={form.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <p className="text-sm font-medium text-gray-900">{form.subject_name}</p>
                    {form.subject_code && <p className="text-xs text-gray-400">{form.subject_code}</p>}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{form.faculty_name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{form.division}{form.batch ? ` / ${form.batch}` : ''}</td>
                  <td className="py-3 px-5">
                    <Link
                      href={`/student/feedback/${form.id}`}
                      className="inline-flex items-center px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Fill Feedback
                    </Link>
                  </td>
                </tr>
              ))}
              {completedForms.map((form) => (
                <tr key={form.id} className="bg-green-50/30 hover:bg-green-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <p className="text-sm font-medium text-gray-900">{form.subject_name}</p>
                    {form.subject_code && <p className="text-xs text-gray-400">{form.subject_code}</p>}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{form.faculty_name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{form.division}{form.batch ? ` / ${form.batch}` : ''}</td>
                  <td className="py-3 px-5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Submitted
                    </span>
                  </td>
                </tr>
              ))}
              {studentForms.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm text-gray-400">
                    No feedback forms available for you.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['student']}>
      <StudentDashboardContent />
    </ProtectedRoute>
  );
}
