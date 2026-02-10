'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Toast from '@/components/Toast';

interface StudentRecord {
  id: string;
  name: string;
  email: string;
  semester: number;
  course: string;
  division: string;
  batch: string;
  honours_course?: string;
  honours_batch?: string;
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

function StudentFeedbackFlow() {
  const { userRole, signOut, authFetch } = useAuth();

  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [pendingForms, setPendingForms] = useState<FeedbackForm[]>([]);
  const [formQuestions, setFormQuestions] = useState<Record<string, FeedbackParameter[]>>({});
  const [currentFormIndex, setCurrentFormIndex] = useState(0);
  const [allRatings, setAllRatings] = useState<Record<string, Record<string, number>>>({});
  const [allComments, setAllComments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [draftLoaded, setDraftLoaded] = useState(false);

  const studentId = userRole?.studentId || null;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save draft to database (debounced)
  const saveDraftToDb = useCallback(
    (index: number, ratings: Record<string, Record<string, number>>, comments: Record<string, string>) => {
      if (!studentId) return;

      // Clear previous timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Debounce: save after 500ms of no changes
      saveTimerRef.current = setTimeout(async () => {
        try {
          await authFetch('/api/draft-feedback', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId,
              currentFormIndex: index,
              allRatings: ratings,
              allComments: comments,
            }),
          });
        } catch {
          // Silently fail - draft saving is best-effort
        }
      }, 500);
    },
    [studentId, authFetch]
  );

  // Delete draft from database
  const deleteDraftFromDb = useCallback(async () => {
    if (!studentId) return;
    try {
      await authFetch(`/api/draft-feedback?studentId=${studentId}`, {
        method: 'DELETE',
      });
    } catch {
      // ignore
    }
  }, [studentId, authFetch]);

  // Fetch all data on mount
  useEffect(() => {
    async function fetchData() {
      if (!studentId) return;

      try {
        // Fetch student info
        const studentRes = await authFetch(`/api/admin/students/${studentId}`);
        if (!studentRes.ok) {
          setIsLoading(false);
          return;
        }
        const studentData: StudentRecord = await studentRes.json();
        setStudent(studentData);

        // Fetch forms, responses, and saved draft in parallel
        const formsQuery = new URLSearchParams({
          semester: studentData.semester.toString(),
          course: studentData.course,
          division: studentData.division,
          status: 'active',
        });

        // Build parallel fetches - include honours forms if student has honours_course
        const fetchPromises: Promise<Response>[] = [
          authFetch(`/api/admin/forms?${formsQuery}`),
          authFetch(`/api/responses?studentId=${studentId}`),
          authFetch(`/api/draft-feedback?studentId=${studentId}`),
        ];

        // Honours: only fetch forms for the student's allotted honours_course (from DB)
        if (studentData.honours_course) {
          const honoursFormsQuery = new URLSearchParams({
            semester: studentData.semester.toString(),
            course: studentData.honours_course,
            status: 'active',
          });
          fetchPromises.push(authFetch(`/api/admin/forms?${honoursFormsQuery}`));
        }

        const results = await Promise.all(fetchPromises);
        const [formsRes, responsesRes, draftRes] = results;
        const honoursFormsRes = results[3]; // may be undefined

        let regularForms: FeedbackForm[] = [];
        if (formsRes.ok) regularForms = await formsRes.json();

        let honoursForms: FeedbackForm[] = [];
        if (honoursFormsRes?.ok) honoursForms = await honoursFormsRes.json();

        let responses: FeedbackResponse[] = [];
        if (responsesRes.ok) responses = await responsesRes.json();

        const submittedIds = new Set(responses.map((r) => r.form_id));

        // Regular: only forms for this division; lab forms only if batch matches student's batch
        const filteredRegular = regularForms
          .filter((f) => !f.batch || f.batch === studentData.batch)
          .filter((f) => !submittedIds.has(f.id));

        // Honours: only forms allotted to this student - theory (no batch) for their honours_course; lab only if honours_batch matches
        const filteredHonours = honoursForms
          .filter((f) => !f.batch || f.batch === (studentData.honours_batch ?? ''))
          .filter((f) => !submittedIds.has(f.id));

        // Merge and deduplicate (in case of overlap)
        const seenIds = new Set(filteredRegular.map((f) => f.id));
        const uniqueHonours = filteredHonours.filter((f) => !seenIds.has(f.id));
        const filtered = [...filteredRegular, ...uniqueHonours];

        if (filtered.length === 0) {
          setAllDone(true);
          deleteDraftFromDb();
          setIsLoading(false);
          return;
        }

        setPendingForms(filtered);

        // Fetch questions for ALL pending forms in parallel
        const questionsMap: Record<string, FeedbackParameter[]> = {};
        await Promise.all(
          filtered.map(async (form) => {
            const res = await authFetch(`/api/forms/${form.id}/questions`);
            if (res.ok) questionsMap[form.id] = await res.json();
          })
        );
        setFormQuestions(questionsMap);

        // Restore draft from database
        if (draftRes.ok) {
          const draftData = await draftRes.json();
          if (draftData?.formData) {
            const { currentFormIndex: savedIndex, allRatings: savedRatings, allComments: savedComments } = draftData.formData;

            // Validate draft data matches current forms
            if (savedRatings && typeof savedRatings === 'object') {
              const currentFormIds = filtered.map((f) => f.id);
              const hasOverlap = Object.keys(savedRatings).some((id) => currentFormIds.includes(id));

              if (hasOverlap) {
                setAllRatings(savedRatings);
                if (savedComments) setAllComments(savedComments);
                if (typeof savedIndex === 'number') {
                  setCurrentFormIndex(Math.min(savedIndex, filtered.length - 1));
                }
              }
            }
          }
        }

        setDraftLoaded(true);
      } catch (error) {
        console.error('Error loading data', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [studentId, authFetch, deleteDraftFromDb]);

  // Save draft to DB whenever ratings/comments/index change (after initial load)
  useEffect(() => {
    if (!draftLoaded || pendingForms.length === 0) return;
    saveDraftToDb(currentFormIndex, allRatings, allComments);
  }, [currentFormIndex, allRatings, allComments, draftLoaded, pendingForms.length, saveDraftToDb]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const currentForm = pendingForms[currentFormIndex] || null;
  const currentQuestions = currentForm ? formQuestions[currentForm.id] || [] : [];
  const currentRatings = currentForm ? allRatings[currentForm.id] || {} : {};
  const currentComment = currentForm ? allComments[currentForm.id] || '' : '';
  const allCurrentRated = currentQuestions.every((q) => currentRatings[q.id] !== undefined);
  const isLastForm = currentFormIndex === pendingForms.length - 1;

  const handleRatingChange = useCallback(
    (parameterId: string, rating: number) => {
      if (!currentForm) return;
      setAllRatings((prev) => ({
        ...prev,
        [currentForm.id]: {
          ...(prev[currentForm.id] || {}),
          [parameterId]: rating,
        },
      }));
    },
    [currentForm]
  );

  const handleCommentChange = useCallback(
    (value: string) => {
      if (!currentForm) return;
      setAllComments((prev) => ({
        ...prev,
        [currentForm.id]: value,
      }));
    },
    [currentForm]
  );

  const handleNext = () => {
    if (!allCurrentRated) return;
    setCurrentFormIndex((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (currentFormIndex === 0) return;
    setCurrentFormIndex((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitAll = async () => {
    if (!studentId || isSubmitting) return;

    // Verify all forms are filled
    for (const form of pendingForms) {
      const questions = formQuestions[form.id] || [];
      const ratings = allRatings[form.id] || {};
      const allRated = questions.every((q) => ratings[q.id] !== undefined);
      if (!allRated) {
        setToastType('error');
        setToastMessage(`Please complete all questions for "${form.subject_name}"`);
        setShowToast(true);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const submissions = pendingForms.map((form) => ({
        formId: form.id,
        ratings: allRatings[form.id] || {},
        comment: allComments[form.id] || '',
      }));

      const res = await authFetch('/api/responses/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, submissions }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit');
      }

      // Clear draft from database after successful submission
      await deleteDraftFromDb();

      setToastType('success');
      setToastMessage('All feedback submitted successfully!');
      setShowToast(true);
      setAllDone(true);
    } catch (error) {
      setToastType('error');
      setToastMessage(error instanceof Error ? error.message : 'Failed to submit');
      setShowToast(true);
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-5 py-8">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-8">
            <div className="h-1.5 bg-gray-200 rounded-full flex-1 mr-4"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
          </div>
          <div className="h-5 bg-gray-200 rounded w-40 mb-2"></div>
          <div className="h-4 bg-gray-100 rounded w-28 mb-10"></div>
          <div className="space-y-10">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                <div className="flex gap-1">
                  {[...Array(10)].map((_, j) => (
                    <div key={j} className="h-10 bg-gray-100 rounded-lg flex-1"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="h-12 bg-gray-200 rounded-xl mt-10"></div>
        </div>
      </div>
    );
  }

  // All forms completed
  if (allDone) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-5 py-10 text-center">
        {showToast && (
          <Toast message={toastMessage} type={toastType} onClose={() => setShowToast(false)} />
        )}
        <div className="max-w-md w-full">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">All Done!</h2>
          <p className="text-sm text-gray-500 mb-6">
            You have completed all available feedback forms. Thank you for your responses.
          </p>
          <button
            onClick={signOut}
            className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!currentForm || !student) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center">
        <p className="text-sm text-gray-500">No forms available.</p>
      </div>
    );
  }

  const completedCount = pendingForms.filter((form) => {
    const questions = formQuestions[form.id] || [];
    const ratings = allRatings[form.id] || {};
    return questions.length > 0 && questions.every((q) => ratings[q.id] !== undefined);
  }).length;

  return (
    <div className="max-w-xl mx-auto px-5 py-8">
      {showToast && (
        <Toast message={toastMessage} type={toastType} onClose={() => setShowToast(false)} />
      )}

      {/* Top bar: Progress on left, Profile on right */}
      <div className="flex items-center justify-between gap-4 mb-8">
        {/* Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">
              {currentFormIndex + 1} of {pendingForms.length}
            </span>
            <span className="text-xs text-gray-400">
              {completedCount} completed
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentFormIndex + 1) / pendingForms.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Profile dropdown */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowProfile((prev) => !prev)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-medium">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <svg
              className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showProfile ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
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
                  <span className="font-medium text-gray-900 text-right">
                    {student.course === 'AIDS' ? 'AI & DS' : 'IT'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Semester / Division</span>
                  <span className="font-medium text-gray-900 text-right">
                    Sem {student.semester} · Div {student.division}
                  </span>
                </div>
                {student.batch && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Batch</span>
                    <span className="font-medium text-gray-900 text-right">{student.batch}</span>
                  </div>
                )}
                {student.honours_course && (
                  <>
                    <div className="border-t border-gray-100 pt-2 mt-1"></div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Honours</span>
                      <span className="font-medium text-purple-600 text-right">{student.honours_course}</span>
                    </div>
                    {student.honours_batch && (
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-400">Honours Batch</span>
                        <span className="font-medium text-purple-600 text-right">{student.honours_batch}</span>
                      </div>
                    )}
                  </>
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

      {/* Form header */}
      <div className="mb-10">
        <h1 className="text-xl font-bold text-gray-900">{currentForm.faculty_name}</h1>
        <p className="text-sm text-gray-500 mt-1">{currentForm.subject_name}</p>
      </div>

      {/* Questions */}
      <div className="space-y-10">
        {currentQuestions.map((param, index) => (
          <div key={param.id}>
            <p className="text-sm font-medium text-gray-900 mb-4 leading-relaxed">
              <span className="text-gray-500 mr-1">{index + 1}.</span>
              {param.text}
            </p>

            {/* Yes/No */}
            {param.question_type === 'yes_no' && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                {[
                  { value: 1, label: 'Yes' },
                  { value: 0, label: 'No' },
                ].map((option) => {
                  const isSelected = currentRatings[param.id] === option.value;
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

            {/* 3-option scale */}
            {param.question_type === 'scale_3' && (
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-4">
                {[
                  { value: 1, label: 'Need improvement', color: 'red' },
                  { value: 2, label: 'Satisfactory', color: 'yellow' },
                  { value: 3, label: 'Good', color: 'green' },
                ].map((option) => {
                  const isSelected = currentRatings[param.id] === option.value;
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
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => {
                    const isSelected = currentRatings[param.id] === rating;
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

            {/* Fallback for old scale */}
            {!param.question_type && (
              <div className="grid grid-cols-11 gap-1 mt-4">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleRatingChange(param.id, rating)}
                    className={`h-9 sm:h-11 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                      currentRatings[param.id] === rating
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

      {/* Comment - only on last form */}
      {isLastForm && (
        <div className="mt-10 pt-6 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Additional Comments <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={currentComment}
            onChange={(e) => handleCommentChange(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 resize-none transition-colors placeholder:text-gray-400"
            placeholder="Share any additional feedback..."
          />
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3 mt-10">
        {currentFormIndex > 0 && (
          <button
            type="button"
            onClick={handleBack}
            className="px-6 py-3.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        )}

        {isLastForm ? (
          <button
            type="button"
            onClick={handleSubmitAll}
            disabled={!allCurrentRated || isSubmitting}
            className={`flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              allCurrentRated && !isSubmitting
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit All Feedback'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={!allCurrentRated}
            className={`flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              allCurrentRated
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['student']}>
      <StudentFeedbackFlow />
    </ProtectedRoute>
  );
}
