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
  }[];
}

interface FeedbackParameter {
  id: string;
  text: string;
  position: number;
  form_type: string;
  question_type: string;
}

function ReportsContent() {
  const { authFetch } = useAuth();
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [parameters, setParameters] = useState<FeedbackParameter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  
  useEffect(() => {
    async function fetchData() {
      try {
        const [formsRes, responsesRes, paramsRes] = await Promise.all([
          authFetch('/api/admin/forms'),
          authFetch('/api/responses'),
          authFetch('/api/feedback-parameters'),
        ]);

        if (formsRes.ok) setForms(await formsRes.json());
        if (responsesRes.ok) setResponses(await responsesRes.json());
        if (paramsRes.ok) setParameters(await paramsRes.json());
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Helper to normalize rating to 1-10 scale
  const normalizeRating = (rating: number, questionType: string): number => {
    if (questionType === 'yes_no') {
      // 0 -> 1, 1 -> 10
      return rating === 1 ? 10 : 1;
    } else if (questionType === 'scale_3') {
      // 1 -> 3.3, 2 -> 6.6, 3 -> 10
      return (rating / 3) * 10;
    }
    // scale_1_10 stays as is
    return rating;
  };

  // Calculate stats for a faculty member (across all their forms)
  const getFacultyStats = (facultyEmail: string) => {
    const facultyForms = forms.filter(f => f.faculty_email.toLowerCase() === facultyEmail.toLowerCase());
    const formIds = facultyForms.map(f => f.id);
    const facultyResponses = responses.filter(r => formIds.includes(r.form_id));

    let totalRating = 0;
    let ratingCount = 0;

    facultyResponses.forEach(resp => {
      const form = forms.find(f => f.id === resp.form_id);
      const formType = form?.batch ? 'lab' : 'theory';
      const formParameters = parameters.filter(p => p.form_type === formType);
      
      resp.feedback_response_items.forEach(item => {
        const param = formParameters.find(p => p.id === item.parameter_id);
        if (param) {
          totalRating += normalizeRating(item.rating, param.question_type);
          ratingCount++;
        }
      });
    });

    const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

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
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/dashboard"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-3"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">View detailed analytics for faculty feedback</p>
      </div>

      {/* Faculty Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Faculty Members ({filteredFacultyList.length})
          </h2>
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search faculty..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none"
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
            <div className="overflow-x-auto -mx-6">
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
                  {displayedFacultyList.map((fac, index) => {
                    const stats = getFacultyStats(fac.email);
                    
                    // Get original rank (position in sorted list)
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
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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
