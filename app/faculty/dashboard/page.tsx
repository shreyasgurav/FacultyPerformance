'use client';

import { useState, useEffect } from 'react';

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
  }[];
}

interface FeedbackParameter {
  id: string;
  text: string;
  position: number;
  form_type: string;
  question_type: string;
}

export default function FacultyDashboardPage() {
  const [faculty, setFaculty] = useState<FacultyRecord[]>([]);
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [parameters, setParameters] = useState<FeedbackParameter[]>([]);
  const [currentFacultyId, setCurrentFacultyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [facultyRes, formsRes, responsesRes, paramsRes] = await Promise.all([
          fetch('/api/admin/faculty'),
          fetch('/api/admin/forms'),
          fetch('/api/responses'),
          fetch('/api/feedback-parameters'),
        ]);
        
        if (facultyRes.ok) {
          const data = await facultyRes.json();
          setFaculty(data);
          if (data.length > 0) {
            setCurrentFacultyId(data[0].id);
          }
        }
        
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
        console.error('Error loading data', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const currentFaculty = faculty.find(f => f.id === currentFacultyId) || null;
  
  // Filter forms for this faculty's email
  const facultyForms = currentFaculty ? forms.filter(f => 
    f.faculty_email.toLowerCase() === currentFaculty.email.toLowerCase()
  ) : [];

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

  // Calculate stats for each form
  const formStats = facultyForms.map(form => {
    const formResponses = responses.filter(r => r.form_id === form.id);
    const formType = form.batch ? 'lab' : 'theory';
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

    const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    return {
      form,
      responseCount: formResponses.length,
      avgRating,
    };
  });

  // Detailed stats for a single form (per-question averages + comments)
  const getFormDetails = (formId: string) => {
    const form = forms.find(f => f.id === formId);
    const formResponses = responses.filter(r => r.form_id === formId);
    
    // Determine form type: if batch exists, it's lab; otherwise theory
    const formType = form?.batch ? 'lab' : 'theory';
    
    // Filter parameters by form type
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

    const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    const parameterAverages = formParameters.map((param, idx) => {
      let paramTotal = 0;
      let paramCount = 0;

      formResponses.forEach(resp => {
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

    const comments = formResponses
      .filter(r => r.comment && r.comment.trim())
      .map(r => r.comment!.trim());

    return {
      avgRating,
      responseCount: formResponses.length,
      parameterAverages,
      comments,
    };
  };

  // Overall stats
  const totalResponses = formStats.reduce((sum, s) => sum + s.responseCount, 0);
  const overallAvg = formStats.length > 0 
    ? formStats.reduce((sum, s) => sum + (s.avgRating * s.responseCount), 0) / Math.max(totalResponses, 1)
    : 0;

  if (isLoading) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }

  if (!currentFaculty) {
    return <div className="p-6 text-gray-500">No faculty found. Add faculty from Admin → User Management.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Title row with demo dropdown and profile */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">My Feedback Forms</h2>

        <div className="flex items-center gap-3">
          {/* Demo dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Demo as:</label>
            <select
              value={currentFacultyId ?? ''}
              onChange={(e) => setCurrentFacultyId(e.target.value)}
              className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors"
            >
              {faculty.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
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
                    <span className="text-gray-400">Total Responses</span>
                    <span className="font-medium text-gray-900 text-right">{totalResponses}</span>
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
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Responses</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Rating</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {formStats.map(({ form, responseCount, avgRating }) => (
                    <tr key={form.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-5">
                        <p className="text-sm font-medium text-gray-900">{form.subject_name}</p>
                        {form.subject_code && <p className="text-xs text-gray-400">{form.subject_code}</p>}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        Year {form.year} · {form.course === 'AIDS' ? 'AI&DS' : 'IT'} · {form.division}{form.batch ? `/${form.batch}` : ''}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {responseCount}
                        </span>
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
                        <button
                          onClick={() => setSelectedFormId(form.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal/Popup for detailed report */}
          {selectedFormId && (() => {
            const selectedForm = facultyForms.find(f => f.id === selectedFormId);
            if (!selectedForm) return null;
            const details = getFormDetails(selectedFormId);

            return (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{selectedForm.subject_name}</h3>
                      <p className="text-sm text-gray-500">
                        Year {selectedForm.year} · {selectedForm.course === 'AIDS' ? 'AI & DS' : 'IT'} · Div {selectedForm.division}{selectedForm.batch ? ` / ${selectedForm.batch}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFormId(null)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {/* Summary stats */}
                    <div className="flex items-center gap-8 mb-6 pb-5 border-b border-gray-100">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Responses</p>
                        <p className="text-2xl font-bold text-gray-900">{details.responseCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Avg Rating</p>
                        <p className={`text-2xl font-bold ${
                          details.avgRating >= 7 ? 'text-green-600' :
                          details.avgRating >= 5 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {details.avgRating > 0 ? details.avgRating.toFixed(1) : '-'}/10
                        </p>
                      </div>
                    </div>

                    {details.responseCount === 0 ? (
                      <p className="text-center text-sm text-gray-400 py-8">No responses yet for this form.</p>
                    ) : (
                      <>
                        {/* Question-wise averages */}
                        <div className="mb-6">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Question-wise Ratings</p>
                          <div className="space-y-3">
                            {details.parameterAverages.map(param => {
                              // Normalize all ratings to 1-10 scale for display
                              let normalizedRating = 0;
                              let percentage = 0;

                              if (param.question_type === 'yes_no') {
                                // 0 -> 1, 1 -> 10
                                normalizedRating = param.average === 1 ? 10 : (param.average * 9 + 1);
                                percentage = normalizedRating * 10;
                              } else if (param.question_type === 'scale_3') {
                                // 1 -> 3.3, 2 -> 6.6, 3 -> 10
                                normalizedRating = (param.average / 3) * 10;
                                percentage = normalizedRating * 10;
                              } else {
                                // 1-10 scale (default)
                                normalizedRating = param.average;
                                percentage = normalizedRating * 10;
                              }

                              const isGood = normalizedRating >= 7;
                              const isMedium = normalizedRating >= 5;
                              const displayValue = normalizedRating.toFixed(1);

                              return (
                                <div key={param.id}>
                                  <div className="flex items-start justify-between text-sm mb-1 gap-2">
                                    <span className="text-gray-600 flex-1">
                                      {param.index}. {param.text}
                                    </span>
                                    <span className={`text-xs font-semibold whitespace-nowrap ${
                                      isGood ? 'text-green-600' :
                                      isMedium ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {displayValue}/10
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div
                                      className={`h-1.5 rounded-full transition-all ${
                                        isGood ? 'bg-green-500' :
                                        isMedium ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Comments */}
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                            Student Comments ({details.comments.length})
                          </p>
                          {details.comments.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No comments submitted.</p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {details.comments.map((comment, idx) => (
                                <div key={idx} className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
                                  <p className="italic">&ldquo;{comment}&rdquo;</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </>)
      }
    </div>
  );
}
