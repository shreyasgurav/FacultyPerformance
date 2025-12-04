'use client';

import Link from 'next/link';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { ArrowLeftIcon } from '@/components/Icons';
import {
  getSubjectById,
  getFeedbackFormsBySubjectId,
  getFeedbackResponsesByFormId,
  feedbackParameters,
  calculateParameterAverages,
  getCommentsForSubject,
} from '@/lib/mockData';

interface PageProps {
  params: { subjectId: string };
}

export default function SubjectFeedbackPage({ params }: PageProps) {
  const subject = getSubjectById(params.subjectId);
  const forms = getFeedbackFormsBySubjectId(params.subjectId);
  const formIds = forms.map(f => f.id);
  
  // Calculate totals
  const totalResponses = forms.reduce(
    (sum, form) => sum + getFeedbackResponsesByFormId(form.id).length, 0
  );
  
  // Calculate parameter averages
  const parameterAverages = calculateParameterAverages(formIds);
  
  // Calculate overall average
  const overallAvg = parameterAverages.length > 0
    ? parameterAverages.reduce((sum, p) => sum + p.average, 0) / parameterAverages.length
    : 0;
  
  // Get comments
  const comments = getCommentsForSubject(params.subjectId);

  if (!subject) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Subject Not Found</h2>
          <p className="text-gray-600 mb-4">The subject you&apos;re looking for doesn&apos;t exist.</p>
          <Button href="/faculty/dashboard">Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Button href="/faculty/dashboard" variant="outline" size="sm" className="mb-4">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Feedback Summary – {subject.name}</h1>
        <div className="flex gap-4 mt-2 text-sm text-gray-500">
          <span>Code: {subject.code}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            subject.type === 'theory' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {subject.type === 'theory' ? 'Theory' : 'Practical'}
          </span>
        </div>
      </div>

      {/* Overall Scores */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Overall Scores</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{overallAvg.toFixed(1)}</p>
              <p className="text-sm text-gray-600 mt-1">Overall Average (out of 10)</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{totalResponses}</p>
              <p className="text-sm text-gray-600 mt-1">Student Responses</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">{forms.length}</p>
              <p className="text-sm text-gray-600 mt-1">Feedback Forms</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Parameter-wise Averages */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Parameter-wise Averages</h2>
          {totalResponses === 0 ? (
            <p className="text-gray-500 text-center py-4">No feedback responses yet.</p>
          ) : (
            <div className="space-y-4">
              {parameterAverages.map(({ parameterId, average }) => {
                const param = feedbackParameters.find(p => p.id === parameterId);
                const percentage = (average / 10) * 100;
                return (
                  <div key={parameterId}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{param?.text}</span>
                      <span className="text-sm font-semibold text-gray-900">{average.toFixed(1)} / 10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          average >= 8 ? 'bg-green-500' :
                          average >= 6 ? 'bg-blue-500' :
                          average >= 4 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Student Comments */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Comments</h2>
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No comments yet.</p>
          ) : (
            <div className="space-y-4">
              {comments.map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-gray-700 italic">&ldquo;{item.comment}&rdquo;</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Division {item.division}{item.batch ? ` / Batch ${item.batch}` : ''} • Anonymous
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> This is a read-only view. Faculty members cannot edit or delete feedback.
        </p>
      </div>
    </div>
  );
}
