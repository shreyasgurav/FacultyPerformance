'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@/components/Icons';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

interface FormData {
  id: string;
  subject_name: string;
  subject_code: string | null;
  faculty_name: string;
  division: string;
  batch: string | null;
  semester: number;
  course: string;
  academic_year: string;
  status: string;
}

interface StudentData {
  id: string;
  name: string;
  email: string;
  semester: number;
  course: string;
  division: string;
  batch: string | null;
  honours_course: string | null;
  honours_batch: string | null;
}

interface ResponseData {
  id: string;
  form_id: string;
  student_id: string;
  submitted_at: string | null;
}

interface StudentStatus {
  student: StudentData;
  filled: boolean;
  submittedAt: string | null;
}

const KNOWN_COURSES = ['IT', 'AIDS', 'CS', 'EXTC', 'MECH', 'CIVIL'];

function isHonoursCourse(course: string): boolean {
  return !KNOWN_COURSES.includes(course.toUpperCase());
}

function isStudentEligibleForForm(student: StudentData, form: FormData): boolean {
  const matchesSemester = student.semester === form.semester;

  // Regular course match
  const matchesCourse = student.course.toUpperCase() === form.course.toUpperCase();
  const matchesDivision = form.division ? student.division.toUpperCase() === form.division.toUpperCase() : true;

  let regularMatch = false;
  if (form.batch) {
    const matchesBatch = (student.batch || '').toUpperCase() === form.batch.toUpperCase();
    regularMatch = matchesSemester && matchesCourse && matchesDivision && matchesBatch;
  } else {
    regularMatch = matchesSemester && matchesCourse && matchesDivision;
  }

  // Honours course match
  let honoursMatch = false;
  if (student.honours_course) {
    const matchesHonoursCourse = student.honours_course.toUpperCase() === form.course.toUpperCase();
    if (form.batch) {
      const matchesHonoursBatch = (student.honours_batch || '').toUpperCase() === form.batch.toUpperCase();
      honoursMatch = matchesSemester && matchesHonoursCourse && matchesHonoursBatch;
    } else {
      honoursMatch = matchesSemester && matchesHonoursCourse;
    }
  }

  return regularMatch || honoursMatch;
}

function MonitorContent() {
  const { authFetch } = useAuth();
  const searchParams = useSearchParams();

  const semester = searchParams.get('semester') || '';
  const course = searchParams.get('course') || '';
  const batchParam = searchParams.get('batch') || '';

  const [forms, setForms] = useState<FormData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected form filter
  const [selectedFormId, setSelectedFormId] = useState<string>('all');
  // Search filter
  const [search, setSearch] = useState('');
  // Status filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'filled' | 'not_filled'>('all');
  // Copy state
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    if (!semester || !course) return;
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ semester, course });
      if (batchParam) params.set('batch', batchParam);

      const res = await authFetch(`/api/admin/feedback/monitor?${params}`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch data');
      }

      const data = await res.json();
      setForms(data.forms || []);
      setStudents(data.students || []);
      setResponses(data.responses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [semester, course, batchParam, authFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build response lookup: form_id -> Set of student_ids who submitted
  const responseMap = useMemo(() => {
    const map = new Map<string, Map<string, string | null>>();
    for (const r of responses) {
      if (!map.has(r.form_id)) {
        map.set(r.form_id, new Map());
      }
      map.get(r.form_id)!.set(r.student_id, r.submitted_at);
    }
    return map;
  }, [responses]);

  // Compute student statuses for the selected form(s)
  const studentStatuses: StudentStatus[] = useMemo(() => {
    if (forms.length === 0) return [];

    const targetForms = selectedFormId === 'all' ? forms : forms.filter(f => f.id === selectedFormId);

    if (selectedFormId === 'all') {
      // "All Forms" mode: show each student once, mark filled only if ALL eligible forms are filled
      const studentMap = new Map<string, { student: StudentData; eligibleFormIds: Set<string>; filledFormIds: Set<string>; latestSubmission: string | null }>();

      for (const form of targetForms) {
        const formResponses = responseMap.get(form.id) || new Map();

        for (const student of students) {
          if (!isStudentEligibleForForm(student, form)) continue;

          if (!studentMap.has(student.id)) {
            studentMap.set(student.id, {
              student,
              eligibleFormIds: new Set(),
              filledFormIds: new Set(),
              latestSubmission: null,
            });
          }

          const entry = studentMap.get(student.id)!;
          entry.eligibleFormIds.add(form.id);

          if (formResponses.has(student.id)) {
            entry.filledFormIds.add(form.id);
            const subAt = formResponses.get(student.id) || null;
            if (subAt && (!entry.latestSubmission || subAt > entry.latestSubmission)) {
              entry.latestSubmission = subAt;
            }
          }
        }
      }

      return Array.from(studentMap.values()).map(entry => ({
        student: entry.student,
        filled: entry.filledFormIds.size === entry.eligibleFormIds.size,
        submittedAt: entry.latestSubmission,
        filledCount: entry.filledFormIds.size,
        totalCount: entry.eligibleFormIds.size,
      })) as (StudentStatus & { filledCount?: number; totalCount?: number })[];
    } else {
      // Single form mode
      const form = targetForms[0];
      if (!form) return [];

      const formResponses = responseMap.get(form.id) || new Map();
      const eligible = students.filter(s => isStudentEligibleForForm(s, form));

      return eligible.map(student => ({
        student,
        filled: formResponses.has(student.id),
        submittedAt: formResponses.get(student.id) || null,
      }));
    }
  }, [forms, students, responseMap, selectedFormId]);

  // Apply search and status filters
  const filteredStatuses = useMemo(() => {
    let result = studentStatuses;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(s =>
        s.student.name.toLowerCase().includes(q) ||
        s.student.email.toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'filled') {
      result = result.filter(s => s.filled);
    } else if (statusFilter === 'not_filled') {
      result = result.filter(s => !s.filled);
    }

    return result;
  }, [studentStatuses, search, statusFilter]);

  // Stats
  const filledCount = useMemo(() => studentStatuses.filter(s => s.filled).length, [studentStatuses]);
  const notFilledCount = useMemo(() => studentStatuses.filter(s => !s.filled).length, [studentStatuses]);
  const totalCount = studentStatuses.length;

  // Emails of students who haven't filled
  const notFilledEmails = useMemo(
    () => studentStatuses.filter(s => !s.filled).map(s => s.student.email),
    [studentStatuses]
  );

  const copyNotFilledEmails = useCallback(() => {
    if (notFilledEmails.length === 0) return;
    navigator.clipboard.writeText(notFilledEmails.join(', ')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [notFilledEmails]);

  const openGmailCompose = useCallback(() => {
    if (notFilledEmails.length === 0) return;

    const to = encodeURIComponent(notFilledEmails.join(','));

    const courseLabel = course === 'AIDS' ? 'AI&DS' : course;
    const subjectText = `Reminder: Faculty Feedback - Sem ${semester} ${courseLabel}${batchParam ? ` ${batchParam}` : ''}`;
    const bodyText = `Hey,

You haven't filled the faculty feedback form yet. Please fill the faculty feedback form as soon as possible using the college feedback portal.

Thank you.`;

    const subject = encodeURIComponent(subjectText);
    const body = encodeURIComponent(bodyText);

    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [notFilledEmails, semester, course, batchParam]);

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!semester || !course) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <p className="text-gray-500 text-sm">Missing required parameters. Please go back and select a course.</p>
        <Link href="/admin/feedback" className="text-sm text-gray-900 underline mt-2 inline-block">
          Back to Feedback Monitoring
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <Link
          href={`/admin/feedback`}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-2 sm:mb-3"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Student Completion Monitor</h1>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                Sem {semester}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                isHonoursCourse(course) ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {course === 'AIDS' ? 'AI&DS' : course}
                {isHonoursCourse(course) && ' (Honours)'}
              </span>
              {batchParam && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {batchParam}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-sm text-red-500 mb-2">{error}</p>
          <button onClick={fetchData} className="text-sm text-gray-900 underline">
            Try Again
          </button>
        </div>
      ) : forms.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm text-gray-500">No forms found for the selected criteria.</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <button
              onClick={() => setStatusFilter('all')}
              className={`p-3 sm:p-4 rounded-xl border transition-all text-left ${
                statusFilter === 'all'
                  ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{totalCount}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Total Students</p>
            </button>
            <button
              onClick={() => setStatusFilter('filled')}
              className={`p-3 sm:p-4 rounded-xl border transition-all text-left ${
                statusFilter === 'filled'
                  ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <p className="text-lg sm:text-2xl font-bold text-emerald-600">{filledCount}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Filled</p>
            </button>
            <button
              onClick={() => setStatusFilter('not_filled')}
              className={`p-3 sm:p-4 rounded-xl border transition-all text-left ${
                statusFilter === 'not_filled'
                  ? 'border-red-500 bg-red-50 ring-1 ring-red-500'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <p className="text-lg sm:text-2xl font-bold text-red-500">{notFilledCount}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Not Filled</p>
            </button>
          </div>

          {/* Actions for not filled students */}
          {notFilledEmails.length > 0 && (
            <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:items-center">
              <button
                onClick={copyNotFilledEmails}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  copied
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied {notFilledEmails.length} email{notFilledEmails.length !== 1 ? 's' : ''}!
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy {notFilledEmails.length} Not Filled Email{notFilledEmails.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
              <button
                onClick={openGmailCompose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
              >
                <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm-.4 2L12 10.75 4.4 6h15.2zM4 18V8.25l7.4 4.63a1 1 0 001.2 0L20 8.25V18H4z" />
                </svg>
                Open Gmail compose ({notFilledEmails.length})
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
            {/* Form selector */}
            <select
              value={selectedFormId}
              onChange={e => setSelectedFormId(e.target.value)}
              className="flex-1 sm:flex-none sm:min-w-[240px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-colors outline-none"
            >
              <option value="all">All Forms ({forms.length})</option>
              {forms.map(f => (
                <option key={f.id} value={f.id}>
                  {f.subject_name} — {f.faculty_name}{f.batch ? ` (${f.batch})` : ' (Theory)'}
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-colors outline-none"
              />
            </div>
          </div>

          {/* Results count */}
          <p className="text-xs text-gray-400 mb-3">
            Showing {filteredStatuses.length} of {totalCount} student{totalCount !== 1 ? 's' : ''}
            {statusFilter !== 'all' && ` · ${statusFilter === 'filled' ? 'Filled only' : 'Not filled only'}`}
          </p>

          {filteredStatuses.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-gray-500">No students match the current filters.</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="sm:hidden space-y-2">
                {filteredStatuses.map((entry) => {
                  const ext = entry as StudentStatus & { filledCount?: number; totalCount?: number };
                  return (
                    <div
                      key={entry.student.id}
                      className={`p-3 rounded-xl border ${
                        entry.filled
                          ? 'border-emerald-100 bg-emerald-50/30'
                          : 'border-red-100 bg-red-50/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{entry.student.name}</p>
                          <p className="text-xs text-gray-500 truncate">{entry.student.email}</p>
                        </div>
                        <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.filled
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {entry.filled ? (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              Filled
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Not Filled
                            </>
                          )}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap text-[10px] text-gray-500">
                        <span>{entry.student.course}{entry.student.division ? ` · Div ${entry.student.division}` : ''}</span>
                        {entry.student.batch && <span>· {entry.student.batch}</span>}
                        {entry.student.honours_course && (
                          <span className="text-purple-600">· {entry.student.honours_course} (Honours)</span>
                        )}
                        {selectedFormId === 'all' && ext.totalCount !== undefined && (
                          <span className="ml-auto text-gray-400">{ext.filledCount}/{ext.totalCount} forms</span>
                        )}
                        {entry.submittedAt && selectedFormId !== 'all' && (
                          <span className="ml-auto">{formatDate(entry.submittedAt)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block">
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course / Division</th>
                          {selectedFormId === 'all' && (
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Forms Progress</th>
                          )}
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredStatuses.map((entry) => {
                          const ext = entry as StudentStatus & { filledCount?: number; totalCount?: number };
                          return (
                            <tr key={entry.student.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-3 px-4">
                                <p className="text-sm font-medium text-gray-900">{entry.student.name}</p>
                                <p className="text-xs text-gray-400">{entry.student.email}</p>
                              </td>
                              <td className="py-3 px-4">
                                <p className="text-sm text-gray-600">
                                  {entry.student.course === 'AIDS' ? 'AI&DS' : entry.student.course}
                                  {entry.student.division && ` · Div ${entry.student.division}`}
                                  {entry.student.batch && ` / ${entry.student.batch}`}
                                </p>
                                {entry.student.honours_course && (
                                  <p className="text-xs text-purple-600 mt-0.5">
                                    {entry.student.honours_course} (Honours)
                                    {entry.student.honours_batch && ` / ${entry.student.honours_batch}`}
                                  </p>
                                )}
                              </td>
                              {selectedFormId === 'all' && (
                                <td className="py-3 px-4">
                                  {ext.totalCount !== undefined ? (
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 max-w-[100px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${
                                            ext.filledCount === ext.totalCount ? 'bg-emerald-500' : 'bg-amber-400'
                                          }`}
                                          style={{ width: `${ext.totalCount > 0 ? (ext.filledCount! / ext.totalCount) * 100 : 0}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-gray-500 tabular-nums">{ext.filledCount}/{ext.totalCount}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </td>
                              )}
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                  entry.filled
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-red-100 text-red-600'
                                }`}>
                                  {entry.filled ? (
                                    <>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Filled
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      Not Filled
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-xs text-gray-500">
                                {entry.submittedAt ? formatDate(entry.submittedAt) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function MonitorPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <MonitorContent />
    </ProtectedRoute>
  );
}
