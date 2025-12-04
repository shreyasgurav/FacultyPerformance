'use client';

import { useState } from 'react';
import Card, { StatCard } from '@/components/Card';
import Button from '@/components/Button';
import Toast from '@/components/Toast';
import { ArrowLeftIcon, DownloadIcon, StarIcon } from '@/components/Icons';
import {
  faculty,
  subjects,
  feedbackForms,
  departments,
  getFacultyById,
  getSubjectById,
  getDepartmentById,
  getFeedbackResponsesByFormId,
  calculateFormAverageScore,
  getFeedbackFormsForFaculty,
} from '@/lib/mockData';

export default function ReportsPage() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Calculate faculty-wise averages
  const facultyStats = faculty.map(fac => {
    const forms = getFeedbackFormsForFaculty(fac.id);
    let totalScore = 0;
    let scoreCount = 0;
    
    forms.forEach(form => {
      const avg = calculateFormAverageScore(form.id);
      if (avg > 0) {
        totalScore += avg;
        scoreCount++;
      }
    });
    
    return {
      faculty: fac,
      department: getDepartmentById(fac.departmentId),
      subjectCount: forms.length,
      avgRating: scoreCount > 0 ? totalScore / scoreCount : 0,
      responseCount: forms.reduce((sum, f) => sum + getFeedbackResponsesByFormId(f.id).length, 0),
    };
  }).filter(s => s.subjectCount > 0).sort((a, b) => b.avgRating - a.avgRating);

  // Calculate subject-wise averages
  const subjectStats = subjects.map(sub => {
    const forms = feedbackForms.filter(f => f.subjectId === sub.id);
    let totalScore = 0;
    let scoreCount = 0;
    
    forms.forEach(form => {
      const avg = calculateFormAverageScore(form.id);
      if (avg > 0) {
        totalScore += avg;
        scoreCount++;
      }
    });
    
    const fac = forms.length > 0 ? getFacultyById(forms[0].facultyId) : null;
    
    return {
      subject: sub,
      department: getDepartmentById(sub.departmentId),
      faculty: fac,
      avgRating: scoreCount > 0 ? totalScore / scoreCount : 0,
      responseCount: forms.reduce((sum, f) => sum + getFeedbackResponsesByFormId(f.id).length, 0),
    };
  }).filter(s => s.responseCount > 0).sort((a, b) => b.avgRating - a.avgRating);

  // Calculate department averages
  const deptStats = departments.map(dept => {
    const deptSubjects = subjects.filter(s => s.departmentId === dept.id);
    let totalScore = 0;
    let scoreCount = 0;
    
    deptSubjects.forEach(sub => {
      const forms = feedbackForms.filter(f => f.subjectId === sub.id);
      forms.forEach(form => {
        const avg = calculateFormAverageScore(form.id);
        if (avg > 0) {
          totalScore += avg;
          scoreCount++;
        }
      });
    });
    
    return {
      department: dept,
      avgRating: scoreCount > 0 ? totalScore / scoreCount : 0,
    };
  }).filter(d => d.avgRating > 0);

  const overallAvg = deptStats.length > 0
    ? deptStats.reduce((sum, d) => sum + d.avgRating, 0) / deptStats.length
    : 0;

  const highestRatedFaculty = facultyStats.length > 0 ? facultyStats[0] : null;
  const lowestRatedSubject = subjectStats.length > 0 ? subjectStats[subjectStats.length - 1] : null;

  const handleDownload = (type: string) => {
    setToastMessage(`${type} download started! (Mock)`);
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
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">View department-wise analytics and export reports</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <StarIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Highest Rated Faculty</p>
              <p className="font-semibold text-gray-900">
                {highestRatedFaculty?.faculty.name || 'N/A'}
              </p>
              {highestRatedFaculty && (
                <p className="text-sm text-green-600">{highestRatedFaculty.avgRating.toFixed(1)}/10</p>
              )}
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <StarIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Lowest Rated Subject</p>
              <p className="font-semibold text-gray-900">
                {lowestRatedSubject?.subject.name || 'N/A'}
              </p>
              {lowestRatedSubject && (
                <p className="text-sm text-red-600">{lowestRatedSubject.avgRating.toFixed(1)}/10</p>
              )}
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <StarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Overall Department Average</p>
              <p className="font-semibold text-gray-900">{overallAvg.toFixed(1)}/10</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Faculty-wise Summary */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Faculty-wise Summary</h2>
            <Button size="sm" variant="outline" onClick={() => handleDownload('Faculty Report (Excel)')}>
              <DownloadIcon className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Rank</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Faculty Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Department</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Subjects</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Responses</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Avg Rating</th>
                </tr>
              </thead>
              <tbody>
                {facultyStats.map((stat, index) => (
                  <tr key={stat.faculty.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">#{index + 1}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{stat.faculty.name}</td>
                    <td className="py-3 px-4 text-gray-700">{stat.department?.name}</td>
                    <td className="py-3 px-4 text-gray-700">{stat.subjectCount}</td>
                    <td className="py-3 px-4 text-gray-700">{stat.responseCount}</td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${
                        stat.avgRating >= 8 ? 'text-green-600' :
                        stat.avgRating >= 6 ? 'text-blue-600' :
                        stat.avgRating >= 4 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {stat.avgRating.toFixed(1)}/10
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Subject-wise Summary */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Subject-wise Summary</h2>
            <Button size="sm" variant="outline" onClick={() => handleDownload('Subject Report (Excel)')}>
              <DownloadIcon className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Subject</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Code</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Faculty</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Responses</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Avg Rating</th>
                </tr>
              </thead>
              <tbody>
                {subjectStats.map(stat => (
                  <tr key={stat.subject.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{stat.subject.name}</td>
                    <td className="py-3 px-4 text-gray-700">{stat.subject.code}</td>
                    <td className="py-3 px-4 text-gray-700">{stat.faculty?.name || '-'}</td>
                    <td className="py-3 px-4 text-gray-700">{stat.responseCount}</td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${
                        stat.avgRating >= 8 ? 'text-green-600' :
                        stat.avgRating >= 6 ? 'text-blue-600' :
                        stat.avgRating >= 4 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {stat.avgRating.toFixed(1)}/10
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Download Buttons */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Reports</h2>
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => handleDownload('Department Report (PDF)')}>
              <DownloadIcon className="w-4 h-4 mr-2" />
              Download Department Report (PDF)
            </Button>
            <Button variant="outline" onClick={() => handleDownload('Subject-wise Report (Excel)')}>
              <DownloadIcon className="w-4 h-4 mr-2" />
              Download Subject-wise Report (Excel)
            </Button>
            <Button variant="outline" onClick={() => handleDownload('Faculty-wise Report (Excel)')}>
              <DownloadIcon className="w-4 h-4 mr-2" />
              Download Faculty-wise Report (Excel)
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Note: Download functionality is simulated in this prototype.
          </p>
        </div>
      </Card>
    </div>
  );
}
