'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
}

export default function ReportsPage() {
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [parameters, setParameters] = useState<FeedbackParameter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Selected faculty for detailed view
  const [selectedFacultyEmail, setSelectedFacultyEmail] = useState<string | null>(null);
  // Selected subject within faculty popup
  const [selectedSubjectFormId, setSelectedSubjectFormId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [formsRes, responsesRes, paramsRes] = await Promise.all([
          fetch('/api/admin/forms'),
          fetch('/api/responses'),
          fetch('/api/feedback-parameters'),
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

  // Calculate stats for a faculty member (across all their forms)
  const getFacultyStats = (facultyEmail: string) => {
    const facultyForms = forms.filter(f => f.faculty_email.toLowerCase() === facultyEmail.toLowerCase());
    const formIds = facultyForms.map(f => f.id);
    const facultyResponses = responses.filter(r => formIds.includes(r.form_id));

    let totalRating = 0;
    let ratingCount = 0;

    facultyResponses.forEach(resp => {
      resp.feedback_response_items.forEach(item => {
        totalRating += item.rating;
        ratingCount++;
      });
    });

    const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    return {
      formCount: facultyForms.length,
      responseCount: facultyResponses.length,
      avgRating,
    };
  };

  // Calculate stats for a single form/subject
  const getFormStats = (formId: string) => {
    const formResponses = responses.filter(r => r.form_id === formId);
    
    let totalRating = 0;
    let ratingCount = 0;

    formResponses.forEach(resp => {
      resp.feedback_response_items.forEach(item => {
        totalRating += item.rating;
        ratingCount++;
      });
    });

    const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    // Per-parameter averages
    const parameterAverages = parameters.map(param => {
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
        text: param.text,
        average: paramCount > 0 ? paramTotal / paramCount : 0,
        count: paramCount,
      };
    });

    // Get comments
    const comments = formResponses
      .filter(r => r.comment && r.comment.trim())
      .map(r => ({
        text: r.comment!,
        date: r.submitted_at,
      }));

    return {
      responseCount: formResponses.length,
      avgRating,
      parameterAverages,
      comments,
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

  // Get forms for selected faculty
  const selectedFacultyForms = selectedFacultyEmail 
    ? forms.filter(f => f.faculty_email.toLowerCase() === selectedFacultyEmail.toLowerCase())
    : [];
  const selectedFacultyInfo = selectedFacultyEmail 
    ? facultyList.find(f => f.email.toLowerCase() === selectedFacultyEmail.toLowerCase())
    : null;
  const selectedFacultyOverallStats = selectedFacultyEmail ? getFacultyStats(selectedFacultyEmail) : null;

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
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">View detailed analytics for faculty feedback</p>
      </div>

      {/* Faculty Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Faculty Members ({facultyList.length})
        </h2>
        {facultyList.length === 0 ? (
          <p className="text-gray-400 text-center text-sm py-8">No faculty with feedback forms found.</p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Faculty Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Subjects</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Avg Rating</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {facultyList.map(fac => {
                  const stats = getFacultyStats(fac.email);
                  
                  return (
                    <tr key={fac.email} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-6">
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
                        <button
                          onClick={() => {
                            setSelectedFacultyEmail(fac.email);
                            setSelectedSubjectFormId(null);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal/Popup for faculty detailed report */}
      {selectedFacultyEmail && selectedFacultyInfo && selectedFacultyOverallStats && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedFacultyInfo.name}</h3>
                <p className="text-sm text-gray-500">{selectedFacultyInfo.email}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedFacultyEmail(null);
                  setSelectedSubjectFormId(null);
                }}
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
              <div className="flex items-center gap-6 mb-6 pb-4 border-b border-gray-100">
                <div>
                  <p className="text-sm text-gray-500">Total Subjects</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedFacultyOverallStats.formCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Responses</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedFacultyOverallStats.responseCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Overall Avg Rating</p>
                  <p className={`text-2xl font-bold ${
                    selectedFacultyOverallStats.avgRating >= 7 ? 'text-green-600' :
                    selectedFacultyOverallStats.avgRating >= 5 ? 'text-yellow-600' : 
                    selectedFacultyOverallStats.avgRating > 0 ? 'text-red-600' : 'text-gray-400'
                  }`}>
                    {selectedFacultyOverallStats.avgRating > 0 ? selectedFacultyOverallStats.avgRating.toFixed(1) : '-'}/10
                  </p>
                </div>
              </div>

              {/* Subject-wise breakdown */}
              {!selectedSubjectFormId ? (
                <>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Subject-wise Breakdown</h4>
                  <div className="space-y-2">
                    {selectedFacultyForms.map(form => {
                      const stats = getFormStats(form.id);

                      return (
                        <div
                          key={form.id}
                          onClick={() => setSelectedSubjectFormId(form.id)}
                          className="p-3 rounded-lg border border-gray-200 bg-white hover:border-gray-300 cursor-pointer transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{form.subject_name}</p>
                              <p className="text-xs text-gray-500">
                                Sem {form.semester} · {form.course === 'AIDS' ? 'AI & DS' : 'IT'} · Div {form.division}{form.batch ? ` / ${form.batch}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-gray-500">{stats.responseCount} responses</p>
                                <p className={`font-semibold ${
                                  stats.avgRating >= 7 ? 'text-green-600' :
                                  stats.avgRating >= 5 ? 'text-yellow-600' : 
                                  stats.avgRating > 0 ? 'text-red-600' : 'text-gray-400'
                                }`}>
                                  {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}/10
                                </p>
                              </div>
                              <span className="text-gray-400 text-sm">→</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                // Full subject detail view
                (() => {
                  const form = selectedFacultyForms.find(f => f.id === selectedSubjectFormId);
                  if (!form) return null;
                  const stats = getFormStats(form.id);

                  return (
                    <div>
                      {/* Back button and subject header */}
                      <div className="flex items-center gap-3 mb-4">
                        <button
                          onClick={() => setSelectedSubjectFormId(null)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{form.subject_name}</h4>
                          <p className="text-xs text-gray-500">
                            Sem {form.semester} · {form.course === 'AIDS' ? 'AI & DS' : 'IT'} · Div {form.division}{form.batch ? ` / ${form.batch}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{stats.responseCount} responses</p>
                          <p className={`text-lg font-bold ${
                            stats.avgRating >= 7 ? 'text-green-600' :
                            stats.avgRating >= 5 ? 'text-yellow-600' : 
                            stats.avgRating > 0 ? 'text-red-600' : 'text-gray-400'
                          }`}>
                            {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}/10
                          </p>
                        </div>
                      </div>

                      {stats.responseCount === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">No responses yet for this subject.</p>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Question-wise averages */}
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-3">Question-wise Ratings</p>
                            <div className="space-y-3">
                              {stats.parameterAverages.map((param, idx) => (
                                <div key={param.id}>
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-gray-700">
                                      {idx + 1}. {param.text}
                                    </span>
                                    <span className={`font-semibold ${
                                      param.average >= 7 ? 'text-green-600' :
                                      param.average >= 5 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {param.average.toFixed(1)}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${
                                        param.average >= 7 ? 'bg-green-500' :
                                        param.average >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${(param.average / 10) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Comments */}
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-3">
                              Student Comments ({stats.comments.length})
                            </p>
                            {stats.comments.length === 0 ? (
                              <p className="text-sm text-gray-400 italic">No comments submitted.</p>
                            ) : (
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {stats.comments.map((comment, idx) => (
                                  <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                                    <p className="italic">&ldquo;{comment.text}&rdquo;</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(comment.date).toLocaleDateString()}
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
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
