// Types
export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Faculty {
  id: string;
  name: string;
  email: string;
  departmentId: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  year: string; // '1' | '2' | '3' | '4'
  division: string;
  batch: string; // For practicals
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  type: 'theory' | 'practical';
}

export interface TimetableEntry {
  id: string;
  subjectId: string;
  facultyId: string;
  division: string;
  batch?: string; // Only for practicals
  timeSlot: string;
}

export interface FeedbackParameter {
  id: string;
  text: string;
}

export interface FeedbackForm {
  id: string;
  subjectId: string;
  facultyId: string;
  division: string;
  batch?: string;
  status: 'active' | 'closed';
  createdAt: string;
}

export interface FeedbackAnswer {
  parameterId: string;
  rating: number; // 0-10
}

export interface FeedbackResponse {
  id: string;
  formId: string;
  studentId: string;
  answers: FeedbackAnswer[];
  comment: string;
  submittedAt: string;
}

// Feedback Parameters - Theory (Questions 1-6: 3-option scale, Question 7: 1-10 scale)
export const feedbackParameters: FeedbackParameter[] = [
  { id: 'theory_1', text: 'Interaction with students regarding the subject taught and query-handling during lectures' },
  { id: 'theory_2', text: 'Number of numerical problems solved/case studies and practical applications discussed' },
  { id: 'theory_3', text: 'Audibility and overall command on verbal communication' },
  { id: 'theory_4', text: 'Command on the subject taught' },
  { id: 'theory_5', text: 'Use of audio/visuals aids (e.g. OHP slides, LCD projector, PA system, charts, models etc.)' },
  { id: 'theory_6', text: 'Whether the test-syllabus was covered satisfactorily before the term tests?' },
  { id: 'theory_7', text: 'Evaluation of the faculty in the scale of 1-10' },
];

// Mock Data
export const departments: Department[] = [
  { id: 'dept1', name: 'Information Technology', code: 'IT' },
  { id: 'dept2', name: 'Computer Science', code: 'CS' },
  { id: 'dept3', name: 'AI & Data Science', code: 'AIDS' },
  { id: 'dept4', name: 'Robotics & AI', code: 'RAI' },
  { id: 'dept5', name: 'Electronics & Communication', code: 'EC' },
];

export const faculty: Faculty[] = [
  { id: 'fac1', name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar@college.edu', departmentId: 'dept1' },
  { id: 'fac2', name: 'Prof. Anita Sharma', email: 'anita.sharma@college.edu', departmentId: 'dept1' },
  { id: 'fac3', name: 'Dr. Suresh Patel', email: 'suresh.patel@college.edu', departmentId: 'dept2' },
  { id: 'fac4', name: 'Prof. Meera Reddy', email: 'meera.reddy@college.edu', departmentId: 'dept2' },
  { id: 'fac5', name: 'Dr. Vikram Singh', email: 'vikram.singh@college.edu', departmentId: 'dept3' },
  { id: 'fac6', name: 'Prof. Priya Nair', email: 'priya.nair@college.edu', departmentId: 'dept3' },
  { id: 'fac7', name: 'Dr. Amit Desai', email: 'amit.desai@college.edu', departmentId: 'dept4' },
  { id: 'fac8', name: 'Prof. Kavita Joshi', email: 'kavita.joshi@college.edu', departmentId: 'dept4' },
  { id: 'fac9', name: 'Dr. Ramesh Gupta', email: 'ramesh.gupta@college.edu', departmentId: 'dept5' },
];

export const students: Student[] = [
  { id: 'stu1', name: 'Amit Verma', email: 'amit.verma@student.edu', departmentId: 'dept1', year: '2', division: 'A', batch: 'A1' },
  { id: 'stu2', name: 'Priya Gupta', email: 'priya.gupta@student.edu', departmentId: 'dept1', year: '2', division: 'A', batch: 'A1' },
  { id: 'stu3', name: 'Rahul Sharma', email: 'rahul.sharma@student.edu', departmentId: 'dept1', year: '2', division: 'A', batch: 'A2' },
  { id: 'stu4', name: 'Sneha Patel', email: 'sneha.patel@student.edu', departmentId: 'dept1', year: '2', division: 'B', batch: 'B1' },
  { id: 'stu5', name: 'Vikash Kumar', email: 'vikash.kumar@student.edu', departmentId: 'dept1', year: '3', division: 'A', batch: 'A1' },
  { id: 'stu6', name: 'Anjali Singh', email: 'anjali.singh@student.edu', departmentId: 'dept1', year: '3', division: 'A', batch: 'A2' },
  { id: 'stu7', name: 'Rohan Mehta', email: 'rohan.mehta@student.edu', departmentId: 'dept1', year: '3', division: 'A', batch: 'A1' },
  { id: 'stu8', name: 'Kavita Joshi', email: 'kavita.joshi@student.edu', departmentId: 'dept1', year: '3', division: 'A', batch: 'A1' },
  { id: 'stu9', name: 'Nikhil Rao', email: 'nikhil.rao@student.edu', departmentId: 'dept1', year: '4', division: 'A', batch: 'A1' },
  { id: 'stu10', name: 'Pooja Deshmukh', email: 'pooja.deshmukh@student.edu', departmentId: 'dept1', year: '4', division: 'A', batch: 'A2' },
];

export const subjects: Subject[] = [
  // IT Department
  { id: 'sub1', name: 'Data Structures', code: 'IT301', departmentId: 'dept1', type: 'theory' },
  { id: 'sub2', name: 'Database Management', code: 'IT302', departmentId: 'dept1', type: 'theory' },
  { id: 'sub3', name: 'DS Lab', code: 'IT301L', departmentId: 'dept1', type: 'practical' },
  { id: 'sub4', name: 'DBMS Lab', code: 'IT302L', departmentId: 'dept1', type: 'practical' },
  // CS Department
  { id: 'sub5', name: 'Operating Systems', code: 'CS301', departmentId: 'dept2', type: 'theory' },
  { id: 'sub6', name: 'Computer Networks', code: 'CS302', departmentId: 'dept2', type: 'theory' },
  { id: 'sub7', name: 'OS Lab', code: 'CS301L', departmentId: 'dept2', type: 'practical' },
  // AI & DS Department
  { id: 'sub8', name: 'Machine Learning', code: 'AIDS301', departmentId: 'dept3', type: 'theory' },
  { id: 'sub9', name: 'Deep Learning', code: 'AIDS302', departmentId: 'dept3', type: 'theory' },
  { id: 'sub10', name: 'ML Lab', code: 'AIDS301L', departmentId: 'dept3', type: 'practical' },
  // RAI Department
  { id: 'sub11', name: 'Robotics Fundamentals', code: 'RAI301', departmentId: 'dept4', type: 'theory' },
  { id: 'sub12', name: 'Computer Vision', code: 'RAI302', departmentId: 'dept4', type: 'theory' },
  { id: 'sub13', name: 'Robotics Lab', code: 'RAI301L', departmentId: 'dept4', type: 'practical' },
  // EC Department
  { id: 'sub14', name: 'Digital Electronics', code: 'EC301', departmentId: 'dept5', type: 'theory' },
  { id: 'sub15', name: 'DE Lab', code: 'EC301L', departmentId: 'dept5', type: 'practical' },
];

export const timetableEntries: TimetableEntry[] = [
  // IT Division A - Theory
  { id: 'tt1', subjectId: 'sub1', facultyId: 'fac1', division: 'A', timeSlot: 'Mon 9:00-10:00' },
  { id: 'tt2', subjectId: 'sub2', facultyId: 'fac2', division: 'A', timeSlot: 'Tue 10:00-11:00' },
  // IT Division A - Practicals (batch-wise)
  { id: 'tt3', subjectId: 'sub3', facultyId: 'fac1', division: 'A', batch: 'A1', timeSlot: 'Wed 2:00-4:00' },
  { id: 'tt4', subjectId: 'sub3', facultyId: 'fac1', division: 'A', batch: 'A2', timeSlot: 'Thu 2:00-4:00' },
  { id: 'tt5', subjectId: 'sub4', facultyId: 'fac2', division: 'A', batch: 'A1', timeSlot: 'Fri 2:00-4:00' },
  { id: 'tt6', subjectId: 'sub4', facultyId: 'fac2', division: 'A', batch: 'A2', timeSlot: 'Fri 4:00-6:00' },
  // IT Division B
  { id: 'tt7', subjectId: 'sub1', facultyId: 'fac1', division: 'B', timeSlot: 'Mon 11:00-12:00' },
  { id: 'tt8', subjectId: 'sub2', facultyId: 'fac2', division: 'B', timeSlot: 'Tue 11:00-12:00' },
  { id: 'tt9', subjectId: 'sub3', facultyId: 'fac1', division: 'B', batch: 'B1', timeSlot: 'Wed 4:00-6:00' },
  // CS Division A
  { id: 'tt10', subjectId: 'sub5', facultyId: 'fac3', division: 'A', timeSlot: 'Mon 9:00-10:00' },
  { id: 'tt11', subjectId: 'sub6', facultyId: 'fac4', division: 'A', timeSlot: 'Tue 9:00-10:00' },
  { id: 'tt12', subjectId: 'sub7', facultyId: 'fac3', division: 'A', batch: 'A1', timeSlot: 'Wed 2:00-4:00' },
  { id: 'tt13', subjectId: 'sub7', facultyId: 'fac3', division: 'A', batch: 'A2', timeSlot: 'Thu 2:00-4:00' },
  // AI & DS Division A
  { id: 'tt14', subjectId: 'sub8', facultyId: 'fac5', division: 'A', timeSlot: 'Mon 10:00-11:00' },
  { id: 'tt15', subjectId: 'sub9', facultyId: 'fac6', division: 'A', timeSlot: 'Tue 10:00-11:00' },
  { id: 'tt16', subjectId: 'sub10', facultyId: 'fac5', division: 'A', batch: 'A1', timeSlot: 'Wed 2:00-4:00' },
  // RAI Division A
  { id: 'tt17', subjectId: 'sub11', facultyId: 'fac7', division: 'A', timeSlot: 'Mon 11:00-12:00' },
  { id: 'tt18', subjectId: 'sub12', facultyId: 'fac8', division: 'A', timeSlot: 'Tue 11:00-12:00' },
  { id: 'tt19', subjectId: 'sub13', facultyId: 'fac7', division: 'A', batch: 'A1', timeSlot: 'Thu 2:00-4:00' },
  { id: 'tt20', subjectId: 'sub13', facultyId: 'fac7', division: 'A', batch: 'A2', timeSlot: 'Fri 2:00-4:00' },
];

export let feedbackForms: FeedbackForm[] = [
  // IT Department forms
  { id: 'form1', subjectId: 'sub1', facultyId: 'fac1', division: 'A', status: 'active', createdAt: '2025-09-15' },
  { id: 'form2', subjectId: 'sub2', facultyId: 'fac2', division: 'A', status: 'active', createdAt: '2025-09-15' },
  { id: 'form3', subjectId: 'sub3', facultyId: 'fac1', division: 'A', batch: 'A1', status: 'active', createdAt: '2025-09-15' },
  { id: 'form4', subjectId: 'sub3', facultyId: 'fac1', division: 'A', batch: 'A2', status: 'active', createdAt: '2025-09-15' },
  { id: 'form5', subjectId: 'sub4', facultyId: 'fac2', division: 'A', batch: 'A1', status: 'active', createdAt: '2025-09-15' },
  { id: 'form6', subjectId: 'sub4', facultyId: 'fac2', division: 'A', batch: 'A2', status: 'active', createdAt: '2025-09-15' },
  { id: 'form7', subjectId: 'sub1', facultyId: 'fac1', division: 'B', status: 'active', createdAt: '2025-09-15' },
  { id: 'form8', subjectId: 'sub2', facultyId: 'fac2', division: 'B', status: 'active', createdAt: '2025-09-15' },
  { id: 'form9', subjectId: 'sub3', facultyId: 'fac1', division: 'B', batch: 'B1', status: 'active', createdAt: '2025-09-15' },
  // CS Department forms
  { id: 'form10', subjectId: 'sub5', facultyId: 'fac3', division: 'A', status: 'active', createdAt: '2025-09-16' },
  { id: 'form11', subjectId: 'sub6', facultyId: 'fac4', division: 'A', status: 'active', createdAt: '2025-09-16' },
  { id: 'form12', subjectId: 'sub7', facultyId: 'fac3', division: 'A', batch: 'A1', status: 'active', createdAt: '2025-09-16' },
  { id: 'form13', subjectId: 'sub7', facultyId: 'fac3', division: 'A', batch: 'A2', status: 'active', createdAt: '2025-09-16' },
  // AI & DS Department forms
  { id: 'form14', subjectId: 'sub8', facultyId: 'fac5', division: 'A', status: 'active', createdAt: '2025-09-17' },
  { id: 'form15', subjectId: 'sub9', facultyId: 'fac6', division: 'A', status: 'active', createdAt: '2025-09-17' },
  { id: 'form16', subjectId: 'sub10', facultyId: 'fac5', division: 'A', batch: 'A1', status: 'active', createdAt: '2025-09-17' },
  // RAI Department forms
  { id: 'form17', subjectId: 'sub11', facultyId: 'fac7', division: 'A', status: 'active', createdAt: '2025-09-18' },
  { id: 'form18', subjectId: 'sub12', facultyId: 'fac8', division: 'A', status: 'active', createdAt: '2025-09-18' },
  { id: 'form19', subjectId: 'sub13', facultyId: 'fac7', division: 'A', batch: 'A1', status: 'active', createdAt: '2025-09-18' },
  { id: 'form20', subjectId: 'sub13', facultyId: 'fac7', division: 'A', batch: 'A2', status: 'active', createdAt: '2025-09-18' },
];

export let feedbackResponses: FeedbackResponse[] = [
  // Sample responses for IT Data Structures (form1)
  {
    id: 'resp1',
    formId: 'form1',
    studentId: 'stu1',
    answers: [
      { parameterId: 'p1', rating: 9 },
      { parameterId: 'p2', rating: 8 },
      { parameterId: 'p3', rating: 9 },
      { parameterId: 'p4', rating: 7 },
      { parameterId: 'p5', rating: 8 },
      { parameterId: 'p6', rating: 8 },
      { parameterId: 'p7', rating: 7 },
      { parameterId: 'p8', rating: 8 },
    ],
    comment: 'Excellent teaching methodology. Very clear explanations with good examples.',
    submittedAt: '2025-09-20',
  },
  {
    id: 'resp2',
    formId: 'form1',
    studentId: 'stu2',
    answers: [
      { parameterId: 'p1', rating: 8 },
      { parameterId: 'p2', rating: 9 },
      { parameterId: 'p3', rating: 8 },
      { parameterId: 'p4', rating: 8 },
      { parameterId: 'p5', rating: 9 },
      { parameterId: 'p6', rating: 7 },
      { parameterId: 'p7', rating: 8 },
      { parameterId: 'p8', rating: 7 },
    ],
    comment: 'Good course content. Would appreciate more practical coding sessions.',
    submittedAt: '2025-09-21',
  },
  // Sample responses for AI & DS ML (form14)
  {
    id: 'resp3',
    formId: 'form14',
    studentId: 'stu7',
    answers: [
      { parameterId: 'p1', rating: 10 },
      { parameterId: 'p2', rating: 9 },
      { parameterId: 'p3', rating: 9 },
      { parameterId: 'p4', rating: 10 },
      { parameterId: 'p5', rating: 8 },
      { parameterId: 'p6', rating: 9 },
      { parameterId: 'p7', rating: 9 },
      { parameterId: 'p8', rating: 8 },
    ],
    comment: 'Best ML course! The practical examples were very helpful.',
    submittedAt: '2025-09-22',
  },
  {
    id: 'resp4',
    formId: 'form14',
    studentId: 'stu8',
    answers: [
      { parameterId: 'p1', rating: 9 },
      { parameterId: 'p2', rating: 10 },
      { parameterId: 'p3', rating: 8 },
      { parameterId: 'p4', rating: 9 },
      { parameterId: 'p5', rating: 9 },
      { parameterId: 'p6', rating: 8 },
      { parameterId: 'p7', rating: 8 },
      { parameterId: 'p8', rating: 9 },
    ],
    comment: 'Very engaging lectures. Loved the real-world project examples.',
    submittedAt: '2025-09-22',
  },
  // Sample responses for RAI Robotics (form17)
  {
    id: 'resp5',
    formId: 'form17',
    studentId: 'stu9',
    answers: [
      { parameterId: 'p1', rating: 8 },
      { parameterId: 'p2', rating: 8 },
      { parameterId: 'p3', rating: 7 },
      { parameterId: 'p4', rating: 9 },
      { parameterId: 'p5', rating: 8 },
      { parameterId: 'p6', rating: 7 },
      { parameterId: 'p7', rating: 6 },
      { parameterId: 'p8', rating: 7 },
    ],
    comment: 'Good introduction to robotics. More hands-on sessions would be helpful.',
    submittedAt: '2025-09-23',
  },
];

// Helper functions
export function getDepartmentById(id: string): Department | undefined {
  return departments.find(d => d.id === id);
}

export function getFacultyById(id: string): Faculty | undefined {
  return faculty.find(f => f.id === id);
}

export function getStudentById(id: string): Student | undefined {
  return students.find(s => s.id === id);
}

export function getSubjectById(id: string): Subject | undefined {
  return subjects.find(s => s.id === id);
}

export function getFeedbackFormById(id: string): FeedbackForm | undefined {
  return feedbackForms.find(f => f.id === id);
}

export function getSubjectsByFacultyId(facultyId: string): Subject[] {
  const subjectIds = new Set(
    timetableEntries.filter(t => t.facultyId === facultyId).map(t => t.subjectId)
  );
  return subjects.filter(s => subjectIds.has(s.id));
}

export function getFeedbackFormsBySubjectId(subjectId: string): FeedbackForm[] {
  return feedbackForms.filter(f => f.subjectId === subjectId);
}

export function getFeedbackResponsesByFormId(formId: string): FeedbackResponse[] {
  return feedbackResponses.filter(r => r.formId === formId);
}

export function getFacultyByDepartmentId(departmentId: string): Faculty[] {
  return faculty.filter(f => f.departmentId === departmentId);
}

export function getStudentsByDepartmentId(departmentId: string): Student[] {
  return students.filter(s => s.departmentId === departmentId);
}

export function getSubjectsByDepartmentId(departmentId: string): Subject[] {
  return subjects.filter(s => s.departmentId === departmentId);
}

// Get feedback forms for a student based on their division and batch
export function getPendingFeedbackForStudent(student: Student): FeedbackForm[] {
  const submittedFormIds = new Set(
    feedbackResponses.filter(r => r.studentId === student.id).map(r => r.formId)
  );

  const deptSubjectIds = new Set(
    subjects.filter(s => s.departmentId === student.departmentId).map(s => s.id)
  );

  return feedbackForms.filter(form => {
    if (!deptSubjectIds.has(form.subjectId)) return false;
    if (submittedFormIds.has(form.id)) return false;
    if (form.status !== 'active') return false;

    const subject = getSubjectById(form.subjectId);
    if (!subject) return false;

    // For theory: match division
    if (subject.type === 'theory') {
      return form.division === student.division;
    }
    // For practical: match division and batch
    return form.division === student.division && form.batch === student.batch;
  });
}

export function getSubmittedFeedbackForStudent(studentId: string): FeedbackResponse[] {
  return feedbackResponses.filter(r => r.studentId === studentId);
}

// Get forms for a faculty member
export function getFeedbackFormsForFaculty(facultyId: string): FeedbackForm[] {
  return feedbackForms.filter(f => f.facultyId === facultyId);
}

// Calculate average score for a form
export function calculateFormAverageScore(formId: string): number {
  const responses = getFeedbackResponsesByFormId(formId);
  if (responses.length === 0) return 0;

  let totalScore = 0;
  let totalRatings = 0;

  responses.forEach(response => {
    response.answers.forEach(answer => {
      totalScore += answer.rating;
      totalRatings++;
    });
  });

  return totalRatings > 0 ? Math.round((totalScore / totalRatings) * 10) / 10 : 0;
}

// Calculate parameter-wise averages for a subject
export function calculateParameterAverages(formIds: string[]): { parameterId: string; average: number }[] {
  const parameterTotals: Record<string, { sum: number; count: number }> = {};

  feedbackParameters.forEach(p => {
    parameterTotals[p.id] = { sum: 0, count: 0 };
  });

  formIds.forEach(formId => {
    const responses = getFeedbackResponsesByFormId(formId);
    responses.forEach(response => {
      response.answers.forEach(answer => {
        if (parameterTotals[answer.parameterId]) {
          parameterTotals[answer.parameterId].sum += answer.rating;
          parameterTotals[answer.parameterId].count++;
        }
      });
    });
  });

  return feedbackParameters.map(p => ({
    parameterId: p.id,
    average: parameterTotals[p.id].count > 0
      ? Math.round((parameterTotals[p.id].sum / parameterTotals[p.id].count) * 10) / 10
      : 0,
  }));
}

// Get all comments for a subject
export function getCommentsForSubject(subjectId: string): { comment: string; division: string; batch?: string }[] {
  const forms = getFeedbackFormsBySubjectId(subjectId);
  const comments: { comment: string; division: string; batch?: string }[] = [];

  forms.forEach(form => {
    const responses = getFeedbackResponsesByFormId(form.id);
    responses.forEach(response => {
      if (response.comment.trim()) {
        comments.push({
          comment: response.comment,
          division: form.division,
          batch: form.batch,
        });
      }
    });
  });

  return comments;
}

// Add a new feedback response
export function addFeedbackResponse(response: FeedbackResponse): void {
  feedbackResponses = [...feedbackResponses, response];
}

// Toggle feedback form status
export function toggleFormStatus(formId: string): void {
  feedbackForms = feedbackForms.map(f =>
    f.id === formId ? { ...f, status: f.status === 'active' ? 'closed' : 'active' } : f
  );
}

// Add a new feedback form
export function addFeedbackForm(form: FeedbackForm): void {
  feedbackForms = [...feedbackForms, form];
}

// Generate feedback forms from timetable
export function generateFormsFromTimetable(): FeedbackForm[] {
  const newForms: FeedbackForm[] = [];
  let formIdCounter = feedbackForms.length + 1;

  timetableEntries.forEach(entry => {
    const existingForm = feedbackForms.find(
      f => f.subjectId === entry.subjectId &&
           f.facultyId === entry.facultyId &&
           f.division === entry.division &&
           f.batch === entry.batch
    );

    if (!existingForm) {
      newForms.push({
        id: `form${formIdCounter++}`,
        subjectId: entry.subjectId,
        facultyId: entry.facultyId,
        division: entry.division,
        batch: entry.batch,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
      });
    }
  });

  feedbackForms = [...feedbackForms, ...newForms];
  return newForms;
}
