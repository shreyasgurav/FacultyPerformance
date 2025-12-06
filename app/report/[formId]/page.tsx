'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
  year: string;
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
 
function ReportContent() {
  const params = useParams();
  const { authFetch, userRole } = useAuth();
  const formId = params.formId as string;

  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [parameters, setParameters] = useState<FeedbackParameter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [formsRes, responsesRes, paramsRes] = await Promise.all([
          authFetch('/api/admin/forms'),
          authFetch('/api/responses'),
          authFetch('/api/feedback-parameters'),
        ]);

        if (formsRes.ok) {
          const formsData = await formsRes.json();
          const foundForm = formsData.find((f: FeedbackForm) => f.id === formId);
          setForm(foundForm || null);
        }

        if (responsesRes.ok) {
          const responsesData = await responsesRes.json();
          setResponses(responsesData.filter((r: FeedbackResponse) => r.form_id === formId));
        }

        if (paramsRes.ok) {
          const paramsData = await paramsRes.json();
          setParameters(paramsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [formId]);

  // Helper to normalize rating to 1-10 scale
  const normalizeRating = (rating: number, questionType: string): number => {
    if (questionType === 'yes_no') {
      return rating === 1 ? 10 : 1;
    } else if (questionType === 'scale_3') {
      return (rating / 3) * 10;
    }
    return rating;
  };

  // Calculate stats
  const getStats = () => {
    if (!form) return null;

    const formType = form.batch ? 'lab' : 'theory';
    const formParameters = parameters.filter(p => p.form_type === formType);

    let totalRating = 0;
    let ratingCount = 0;

    responses.forEach(resp => {
      resp.feedback_response_items.forEach(item => {
        const param = formParameters.find(p => p.id === item.parameter_id);
        if (param) {
          totalRating += normalizeRating(item.rating, param.question_type);
          ratingCount++;
        }
      });
    });

    const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    const parameterAverages = formParameters.map((param, idx) => {
      let paramTotal = 0;
      let paramCount = 0;

      responses.forEach(resp => {
        const item = resp.feedback_response_items.find(i => i.parameter_id === param.id);
        if (item) {
          paramTotal += item.rating;
          paramCount++;
        }
      });

      return {
        id: param.id,
        index: idx + 1,
        text: param.text,
        average: paramCount > 0 ? paramTotal / paramCount : 0,
        count: paramCount,
        question_type: param.question_type || 'scale_1_10',
      };
    });

    const comments = responses
      .filter(r => r.comment && r.comment.trim() && !r.comment.includes('__original_student_email:'))
      .map(r => ({
        text: r.comment!.trim(),
        date: r.submitted_at,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      responseCount: responses.length,
      avgRating,
      parameterAverages,
      comments,
    };
  };

  const stats = getStats();

  // Determine back URL based on user role
  const getBackUrl = () => {
    if (userRole?.role === 'admin') {
      // Go back to faculty report if we have faculty email
      if (form?.faculty_email) {
        return `/report/faculty/${encodeURIComponent(form.faculty_email)}`;
      }
      return '/admin/reports';
    }
    return '/faculty/dashboard';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link
          href="/admin/reports"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400">Form not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={getBackUrl()}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-3"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        
        {/* Subject name with overall rating on right */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{form.subject_name}</h1>
            {form.subject_code && (
              <p className="text-sm text-gray-500 mt-0.5">{form.subject_code}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {form.faculty_name} · Sem {form.semester} · {form.course === 'AIDS' ? 'AI & DS' : 'IT'} · Div {form.division}{form.batch ? ` / Batch ${form.batch}` : ''}
            </p>
            {stats && (
              <p className="text-xs text-gray-400 mt-2">
                {stats.responseCount} response{stats.responseCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {stats && stats.avgRating > 0 && (
            <div className="text-right">
              <p className={`text-3xl font-bold ${
                stats.avgRating >= 7 ? 'text-green-600' :
                stats.avgRating >= 5 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {stats.avgRating.toFixed(1)}
                <span className="text-lg text-gray-400 font-normal">/10</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {stats && stats.responseCount === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400">No responses yet for this form.</p>
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Question-wise Ratings */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Question-wise Ratings</h2>
            <div className="space-y-5">
              {stats.parameterAverages.map(param => {
                let normalizedRating = 0;
                let percentage = 0;

                if (param.question_type === 'yes_no') {
                  normalizedRating = param.average === 1 ? 10 : (param.average * 9 + 1);
                  percentage = normalizedRating * 10;
                } else if (param.question_type === 'scale_3') {
                  normalizedRating = (param.average / 3) * 10;
                  percentage = normalizedRating * 10;
                } else {
                  normalizedRating = param.average;
                  percentage = normalizedRating * 10;
                }

                const isGood = normalizedRating >= 7;
                const isMedium = normalizedRating >= 5;
                const displayValue = normalizedRating.toFixed(1);

                return (
                  <div key={param.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 leading-snug flex-1 pr-3">
                        {param.text}
                      </span>
                      <span className={`text-sm font-bold tabular-nums ${
                        isGood ? 'text-green-600' :
                        isMedium ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {displayValue}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isGood ? 'bg-green-500' :
                          isMedium ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student Comments */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Student Comments
              <span className="ml-2 text-sm font-normal text-gray-400">({stats.comments.length})</span>
            </h2>
            {stats.comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">No comments submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {stats.comments.map((comment, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-700 leading-relaxed">&ldquo;{comment.text}&rdquo;</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(comment.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'faculty']}>
      <ReportContent />
    </ProtectedRoute>
  );
}
