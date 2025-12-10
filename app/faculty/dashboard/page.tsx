'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

interface FacultyRecord {
  id: string;
  name: string;
  email: string;
}

interface FeedbackForm {
  id: string;
  subject_name: string;
  subject_code: string | null;
  faculty_name: string;
  faculty_email: string;
  division: string;
  batch: string | null;
  year: string;
  course: string;
  status: string;
}

interface FeedbackResponse {
  id: string;
  form_id: string;
  student_id: string;
  comment?: string | null;
  feedback_response_items: {
    parameter_id: string;
    rating: number;
    question_text: string | null;
    question_type: string | null;
  }[];
}

function FacultyDashboardContent() {
  const { userRole, signOut, authFetch } = useAuth();
  const [currentFaculty, setCurrentFaculty] = useState<FacultyRecord | null>(null);
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!userRole?.facultyId) return;
      
      try {
        const [facultyRes, formsRes, responsesRes] = await Promise.all([
          authFetch(`/api/admin/faculty/${userRole.facultyId}`),
          authFetch('/api/admin/forms'),
          authFetch('/api/responses'),
        ]);
        
        if (facultyRes.ok) {
          const data = await facultyRes.json();
          setCurrentFaculty(data);
        }
        
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
  }, [userRole?.facultyId]);
  
  // Filter forms for this faculty's email
  const facultyForms = currentFaculty ? forms.filter(f => 
    f.faculty_email.toLowerCase() === currentFaculty.email.toLowerCase()
  ) : [];

  // Helper to normalize rating to 0-10 scale based on question type
  const normalizeRating = (rating: number, questionType: string): number => {
    if (questionType === 'yes_no') {
      // yes_no: 1 = Yes (10), 0 = No (0)
      return rating === 1 ? 10 : 0;
    } else if (questionType === 'scale_3') {
      // scale_3: 1 = Need improvement (3.3), 2 = Satisfactory (6.6), 3 = Good (10)
      return (rating / 3) * 10;
    }
    // scale_1_10: already 1-10
    return rating;
  };

  // Calculate average for a single response using embedded question data
  const getResponseAverage = (resp: FeedbackResponse): number => {
    if (resp.feedback_response_items.length === 0) return 0;

    let totalNormalized = 0;
    let count = 0;

    resp.feedback_response_items.forEach(item => {
      // Use embedded question_type from response (most reliable)
      const questionType = item.question_type || 'scale_1_10';
      totalNormalized += normalizeRating(item.rating, questionType);
      count++;
    });

    return count > 0 ? totalNormalized / count : 0;
  };

  // Calculate stats for each form using embedded question data
  const formStats = facultyForms.map(form => {
    const formResponses = responses.filter(r => r.form_id === form.id);
    
    if (formResponses.length === 0) {
      return {
        form,
        responseCount: 0,
        avgRating: 0,
      };
    }

    // Calculate average of all response averages
    let totalResponseAvg = 0;
    formResponses.forEach(resp => {
      totalResponseAvg += getResponseAverage(resp);
    });

    const avgRating = totalResponseAvg / formResponses.length;

    return {
      form,
      responseCount: formResponses.length,
      avgRating,
    };
  });

  // Overall stats
  const totalResponses = formStats.reduce((sum, s) => sum + s.responseCount, 0);
  const overallAvg = formStats.length > 0 
    ? formStats.reduce((sum, s) => sum + (s.avgRating * s.responseCount), 0) / Math.max(totalResponses, 1)
    : 0;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="h-7 bg-gray-200 rounded w-48"></div>
            <div className="flex items-center gap-3">
              <div className="h-8 bg-gray-100 rounded-lg w-32 hidden sm:block"></div>
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
            </div>
          </div>
          {/* Cards skeleton */}
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-100 rounded w-32 mb-3"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-100 rounded-full w-20"></div>
                      <div className="h-6 bg-gray-100 rounded-full w-24"></div>
                    </div>
                  </div>
                  <div className="h-9 bg-gray-200 rounded-lg w-28"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentFaculty) {
    return <div className="p-6 text-gray-500">Faculty profile not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Title row with profile */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">My Feedback Forms</h2>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-lg text-xs">
            <span className="text-gray-400">Avg Rating: <span className={`font-semibold ${
              overallAvg >= 7 ? 'text-green-600' :
              overallAvg >= 5 ? 'text-yellow-600' : 'text-red-600'
            }`}>{overallAvg > 0 ? overallAvg.toFixed(1) : '-'}/10</span></span>
          </div>

          {/* Profile button + dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfile(prev => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-medium">
                {currentFaculty.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900 leading-tight">{currentFaculty.name}</p>
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${showProfile ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty Profile</p>
                </div>
                <div className="px-4 py-3 space-y-2.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Name</span>
                    <span className="font-medium text-gray-900 text-right">{currentFaculty.name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Email</span>
                    <span className="font-medium text-gray-900 text-right text-xs break-all">{currentFaculty.email}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Overall Rating</span>
                    <span className={`font-medium text-right ${
                      overallAvg >= 7 ? 'text-green-600' :
                      overallAvg >= 5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {overallAvg > 0 ? overallAvg.toFixed(1) : '-'}/10
                    </span>
                  </div>
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
      </div>

      {/* Forms table */}
      {formStats.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-sm text-gray-400">No feedback forms assigned to you yet.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-400 uppercase tracking-wider">Subject</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Class</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Rating</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {formStats.map(({ form, avgRating }) => (
                    <tr key={form.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-5">
                        <p className="text-sm font-medium text-gray-900">{form.subject_name}</p>
                        {form.subject_code && <p className="text-xs text-gray-400">{form.subject_code}</p>}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        Year {form.year} · {form.course === 'AIDS' ? 'AI&DS' : 'IT'} · {form.division}{form.batch ? `/${form.batch}` : ''}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-semibold ${
                          avgRating >= 7 ? 'text-green-600' :
                          avgRating >= 5 ? 'text-yellow-600' : 
                          avgRating > 0 ? 'text-red-600' : 'text-gray-400'
                        }`}>
                          {avgRating > 0 ? avgRating.toFixed(1) : '-'}/10
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <Link
                          href={`/report/${form.id}`}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function FacultyDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['faculty']}>
      <FacultyDashboardContent />
    </ProtectedRoute>
  );
}
