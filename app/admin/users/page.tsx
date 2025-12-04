'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { ArrowLeftIcon, PlusIcon } from '@/components/Icons';

type TabType = 'students' | 'faculty';

interface Student {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  year: string;
  course: string;
  division: string;
  batch: string;
}

interface Faculty {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  facultyCode?: string | null;
}

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isLoading, setIsLoading] = useState(true);

  const [localStudents, setLocalStudents] = useState<Student[]>([]);
  const [localFaculty, setLocalFaculty] = useState<Faculty[]>([]);

  // Fetch students and faculty from DB on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [studentsRes, facultyRes] = await Promise.all([
          fetch('/api/admin/students'),
          fetch('/api/admin/faculty'),
        ]);
        
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          setLocalStudents(studentsData);
        }
        
        if (facultyRes.ok) {
          const facultyData = await facultyRes.json();
          setLocalFaculty(facultyData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, []);

  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    year: '1',
    course: 'IT',
    division: 'A',
    batch: 'A1',
  });

  const [newFaculty, setNewFaculty] = useState({
    name: '',
    email: '',
    facultyCode: '',
  });

  const [studentEmailError, setStudentEmailError] = useState('');
  const [facultyEmailError, setFacultyEmailError] = useState('');

  // Validate somaiya.edu email
  const isValidSomaiyaEmail = (email: string) => {
    return email.toLowerCase().endsWith('@somaiya.edu');
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email || !newStudent.year) return;
    
    if (!isValidSomaiyaEmail(newStudent.email)) {
      setStudentEmailError('Please use a valid @somaiya.edu email');
      return;
    }
    setStudentEmailError('');
    
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add student');
      }
      
      const student = await res.json();
      setLocalStudents([...localStudents, student]);
      setShowStudentModal(false);
      setNewStudent({ name: '', email: '', year: '1', course: 'IT', division: 'A', batch: 'A1' });
      setToastType('success');
      setToastMessage('Student added successfully!');
      setShowToast(true);
    } catch (error) {
      setToastType('error');
      setToastMessage(error instanceof Error ? error.message : 'Failed to add student');
      setShowToast(true);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
      const res = await fetch(`/api/admin/students?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete student');
      }
      setLocalStudents(localStudents.filter(s => s.id !== id));
      setToastType('success');
      setToastMessage('Student deleted successfully!');
      setShowToast(true);
    } catch (error) {
      setToastType('error');
      setToastMessage(error instanceof Error ? error.message : 'Failed to delete student');
      setShowToast(true);
    }
  };

  const handleDeleteFaculty = async (id: string) => {
    if (!confirm('Are you sure you want to delete this faculty?')) return;
    
    try {
      const res = await fetch(`/api/admin/faculty?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete faculty');
      }
      setLocalFaculty(localFaculty.filter(f => f.id !== id));
      setToastType('success');
      setToastMessage('Faculty deleted successfully!');
      setShowToast(true);
    } catch (error) {
      setToastType('error');
      setToastMessage(error instanceof Error ? error.message : 'Failed to delete faculty');
      setShowToast(true);
    }
  };

  const handleAddFaculty = async () => {
    if (!newFaculty.name || !newFaculty.email || !newFaculty.facultyCode) return;
    
    if (!isValidSomaiyaEmail(newFaculty.email)) {
      setFacultyEmailError('Please use a valid @somaiya.edu email');
      return;
    }
    setFacultyEmailError('');
    
    try {
      const res = await fetch('/api/admin/faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFaculty),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add faculty');
      }
      
      const fac = await res.json();
      setLocalFaculty([...localFaculty, fac]);
      setShowFacultyModal(false);
      setNewFaculty({ name: '', email: '', facultyCode: '' });
      setToastType('success');
      setToastMessage('Faculty added successfully!');
      setShowToast(true);
    } catch (error) {
      setToastType('error');
      setToastMessage(error instanceof Error ? error.message : 'Failed to add faculty');
      setShowToast(true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {showToast && (
        <Toast message={toastMessage} type={toastType} onClose={() => setShowToast(false)} />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 text-sm mt-1">Manage student and faculty accounts</p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8 text-gray-500">Loading users...</div>
      )}

      {/* Tabs */}
      {!isLoading && <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'students'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Students ({localStudents.length})
        </button>
        <button
          onClick={() => setActiveTab('faculty')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'faculty'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Faculty ({localFaculty.length})
        </button>
      </div>}

      {/* Students Tab */}
      {!isLoading && activeTab === 'students' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Students</h2>
            <button
              onClick={() => setShowStudentModal(true)}
              className="inline-flex items-center px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-1.5" />
              Add Student
            </button>
          </div>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Year</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Division</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Batch</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {localStudents.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-6 text-sm font-medium text-gray-900">{student.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.year}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.division}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.batch || '-'}</td>
                    <td className="py-3 px-6">
                      <button
                        onClick={() => handleDeleteStudent(student.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {localStudents.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No students added yet</p>
          )}
        </div>
      )}

      {/* Faculty Tab */}
      {!isLoading && activeTab === 'faculty' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Faculty</h2>
            <button
              onClick={() => setShowFacultyModal(true)}
              className="inline-flex items-center px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-1.5" />
              Add Faculty
            </button>
          </div>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Code</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Department</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {localFaculty.map(fac => (
                  <tr key={fac.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-6 text-sm font-medium text-gray-900">{fac.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{fac.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{fac.facultyCode || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">Information Technology</td>
                    <td className="py-3 px-6">
                      <button
                        onClick={() => handleDeleteFaculty(fac.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {localFaculty.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No faculty added yet</p>
          )}
        </div>
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
            <div className="relative">
              <input
                type="email"
                value={newStudent.email}
                onChange={e => {
                  setNewStudent({ ...newStudent, email: e.target.value });
                  if (studentEmailError) setStudentEmailError('');
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  studentEmailError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="name@somaiya.edu"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">@somaiya.edu</span>
            </div>
            {studentEmailError && (
              <p className="text-xs text-red-500 mt-1">{studentEmailError}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={newStudent.year}
                onChange={e => setNewStudent({ ...newStudent, year: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">First Year</option>
                <option value="2">Second Year</option>
                <option value="3">Third Year</option>
                <option value="4">Fourth Year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
              <select
                value={newStudent.course}
                onChange={e => setNewStudent({ ...newStudent, course: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="IT">Information Technology</option>
                <option value="AIDS">AI & Data Science</option>
              </select>
            </div>
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
            <div className="relative">
              <input
                type="email"
                value={newFaculty.email}
                onChange={e => {
                  setNewFaculty({ ...newFaculty, email: e.target.value });
                  if (facultyEmailError) setFacultyEmailError('');
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  facultyEmailError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="name@somaiya.edu"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">@somaiya.edu</span>
            </div>
            {facultyEmailError && (
              <p className="text-xs text-red-500 mt-1">{facultyEmailError}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Faculty Code <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={newFaculty.facultyCode}
              onChange={e => setNewFaculty({ ...newFaculty, facultyCode: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter short code, e.g. IT-F01"
            />
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
