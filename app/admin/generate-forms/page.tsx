'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, CheckCircleIcon } from '@/components/Icons';

type FormType = 'division' | 'batch';

interface Faculty {
  id: string;
  name: string;
  email: string;
}

interface FormEntry {
  subjectName: string;
  facultyName: string;
  facultyEmail: string;
  division: string;
  year: string;
  course: string;
  batch?: string;
  formType: FormType;
}

export default function GenerateFormsPage() {
  const [formType, setFormType] = useState<FormType>('division');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [facultySearch, setFacultySearch] = useState('');
  const [showFacultyDropdown, setShowFacultyDropdown] = useState(false);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [generatedForms, setGeneratedForms] = useState<FormEntry[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(true);
  const facultyDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (facultyDropdownRef.current && !facultyDropdownRef.current.contains(event.target as Node)) {
        setShowFacultyDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch faculty list on mount
  useEffect(() => {
    async function fetchFaculty() {
      try {
        const res = await fetch('/api/admin/faculty');
        if (res.ok) {
          const data = await res.json();
          setFacultyList(data);
        }
      } catch (error) {
        console.error('Error fetching faculty:', error);
      } finally {
        setIsLoadingFaculty(false);
      }
    }
    fetchFaculty();
  }, []);

  // Get selected faculty details
  const selectedFaculty = facultyList.find(f => f.id === selectedFacultyId);

  // Filter faculty based on search
  const filteredFaculty = facultyList.filter(f =>
    f.name.toLowerCase().includes(facultySearch.toLowerCase()) ||
    f.email.toLowerCase().includes(facultySearch.toLowerCase())
  );

  const handleFacultySelect = (faculty: Faculty) => {
    setSelectedFacultyId(faculty.id);
    setFacultySearch(faculty.name);
    setShowFacultyDropdown(false);
  };

  const divisions = ['A', 'B', 'C', 'D'];
  const years = [
    { value: '1', label: 'First Year' },
    { value: '2', label: 'Second Year' },
    { value: '3', label: 'Third Year' },
    { value: '4', label: 'Fourth Year' },
  ];
  const courses = [
    { value: 'IT', label: 'Information Technology' },
    { value: 'AIDS', label: 'AI & Data Science' },
  ];
  const batches = selectedDivision
    ? [`${selectedDivision}1`, `${selectedDivision}2`, `${selectedDivision}3`]
    : [];

  const resetForm = () => {
    setSubjectName('');
    setSelectedFacultyId('');
    setFacultySearch('');
  };

  const handleDivisionChange = (division: string) => {
    setSelectedDivision(division);
    setSelectedBatch('');
  };

  const canAddForm = () => {
    if (!selectedYear || !selectedCourse || !selectedDivision || !subjectName.trim() || !selectedFacultyId) {
      return false;
    }
    if (formType === 'batch' && !selectedBatch) {
      return false;
    }
    return true;
  };

  const addFormToList = () => {
    if (!canAddForm()) {
      setErrorMessage('Please fill all required fields');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (!selectedFaculty) {
      setErrorMessage('Please select a faculty');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const isDuplicate = generatedForms.some(f =>
      f.subjectName.toLowerCase() === subjectName.toLowerCase().trim() &&
      f.facultyEmail.toLowerCase() === selectedFaculty.email.toLowerCase() &&
      f.division === selectedDivision && f.year === selectedYear && f.course === selectedCourse &&
      (formType === 'division' ? !f.batch : f.batch === selectedBatch)
    );

    if (isDuplicate) {
      setErrorMessage('This form already exists in the list!');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const newEntry: FormEntry = {
      subjectName: subjectName.trim(),
      facultyName: selectedFaculty.name,
      facultyEmail: selectedFaculty.email,
      division: selectedDivision,
      year: selectedYear,
      course: selectedCourse,
      formType,
      ...(formType === 'batch' && { batch: selectedBatch }),
    };

    setGeneratedForms([...generatedForms, newEntry]);
    resetForm();
  };

  const removeFormFromList = (index: number) => {
    setGeneratedForms(generatedForms.filter((_, i) => i !== index));
  };

  const generateAllForms = async () => {
    if (generatedForms.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forms: generatedForms }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate forms');
      }

      const data = await res.json();
      setSuccessMessage(data.message || `Successfully generated ${generatedForms.length} feedback form(s)!`);
      setGeneratedForms([]);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate forms');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCourseName = (code: string) => courses.find(c => c.value === code)?.label || code;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Generate Forms</h1>
        <p className="text-gray-500 text-sm mt-1">Create feedback forms for divisions or batches</p>
      </div>

      {successMessage && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm">
          <CheckCircleIcon className="w-4 h-4 text-green-600" />
          <span className="text-green-700">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setFormType('division'); setSelectedBatch(''); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              formType === 'division'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Division (Theory)
          </button>
          <button
            onClick={() => setFormType('batch')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              formType === 'batch'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Batch (Lab)
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
            >
              <option value="">Select year</option>
              {years.map(y => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>
          </div>

          {selectedYear && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
              >
                <option value="">Select course</option>
                {courses.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

          {selectedCourse && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Division</label>
              <select
                value={selectedDivision}
                onChange={(e) => handleDivisionChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
              >
                <option value="">Select division</option>
                {divisions.map(div => (
                  <option key={div} value={div}>Division {div}</option>
                ))}
              </select>
            </div>
          )}

          {formType === 'batch' && selectedDivision && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Batch</label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
              >
                <option value="">Select batch</option>
                {batches.map(batch => (
                  <option key={batch} value={batch}>Batch {batch}</option>
                ))}
              </select>
            </div>
          )}

          {selectedDivision && (formType === 'division' || selectedBatch) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject Name</label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g., Machine Learning"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>

              <div className="relative" ref={facultyDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Faculty</label>
                <input
                  type="text"
                  value={facultySearch}
                  onChange={(e) => {
                    setFacultySearch(e.target.value);
                    setSelectedFacultyId('');
                    setShowFacultyDropdown(true);
                  }}
                  onFocus={() => setShowFacultyDropdown(true)}
                  disabled={isLoadingFaculty}
                  placeholder={isLoadingFaculty ? 'Loading faculty...' : 'Search faculty by name...'}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors disabled:opacity-50"
                />
                {showFacultyDropdown && !isLoadingFaculty && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredFaculty.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-400">No faculty found</div>
                    ) : (
                      filteredFaculty.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleFacultySelect(f)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                            selectedFacultyId === f.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          <div className="font-medium">{f.name}</div>
                          <div className="text-xs text-gray-400">{f.email}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {selectedFaculty && (
                  <p className="text-xs text-green-600 mt-1">✓ {selectedFaculty.email}</p>
                )}
              </div>
            </>
          )}

          <button
            onClick={addFormToList}
            disabled={!canAddForm()}
            className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              canAddForm()
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <PlusIcon className="w-4 h-4" />
            Add to List
          </button>
        </div>
      </div>

      {generatedForms.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Forms to Generate ({generatedForms.length})
            </h2>
            <button
              onClick={generateAllForms}
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Generating...' : 'Generate All'}
            </button>
          </div>

          <div className="space-y-2">
            {generatedForms.map((form, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {form.subjectName}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {form.facultyName} • Year {form.year} • {getCourseName(form.course)} • Div {form.division}{form.batch && ` / ${form.batch}`}
                  </div>
                </div>
                <button
                  onClick={() => removeFormFromList(index)}
                  className="ml-3 text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-sm text-gray-500">
        <Link href="/admin/feedback" className="text-blue-600 hover:text-blue-700">
          View all forms
        </Link>
      </div>
    </div>
  );
}
