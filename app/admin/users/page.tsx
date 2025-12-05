'use client';

import { useState, useEffect, useRef } from 'react';
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
  semester: number;
  year: number;
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
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
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
    semester: '1',
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
  const [isUploading, setIsUploading] = useState(false);
  const [showCSVPreviewModal, setShowCSVPreviewModal] = useState(false);
  const [csvStudents, setCsvStudents] = useState<{ name: string; email: string; semester: string; division: string; batch: string; selected: boolean; exists: boolean }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Search and filter state - Students
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterBatch, setFilterBatch] = useState('');

  // Search state - Faculty
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [showFacultyCSVPreviewModal, setShowFacultyCSVPreviewModal] = useState(false);
  const [csvFaculty, setCsvFaculty] = useState<{ name: string; email: string; code: string; selected: boolean; exists: boolean }[]>([]);
  const facultyFileInputRef = useRef<HTMLInputElement>(null);

  // Filtered students
  const filteredStudents = localStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSemester = !filterSemester || student.semester.toString() === filterSemester;
    const matchesDivision = !filterDivision || student.division === filterDivision;
    const matchesBatch = !filterBatch || student.batch === filterBatch;
    return matchesSearch && matchesSemester && matchesDivision && matchesBatch;
  });

  // Filtered faculty
  const filteredFaculty = localFaculty.filter(fac => {
    return fac.name.toLowerCase().includes(facultySearchQuery.toLowerCase()) ||
           fac.email.toLowerCase().includes(facultySearchQuery.toLowerCase()) ||
           (fac.facultyCode || '').toLowerCase().includes(facultySearchQuery.toLowerCase());
  });

  // Validate somaiya.edu email
  const isValidSomaiyaEmail = (email: string) => {
    return email.toLowerCase().endsWith('@somaiya.edu');
  };

  // Parse CSV file
  const parseCSV = (text: string): { name: string; email: string; semester: string; division: string; batch: string }[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIdx = headers.indexOf('name');
    const emailIdx = headers.indexOf('email');
    const semesterIdx = headers.indexOf('semester');
    const divisionIdx = headers.indexOf('division');
    const batchIdx = headers.indexOf('batch');
    
    if (nameIdx === -1 || emailIdx === -1 || semesterIdx === -1 || divisionIdx === -1) {
      throw new Error('CSV must have columns: name, email, semester, division, batch');
    }
    
    const students = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 4) continue;
      
      students.push({
        name: values[nameIdx] || '',
        email: values[emailIdx] || '',
        semester: values[semesterIdx] || '1',
        division: values[divisionIdx] || 'A',
        batch: batchIdx !== -1 ? values[batchIdx] || '' : '',
      });
    }
    return students;
  };

  // Handle CSV file upload - parse and show preview
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.name.endsWith('.csv')) {
      setToastType('error');
      setToastMessage('Please upload a CSV file');
      setShowToast(true);
      return;
    }
    
    try {
      const text = await file.text();
      const students = parseCSV(text);
      
      if (students.length === 0) {
        throw new Error('No valid student data found in CSV');
      }
      
      // Validate all emails
      const invalidEmails = students.filter(s => !isValidSomaiyaEmail(s.email));
      if (invalidEmails.length > 0) {
        throw new Error(`${invalidEmails.length} student(s) have invalid emails. All emails must end with @somaiya.edu`);
      }
      
      // Check for existing emails
      const existingEmails = new Set(localStudents.map(s => s.email.toLowerCase()));
      const studentsWithStatus = students.map(s => ({
        ...s,
        selected: !existingEmails.has(s.email.toLowerCase()),
        exists: existingEmails.has(s.email.toLowerCase()),
      }));
      
      setCsvStudents(studentsWithStatus);
      setShowCSVPreviewModal(true);
      
    } catch (error) {
      setToastType('error');
      setToastMessage(error instanceof Error ? error.message : 'Failed to parse CSV');
      setShowToast(true);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Toggle student selection in CSV preview
  const toggleStudentSelection = (idx: number) => {
    setCsvStudents(prev => prev.map((s, i) => 
      i === idx ? { ...s, selected: !s.selected } : s
    ));
  };

  // Confirm and add students from CSV preview
  const handleConfirmCSVImport = async () => {
    const selectedStudents = csvStudents.filter(s => s.selected && !s.exists);
    if (selectedStudents.length === 0) return;
    
    setIsUploading(true);
    
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    
    for (const student of selectedStudents) {
      try {
        const res = await fetch('/api/admin/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...student,
            course: 'IT', // Default course
          }),
        });
        
        if (res.ok) {
          const newStudent = await res.json();
          setLocalStudents(prev => [...prev, newStudent]);
          successCount++;
        } else {
          const err = await res.json();
          errors.push(`${student.email}: ${err.error}`);
          failCount++;
        }
      } catch {
        errors.push(`${student.email}: Network error`);
        failCount++;
      }
    }
    
    // Show result
    if (successCount > 0 && failCount === 0) {
      setToastType('success');
      setToastMessage(`Successfully imported ${successCount} student(s)!`);
    } else if (successCount > 0 && failCount > 0) {
      setToastType('success');
      setToastMessage(`Imported ${successCount} student(s). ${failCount} failed.`);
    } else {
      setToastType('error');
      setToastMessage(`Import failed. ${errors[0] || 'Unknown error'}`);
    }
    setShowToast(true);
    
    // Close modal and reset
    setShowCSVPreviewModal(false);
    setCsvStudents([]);
    setIsUploading(false);
  };

  // Parse Faculty CSV file
  const parseFacultyCSV = (text: string): { name: string; email: string; code: string }[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIdx = headers.indexOf('name');
    const emailIdx = headers.indexOf('email');
    const codeIdx = headers.indexOf('code');
    
    if (nameIdx === -1 || emailIdx === -1 || codeIdx === -1) {
      throw new Error('CSV must have columns: name, email, code');
    }
    
    const faculty = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 3) continue;
      
      faculty.push({
        name: values[nameIdx] || '',
        email: values[emailIdx] || '',
        code: values[codeIdx] || '',
      });
    }
    return faculty;
  };

  // Handle Faculty CSV file upload - parse and show preview
  const handleFacultyCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      setToastType('error');
      setToastMessage('Please upload a CSV file');
      setShowToast(true);
      return;
    }
    
    try {
      const text = await file.text();
      const faculty = parseFacultyCSV(text);
      
      if (faculty.length === 0) {
        throw new Error('No valid faculty data found in CSV');
      }
      
      const invalidEmails = faculty.filter(f => !isValidSomaiyaEmail(f.email));
      if (invalidEmails.length > 0) {
        throw new Error(`${invalidEmails.length} faculty have invalid emails. All emails must end with @somaiya.edu`);
      }
      
      const existingEmails = new Set(localFaculty.map(f => f.email.toLowerCase()));
      const facultyWithStatus = faculty.map(f => ({
        ...f,
        selected: !existingEmails.has(f.email.toLowerCase()),
        exists: existingEmails.has(f.email.toLowerCase()),
      }));
      
      setCsvFaculty(facultyWithStatus);
      setShowFacultyCSVPreviewModal(true);
      
    } catch (error) {
      setToastType('error');
      setToastMessage(error instanceof Error ? error.message : 'Failed to parse CSV');
      setShowToast(true);
    } finally {
      if (facultyFileInputRef.current) {
        facultyFileInputRef.current.value = '';
      }
    }
  };

  // Toggle faculty selection in CSV preview
  const toggleFacultySelection = (idx: number) => {
    setCsvFaculty(prev => prev.map((f, i) => 
      i === idx ? { ...f, selected: !f.selected } : f
    ));
  };

  // Confirm and add faculty from CSV preview
  const handleConfirmFacultyCSVImport = async () => {
    const selectedFaculty = csvFaculty.filter(f => f.selected && !f.exists);
    if (selectedFaculty.length === 0) return;
    
    setIsUploading(true);
    
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    
    for (const fac of selectedFaculty) {
      try {
        const res = await fetch('/api/admin/faculty', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fac.name,
            email: fac.email,
            facultyCode: fac.code,
          }),
        });
        
        if (res.ok) {
          const newFac = await res.json();
          setLocalFaculty(prev => [...prev, newFac]);
          successCount++;
        } else {
          const err = await res.json();
          errors.push(`${fac.email}: ${err.error}`);
          failCount++;
        }
      } catch {
        errors.push(`${fac.email}: Network error`);
        failCount++;
      }
    }
    
    if (successCount > 0 && failCount === 0) {
      setToastType('success');
      setToastMessage(`Successfully imported ${successCount} faculty!`);
    } else if (successCount > 0 && failCount > 0) {
      setToastType('success');
      setToastMessage(`Imported ${successCount} faculty. ${failCount} failed.`);
    } else {
      setToastType('error');
      setToastMessage(`Import failed. ${errors[0] || 'Unknown error'}`);
    }
    setShowToast(true);
    
    setShowFacultyCSVPreviewModal(false);
    setCsvFaculty([]);
    setIsUploading(false);
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email || !newStudent.semester) return;
    
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
      setNewStudent({ name: '', email: '', semester: '1', course: 'IT', division: 'A', batch: 'A1' });
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

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setShowEditStudentModal(true);
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;
    
    try {
      const res = await fetch('/api/admin/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStudent.id,
          semester: editingStudent.semester,
          course: editingStudent.course,
          division: editingStudent.division,
          batch: editingStudent.batch,
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update student');
      }
      
      const updated = await res.json();
      setLocalStudents(localStudents.map(s => s.id === updated.id ? updated : s));
      setShowEditStudentModal(false);
      setEditingStudent(null);
      setToastType('success');
      setToastMessage('Student updated successfully!');
      setShowToast(true);
    } catch (error) {
      setToastType('error');
      setToastMessage(error instanceof Error ? error.message : 'Failed to update student');
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
          {/* Header with title and action buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-base font-semibold text-gray-900">Students</h2>
            <div className="flex flex-wrap items-center gap-2">
              {/* CSV Upload */}
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className={`inline-flex items-center px-3 py-1.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {isUploading ? 'Importing...' : 'Import CSV'}
                </label>
              </div>
              {/* Add Student Button */}
              <button
                onClick={() => setShowStudentModal(true)}
                className="inline-flex items-center px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                <PlusIcon className="w-4 h-4 mr-1.5" />
                Add Student
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none"
              />
            </div>
            
            {/* Semester Filter */}
            <select
              value={filterSemester}
              onChange={e => setFilterSemester(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none text-gray-600 bg-white"
            >
              <option value="">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(s => (
                <option key={s} value={s}>Sem {s}</option>
              ))}
            </select>
            
            {/* Division Filter */}
            <select
              value={filterDivision}
              onChange={e => setFilterDivision(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none text-gray-600 bg-white"
            >
              <option value="">All Divisions</option>
              {['A','B','C','D'].map(d => (
                <option key={d} value={d}>Div {d}</option>
              ))}
            </select>
            
            {/* Batch Filter */}
            <select
              value={filterBatch}
              onChange={e => setFilterBatch(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none text-gray-600 bg-white"
            >
              <option value="">All Batches</option>
              {['A1','A2','B1','B2','C1','C2','D1','D2'].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Clear Filters */}
            {(searchQuery || filterSemester || filterDivision || filterBatch) && (
              <button
                onClick={() => { setSearchQuery(''); setFilterSemester(''); setFilterDivision(''); setFilterBatch(''); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>

          <div className="overflow-x-auto -mx-6">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Semester</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Division</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Batch</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-6 text-sm font-medium text-gray-900">{student.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">Sem {student.semester}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.division}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.batch || '-'}</td>
                    <td className="py-3 px-6 flex gap-2">
                      <button
                        onClick={() => handleEditStudent(student)}
                        className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                      >
                        Edit
                      </button>
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
          {filteredStudents.length === 0 && localStudents.length > 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No students match your filters</p>
          )}
          {localStudents.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No students added yet</p>
          )}
        </div>
      )}

      {/* Faculty Tab */}
      {!isLoading && activeTab === 'faculty' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {/* Header with title and action buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-base font-semibold text-gray-900">Faculty</h2>
            <div className="flex flex-wrap items-center gap-2">
              {/* CSV Upload */}
              <div className="relative">
                <input
                  ref={facultyFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFacultyCSVUpload}
                  className="hidden"
                  id="faculty-csv-upload"
                />
                <label
                  htmlFor="faculty-csv-upload"
                  className={`inline-flex items-center px-3 py-1.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {isUploading ? 'Importing...' : 'Import CSV'}
                </label>
              </div>
              {/* Add Faculty Button */}
              <button
                onClick={() => setShowFacultyModal(true)}
                className="inline-flex items-center px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                <PlusIcon className="w-4 h-4 mr-1.5" />
                Add Faculty
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email or code..."
                value={facultySearchQuery}
                onChange={e => setFacultySearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none"
              />
            </div>
            {facultySearchQuery && (
              <button
                onClick={() => setFacultySearchQuery('')}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
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
                {filteredFaculty.map(fac => (
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
          {filteredFaculty.length === 0 && localFaculty.length > 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No faculty match your search</p>
          )}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select
                value={newStudent.semester}
                onChange={e => setNewStudent({ ...newStudent, semester: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
                <option value="8">Semester 8</option>
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

      {/* Edit Student Modal */}
      <Modal isOpen={showEditStudentModal} onClose={() => { setShowEditStudentModal(false); setEditingStudent(null); }} title="Edit Student">
        {editingStudent && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editingStudent.name}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={editingStudent.email}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <select
                  value={editingStudent.semester}
                  onChange={e => setEditingStudent({ ...editingStudent, semester: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                  <option value={3}>Semester 3</option>
                  <option value={4}>Semester 4</option>
                  <option value={5}>Semester 5</option>
                  <option value={6}>Semester 6</option>
                  <option value={7}>Semester 7</option>
                  <option value={8}>Semester 8</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select
                  value={editingStudent.course}
                  onChange={e => setEditingStudent({ ...editingStudent, course: e.target.value })}
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
                  value={editingStudent.division}
                  onChange={e => setEditingStudent({ ...editingStudent, division: e.target.value })}
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
                  value={editingStudent.batch}
                  onChange={e => setEditingStudent({ ...editingStudent, batch: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setShowEditStudentModal(false); setEditingStudent(null); }}>Cancel</Button>
              <Button onClick={handleUpdateStudent}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* CSV Preview Modal - Students */}
      {showCSVPreviewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Import Students</h3>
                <p className="text-sm text-gray-500">{csvStudents.length} students found in CSV</p>
              </div>
              <button
                onClick={() => { setShowCSVPreviewModal(false); setCsvStudents([]); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-3 w-10"></th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Sem</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Div</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {csvStudents.map((student, idx) => (
                      <tr 
                        key={idx} 
                        className={`${student.exists ? 'bg-gray-50/50 opacity-60' : 'hover:bg-gray-50 cursor-pointer'} transition-colors`}
                        onClick={() => !student.exists && toggleStudentSelection(idx)}
                      >
                        <td className="py-3 px-3">
                          {student.exists ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Exists</span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={student.selected}
                              onChange={() => toggleStudentSelection(idx)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-900 font-medium">{student.name}</td>
                        <td className="py-3 px-3 text-gray-500 text-xs">{student.email}</td>
                        <td className="py-3 px-3 text-gray-600">{student.semester}</td>
                        <td className="py-3 px-3 text-gray-600">{student.division}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <span className="text-sm text-gray-500">
                {csvStudents.filter(s => s.selected && !s.exists).length} of {csvStudents.filter(s => !s.exists).length} selected
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowCSVPreviewModal(false); setCsvStudents([]); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCSVImport}
                  disabled={isUploading || csvStudents.filter(s => s.selected && !s.exists).length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Adding...' : 'Add Students'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Preview Modal - Faculty */}
      {showFacultyCSVPreviewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Import Faculty</h3>
                <p className="text-sm text-gray-500">{csvFaculty.length} faculty found in CSV</p>
              </div>
              <button
                onClick={() => { setShowFacultyCSVPreviewModal(false); setCsvFaculty([]); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-3 w-10"></th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {csvFaculty.map((fac, idx) => (
                      <tr 
                        key={idx} 
                        className={`${fac.exists ? 'bg-gray-50/50 opacity-60' : 'hover:bg-gray-50 cursor-pointer'} transition-colors`}
                        onClick={() => !fac.exists && toggleFacultySelection(idx)}
                      >
                        <td className="py-3 px-3">
                          {fac.exists ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Exists</span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={fac.selected}
                              onChange={() => toggleFacultySelection(idx)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-900 font-medium">{fac.name}</td>
                        <td className="py-3 px-3 text-gray-500 text-xs">{fac.email}</td>
                        <td className="py-3 px-3 text-gray-600">{fac.code}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <span className="text-sm text-gray-500">
                {csvFaculty.filter(f => f.selected && !f.exists).length} of {csvFaculty.filter(f => !f.exists).length} selected
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowFacultyCSVPreviewModal(false); setCsvFaculty([]); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmFacultyCSVImport}
                  disabled={isUploading || csvFaculty.filter(f => f.selected && !f.exists).length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Adding...' : 'Add Faculty'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
