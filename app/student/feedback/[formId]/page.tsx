'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Toast from '@/components/Toast';
import { ArrowLeftIcon } from '@/components/Icons';
import {
  getFeedbackFormById,
  getSubjectById,
  getFacultyById,
  feedbackParameters,
  addFeedbackResponse,
  FeedbackResponse,
} from '@/lib/mockData';

interface PageProps {
  params: { formId: string };
}

export default function FeedbackFormPage({ params }: PageProps) {
  const router = useRouter();
  const form = getFeedbackFormById(params.formId);
  const subject = form ? getSubjectById(form.subjectId) : null;
  const faculty = form ? getFacultyById(form.facultyId) : null;

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!form || !subject || !faculty) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Form Not Found</h2>
          <p className="text-gray-600 mb-4">The feedback form you&apos;re looking for doesn&apos;t exist.</p>
          <Button href="/student/dashboard">Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  const handleRatingChange = (parameterId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [parameterId]: rating }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Create feedback response
    const response: FeedbackResponse = {
      id: `resp_${Date.now()}`,
      formId: form.id,
      studentId: 'stu1', // Mock student
      answers: feedbackParameters.map(p => ({
        parameterId: p.id,
        rating: ratings[p.id] || 0,
      })),
      comment,
      submittedAt: new Date().toISOString().split('T')[0],
    };

    // Add to mock data
    addFeedbackResponse(response);

    setTimeout(() => {
      setShowToast(true);
      setTimeout(() => {
        router.push('/student/dashboard');
      }, 1500);
    }, 500);
  };

  const allParametersRated = feedbackParameters.every(p => ratings[p.id] !== undefined);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {showToast && (
        <Toast
          message="Feedback submitted successfully!"
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="mb-6">
        <Button href="/student/dashboard" variant="outline" size="sm" className="mb-4">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Feedback for {subject.name}</h1>
        <p className="text-gray-600 mt-1">Faculty: {faculty.name}</p>
        <div className="flex gap-4 mt-2 text-sm text-gray-500">
          <span>Code: {subject.code}</span>
          <span>Division: {form.division}</span>
          {form.batch && <span>Batch: {form.batch}</span>}
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            subject.type === 'theory' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {subject.type === 'theory' ? 'Theory' : 'Practical'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Rate Each Parameter</h2>
            <p className="text-sm text-gray-500 mt-1">
              Please rate each aspect on a scale of 0 to 10 (0 = Very Poor, 10 = Excellent)
            </p>
          </div>
          <div className="p-6 space-y-8">
            {feedbackParameters.map((param, index) => (
              <div key={param.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                <label className="block text-sm font-medium text-gray-900 mb-4">
                  {index + 1}. {param.text}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleRatingChange(param.id, rating)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium border-2 transition-all ${
                        ratings[param.id] === rating
                          ? 'bg-blue-600 text-white border-blue-600 scale-110'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
                {ratings[param.id] !== undefined && (
                  <p className="text-sm text-gray-500 mt-2">
                    Your rating: <span className="font-semibold text-blue-600">{ratings[param.id]}/10</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="mb-6">
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Additional Feedback / Comments (Optional)
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Share any additional feedback, suggestions, or comments about this subject/faculty..."
            />
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button href="/student/dashboard" variant="outline">Cancel</Button>
          <Button type="submit" disabled={!allParametersRated || isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </form>
    </div>
  );
}
