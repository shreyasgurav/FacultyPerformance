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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editType, setEditType] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '', question_type: 'scale_3' });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
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

  const handleStartEdit = (param: FeedbackParameter) => {
    setEditingId(param.id);
    setEditText(param.text);
    setEditType(param.question_type);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditType('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return;

    setIsSaving(true);
    try {
      const res = await authFetch('/api/admin/feedback-parameters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          text: editText.trim(),
          question_type: editType,
        }),
      });

      if (res.ok) {
        setParameters(prev =>
          prev.map(p =>
            p.id === editingId
              ? { ...p, text: editText.trim(), question_type: editType }
              : p
          )
        );
        setSuccessMessage('Question updated successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        handleCancelEdit();
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

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      const res = await authFetch(`/api/admin/feedback-parameters?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setParameters(prev => prev.filter(p => p.id !== id));
        setSuccessMessage('Question deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
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
      setDeleteConfirm(null);
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/dashboard"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mb-3"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Form Editor</h1>
            <p className="text-sm text-gray-500 mt-1">Customize feedback form questions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset to Default
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Question
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('theory')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'theory'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Theory Form ({parameters.filter(p => p.form_type === 'theory').length})
        </button>
        <button
          onClick={() => setActiveTab('lab')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'lab'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Lab Form ({parameters.filter(p => p.form_type === 'lab').length})
        </button>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filteredParams.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400">No questions yet. Add your first question.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredParams.map((param, index) => (
              <div key={param.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                {editingId === param.id ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex items-center gap-3">
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        {QUESTION_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex items-start gap-3">
                    {/* Position Number */}
                    <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-xs font-medium text-gray-500 mt-0.5">
                      {index + 1}
                    </span>

                    {/* Question Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 leading-relaxed">{param.text}</p>
                      <p className="text-xs text-gray-400 mt-1">{getQuestionTypeLabel(param.question_type)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(param)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {deleteConfirm === param.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(param.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(param.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Question</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Question Text</label>
                <textarea
                  value={newQuestion.text}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Enter your question..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Response Type</label>
                <select
                  value={newQuestion.question_type}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, question_type: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {QUESTION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Adding to: <span className="font-medium text-gray-700">{activeTab === 'theory' ? 'Theory Form' : 'Lab Form'}</span></p>
                <p className="text-xs text-gray-400">Position: #{filteredParams.length + 1}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewQuestion({ text: '', question_type: 'scale_3' });
                }}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuestion}
                disabled={!newQuestion.text.trim() || isSaving}
                className="px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Adding...' : 'Add Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Reset to Default?</h2>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              This will delete all current questions and restore the original default questions for both Theory and Lab forms. This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefault}
                disabled={isResetting}
                className="px-4 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
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
