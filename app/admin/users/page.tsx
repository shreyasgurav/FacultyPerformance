'use client';

import { useState } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { ArrowLeftIcon, PlusIcon } from '@/components/Icons';
import {
  students,
  faculty,
  departments,
  getDepartmentById,
  Student,
  Faculty,
} from '@/lib/mockData';

type TabType = 'students' | 'faculty';

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [localStudents, setLocalStudents] = useState(students);
  const [localFaculty, setLocalFaculty] = useState(faculty);

  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    departmentId: '',
    division: 'A',
    batch: 'A1',
  });

  const [newFaculty, setNewFaculty] = useState({
    name: '',
    email: '',
    departmentId: '',
  });

  const handleAddStudent = () => {
    if (!newStudent.name || !newStudent.email || !newStudent.departmentId) return;
    
    const student: Student = {
      id: `stu${localStudents.length + 1}`,
      ...newStudent,
    };
    setLocalStudents([...localStudents, student]);
    setShowStudentModal(false);
    setNewStudent({ name: '', email: '', departmentId: '', division: 'A', batch: 'A1' });
    setToastMessage('Student added successfully!');
    setShowToast(true);
  };

  const handleAddFaculty = () => {
    if (!newFaculty.name || !newFaculty.email || !newFaculty.departmentId) return;
    
    const fac: Faculty = {
      id: `fac${localFaculty.length + 1}`,
      ...newFaculty,
    };
    setLocalFaculty([...localFaculty, fac]);
    setShowFacultyModal(false);
    setNewFaculty({ name: '', email: '', departmentId: '' });
    setToastMessage('Faculty added successfully!');
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
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage student and faculty accounts</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'students'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Students ({localStudents.length})
        </button>
        <button
          onClick={() => setActiveTab('faculty')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'faculty'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Faculty ({localFaculty.length})
        </button>
      </div>

      {/* Students Tab */}
      {activeTab === 'students' && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Students</h2>
              <Button size="sm" onClick={() => setShowStudentModal(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Department</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Division</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {localStudents.map(student => (
                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{student.name}</td>
                      <td className="py-3 px-4 text-gray-700">{student.email}</td>
                      <td className="py-3 px-4 text-gray-700">
                        {getDepartmentById(student.departmentId)?.name}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{student.division}</td>
                      <td className="py-3 px-4 text-gray-700">{student.batch}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Faculty Tab */}
      {activeTab === 'faculty' && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Faculty</h2>
              <Button size="sm" onClick={() => setShowFacultyModal(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Faculty
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Department</th>
                  </tr>
                </thead>
                <tbody>
                  {localFaculty.map(fac => (
                    <tr key={fac.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{fac.name}</td>
                      <td className="py-3 px-4 text-gray-700">{fac.email}</td>
                      <td className="py-3 px-4 text-gray-700">
                        {getDepartmentById(fac.departmentId)?.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Add Student Modal */}
      <Modal isOpen={showStudentModal} onClose={() => setShowStudentModal(false)} title="Add Student">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={newStudent.name}
              onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter student name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={newStudent.email}
              onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={newStudent.departmentId}
              onChange={e => setNewStudent({ ...newStudent, departmentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
              <select
                value={newStudent.division}
                onChange={e => setNewStudent({ ...newStudent, division: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {['A', 'B', 'C', 'D'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <select
                value={newStudent.batch}
                onChange={e => setNewStudent({ ...newStudent, batch: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowStudentModal(false)}>Cancel</Button>
            <Button onClick={handleAddStudent}>Add Student</Button>
          </div>
        </div>
      </Modal>

      {/* Add Faculty Modal */}
      <Modal isOpen={showFacultyModal} onClose={() => setShowFacultyModal(false)} title="Add Faculty">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={newFaculty.name}
              onChange={e => setNewFaculty({ ...newFaculty, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter faculty name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={newFaculty.email}
              onChange={e => setNewFaculty({ ...newFaculty, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={newFaculty.departmentId}
              onChange={e => setNewFaculty({ ...newFaculty, departmentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowFacultyModal(false)}>Cancel</Button>
            <Button onClick={handleAddFaculty}>Add Faculty</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
