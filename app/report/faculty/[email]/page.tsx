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
  academic_year: string;
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

interface FormQuestion {
  id: string;
  text: string;
  position: number;
  question_type: string;
}

function FacultyReportContent() {
  const params = useParams();
  const { authFetch } = useAuth();
  const facultyEmail = decodeURIComponent(params.email as string);

  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [formQuestionsMap, setFormQuestionsMap] = useState<Record<string, FormQuestion[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [formsRes, responsesRes] = await Promise.all([
          authFetch('/api/admin/forms'),
          authFetch('/api/responses'),
        ]);

        let formsData: FeedbackForm[] = [];
        if (formsRes.ok) {
          formsData = await formsRes.json();
          setForms(formsData);
        }

        if (responsesRes.ok) {
          const responsesData = await responsesRes.json();
          setResponses(responsesData);
        }

        // Fetch questions for each form that belongs to this faculty
        const facultyFormIds = formsData
          .filter(f => f.faculty_email.toLowerCase() === facultyEmail.toLowerCase())
          .map(f => f.id);

        const questionsMap: Record<string, FormQuestion[]> = {};
        await Promise.all(
          facultyFormIds.map(async (formId) => {
            const res = await authFetch(`/api/forms/${formId}/questions`);
            if (res.ok) {
              questionsMap[formId] = await res.json();
            }
          })
        );
        setFormQuestionsMap(questionsMap);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [facultyEmail]);

  // Filter forms for this faculty
  const facultyForms = forms.filter(f => 
    f.faculty_email.toLowerCase() === facultyEmail.toLowerCase()
  );

  const facultyName = facultyForms[0]?.faculty_name || 'Faculty';

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

  // Calculate average rating for a single response
  // Uses embedded question_type from response items (preferred) or falls back to formQuestionsMap
  const getResponseAverage = (resp: FeedbackResponse, formId: string): number => {
    if (resp.feedback_response_items.length === 0) return 0;

    const formQuestions = formQuestionsMap[formId] || [];
    let totalNormalized = 0;
    let count = 0;

    resp.feedback_response_items.forEach(item => {
      // Prefer embedded question_type from response, fallback to form questions map
      let questionType = item.question_type;
      if (!questionType) {
        const question = formQuestions.find((q: FormQuestion) => q.id === item.parameter_id);
        questionType = question?.question_type || 'scale_1_10';
      }
      totalNormalized += normalizeRating(item.rating, questionType);
      count++;
    });

    return count > 0 ? totalNormalized / count : 0;
  };

  // Calculate overall stats for faculty (average of all response averages)
  const getOverallStats = () => {
    const formIds = facultyForms.map(f => f.id);
    const facultyResponses = responses.filter(r => formIds.includes(r.form_id));

    if (facultyResponses.length === 0) {
      return { formCount: facultyForms.length, responseCount: 0, avgRating: 0 };
    }

    let totalResponseAvg = 0;

    facultyResponses.forEach(resp => {
      totalResponseAvg += getResponseAverage(resp, resp.form_id);
    });

    return {
      formCount: facultyForms.length,
      responseCount: facultyResponses.length,
      avgRating: totalResponseAvg / facultyResponses.length,
    };
  };

  // Calculate stats for a single form (average of all response averages for this form)
  const getFormStats = (formId: string) => {
    const formResponses = responses.filter(r => r.form_id === formId);

    if (formResponses.length === 0) {
      return { responseCount: 0, avgRating: 0 };
    }

    let totalResponseAvg = 0;

    formResponses.forEach(resp => {
      totalResponseAvg += getResponseAverage(resp, formId);
    });

    return {
      responseCount: formResponses.length,
      avgRating: totalResponseAvg / formResponses.length,
    };
  };

  const overallStats = getOverallStats();

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-gray-200 rounded-lg mb-4"></div>
          <div className="mb-6">
            <div className="h-6 sm:h-7 bg-gray-200 rounded w-40 sm:w-48 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-48 sm:w-64"></div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6">
            <div className="h-5 bg-gray-200 rounded w-24 sm:w-32 mb-4"></div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 sm:h-16 bg-gray-100 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (facultyForms.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Link
          href="/admin/reports"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-8 sm:p-12 text-center">
          <p className="text-gray-400 text-sm sm:text-base">No feedback forms found for this faculty.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <Link
          href="/admin/reports"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-3"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        
        {/* Faculty name with overall rating */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{facultyName}</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">{facultyEmail}</p>
          </div>
          {overallStats.avgRating > 0 && (
            <div className="text-right flex-shrink-0">
              <p className={`text-2xl sm:text-3xl font-bold ${
                overallStats.avgRating >= 7 ? 'text-green-600' :
                overallStats.avgRating >= 5 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {overallStats.avgRating.toFixed(1)}
                <span className="text-sm sm:text-lg text-gray-400 font-normal">/10</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Subjects List */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Subjects</h2>
        <div className="space-y-2 sm:space-y-3">
          {facultyForms.map(form => {
            const stats = getFormStats(form.id);
            
            return (
              <Link
                key={form.id}
                href={`/report/${form.id}`}
                className="block p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all group"
              >
                {/* Mobile layout */}
                <div className="sm:hidden">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium text-gray-900 text-sm leading-tight">
                      {form.subject_name}
                    </p>
                    <div className="text-gray-300 group-hover:text-gray-400 transition-colors flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {form.academic_year} · Sem {form.semester} · {form.course === 'AIDS' ? 'AI & DS' : 'IT'} · {form.division}{form.batch ? ` / ${form.batch}` : ''}
                  </p>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-xs text-gray-400">Responses: </span>
                      <span className="text-xs font-semibold text-gray-900">{stats.responseCount}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Rating: </span>
                      <span className={`text-xs font-bold ${
                        stats.avgRating >= 7 ? 'text-green-600' :
                        stats.avgRating >= 5 ? 'text-yellow-600' : 
                        stats.avgRating > 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}/10
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden sm:flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 group-hover:text-gray-700 truncate">
                      {form.subject_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {form.academic_year} · Sem {form.semester} · {form.course === 'AIDS' ? 'AI & DS' : 'IT'} · Div {form.division}{form.batch ? ` / Batch ${form.batch}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Responses</p>
                      <p className="text-sm font-semibold text-gray-900">{stats.responseCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Rating</p>
                      <p className={`text-sm font-bold ${
                        stats.avgRating >= 7 ? 'text-green-600' :
                        stats.avgRating >= 5 ? 'text-yellow-600' : 
                        stats.avgRating > 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}/10
                      </p>
                    </div>
                    <div className="text-gray-300 group-hover:text-gray-400 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function FacultyReportPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <FacultyReportContent />
    </ProtectedRoute>
  );
}
