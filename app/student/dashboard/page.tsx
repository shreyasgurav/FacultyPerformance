'use client';

import { useState } from 'react';
import Link from 'next/link';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  students,
  getStudentById,
  getDepartmentById,
  getSubjectById,
  getFacultyById,
  getFeedbackFormById,
  getPendingFeedbackForStudent,
  getSubmittedFeedbackForStudent,
} from '@/lib/mockData';

const DEFAULT_STUDENT_ID = 'stu1';

export default function StudentDashboardPage() {
  const [currentStudentId, setCurrentStudentId] = useState(DEFAULT_STUDENT_ID);
  
  const student = getStudentById(currentStudentId);
  const department = student ? getDepartmentById(student.departmentId) : null;
  const pendingForms = student ? getPendingFeedbackForStudent(student) : [];
  const completedResponses = getSubmittedFeedbackForStudent(currentStudentId);

  if (!student || !department) {
    return <div className="p-6">Student not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <label className="text-sm text-gray-600">Demo as:</label>
        <select
          value={currentStudentId}
          onChange={(e) => setCurrentStudentId(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({getDepartmentById(s.departmentId)?.code})</option>
          ))}
        </select>
      </div>

      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium text-gray-900">{student.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Department</p>
              <p className="font-medium text-gray-900">{department.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Division</p>
              <p className="font-medium text-gray-900">{student.division}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Batch</p>
              <p className="font-medium text-gray-900">{student.batch}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900 text-sm">{student.email}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Subject</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Faculty</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Division/Batch</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingForms.map((form) => {
                  const subject = getSubjectById(form.subjectId);
                  const faculty = getFacultyById(form.facultyId);
                  return (
                    <tr key={form.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{subject?.name}</p>
                        <p className="text-sm text-gray-500">{subject?.code}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          subject?.type === 'theory' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {subject?.type === 'theory' ? 'Theory' : 'Practical'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{faculty?.name}</td>
                      <td className="py-3 px-4 text-gray-700">{form.division}{form.batch ? ` / ${form.batch}` : ''}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/student/feedback/${form.id}`}>
                          <Button size="sm">Fill Feedback</Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {completedResponses.map((response) => {
                  const form = getFeedbackFormById(response.formId);
                  const subject = form ? getSubjectById(form.subjectId) : null;
                  const faculty = form ? getFacultyById(form.facultyId) : null;
                  return (
                    <tr key={response.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{subject?.name}</p>
                        <p className="text-sm text-gray-500">{subject?.code}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          subject?.type === 'theory' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {subject?.type === 'theory' ? 'Theory' : 'Practical'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{faculty?.name}</td>
                      <td className="py-3 px-4 text-gray-700">{form?.division}{form?.batch ? ` / ${form.batch}` : ''}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Submitted</span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">—</td>
                    </tr>
                  );
                })}
                {pendingForms.length === 0 && completedResponses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">No feedback items.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
