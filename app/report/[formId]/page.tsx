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
 
interface Student {
  id: string;
  name: string;
  email: string;
  semester: number;
  course: string;
  division: string;
  batch: string;
}
 
function ReportContent() {
  const params = useParams();
  const { authFetch, userRole } = useAuth();
  const formId = params.formId as string;

  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notAuthorized, setNotAuthorized] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch form, responses, form-specific questions, and students
        const [formsRes, responsesRes, questionsRes, studentsRes] = await Promise.all([
          authFetch('/api/admin/forms'),
          authFetch('/api/responses'),
          authFetch(`/api/forms/${formId}/questions`),  // Get form-specific questions
          authFetch('/api/admin/students'),
        ]);

        let foundForm: FeedbackForm | null = null;
        if (formsRes.ok) {
          const formsData = await formsRes.json();
          foundForm = formsData.find((f: FeedbackForm) => f.id === formId) || null;
          setForm(foundForm);
        }

        if (responsesRes.ok) {
          const responsesData = await responsesRes.json();
          setResponses(responsesData.filter((r: FeedbackResponse) => r.form_id === formId));
        }

        if (questionsRes.ok) {
          const questionsData = await questionsRes.json();
          setFormQuestions(questionsData);
        }

        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          setStudents(studentsData);
        }

        // SECURITY: Check if faculty is authorized to view this form's report
        // Admin can see all reports, faculty can only see their own forms
        if (userRole?.role === 'faculty' && foundForm) {
          const facultyEmail = userRole.email?.toLowerCase();
          const formFacultyEmail = foundForm.faculty_email?.toLowerCase();
          if (facultyEmail !== formFacultyEmail) {
            setNotAuthorized(true);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [formId, authFetch, userRole]);

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

  // Calculate stats - prefer embedded question data from responses, fallback to formQuestions
  const getStats = () => {
    if (!form) return null;

    // No responses yet - show empty state with form questions
    if (responses.length === 0) {
      return {
        responseCount: 0,
        avgRating: 0,
        parameterAverages: formQuestions.map((q: FormQuestion, idx: number) => ({
          id: q.id,
          index: idx + 1,
          text: q.text,
          average: 0,
          normalizedAvg: 0,
          count: 0,
          question_type: q.question_type || 'scale_1_10',
        })),
        comments: [],
      };
    }

    // Build question map - PRIORITY ORDER:
    // 1. Embedded data from response items (most reliable, saved at submission time)
    // 2. form_questions table (snapshot at form creation)
    // 3. Default fallback
    const questionMap = new Map<string, { text: string; type: string; position: number }>();
    
    // First, try to build from embedded response data (most reliable)
    let positionCounter = 1;
    responses.forEach(resp => {
      resp.feedback_response_items.forEach(item => {
        if (item.question_text && item.question_type && !questionMap.has(item.parameter_id)) {
          questionMap.set(item.parameter_id, {
            text: item.question_text,
            type: item.question_type,
            position: positionCounter++,
          });
        }
      });
    });
    
    // If no embedded data, fallback to formQuestions
    if (questionMap.size === 0 && formQuestions.length > 0) {
      formQuestions.forEach((q: FormQuestion, idx: number) => {
        questionMap.set(q.id, { text: q.text, type: q.question_type, position: idx + 1 });
      });
    }
    
    // If still empty but we have responses, create placeholder entries
    if (questionMap.size === 0 && responses.length > 0) {
      responses[0].feedback_response_items.forEach((item, idx) => {
        questionMap.set(item.parameter_id, {
          text: `Question ${idx + 1}`,
          type: item.question_type || 'scale_1_10',
          position: idx + 1,
        });
      });
    }

    // Calculate overall average: average of each response's average
    let totalResponseAvg = 0;
    responses.forEach(resp => {
      let respTotal = 0;
      let respCount = 0;
      resp.feedback_response_items.forEach(item => {
        // Use embedded question_type if available, otherwise lookup
        const questionType = item.question_type || questionMap.get(item.parameter_id)?.type || 'scale_1_10';
        respTotal += normalizeRating(item.rating, questionType);
        respCount++;
      });
      if (respCount > 0) {
        totalResponseAvg += respTotal / respCount;
      }
    });
    const avgRating = totalResponseAvg / responses.length;

    // Calculate per-question averages using the question map
    const parameterAverages = Array.from(questionMap.entries())
      .sort((a, b) => a[1].position - b[1].position)
      .map(([paramId, question], idx) => {
        let paramTotal = 0;
        let paramCount = 0;

        responses.forEach(resp => {
          const item = resp.feedback_response_items.find(i => i.parameter_id === paramId);
          if (item) {
            paramTotal += item.rating;
            paramCount++;
          }
        });

        const rawAvg = paramCount > 0 ? paramTotal / paramCount : 0;
        const normalizedAvg = normalizeRating(rawAvg, question.type);

        return {
          id: paramId,
          index: idx + 1,
          text: question.text,
          average: rawAvg,
          normalizedAvg,
          count: paramCount,
          question_type: question.type || 'scale_1_10',
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

  const getTotalStudentsForForm = (form: FeedbackForm): number => {
    // Match students by semester, course, division, and batch (if lab form)
    return students.filter(student => {
      const matchesSemester = student.semester === form.semester;
      const matchesCourse = student.course.toUpperCase() === form.course.toUpperCase();
      const matchesDivision = student.division.toUpperCase() === form.division.toUpperCase();
      
      // If form has a batch (lab form), match batch too
      // If theory form (no batch), count ALL students in that division
      if (form.batch) {
        const matchesBatch = student.batch?.toUpperCase() === form.batch.toUpperCase();
        return matchesSemester && matchesCourse && matchesDivision && matchesBatch;
      } else {
        // Theory form - count all students in this division (regardless of their batch)
        return matchesSemester && matchesCourse && matchesDivision;
      }
    }).length;
  };

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
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-gray-200 rounded-lg mb-4"></div>
          <div className="mb-4 sm:mb-6">
            <div className="h-5 sm:h-6 bg-gray-200 rounded w-48 sm:w-64 mb-2"></div>
            <div className="h-3 sm:h-4 bg-gray-100 rounded w-full sm:w-80 mb-2"></div>
          </div>
          <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6">
              <div className="h-5 bg-gray-200 rounded w-32 sm:w-40 mb-4"></div>
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <div className="h-3 sm:h-4 bg-gray-100 rounded w-full mb-2"></div>
                    <div className="h-2 bg-gray-100 rounded-full"></div>
              </div>
            ))}
          </div>
                </div>
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6">
              <div className="h-5 bg-gray-200 rounded w-32 sm:w-40 mb-4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 sm:h-20 bg-gray-100 rounded-lg"></div>
              ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!form || notAuthorized) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Link
          href={userRole?.role === 'admin' ? '/admin/reports' : '/faculty/dashboard'}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-8 sm:p-12 text-center">
          {notAuthorized ? (
            <>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-gray-600 mb-2 text-sm sm:text-base">Access Denied</p>
              <p className="text-xs sm:text-sm text-gray-400">You can only view reports for your own forms.</p>
            </>
          ) : (
            <p className="text-gray-400 text-sm sm:text-base">Form not found.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <Link
          href={getBackUrl()}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-3"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        
        {/* Subject name with overall rating on right */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{form.subject_name}</h1>
            {form.subject_code && (
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{form.subject_code}</p>
            )}
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              <span className="hidden sm:inline">{form.academic_year} · {form.faculty_name} · Sem {form.semester} · {form.course === 'AIDS' ? 'AI & DS' : 'IT'} · Div {form.division}{form.batch ? ` / Batch ${form.batch}` : ''}</span>
              <span className="sm:hidden">{form.faculty_name} · Sem {form.semester} · {form.division}{form.batch ? `/${form.batch}` : ''}</span>
            </p>
            {stats && userRole?.role === 'admin' && form && (
              <p className="text-xs text-gray-400 mt-1 sm:mt-2">
                {stats.responseCount} / {getTotalStudentsForForm(form)} response{stats.responseCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {stats && stats.avgRating > 0 && (
            <div className="text-right flex-shrink-0">
              <p className={`text-2xl sm:text-3xl font-bold ${
                stats.avgRating >= 7 ? 'text-green-600' :
                stats.avgRating >= 5 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {stats.avgRating.toFixed(1)}
                <span className="text-sm sm:text-lg text-gray-400 font-normal">/10</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {stats && stats.responseCount === 0 ? (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-8 sm:p-12 text-center">
          <p className="text-gray-400 text-sm sm:text-base">No responses yet for this form.</p>
        </div>
      ) : stats && (
        <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-1 lg:grid-cols-2 sm:gap-6">
          {/* Question-wise Ratings */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-4 sm:mb-5">Question-wise Ratings</h2>
            <div className="space-y-4 sm:space-y-5">
              {stats.parameterAverages.map(param => {
                const normalizedRating = param.normalizedAvg;
                const percentage = normalizedRating * 10;

                const isGood = normalizedRating >= 7;
                const isMedium = normalizedRating >= 5;

                let displayValue = '';
                if (param.question_type === 'yes_no') {
                  const yesPercent = (param.average * 100).toFixed(0);
                  displayValue = `${yesPercent}% Yes`;
                } else if (param.question_type === 'scale_3') {
                  displayValue = `${param.average.toFixed(1)}/3`;
                } else {
                  displayValue = `${param.average.toFixed(1)}/10`;
                }

                return (
                  <div key={param.id}>
                    <div className="flex items-start sm:items-center justify-between mb-1.5 sm:mb-2 gap-2">
                      <span className="text-xs sm:text-sm text-gray-600 leading-snug flex-1">
                        {param.text}
                      </span>
                      <span className={`text-xs sm:text-sm font-bold tabular-nums whitespace-nowrap flex-shrink-0 ${
                        isGood ? 'text-green-600' :
                        isMedium ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {displayValue}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2">
                      <div
                        className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 ${
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
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">
              Comments
              <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm font-normal text-gray-400">({stats.comments.length})</span>
            </h2>
            {stats.comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm text-gray-400">No comments submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-1">
                {stats.comments.map((comment, idx) => (
                  <div key={idx} className="p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">&ldquo;{comment.text}&rdquo;</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-1.5 sm:mt-2">
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
