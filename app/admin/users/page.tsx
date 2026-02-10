'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { ArrowLeftIcon, PlusIcon } from '@/components/Icons';
import ProtectedRoute from '@/components/ProtectedRoute';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';

type TabType = 'students' | 'faculty' | 'admins';

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
  honours_course: string;
  honours_batch: string;
}

interface Faculty {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  facultyCode?: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

function UserManagementContent() {
  const { authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isAddingFaculty, setIsAddingFaculty] = useState(false);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'student' | 'faculty' | 'admin' | null;
    id: string;
    name: string;
    bulk?: boolean;
    ids?: string[];
  }>({ isOpen: false, type: null, id: '', name: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [localStudents, setLocalStudents] = useState<Student[]>([]);
  const [localFaculty, setLocalFaculty] = useState<Faculty[]>([]);
  const [localAdmins, setLocalAdmins] = useState<AdminUser[]>([]);

  // Fetch students, faculty, and admins from DB on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [studentsRes, facultyRes, adminsRes] = await Promise.all([
          authFetch('/api/admin/students'),
          authFetch('/api/admin/faculty'),
          authFetch('/api/admin/admin-users'),
        ]);
        
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          setLocalStudents(studentsData);
        }
        
        if (facultyRes.ok) {
          const facultyData = await facultyRes.json();
          setLocalFaculty(facultyData);
        }

        if (adminsRes.ok) {
          const adminsData = await adminsRes.json();
          setLocalAdmins(adminsData);
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
    honours_course: '',
    honours_batch: '',
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
  const [csvStudents, setCsvStudents] = useState<{ name: string; email: string; semester: string; course: string; division: string; batch: string; honours_course: string; honours_batch: string; selected: boolean; exists: boolean }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Search and filter state - Students
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterBatch, setFilterBatch] = useState('');

  // Search state - Faculty
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [showFacultyCSVPreviewModal, setShowFacultyCSVPreviewModal] = useState(false);
  const [csvFaculty, setCsvFaculty] = useState<{ name: string; email: string; code: string; selected: boolean; exists: boolean }[]>([]);
  const facultyFileInputRef = useRef<HTMLInputElement>(null);

  // Pagination state - show limited items initially, load more on scroll/click
  const ITEMS_PER_PAGE = 20;
  const [studentsDisplayCount, setStudentsDisplayCount] = useState(ITEMS_PER_PAGE);
  const [facultyDisplayCount, setFacultyDisplayCount] = useState(ITEMS_PER_PAGE);
  const [adminsDisplayCount, setAdminsDisplayCount] = useState(ITEMS_PER_PAGE);

  // Filtered students
  const filteredStudents = localStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSemester = !filterSemester || student.semester.toString() === filterSemester;
    const matchesCourse = !filterCourse || student.course === filterCourse;
    const matchesDivision = !filterDivision || student.division === filterDivision;
    const matchesBatch = !filterBatch || student.batch === filterBatch;
    return matchesSearch && matchesSemester && matchesCourse && matchesDivision && matchesBatch;
  });

  // Filtered faculty
  const filteredFaculty = localFaculty.filter(fac => {
    return fac.name.toLowerCase().includes(facultySearchQuery.toLowerCase()) ||
           fac.email.toLowerCase().includes(facultySearchQuery.toLowerCase()) ||
           (fac.facultyCode || '').toLowerCase().includes(facultySearchQuery.toLowerCase());
  });

  // Displayed items for students/faculty (sliced for progressive loading)
  const displayedStudents = filteredStudents.slice(0, studentsDisplayCount);
  const displayedFaculty = filteredFaculty.slice(0, facultyDisplayCount);

  // Check if there are more items to load
  const hasMoreStudents = filteredStudents.length > studentsDisplayCount;
  const hasMoreFaculty = filteredFaculty.length > facultyDisplayCount;

  // Load more handlers
  const loadMoreStudents = () => setStudentsDisplayCount(prev => prev + ITEMS_PER_PAGE);
  const loadMoreFaculty = () => setFacultyDisplayCount(prev => prev + ITEMS_PER_PAGE);

  // Reset display count when filters change
  useEffect(() => {
    setStudentsDisplayCount(ITEMS_PER_PAGE);
  }, [searchQuery, filterSemester, filterCourse, filterDivision, filterBatch]);

  useEffect(() => {
    setFacultyDisplayCount(ITEMS_PER_PAGE);
  }, [facultySearchQuery]);

  // Validate somaiya.edu email
  const isValidSomaiyaEmail = (email: string) => {
    return email.toLowerCase().endsWith('@somaiya.edu');
  };

  // Parse CSV file
  const parseCSV = (text: string): { name: string; email: string; semester: string; course: string; division: string; batch: string; honours_course: string; honours_batch: string }[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIdx = headers.indexOf('name');
    const emailIdx = headers.indexOf('email');
    const semesterIdx = headers.indexOf('semester');
    const courseIdx = headers.indexOf('course');
    const divisionIdx = headers.indexOf('division');
    const batchIdx = headers.indexOf('batch');
    const honoursCourseIdx = headers.findIndex(h => h === 'honours_course' || h === 'honours course' || h === 'minor');
    const honoursBatchIdx = headers.findIndex(h => h === 'honours_batch' || h === 'honours batch' || h === 'minor_batch');
    
    if (nameIdx === -1 || emailIdx === -1 || semesterIdx === -1 || divisionIdx === -1) {
      throw new Error('CSV must have columns: name, email, semester, course, division, batch');
    }
    
    const students = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 4) continue;
      
      // Parse course - accept IT, AIDS, or full names
      let course = courseIdx !== -1 ? values[courseIdx] || 'IT' : 'IT';
      if (course.toLowerCase().includes('ai') || course.toLowerCase().includes('data')) {
        course = 'AIDS';
      } else {
        course = 'IT';
      }
      
      students.push({
        name: values[nameIdx] || '',
        email: values[emailIdx] || '',
        semester: values[semesterIdx] || '1',
        course: course,
        division: values[divisionIdx] || 'A',
        batch: batchIdx !== -1 ? values[batchIdx] || '' : '',
        honours_course: honoursCourseIdx !== -1 ? values[honoursCourseIdx] || '' : '',
        honours_batch: honoursBatchIdx !== -1 ? values[honoursBatchIdx] || '' : '',
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

  // Confirm and add students from CSV preview - BULK import
  const handleConfirmCSVImport = async () => {
    // Include ALL selected students - API will create new ones and update existing ones
    const selectedStudents = csvStudents.filter(s => s.selected);
    if (selectedStudents.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // Use bulk endpoint - handles both create and update
      const res = await authFetch('/api/admin/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: selectedStudents }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Refresh the student list from server
        const refreshRes = await authFetch('/api/admin/students');
        if (refreshRes.ok) {
          const refreshedStudents = await refreshRes.json();
          setLocalStudents(refreshedStudents);
        }
        
        setToastType('success');
        // Show created and updated counts
        const parts = [];
        if (data.created > 0) parts.push(`${data.created} added`);
        if (data.updated > 0) parts.push(`${data.updated} updated`);
        setToastMessage(parts.length > 0 ? `Students: ${parts.join(', ')}` : 'No changes made');
      } else {
        setToastType('error');
        setToastMessage(data.error || 'Failed to import students');
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      setToastType('error');
      setToastMessage('Network error during import');
    }
    
    setShowToast(true);
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

  // Confirm and add faculty from CSV preview - BULK import
  const handleConfirmFacultyCSVImport = async () => {
    const selectedFaculty = csvFaculty.filter(f => f.selected && !f.exists);
    if (selectedFaculty.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // Use bulk endpoint for fast parallel creation
      const res = await authFetch('/api/admin/faculty/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faculty: selectedFaculty }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Refresh the faculty list from server
        const refreshRes = await authFetch('/api/admin/faculty');
        if (refreshRes.ok) {
          const refreshedFaculty = await refreshRes.json();
          setLocalFaculty(refreshedFaculty);
        }
        
        setToastType('success');
        if (data.skipped > 0) {
          setToastMessage(`Imported ${data.count} faculty. ${data.skipped} skipped (duplicates).`);
        } else {
          setToastMessage(`Successfully imported ${data.count} faculty!`);
        }
      } else {
        setToastType('error');
        setToastMessage(data.error || 'Failed to import faculty');
      }
    } catch (error) {
      console.error('Bulk faculty import error:', error);
      setToastType('error');
      setToastMessage('Network error during import');
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
    setIsAddingStudent(true);
    
    try {
      const res = await authFetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add student');
      }
      
      const student = await res.json();
      
      if (student.updated) {
        // Update existing student in list
        setLocalStudents(prev => prev.map(s => 
          s.id === student.id ? student : s
        ));
        setToastMessage('Student updated successfully!');
      } else {
        // Add new student to list
        setLocalStudents(prev => [...prev, student]);
        setToastMessage('Student added successfully!');
      }
      
      setShowStudentModal(false);
      setNewStudent({ name: '', email: '', semester: '1', course: 'IT', division: 'A', batch: 'A1', honours_course: '', honours_batch: '' });
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      setToastType('error');
      setToastMessage(error instanceof Error ? error.message : 'Failed to add student');
      setShowToast(true);
    } finally {
      setIsAddingStudent(false);
    }
  };

  const openDeleteConfirm = (type: 'student' | 'faculty' | 'admin', id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, type, id, name });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ isOpen: false, type: null, id: '', name: '' });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.type) return;
    
    // Handle bulk delete
    if (deleteConfirm.bulk && deleteConfirm.ids && deleteConfirm.ids.length > 0) {
      setIsDeleting(true);
      try {
        let endpoint = '';
        let successMessage = '';
        
        if (deleteConfirm.type === 'student') {
          endpoint = '/api/admin/students/bulk';
          successMessage = `Deleted ${deleteConfirm.ids.length} student(s)!`;
        } else if (deleteConfirm.type === 'faculty') {
          endpoint = '/api/admin/faculty/bulk';
          successMessage = `Deleted ${deleteConfirm.ids.length} faculty member(s)!`;
        } else {
          throw new Error('Bulk delete not supported for this type');
        }

        const res = await authFetch(endpoint, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: deleteConfirm.ids }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to delete');
        }

        const data = await res.json();

        // Update local state
        const idsSet = new Set(deleteConfirm.ids);
        if (deleteConfirm.type === 'student') {
          setLocalStudents(localStudents.filter(s => !idsSet.has(s.id)));
        } else if (deleteConfirm.type === 'faculty') {
          setLocalFaculty(localFaculty.filter(f => !idsSet.has(f.id)));
        }

        setToastType('success');
        setToastMessage(data.message || successMessage);
        setShowToast(true);
        closeDeleteConfirm();
      } catch (error) {
        setToastType('error');
        setToastMessage(error instanceof Error ? error.message : 'Failed to delete');
        setShowToast(true);
      } finally {
        setIsDeleting(false);
      }
      return;
    }

    // Handle single delete
    if (!deleteConfirm.id) return;
    setIsDeleting(true);

    try {
      let endpoint = '';
      let successMessage = '';
      
      switch (deleteConfirm.type) {
        case 'student':
          endpoint = `/api/admin/students?id=${deleteConfirm.id}`;
          successMessage = 'Student deleted successfully!';
          break;
        case 'faculty':
          endpoint = `/api/admin/faculty?id=${deleteConfirm.id}`;
          successMessage = 'Faculty deleted successfully!';
          break;
        case 'admin':
          endpoint = `/api/admin/admin-users?id=${deleteConfirm.id}`;
          successMessage = 'Admin removed successfully!';
          break;
      }

      const res = await authFetch(endpoint, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }

      // Update local state
      if (deleteConfirm.type === 'student') {
        setLocalStudents(localStudents.filter(s => s.id !== deleteConfirm.id));
      } else if (deleteConfirm.type === 'faculty') {
        setLocalFaculty(localFaculty.filter(f => f.id !== deleteConfirm.id));
      } else if (deleteConfirm.type === 'admin') {
        setLocalAdmins(localAdmins.filter(a => a.id !== deleteConfirm.id));
      }

      setToastType('success');
      setToastMessage(successMessage);
      setShowToast(true);
      closeDeleteConfirm();
    } catch (error) {
      setToastType('error');
      setToastMessage(error instanceof Error ? error.message : 'Failed to delete');
      setShowToast(true);
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete all filtered students
  const handleBulkDeleteStudents = () => {
    if (filteredStudents.length === 0) return;
    const ids = filteredStudents.map(s => s.id);
    setDeleteConfirm({
      isOpen: true,
      type: 'student',
      id: '',
      name: `${ids.length} student(s)`,
      bulk: true,
      ids,
    });
  };

  // Bulk delete all filtered faculty
  const handleBulkDeleteFaculty = () => {
    if (filteredFaculty.length === 0) return;
    const ids = filteredFaculty.map(f => f.id);
    setDeleteConfirm({
      isOpen: true,
      type: 'faculty',
      id: '',
      name: `${ids.length} faculty member(s)`,
      bulk: true,
      ids,
    });
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setShowEditStudentModal(true);
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;
    
    try {
      const res = await authFetch('/api/admin/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStudent.id,
          semester: editingStudent.semester,
          course: editingStudent.course,
          division: editingStudent.division,
          batch: editingStudent.batch,
          honours_course: editingStudent.honours_course,
          honours_batch: editingStudent.honours_batch,
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

  const handleAddFaculty = async () => {
    if (!newFaculty.name || !newFaculty.email || !newFaculty.facultyCode) return;
    
    if (!isValidSomaiyaEmail(newFaculty.email)) {
      setFacultyEmailError('Please use a valid @somaiya.edu email');
      return;
    }
    setFacultyEmailError('');
    setIsAddingFaculty(true);
    
    try {
      const res = await authFetch('/api/admin/faculty', {
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
    } finally {
      setIsAddingFaculty(false);
    }
  };

  // Admin management state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', name: '' });
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  // Filtered admins
  const filteredAdmins = localAdmins.filter(admin =>
    admin.email.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
    (admin.name || '').toLowerCase().includes(adminSearchQuery.toLowerCase())
  );

  // Displayed admins (sliced for progressive loading)
  const displayedAdmins = filteredAdmins.slice(0, adminsDisplayCount);
  const hasMoreAdmins = filteredAdmins.length > adminsDisplayCount;
  const loadMoreAdmins = () => setAdminsDisplayCount(prev => prev + ITEMS_PER_PAGE);

  // Reset admin display count when search changes
  useEffect(() => {
    setAdminsDisplayCount(ITEMS_PER_PAGE);
  }, [adminSearchQuery]);

  const handleAddAdmin = async () => {
    if (!newAdmin.email) return;
    setIsAddingAdmin(true);
    
    try {
      const res = await authFetch('/api/admin/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add admin');
      }
      
      const admin = await res.json();
      setLocalAdmins([admin, ...localAdmins]);
      setShowAdminModal(false);
      setNewAdmin({ email: '', name: '' });
      setToastType('success');
      setToastMessage('Admin added successfully!');
      setShowToast(true);
    } catch (error) {
      setToastType('error');
      setToastMessage(error instanceof Error ? error.message : 'Failed to add admin');
      setShowToast(true);
    } finally {
      setIsAddingAdmin(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {showToast && (
        <Toast message={toastMessage} type={toastType} onClose={() => setShowToast(false)} />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={`Delete ${deleteConfirm.type === 'admin' ? 'Admin' : deleteConfirm.type === 'faculty' ? 'Faculty' : 'Student'}`}
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={closeDeleteConfirm}
        isLoading={isDeleting}
      />

      <div className="mb-4 sm:mb-6">
        <Link
          href="/admin/dashboard"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-2 sm:mb-3"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Manage student and faculty accounts</p>
      </div>

      {/* Loading State - Skeleton */}
      {isLoading && (
        <div className="animate-pulse">
          {/* Tabs skeleton */}
          <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6">
            <div className="h-8 sm:h-10 bg-gray-200 rounded-lg sm:rounded-xl w-24 sm:w-28"></div>
            <div className="h-8 sm:h-10 bg-gray-100 rounded-lg sm:rounded-xl w-20 sm:w-24"></div>
            <div className="h-8 sm:h-10 bg-gray-100 rounded-lg sm:rounded-xl w-20 sm:w-24"></div>
          </div>
          {/* Table skeleton */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center mb-3 sm:mb-4">
              <div className="h-5 sm:h-6 bg-gray-200 rounded w-24 sm:w-32"></div>
              <div className="h-7 sm:h-9 bg-gray-200 rounded w-full sm:w-28"></div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
              <div className="h-8 sm:h-9 bg-gray-100 rounded-lg flex-1 min-w-[120px] max-w-xs"></div>
              <div className="h-8 sm:h-9 bg-gray-100 rounded-lg w-20 sm:w-28"></div>
              <div className="h-8 sm:h-9 bg-gray-100 rounded-lg w-20 sm:w-28"></div>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-2 sm:gap-4">
                  <div className="h-10 sm:h-12 bg-gray-100 rounded flex-1"></div>
                  <div className="h-10 sm:h-12 bg-gray-100 rounded w-24 sm:w-40 hidden sm:block"></div>
                  <div className="h-10 sm:h-12 bg-gray-100 rounded w-14 sm:w-20"></div>
                  <div className="h-10 sm:h-12 bg-gray-100 rounded w-12 sm:w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {!isLoading && <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'students'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Students ({localStudents.length})
        </button>
        <button
          onClick={() => setActiveTab('faculty')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'faculty'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Faculty ({localFaculty.length})
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'admins'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Admins ({localAdmins.length})
        </button>
      </div>}

      {/* Students Tab */}
      {!isLoading && activeTab === 'students' && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6">
          {/* Header with title and action buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900">Students</h2>
            <div className="flex items-center gap-2">
              {filteredStudents.length > 0 && (
                <button
                  onClick={handleBulkDeleteStudents}
                  className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-red-50 text-red-600 text-xs sm:text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete All ({filteredStudents.length})
                </button>
              )}
              <button
                onClick={() => setShowStudentModal(true)}
                className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-900 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
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
            
            {/* Course Filter */}
            <select
              value={filterCourse}
              onChange={e => setFilterCourse(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none text-gray-600 bg-white"
            >
              <option value="">All Courses</option>
              <option value="IT">IT</option>
              <option value="AIDS">AI & DS</option>
            </select>

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
              {['A1','A2','A3','B1','B2','B3','C1','C2','C3','D1','D2','D3'].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Clear Filters */}
            {(searchQuery || filterCourse || filterSemester || filterDivision || filterBatch) && (
              <button
                onClick={() => { setSearchQuery(''); setFilterCourse(''); setFilterSemester(''); setFilterDivision(''); setFilterBatch(''); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {displayedStudents.map(student => (
              <div key={student.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50/30">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900">{student.name}</p>
                  <span className="flex-shrink-0 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {student.course === 'AIDS' ? 'AI&DS' : 'IT'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2 truncate">{student.email}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">
                      Sem {student.semester} · Div {student.division}{student.batch ? ` · ${student.batch}` : ''}
                    </p>
                    {student.honours_course && (
                      <p className="text-xs text-purple-600 mt-0.5">
                        Honours: {student.honours_course}{student.honours_batch ? ` / ${student.honours_batch}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditStudent(student)}
                      className="text-blue-600 text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteConfirm('student', student.id, student.name)}
                      className="text-red-500 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto -mx-6">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Course</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Semester</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Division</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Batch</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Honours</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedStudents.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-6 text-sm font-medium text-gray-900">{student.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.course === 'AIDS' ? 'AI & DS' : 'IT'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">Sem {student.semester}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.division}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.batch || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {student.honours_course ? (
                        <span className="text-purple-600">{student.honours_course}{student.honours_batch ? ` / ${student.honours_batch}` : ''}</span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-6 text-sm">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditStudent(student)}
                          className="text-gray-500 hover:text-gray-700 text-xs font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <span className="text-gray-300">/</span>
                        <button
                          onClick={() => openDeleteConfirm('student', student.id, student.name)}
                          className="text-gray-500 hover:text-red-600 text-xs font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Load More Button */}
          {hasMoreStudents && (
            <div className="text-center py-4">
              <button
                onClick={loadMoreStudents}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Load More ({filteredStudents.length - studentsDisplayCount} remaining)
              </button>
            </div>
          )}
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
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6">
          {/* Header with title and action buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900">Faculty</h2>
            <div className="flex items-center gap-2">
              {filteredFaculty.length > 0 && (
                <button
                  onClick={handleBulkDeleteFaculty}
                  className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-red-50 text-red-600 text-xs sm:text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete All ({filteredFaculty.length})
                </button>
              )}
              <button
                onClick={() => setShowFacultyModal(true)}
                className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-900 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
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

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {displayedFaculty.map(fac => (
              <div key={fac.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50/30">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900">{fac.name}</p>
                  {fac.facultyCode && (
                    <span className="flex-shrink-0 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {fac.facultyCode}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 truncate flex-1">{fac.email}</p>
                  <button
                    onClick={() => openDeleteConfirm('faculty', fac.id, fac.name)}
                    className="text-red-500 text-xs font-medium ml-2 flex-shrink-0"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto -mx-6">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Code</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedFaculty.map(fac => (
                  <tr key={fac.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-6 text-sm font-medium text-gray-900">{fac.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{fac.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{fac.facultyCode || '-'}</td>
                    <td className="py-3 px-6">
                      <button
                        onClick={() => openDeleteConfirm('faculty', fac.id, fac.name)}
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
          {/* Load More Button */}
          {hasMoreFaculty && (
            <div className="text-center py-4">
              <button
                onClick={loadMoreFaculty}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Load More ({filteredFaculty.length - facultyDisplayCount} remaining)
              </button>
            </div>
          )}
          {filteredFaculty.length === 0 && localFaculty.length > 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No faculty match your search</p>
          )}
          {localFaculty.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No faculty added yet</p>
          )}
        </div>
      )}

      {/* Admins Tab */}
      {!isLoading && activeTab === 'admins' && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6">
          {/* Header with title and action button */}
          <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-semibold text-gray-900">Admin Access</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage who has admin access</p>
            </div>
            <button
              onClick={() => setShowAdminModal(true)}
              className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-900 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0"
            >
              <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              <span className="hidden xs:inline">Add</span> Admin
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by email or name..."
                value={adminSearchQuery}
                onChange={e => setAdminSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none"
              />
            </div>
            {adminSearchQuery && (
              <button
                onClick={() => setAdminSearchQuery('')}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {displayedAdmins.map(admin => (
              <div key={admin.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50/30">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{admin.email}</p>
                    {admin.name && <p className="text-xs text-gray-600">{admin.name}</p>}
                  </div>
                  <button
                    onClick={() => openDeleteConfirm('admin', admin.id, admin.name || admin.email)}
                    className="text-red-500 text-xs font-medium flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  Added {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '-'}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto -mx-6">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Added</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedAdmins.map(admin => (
                  <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-6 text-sm font-medium text-gray-900">{admin.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{admin.name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-6">
                      <button
                        onClick={() => openDeleteConfirm('admin', admin.id, admin.name || admin.email)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Load More Button */}
          {hasMoreAdmins && (
            <div className="text-center py-4">
              <button
                onClick={loadMoreAdmins}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Load More ({filteredAdmins.length - adminsDisplayCount} remaining)
              </button>
            </div>
          )}
          {filteredAdmins.length === 0 && localAdmins.length > 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No admins match your search</p>
          )}
          {localAdmins.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No dynamic admins added yet. Use the button above to add admin access.</p>
          )}
        </div>
      )}

      {/* Add Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Add Admin</h3>
                <p className="text-xs sm:text-sm text-gray-500">Grant admin access to a user</p>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newAdmin.email}
                    onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                    placeholder="admin@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">Any email domain is allowed</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newAdmin.name}
                    onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                    placeholder="Admin Name"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 flex justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setShowAdminModal(false)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAdmin}
                disabled={!newAdmin.email || isAddingAdmin}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAddingAdmin && (
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isAddingAdmin ? 'Adding...' : 'Add Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Add Student</h3>
                <p className="text-xs sm:text-sm text-gray-500">Add a single student or import CSV</p>
              </div>
              <button
                onClick={() => setShowStudentModal(false)}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto max-h-[calc(90vh-140px)] sm:max-h-[calc(90vh-160px)]">
              {/* Import CSV Option */}
              <div className="mb-4 sm:mb-5 p-3 sm:p-4 border border-dashed border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-white rounded-lg border border-gray-200">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">Import from CSV</p>
                      <p className="text-xs text-gray-500">Bulk add students</p>
                    </div>
                  </div>
                  <label
                    htmlFor="csv-upload-modal"
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors w-full sm:w-auto text-center"
                  >
                    Choose File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      handleCSVUpload(e);
                      setShowStudentModal(false);
                    }}
                    className="hidden"
                    id="csv-upload-modal"
                  />
                </div>
              </div>

              <div className="relative mb-4 sm:mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500">or add manually</span>
                </div>
              </div>

              {/* Manual Form */}
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newStudent.name}
                    onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none"
                    placeholder="Enter student name"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={newStudent.email}
                      onChange={e => {
                        setNewStudent({ ...newStudent, email: e.target.value });
                        if (studentEmailError) setStudentEmailError('');
                      }}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-gray-300 outline-none ${
                        studentEmailError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                      placeholder="name@somaiya.edu"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hidden sm:block">@somaiya.edu</span>
                  </div>
                  {studentEmailError && (
                    <p className="text-xs text-red-500 mt-1">{studentEmailError}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Semester</label>
                    <select
                      value={newStudent.semester}
                      onChange={e => setNewStudent({ ...newStudent, semester: e.target.value })}
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 outline-none"
                    >
                      {[1,2,3,4,5,6,7,8].map(s => (
                        <option key={s} value={s}>Sem {s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Course</label>
                    <select
                      value={newStudent.course}
                      onChange={e => setNewStudent({ ...newStudent, course: e.target.value })}
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 outline-none"
                    >
                      <option value="IT">IT</option>
                      <option value="AIDS">AI&DS</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Division</label>
                    <select
                      value={newStudent.division}
                      onChange={e => setNewStudent({ ...newStudent, division: e.target.value })}
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 outline-none"
                    >
                      {['A', 'B', 'C', 'D'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Batch</label>
                    <select
                      value={newStudent.batch}
                      onChange={e => setNewStudent({ ...newStudent, batch: e.target.value })}
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 outline-none"
                    >
                      {['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Honours / Minor Fields */}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Honours / Minor (optional - leave empty if not enrolled)</p>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Honours Course</label>
                      <input
                        type="text"
                        value={newStudent.honours_course}
                        onChange={e => setNewStudent({ ...newStudent, honours_course: e.target.value })}
                        className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 outline-none"
                        placeholder="e.g. Honours-ML"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Honours Batch</label>
                      <input
                        type="text"
                        value={newStudent.honours_batch}
                        onChange={e => setNewStudent({ ...newStudent, honours_batch: e.target.value })}
                        className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 outline-none"
                        placeholder="e.g. H1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex justify-end gap-2 sm:gap-3 bg-gray-50">
              <button
                onClick={() => setShowStudentModal(false)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStudent}
                disabled={isAddingStudent}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAddingStudent && (
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isAddingStudent ? 'Adding...' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Faculty Modal */}
      {showFacultyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Add Faculty</h3>
                <p className="text-xs sm:text-sm text-gray-500">Add a single faculty or import CSV</p>
              </div>
              <button
                onClick={() => setShowFacultyModal(false)}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto max-h-[calc(90vh-140px)] sm:max-h-[calc(90vh-160px)]">
              {/* Import CSV Option */}
              <div className="mb-4 sm:mb-5 p-3 sm:p-4 border border-dashed border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-white rounded-lg border border-gray-200">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">Import from CSV</p>
                      <p className="text-xs text-gray-500">Bulk add faculty</p>
                    </div>
                  </div>
                  <label
                    htmlFor="faculty-csv-upload-modal"
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors w-full sm:w-auto text-center"
                  >
                    Choose File
                  </label>
                  <input
                    ref={facultyFileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      handleFacultyCSVUpload(e);
                      setShowFacultyModal(false);
                    }}
                    className="hidden"
                    id="faculty-csv-upload-modal"
                  />
                </div>
              </div>

              <div className="relative mb-4 sm:mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500">or add manually</span>
                </div>
              </div>

              {/* Manual Form */}
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newFaculty.name}
                    onChange={e => setNewFaculty({ ...newFaculty, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none"
                    placeholder="Enter faculty name"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={newFaculty.email}
                      onChange={e => {
                        setNewFaculty({ ...newFaculty, email: e.target.value });
                        if (facultyEmailError) setFacultyEmailError('');
                      }}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-gray-300 outline-none ${
                        facultyEmailError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                      placeholder="name@somaiya.edu"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hidden sm:block">@somaiya.edu</span>
                  </div>
                  {facultyEmailError && (
                    <p className="text-xs text-red-500 mt-1">{facultyEmailError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Faculty Code</label>
                  <input
                    type="text"
                    value={newFaculty.facultyCode}
                    onChange={e => setNewFaculty({ ...newFaculty, facultyCode: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none"
                    placeholder="e.g. PPM"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex justify-end gap-2 sm:gap-3 bg-gray-50">
              <button
                onClick={() => setShowFacultyModal(false)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFaculty}
                disabled={isAddingFaculty}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAddingFaculty && (
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isAddingFaculty ? 'Adding...' : 'Add Faculty'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditStudentModal && editingStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Edit Student</h3>
                <p className="text-xs sm:text-sm text-gray-500">Update student details</p>
              </div>
              <button
                onClick={() => { setShowEditStudentModal(false); setEditingStudent(null); }}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto max-h-[calc(90vh-140px)] sm:max-h-[calc(90vh-160px)]">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingStudent.name}
                    disabled
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingStudent.email}
                    disabled
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 truncate"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Semester</label>
                    <select
                      value={editingStudent.semester}
                      onChange={e => setEditingStudent({ ...editingStudent, semester: parseInt(e.target.value) })}
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 outline-none"
                    >
                      {[1,2,3,4,5,6,7,8].map(s => (
                        <option key={s} value={s}>Sem {s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Course</label>
                    <select
                      value={editingStudent.course}
                      onChange={e => setEditingStudent({ ...editingStudent, course: e.target.value })}
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 outline-none"
                    >
                      <option value="IT">IT</option>
                      <option value="AIDS">AI&DS</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Division</label>
                    <select
                      value={editingStudent.division}
                      onChange={e => setEditingStudent({ ...editingStudent, division: e.target.value })}
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 outline-none"
                    >
                      {['A', 'B', 'C', 'D'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Batch</label>
                    <select
                      value={editingStudent.batch}
                      onChange={e => setEditingStudent({ ...editingStudent, batch: e.target.value })}
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 outline-none"
                    >
                      {['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Honours / Minor Fields */}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Honours / Minor (leave empty if not enrolled)</p>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Honours Course</label>
                      <input
                        type="text"
                        value={editingStudent.honours_course}
                        onChange={e => setEditingStudent({ ...editingStudent, honours_course: e.target.value })}
                        className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 outline-none"
                        placeholder="e.g. Honours-ML"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Honours Batch</label>
                      <input
                        type="text"
                        value={editingStudent.honours_batch}
                        onChange={e => setEditingStudent({ ...editingStudent, honours_batch: e.target.value })}
                        className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 outline-none"
                        placeholder="e.g. H1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex justify-end gap-2 sm:gap-3 bg-gray-50">
              <button
                onClick={() => { setShowEditStudentModal(false); setEditingStudent(null); }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStudent}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Preview Modal - Students */}
      {showCSVPreviewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Import Students</h3>
                <p className="text-xs sm:text-sm text-gray-500">{csvStudents.length} students found</p>
              </div>
              <button
                onClick={() => { setShowCSVPreviewModal(false); setCsvStudents([]); }}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-3 sm:px-6 py-4 sm:py-5 overflow-y-auto max-h-[calc(90vh-160px)] sm:max-h-[calc(90vh-180px)]">
              <div className="border border-gray-100 rounded-lg overflow-x-auto">
                <table className="w-full text-xs sm:text-sm min-w-[400px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-3 w-10"></th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Course</th>
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
                        <td className="py-3 px-3 text-gray-600 text-xs">{student.course === 'AIDS' ? 'AI & DS' : 'IT'}</td>
                        <td className="py-3 px-3 text-gray-600">{student.semester}</td>
                        <td className="py-3 px-3 text-gray-600">{student.division}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50">
              <span className="text-xs sm:text-sm text-gray-500">
                {csvStudents.filter(s => s.selected).length} of {csvStudents.length} selected
                {csvStudents.filter(s => s.selected && s.exists).length > 0 && 
                  ` (${csvStudents.filter(s => s.selected && s.exists).length} updating)`}
              </span>
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => { setShowCSVPreviewModal(false); setCsvStudents([]); }}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCSVImport}
                  disabled={isUploading || csvStudents.filter(s => s.selected).length === 0}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Processing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Preview Modal - Faculty */}
      {showFacultyCSVPreviewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Import Faculty</h3>
                <p className="text-xs sm:text-sm text-gray-500">{csvFaculty.length} faculty found</p>
              </div>
              <button
                onClick={() => { setShowFacultyCSVPreviewModal(false); setCsvFaculty([]); }}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-3 sm:px-6 py-4 sm:py-5 overflow-y-auto max-h-[calc(90vh-160px)] sm:max-h-[calc(90vh-180px)]">
              <div className="border border-gray-100 rounded-lg overflow-x-auto">
                <table className="w-full text-xs sm:text-sm min-w-[350px]">
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
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50">
              <span className="text-xs sm:text-sm text-gray-500">
                {csvFaculty.filter(f => f.selected && !f.exists).length} of {csvFaculty.filter(f => !f.exists).length} selected
              </span>
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => { setShowFacultyCSVPreviewModal(false); setCsvFaculty([]); }}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmFacultyCSVImport}
                  disabled={isUploading || csvFaculty.filter(f => f.selected && !f.exists).length === 0}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

export default function UserManagementPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <UserManagementContent />
    </ProtectedRoute>
  );
}
