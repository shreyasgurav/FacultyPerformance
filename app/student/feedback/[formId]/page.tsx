'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Toast from '@/components/Toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeftIcon } from '@/components/Icons';

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

interface FeedbackParameter {
  id: string;
  text: string;
  position: number;
  question_type: string;
}

interface FeedbackResponse {
  id: string;
  form_id: string;
  student_id: string;
}

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

interface PageProps {
  params: { formId: string };
}

function FeedbackFormContent({ params }: PageProps) {
  const router = useRouter();
  const { userRole, authFetch } = useAuth();
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [parameters, setParameters] = useState<FeedbackParameter[]>([]);
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [pendingForms, setPendingForms] = useState<FeedbackForm[]>([]);
  
  // Use authenticated studentId - SECURITY: Never trust URL params for identity
  const studentId = userRole?.studentId || null;

  useEffect(() => {
    async function fetchData() {
      // Wait for authenticated studentId
      if (!studentId) {
        setIsLoading(false);
        setNotAuthorized(true);
        return;
      }

      try {
        // Fetch form, student data, parameters, and responses
        const [formRes, studentRes, responsesRes, formsRes] = await Promise.all([
          authFetch(`/api/forms/${params.formId}`),
          authFetch(`/api/admin/students/${studentId}`),
          authFetch('/api/responses'),
          authFetch('/api/admin/forms'),
        ]);

        let formData: FeedbackForm | null = null;
        if (formRes.ok) {
          formData = await formRes.json();
          setForm(formData);
        }

        let currentStudent: StudentRecord | null = null;
        if (studentRes.ok) {
          currentStudent = await studentRes.json();
          setStudent(currentStudent);
        }

        let allResponses: FeedbackResponse[] = [];
        if (responsesRes.ok) {
          allResponses = await responsesRes.json();
          setResponses(allResponses);
        }

        let allForms: FeedbackForm[] = [];
        if (formsRes.ok) {
          allForms = await formsRes.json();
        }

        // Check if already submitted
        const hasSubmitted = allResponses.some(
          r => r.form_id === params.formId && r.student_id === studentId
        );
        setAlreadySubmitted(hasSubmitted);

        // Fetch questions for this specific form (snapshot or fallback to template)
        const paramsRes = await authFetch(`/api/forms/${params.formId}/questions`);
        if (paramsRes.ok) {
          const paramsData = await paramsRes.json();
          setParameters(paramsData);
        }

        // Check if student is authorized to access this form
        if (formData && currentStudent) {
          const isAuthorized = 
            formData.semester === currentStudent.semester &&
            formData.course === currentStudent.course &&
            formData.division === currentStudent.division &&
            formData.status === 'active' &&
            (!formData.batch || formData.batch === currentStudent.batch);
          
          if (!isAuthorized) {
            setNotAuthorized(true);
          }
        }

        // Build pending forms list for this student (ordered as received)
        if (currentStudent && allForms.length > 0) {
          const studentForms = allForms.filter(f => 
            f.semester === currentStudent.semester &&
            f.course === currentStudent.course &&
            f.division === currentStudent.division &&
            f.status === 'active' &&
            (!f.batch || f.batch === currentStudent.batch)
          );

          const submittedSet = new Set(
            allResponses
              .filter(r => r.student_id === studentId)
              .map(r => r.form_id)
          );

          setPendingForms(studentForms.filter(f => !submittedSet.has(f.id)));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [params.formId, studentId]);

  useEffect(() => {
    if (studentId) {
      const hasSubmitted = responses.some(
        r => r.form_id === params.formId && r.student_id === studentId
      );
      setAlreadySubmitted(hasSubmitted);
    }
  }, [studentId, responses, params.formId]);

  const handleRatingChange = (parameterId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [parameterId]: rating }));
  };

  const getNextFormId = () => {
    if (!form) return null;
    const pendingIds = pendingForms.map(f => f.id);
    const currentIndex = pendingIds.indexOf(form.id);
    if (currentIndex >= 0 && currentIndex < pendingIds.length - 1) {
      return pendingIds[currentIndex + 1];
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !studentId || alreadySubmitted) return;

    setIsSubmitting(true);

    try {
      const res = await authFetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.id,
          studentId,
          ratings,
          comment,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit feedback');
      }

      setToastType('success');
      setToastMessage('Feedback submitted successfully!');
      setShowToast(true);

      const nextFormId = getNextFormId();
      const redirectTo = nextFormId ? `/student/feedback/${nextFormId}` : '/student/dashboard';

      setTimeout(() => {
        router.push(redirectTo);
      }, 1500);
    } catch (error) {
      setToastType('error');
      setToastMessage(error instanceof Error ? error.message : 'Failed to submit');
      setShowToast(true);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }

  if (!form || notAuthorized) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            {notAuthorized 
              ? "You are not authorized to access this form. This form is for a different class/division."
              : "Form not found."
            }
          </p>
          <Link href="/student/dashboard" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-4">You have already submitted feedback for this form.</p>
          <Link href="/student/dashboard" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const allParametersRated = parameters.every(p => ratings[p.id] !== undefined);
  const nextFormId = getNextFormId();
  const submitLabel = nextFormId ? 'Submit and Next' : 'Submit Feedback';

  return (
    <div className="max-w-xl mx-auto px-5 py-8">
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3">
          <Link
            href="/student/dashboard"
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{form.faculty_name}</h1>
            <p className="text-sm text-gray-500 mt-1">{form.subject_name}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* Questions */}
        <div className="space-y-10">
          {parameters.map((param, index) => (
            <div key={param.id}>
              <p className="text-sm font-medium text-gray-900 mb-4 leading-relaxed">
                <span className="text-gray-500 mr-1">{index + 1}.</span>
                {param.text}
              </p>
              
              {/* Yes/No scale (for lab questions) */}
              {param.question_type === 'yes_no' && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {[
                    { value: 1, label: 'Yes' },
                    { value: 0, label: 'No' },
                  ].map(option => {
                    const isSelected = ratings[param.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleRatingChange(param.id, option.value)}
                        className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl text-sm font-medium transition-all border-2 text-center ${
                          isSelected
                            ? option.value === 1
                              ? 'bg-green-50 border-green-400 text-green-700'
                              : 'bg-red-50 border-red-400 text-red-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 3-option scale (Need improvement, Satisfactory, Good) */}
              {param.question_type === 'scale_3' && (
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-4">
                  {[
                    { value: 1, label: 'Need improvement', color: 'red' },
                    { value: 2, label: 'Satisfactory', color: 'yellow' },
                    { value: 3, label: 'Good', color: 'green' },
                  ].map(option => {
                    const isSelected = ratings[param.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleRatingChange(param.id, option.value)}
                        className={`py-2.5 sm:py-3 px-1.5 sm:px-3 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-medium transition-all border-2 text-center ${
                          isSelected
                            ? option.color === 'red' 
                              ? 'bg-red-50 border-red-400 text-red-700'
                              : option.color === 'yellow'
                              ? 'bg-amber-50 border-amber-400 text-amber-700'
                              : 'bg-green-50 border-green-400 text-green-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 1-10 scale */}
              {param.question_type === 'scale_1_10' && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-2 px-1">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => {
                      const isSelected = ratings[param.id] === rating;
                      return (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => handleRatingChange(param.id, rating)}
                          className={`h-9 sm:h-11 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                            isSelected
                              ? rating <= 3 
                                ? 'bg-red-500 text-white shadow-md'
                                : rating <= 6
                                ? 'bg-amber-500 text-white shadow-md'
                                : 'bg-green-500 text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {rating}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fallback for old 0-10 scale (backwards compatibility) */}
              {!param.question_type && (
                <div className="grid grid-cols-11 gap-1 mt-4">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleRatingChange(param.id, rating)}
                      className={`h-9 sm:h-11 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                        ratings[param.id] === rating
                          ? 'bg-gray-900 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comment */}
        <div className="mt-10 pt-6 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Additional Comments <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 resize-none transition-colors placeholder:text-gray-400"
            placeholder="Share any additional feedback about the faculty..."
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!allParametersRated || isSubmitting}
          className={`w-full mt-8 py-3.5 rounded-xl text-sm font-semibold transition-all ${
            allParametersRated && !isSubmitting
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Submitting...' : submitLabel}
        </button>
      </form>
    </div>
  );
}

export default function FeedbackFormPage({ params }: PageProps) {
  return (
    <ProtectedRoute allowedRoles={['student']}>
      <FeedbackFormContent params={params} />
    </ProtectedRoute>
  );
}
