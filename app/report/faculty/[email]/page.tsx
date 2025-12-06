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

function FacultyReportContent() {
  const params = useParams();
  const { authFetch } = useAuth();
  const facultyEmail = decodeURIComponent(params.email as string);

  const [forms, setForms] = useState<FeedbackForm[]>([]);
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
          setForms(formsData);
        }

        if (responsesRes.ok) {
          const responsesData = await responsesRes.json();
          setResponses(responsesData);
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
  }, []);

  // Filter forms for this faculty
  const facultyForms = forms.filter(f => 
    f.faculty_email.toLowerCase() === facultyEmail.toLowerCase()
  );

  const facultyName = facultyForms[0]?.faculty_name || 'Faculty';

  // Helper to normalize rating to 1-10 scale
  const normalizeRating = (rating: number, questionType: string): number => {
    if (questionType === 'yes_no') {
      return rating === 1 ? 10 : 1;
    } else if (questionType === 'scale_3') {
      return (rating / 3) * 10;
    }
    return rating;
  };

  // Calculate overall stats for faculty
  const getOverallStats = () => {
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

    return {
      formCount: facultyForms.length,
      responseCount: facultyResponses.length,
      avgRating: ratingCount > 0 ? totalRating / ratingCount : 0,
    };
  };

  // Calculate stats for a single form
  const getFormStats = (formId: string) => {
    const form = forms.find(f => f.id === formId);
    const formResponses = responses.filter(r => r.form_id === formId);
    const formType = form?.batch ? 'lab' : 'theory';
    const formParameters = parameters.filter(p => p.form_type === formType);

    let totalRating = 0;
    let ratingCount = 0;

    formResponses.forEach(resp => {
      resp.feedback_response_items.forEach(item => {
        const param = formParameters.find(p => p.id === item.parameter_id);
        if (param) {
          totalRating += normalizeRating(item.rating, param.question_type);
          ratingCount++;
        }
      });
    });

    return {
      responseCount: formResponses.length,
      avgRating: ratingCount > 0 ? totalRating / ratingCount : 0,
    };
  };

  const overallStats = getOverallStats();

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

  if (facultyForms.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link
          href="/admin/reports"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400">No feedback forms found for this faculty.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/reports"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-3"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        
        {/* Faculty name with overall rating on right */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{facultyName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{facultyEmail}</p>
          </div>
          {overallStats.avgRating > 0 && (
            <div className="text-right">
              <p className={`text-3xl font-bold ${
                overallStats.avgRating >= 7 ? 'text-green-600' :
                overallStats.avgRating >= 5 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {overallStats.avgRating.toFixed(1)}
                <span className="text-lg text-gray-400 font-normal">/10</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Subjects List - Original Design */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Subjects</h2>
        <div className="space-y-3">
          {facultyForms.map(form => {
            const stats = getFormStats(form.id);
            
            return (
              <Link
                key={form.id}
                href={`/report/${form.id}`}
                className="block p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 group-hover:text-gray-700 truncate">
                      {form.subject_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Sem {form.semester} · {form.course === 'AIDS' ? 'AI & DS' : 'IT'} · Div {form.division}{form.batch ? ` / Batch ${form.batch}` : ''}
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
