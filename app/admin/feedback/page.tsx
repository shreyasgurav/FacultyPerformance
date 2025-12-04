'use client';

import { useState } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Toast from '@/components/Toast';
import { ArrowLeftIcon, FilterIcon } from '@/components/Icons';
import {
  feedbackForms,
  departments,
  subjects,
  getSubjectById,
  getFacultyById,
  getDepartmentById,
  getFeedbackResponsesByFormId,
  toggleFormStatus,
} from '@/lib/mockData';

export default function FeedbackMonitoringPage() {
  const [localForms, setLocalForms] = useState(feedbackForms);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Get unique divisions
  const divisions = Array.from(new Set(localForms.map(f => f.division)));

  // Filter forms
  const filteredForms = localForms.filter(form => {
    const subject = getSubjectById(form.subjectId);
    if (departmentFilter && subject?.departmentId !== departmentFilter) return false;
    if (divisionFilter && form.division !== divisionFilter) return false;
    if (statusFilter && form.status !== statusFilter) return false;
    return true;
  });

  const handleToggleStatus = (formId: string) => {
    toggleFormStatus(formId);
    setLocalForms([...feedbackForms]);
    const form = feedbackForms.find(f => f.id === formId);
    setToastMessage(`Feedback form ${form?.status === 'active' ? 'opened' : 'closed'} successfully!`);
    setShowToast(true);
  };

  const handleOpenAll = () => {
    filteredForms.forEach(form => {
      if (form.status === 'closed') {
        toggleFormStatus(form.id);
      }
    });
    setLocalForms([...feedbackForms]);
    setToastMessage('All filtered forms opened!');
    setShowToast(true);
  };

  const handleCloseAll = () => {
    filteredForms.forEach(form => {
      if (form.status === 'active') {
        toggleFormStatus(form.id);
      }
    });
    setLocalForms([...feedbackForms]);
    setToastMessage('All filtered forms closed!');
    setShowToast(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {showToast && (
        <Toast message={toastMessage} type="success" onClose={() => setShowToast(false)} />
      )}

      <div className="mb-6">
        <Button href="/admin/dashboard" variant="outline" size="sm" className="mb-4">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Feedback Monitoring</h1>
        <p className="text-gray-600 mt-1">Monitor and manage feedback collection status</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FilterIcon className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
              <select
                value={divisionFilter}
                onChange={e => setDivisionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Divisions</option>
                {divisions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm" onClick={handleOpenAll}>Open All</Button>
              <Button variant="outline" size="sm" onClick={handleCloseAll}>Close All</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Forms Table */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Feedback Forms ({filteredForms.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Subject</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Faculty</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Division/Batch</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Responses</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Completion</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredForms.map(form => {
                  const subject = getSubjectById(form.subjectId);
                  const fac = getFacultyById(form.facultyId);
                  const responses = getFeedbackResponsesByFormId(form.id).length;
                  const expectedResponses = 5; // Mock expected
                  const completion = Math.min(100, Math.round((responses / expectedResponses) * 100));
                  
                  return (
                    <tr key={form.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{subject?.name}</p>
                        <p className="text-xs text-gray-500">{subject?.code}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{fac?.name}</td>
                      <td className="py-3 px-4 text-gray-700">
                        {form.division}{form.batch ? ` / ${form.batch}` : ''}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{responses}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                completion >= 80 ? 'bg-green-500' :
                                completion >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${completion}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{completion}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          form.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {form.status === 'active' ? 'Active' : 'Closed'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant={form.status === 'active' ? 'outline' : 'primary'}
                          onClick={() => handleToggleStatus(form.id)}
                        >
                          {form.status === 'active' ? 'Close' : 'Open'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
