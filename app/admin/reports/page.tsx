'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  comment: string | null;
  submitted_at: string;
  feedback_response_items: {
    parameter_id: string;
    rating: number;
    question_text: string | null;
    question_type: string | null;
  }[];
}

function ReportsContent() {
  const { authFetch } = useAuth();
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  
  useEffect(() => {
    async function fetchData() {
      try {
        const [formsRes, responsesRes] = await Promise.all([
          authFetch('/api/admin/forms'),
          authFetch('/api/responses'),
        ]);

        if (formsRes.ok) setForms(await formsRes.json());
        if (responsesRes.ok) setResponses(await responsesRes.json());
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Helper to normalize rating to 0-10 scale based on question type
  // Works for both individual values and averages
  const normalizeRating = (rating: number, questionType: string): number => {
    if (questionType === 'yes_no') {
      // yes_no: 0 = No, 1 = Yes. Multiply by 10 to get 0-10 scale
      // Works for averages too (e.g., 0.6 avg = 6/10)
      return rating * 10;
    } else if (questionType === 'scale_3') {
      // scale_3: 1 = Need improvement, 2 = Satisfactory, 3 = Good
      // Normalize to 0-10 scale: (rating / 3) * 10
      return (rating / 3) * 10;
    }
    // scale_1_10: already 1-10, no conversion needed
    return rating;
  };

  // Calculate average for a single response using embedded question data
  const getResponseAverage = (resp: FeedbackResponse): number => {
    if (resp.feedback_response_items.length === 0) return 0;

    let totalNormalized = 0;
    let count = 0;

    resp.feedback_response_items.forEach(item => {
      // Use embedded question_type from response (most reliable)
      // Fallback to scale_1_10 if not available (old responses)
      const questionType = item.question_type || 'scale_1_10';
      totalNormalized += normalizeRating(item.rating, questionType);
      count++;
    });

    return count > 0 ? totalNormalized / count : 0;
  };

  // Calculate stats for a faculty member (across all their forms)
  // Uses embedded question data from responses - no dependency on global parameters
  const getFacultyStats = (facultyEmail: string) => {
    const facultyForms = forms.filter(f => f.faculty_email.toLowerCase() === facultyEmail.toLowerCase());
    const formIds = facultyForms.map(f => f.id);
    const facultyResponses = responses.filter(r => formIds.includes(r.form_id));

    if (facultyResponses.length === 0) {
      return {
        formCount: facultyForms.length,
        responseCount: 0,
        avgRating: 0,
      };
    }

    // Calculate average of all response averages
    let totalResponseAvg = 0;
    facultyResponses.forEach(resp => {
      totalResponseAvg += getResponseAverage(resp);
    });

    const avgRating = totalResponseAvg / facultyResponses.length;

    return {
      formCount: facultyForms.length,
      responseCount: facultyResponses.length,
      avgRating,
    };
  };

  // Get unique faculty members from forms, sorted by highest rating
  const facultyList = Array.from(
    new Map(forms.map(f => [f.faculty_email.toLowerCase(), { name: f.faculty_name, email: f.faculty_email }])).values()
  ).sort((a, b) => {
    const statsA = getFacultyStats(a.email);
    const statsB = getFacultyStats(b.email);
    return statsB.avgRating - statsA.avgRating; // Highest to lowest
  });

  // Filtered faculty list based on search
  const filteredFacultyList = facultyList.filter(fac => 
    fac.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fac.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Progressive loading
  const ITEMS_PER_PAGE = 20;
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const displayedFacultyList = filteredFacultyList.slice(0, displayCount);
  const hasMore = filteredFacultyList.length > displayCount;
  const loadMore = () => setDisplayCount(prev => prev + ITEMS_PER_PAGE);

  // Reset display count when search changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [searchQuery]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="mb-4 sm:mb-6">
            <div className="w-8 h-8 bg-gray-200 rounded-lg mb-2 sm:mb-3"></div>
            <div className="h-6 sm:h-7 bg-gray-200 rounded w-40 sm:w-48 mb-2"></div>
            <div className="h-3 sm:h-4 bg-gray-100 rounded w-56 sm:w-72"></div>
          </div>
          {/* Table skeleton */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center mb-3 sm:mb-4">
              <div className="h-5 sm:h-6 bg-gray-200 rounded w-32 sm:w-40"></div>
              <div className="h-8 sm:h-9 bg-gray-100 rounded w-full sm:w-48"></div>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-2 sm:gap-4 items-center">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-100 rounded-full"></div>
                  <div className="h-8 sm:h-10 bg-gray-100 rounded flex-1"></div>
                  <div className="h-8 sm:h-10 bg-gray-100 rounded w-24 sm:w-40 hidden sm:block"></div>
                  <div className="h-8 sm:h-10 bg-gray-100 rounded w-12 sm:w-20"></div>
                  <div className="h-8 sm:h-10 bg-gray-100 rounded w-12 sm:w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <Link
          href="/admin/dashboard"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-2 sm:mb-3"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">View detailed analytics for faculty feedback</p>
      </div>

      {/* Faculty Table */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-base font-semibold text-gray-900">
            Faculty Members ({filteredFacultyList.length})
          </h2>
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[150px] sm:min-w-[200px] max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search faculty..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {facultyList.length === 0 ? (
          <p className="text-gray-400 text-center text-sm py-8">No faculty with feedback forms found.</p>
        ) : filteredFacultyList.length === 0 ? (
          <p className="text-gray-400 text-center text-sm py-8">No faculty match your search.</p>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
              {displayedFacultyList.map((fac) => {
                const stats = getFacultyStats(fac.email);
                const originalRank = facultyList.findIndex(f => f.email === fac.email) + 1;
                
                return (
                  <Link
                    key={fac.email}
                    href={`/report/faculty/${encodeURIComponent(fac.email)}`}
                    className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                        originalRank === 1 ? 'bg-yellow-100 text-yellow-700' :
                        originalRank === 2 ? 'bg-gray-200 text-gray-700' :
                        originalRank === 3 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {originalRank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{fac.name}</p>
                          <span className={`flex-shrink-0 text-sm font-bold ${
                            stats.avgRating >= 7 ? 'text-green-600' :
                            stats.avgRating >= 5 ? 'text-yellow-600' : 
                            stats.avgRating > 0 ? 'text-red-600' : 'text-gray-400'
                          }`}>
                            {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}/10
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{fac.email}</p>
                        <p className="text-xs text-gray-400 mt-1">{stats.formCount} subject{stats.formCount !== 1 ? 's' : ''}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto -mx-6">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider w-12">#</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Faculty Name</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Subjects</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Avg Rating</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayedFacultyList.map((fac) => {
                    const stats = getFacultyStats(fac.email);
                    const originalRank = facultyList.findIndex(f => f.email === fac.email) + 1;
                    
                    return (
                      <tr key={fac.email} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-6">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                            originalRank === 1 ? 'bg-yellow-100 text-yellow-700' :
                            originalRank === 2 ? 'bg-gray-200 text-gray-700' :
                            originalRank === 3 ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {originalRank}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-gray-900">{fac.name}</p>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{fac.email}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {stats.formCount}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-sm font-semibold ${
                            stats.avgRating >= 7 ? 'text-green-600' :
                            stats.avgRating >= 5 ? 'text-yellow-600' : 
                            stats.avgRating > 0 ? 'text-red-600' : 'text-gray-400'
                          }`}>
                            {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}/10
                          </span>
                        </td>
                        <td className="py-3 px-6">
                          <Link
                            href={`/report/faculty/${encodeURIComponent(fac.email)}`}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            View Details
                          </Link>
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
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Load More ({filteredFacultyList.length - displayCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <ReportsContent />
    </ProtectedRoute>
  );
}
