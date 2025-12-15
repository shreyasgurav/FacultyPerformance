'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@/components/Icons';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackParameter {
  id: string;
  text: string;
  position: number;
  form_type: string;
  question_type: string;
}

const QUESTION_TYPES = [
  { value: 'scale_3', label: '3-Option Scale (Need improvement, Satisfactory, Good)' },
  { value: 'scale_1_10', label: 'Rating Scale (1-10)' },
  { value: 'yes_no', label: 'Yes/No' },
];

function FormEditorContent() {
  const { authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<'theory' | 'lab'>('theory');
  const [parameters, setParameters] = useState<FeedbackParameter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingParam, setEditingParam] = useState<FeedbackParameter | null>(null);
  const [deleteParam, setDeleteParam] = useState<FeedbackParameter | null>(null);
  const [editText, setEditText] = useState('');
  const [editType, setEditType] = useState('');
  const [newQuestion, setNewQuestion] = useState({ text: '', question_type: 'scale_3' });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    fetchParameters();
  }, []);

  const fetchParameters = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/admin/feedback-parameters');
      if (res.ok) {
        const data = await res.json();
        setParameters(data);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to load parameters');
      }
    } catch (error) {
      console.error('Error fetching parameters:', error);
      setErrorMessage('Failed to load parameters');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredParams = parameters
    .filter(p => p.form_type === activeTab)
    .sort((a, b) => a.position - b.position);

  const handleOpenEdit = (param: FeedbackParameter) => {
    setEditingParam(param);
    setEditText(param.text);
    setEditType(param.question_type);
    setShowEditModal(true);
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    setEditingParam(null);
    setEditText('');
    setEditType('');
  };

  const handleSaveEdit = async () => {
    if (!editingParam || !editText.trim()) return;

    setIsSaving(true);
    try {
      const res = await authFetch('/api/admin/feedback-parameters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingParam.id,
          text: editText.trim(),
          question_type: editType,
        }),
      });

      if (res.ok) {
        setParameters(prev =>
          prev.map(p =>
            p.id === editingParam.id
              ? { ...p, text: editText.trim(), question_type: editType }
              : p
          )
        );
        setSuccessMessage('Question updated successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        handleCloseEdit();
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to update');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    } catch (error) {
      setErrorMessage('Failed to update question');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.text.trim()) return;

    setIsSaving(true);
    try {
      const maxPosition = filteredParams.length > 0
        ? Math.max(...filteredParams.map(p => p.position))
        : 0;

      const res = await authFetch('/api/admin/feedback-parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newQuestion.text.trim(),
          position: maxPosition + 1,
          form_type: activeTab,
          question_type: newQuestion.question_type,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setParameters(prev => [...prev, created]);
        setNewQuestion({ text: '', question_type: 'scale_3' });
        setShowAddModal(false);
        setSuccessMessage('Question added successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to add question');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    } catch (error) {
      setErrorMessage('Failed to add question');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDelete = (param: FeedbackParameter) => {
    setDeleteParam(param);
    setShowDeleteModal(true);
  };

  const handleCloseDelete = () => {
    setShowDeleteModal(false);
    setDeleteParam(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteParam) return;

    setIsSaving(true);
    try {
      const res = await authFetch(`/api/admin/feedback-parameters?id=${deleteParam.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setParameters(prev => prev.filter(p => p.id !== deleteParam.id));
        setSuccessMessage('Question deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        handleCloseDelete();
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to delete');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    } catch (error) {
      setErrorMessage('Failed to delete question');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    return QUESTION_TYPES.find(t => t.value === type)?.label || type;
  };

  const handleResetToDefault = async () => {
    setIsResetting(true);
    try {
      const res = await authFetch('/api/admin/feedback-parameters/reset', {
        method: 'POST',
      });

      if (res.ok) {
        await fetchParameters();
        setSuccessMessage('Form reset to default questions successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to reset');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    } catch (error) {
      setErrorMessage('Failed to reset form');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="animate-pulse space-y-4">
          <div className="w-8 h-8 bg-gray-200 rounded-lg mb-3"></div>
          <div className="h-6 sm:h-8 bg-gray-200 rounded w-32 sm:w-48"></div>
          <div className="h-4 bg-gray-100 rounded w-48 sm:w-64"></div>
          <div className="flex gap-2 mt-4">
            <div className="h-8 sm:h-10 bg-gray-100 rounded-lg w-24 sm:w-32"></div>
            <div className="h-8 sm:h-10 bg-gray-100 rounded-lg w-24 sm:w-32"></div>
          </div>
          <div className="h-64 bg-gray-100 rounded-xl sm:rounded-2xl mt-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <Link
          href="/admin/dashboard"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-3"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-start justify-between gap-3 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Form Editor</h1>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="p-1.5 sm:p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                title="Reset to Default"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-900 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Add Question</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">Customize feedback form questions</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-green-50 border border-green-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-green-700">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6">
        <button
          onClick={() => setActiveTab('theory')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            activeTab === 'theory'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Theory ({parameters.filter(p => p.form_type === 'theory').length})
        </button>
        <button
          onClick={() => setActiveTab('lab')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            activeTab === 'lab'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Lab ({parameters.filter(p => p.form_type === 'lab').length})
        </button>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 overflow-hidden">
        {filteredParams.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <p className="text-gray-400 text-sm">No questions yet. Add your first question.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredParams.map((param, index) => (
              <div key={param.id} className="p-3 sm:p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start gap-2 sm:gap-3">
                  {/* Position Number */}
                  <span className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-gray-100 rounded-full text-[10px] sm:text-xs font-medium text-gray-500 mt-0.5 flex-shrink-0">
                    {index + 1}
                  </span>

                  {/* Question Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-900 leading-relaxed">{param.text}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">{getQuestionTypeLabel(param.question_type)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleOpenEdit(param)}
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleOpenDelete(param)}
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Add Question</h3>
                <p className="text-xs sm:text-sm text-gray-500">Add a new question to {activeTab} form</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewQuestion({ text: '', question_type: 'scale_3' });
                }}
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
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Question Text</label>
                  <textarea
                    value={newQuestion.text}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Enter your question..."
                    className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none resize-none"
                    rows={3}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Response Type</label>
                  <select
                    value={newQuestion.question_type}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, question_type: e.target.value }))}
                    className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none"
                  >
                    {QUESTION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">#{filteredParams.length + 1}</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Will be added as question <span className="font-medium">#{filteredParams.length + 1}</span></p>
                      <p className="text-xs text-gray-400">Form type: {activeTab === 'theory' ? 'Theory' : 'Lab'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewQuestion({ text: '', question_type: 'scale_3' });
                }}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuestion}
                disabled={!newQuestion.text.trim() || isSaving}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving && (
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isSaving ? 'Adding...' : 'Add Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {showEditModal && editingParam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Edit Question</h3>
                <p className="text-xs sm:text-sm text-gray-500">Modify question text and response type</p>
              </div>
              <button
                onClick={handleCloseEdit}
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
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Question Text</label>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder="Enter your question..."
                    className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none resize-none"
                    rows={3}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Response Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none"
                  >
                    {QUESTION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-blue-700">
                      Question #{editingParam.position} • {editingParam.form_type === 'theory' ? 'Theory' : 'Lab'} form
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2 sm:gap-3">
              <button
                onClick={handleCloseEdit}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editText.trim() || isSaving}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving && (
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteParam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <TrashIcon className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Delete Question</h3>
              </div>
              
              <p className="text-xs sm:text-sm text-gray-600 mb-3">
                Are you sure you want to delete this question? This action cannot be undone.
              </p>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs sm:text-sm text-gray-700 line-clamp-3">&ldquo;{deleteParam.text}&rdquo;</p>
                <p className="text-xs text-gray-400 mt-1">{getQuestionTypeLabel(deleteParam.question_type)}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2 sm:gap-3">
              <button
                onClick={handleCloseDelete}
                disabled={isSaving}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isSaving}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && (
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isSaving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Reset to Default</h3>
              </div>
              
              <p className="text-xs sm:text-sm text-gray-600">
                This will delete all current questions and restore the original default questions for both Theory and Lab forms. This action cannot be undone.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefault}
                disabled={isResetting}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isResetting && (
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isResetting ? 'Resetting...' : 'Yes, Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FormEditorPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <FormEditorContent />
    </ProtectedRoute>
  );
}
