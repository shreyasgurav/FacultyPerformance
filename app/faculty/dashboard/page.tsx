'use client';

import { useState } from 'react';
import Link from 'next/link';
import Card from '@/components/Card';
import Button from '@/components/Button';
import {
  faculty,
  getFacultyById,
  getDepartmentById,
  getSubjectsByFacultyId,
  getFeedbackFormsForFaculty,
  getFeedbackResponsesByFormId,
} from '@/lib/mockData';

const DEFAULT_FACULTY_ID = 'fac1';

export default function FacultyDashboardPage() {
  const [currentFacultyId, setCurrentFacultyId] = useState(DEFAULT_FACULTY_ID);
  
  const currentFaculty = getFacultyById(currentFacultyId);
  const department = currentFaculty ? getDepartmentById(currentFaculty.departmentId) : null;
  const subjects = getSubjectsByFacultyId(currentFacultyId);
  const forms = getFeedbackFormsForFaculty(currentFacultyId);

  if (!currentFaculty || !department) {
    return <div className="p-6">Faculty not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
          <label className="text-sm text-gray-600">Demo as:</label>
          <select
            value={currentFacultyId}
            onChange={(e) => setCurrentFacultyId(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
          >
            {faculty.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium text-gray-900">{currentFaculty.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{currentFaculty.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Department</p>
              <p className="font-medium text-gray-900">{department.name}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Subjects This Semester</h2>
          {subjects.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No subjects assigned this semester.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Subject</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Divisions/Batches</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Forms</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Responses</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(subject => {
                    const subjectForms = forms.filter(f => f.subjectId === subject.id);
                    const divisions = Array.from(new Set(subjectForms.map(f => f.division)));
                    const responses = subjectForms.reduce(
                      (sum, form) => sum + getFeedbackResponsesByFormId(form.id).length, 0
                    );
                    return (
                      <tr key={subject.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{subject.name}</p>
                          <p className="text-sm text-gray-500">{subject.code}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subject.type === 'theory' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {subject.type === 'theory' ? 'Theory' : 'Practical'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{divisions.join(', ') || '-'}</td>
                        <td className="py-3 px-4 text-gray-700">{subjectForms.length}</td>
                        <td className="py-3 px-4 text-gray-700">{responses}</td>
                        <td className="py-3 px-4">
                          <Link href={`/faculty/subjects/${subject.id}`}>
                            <Button size="sm" variant="outline">View Feedback</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
