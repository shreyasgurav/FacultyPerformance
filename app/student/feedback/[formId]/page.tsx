'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Toast from '@/components/Toast';

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

interface FeedbackParameter {
  id: string;
  text: string;
  position: number;
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
  year: string;
  course: string;
  division: string;
  batch: string;
}

interface PageProps {
  params: { formId: string };
}

export default function FeedbackFormPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [parameters, setParameters] = useState<FeedbackParameter[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [notAuthorized, setNotAuthorized] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [formRes, paramsRes, studentsRes, responsesRes] = await Promise.all([
          fetch(`/api/forms/${params.formId}`),
          fetch('/api/feedback-parameters'),
          fetch('/api/admin/students'),
          fetch('/api/responses'),
        ]);

        let formData: FeedbackForm | null = null;
        if (formRes.ok) {
          formData = await formRes.json();
          setForm(formData);
        }

        if (paramsRes.ok) {
          const paramsData = await paramsRes.json();
          setParameters(paramsData);
        }

        let allStudents: StudentRecord[] = [];
        if (studentsRes.ok) {
          allStudents = await studentsRes.json();
          setStudents(allStudents);
        }

        let allResponses: FeedbackResponse[] = [];
        if (responsesRes.ok) {
          allResponses = await responsesRes.json();
          setResponses(allResponses);
        }

        // Get student ID from URL or use first matching student
        const urlStudentId = searchParams.get('studentId');
        let currentStudent: StudentRecord | undefined;
        
        if (urlStudentId && allStudents.find(s => s.id === urlStudentId)) {
          setStudentId(urlStudentId);
          currentStudent = allStudents.find(s => s.id === urlStudentId);
          const hasSubmitted = allResponses.some(
            r => r.form_id === params.formId && r.student_id === urlStudentId
          );
          setAlreadySubmitted(hasSubmitted);
        } else if (allStudents.length > 0) {
          setStudentId(allStudents[0].id);
          currentStudent = allStudents[0];
          const hasSubmitted = allResponses.some(
            r => r.form_id === params.formId && r.student_id === allStudents[0].id
          );
          setAlreadySubmitted(hasSubmitted);
        }

        // Check if student is authorized to access this form
        if (formData && currentStudent) {
          const isAuthorized = 
            formData.year === currentStudent.year &&
            formData.course === currentStudent.course &&
            formData.division === currentStudent.division &&
            formData.status === 'active' &&
            (!formData.batch || formData.batch === currentStudent.batch);
          
          if (!isAuthorized) {
            setNotAuthorized(true);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [params.formId, searchParams]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !studentId || alreadySubmitted) return;

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/responses', {
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

      setTimeout(() => {
        router.push('/student/dashboard');
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

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-lg font-semibold text-gray-900">{form.subject_name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{form.faculty_name}</p>
      </div>

      <form onSubmit={handleSubmit}>

        {/* Questions */}
        <div className="space-y-8">
          {parameters.map((param, index) => (
            <div key={param.id}>
              <p className="text-sm text-gray-700 mb-3">
                <span className="text-gray-400 mr-1">{index + 1}.</span> {param.text}
              </p>
              <div className="grid grid-cols-11 gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleRatingChange(param.id, rating)}
                    className={`h-9 rounded-lg text-xs font-medium transition-all ${
                      ratings[param.id] === rating
                        ? 'bg-gray-900 text-white scale-105'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Comment */}
        <div className="mt-10">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Comments (optional)
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white resize-none transition-colors"
            placeholder="Any additional feedback..."
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!allParametersRated || isSubmitting}
          className={`w-full mt-6 py-3 rounded-xl text-sm font-medium transition-all ${
            allParametersRated && !isSubmitting
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
}
