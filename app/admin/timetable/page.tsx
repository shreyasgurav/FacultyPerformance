'use client';

import { useState } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Toast from '@/components/Toast';
import { ArrowLeftIcon, UploadIcon, RefreshIcon } from '@/components/Icons';
import {
  timetableEntries,
  subjects,
  faculty,
  feedbackForms,
  getSubjectById,
  getFacultyById,
  generateFormsFromTimetable,
} from '@/lib/mockData';

export default function TimetableUploadPage() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [generatedCount, setGeneratedCount] = useState(0);
  const [localForms, setLocalForms] = useState(feedbackForms);
  const [previewFromUpload, setPreviewFromUpload] = useState<
    Array<{ code: string; name: string; faculty: string; division: string; batch?: string; timeSlot: string }>
  >([]);
  const [previewLabel, setPreviewLabel] = useState<'mock' | 'csv'>('mock');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setToastMessage('Please upload a CSV file.');
      setShowToast(true);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const rows = text.split(/\r?\n/).filter(Boolean);
        if (rows.length === 0) {
          setToastMessage('CSV appears empty.');
          setShowToast(true);
          return;
        }
        // Expect header: code,name,faculty,division,batch,timeSlot
        const header = rows[0].split(',').map(h => h.trim().toLowerCase());
        const idx = {
          code: header.indexOf('code'),
          name: header.indexOf('name'),
          faculty: header.indexOf('faculty'),
          division: header.indexOf('division'),
          batch: header.indexOf('batch'),
          timeSlot: header.indexOf('timeslot'),
        };
        const missing = Object.entries(idx).filter(([k, v]) => v === -1 && k !== 'batch');
        if (missing.length > 0) {
          setToastMessage('CSV missing headers: code,name,faculty,division,timeSlot');
          setShowToast(true);
          return;
        }
        const parsed = rows.slice(1).map(line => {
          const cols = line.split(',');
          return {
            code: cols[idx.code] || '',
            name: cols[idx.name] || '',
            faculty: cols[idx.faculty] || '',
            division: cols[idx.division] || '',
            batch: idx.batch >= 0 ? (cols[idx.batch] || '') : '',
            timeSlot: cols[idx.timeSlot] || '',
          };
        }).filter(r => r.code || r.name);

        setPreviewFromUpload(parsed);
        setPreviewLabel('csv');
        setToastMessage('Timetable CSV uploaded. Preview updated.');
        setShowToast(true);
      } catch (err) {
        setToastMessage('Failed to read CSV.');
        setShowToast(true);
      }
    };
    reader.readAsText(file);
  };

  const handleGenerateForms = () => {
    const newForms = generateFormsFromTimetable();
    setGeneratedCount(newForms.length);
    setLocalForms([...feedbackForms]);
    setToastMessage(
      newForms.length > 0
        ? `Generated ${newForms.length} new feedback forms!`
        : 'All feedback forms already exist for the current timetable.'
    );
    setShowToast(true);
  };

  const currentPreview = previewLabel === 'csv'
    ? previewFromUpload
    : timetableEntries.map(entry => {
        const subject = getSubjectById(entry.subjectId);
        const fac = getFacultyById(entry.facultyId);
        return {
          code: subject?.code || '',
          name: subject?.name || '',
          faculty: fac?.name || '',
          division: entry.division,
          batch: entry.batch || '',
          timeSlot: entry.timeSlot,
        };
      });

  const downloadCsv = () => {
    const header = ['code','name','faculty','division','batch','timeSlot'];
    const lines = [header.join(',')].concat(
      currentPreview.map(r => [r.code, r.name, r.faculty, r.division, r.batch || '', r.timeSlot]
        .map(v => String(v).replace(/,/g, ' ')).join(','))
    );
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable_${previewLabel}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        <h1 className="text-2xl font-bold text-gray-900">Timetable Upload & Form Generation</h1>
        <p className="text-gray-600 mt-1">Upload semester timetable and auto-generate feedback forms</p>
      </div>

      {/* File Upload Section */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Timetable Excel</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <UploadIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Drag and drop your Excel file here, or</p>
            <label className="cursor-pointer">
              <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block">
                Browse Files
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 mt-4">Supported formats: .xlsx, .xls, .csv</p>
          </div>
        </div>
      </Card>

      {/* Sample / Uploaded Timetable Preview */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Timetable Preview</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {previewLabel === 'csv' ? '(From uploaded CSV)' : '(Mock data)'}
              </span>
              <Button size="sm" variant="outline" onClick={downloadCsv}>Download CSV</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Subject Code</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Subject Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Faculty</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Division</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Batch</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Time Slot</th>
                </tr>
              </thead>
              <tbody>
                {currentPreview.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{row.code}</td>
                    <td className="py-3 px-4 text-gray-700">{row.name}</td>
                    <td className="py-3 px-4 text-gray-700">{row.faculty}</td>
                    <td className="py-3 px-4 text-gray-700">{row.division}</td>
                    <td className="py-3 px-4 text-gray-700">{row.batch || '-'}</td>
                    <td className="py-3 px-4 text-gray-500">{row.timeSlot}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {currentPreview.length > 10 && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Showing 10 of {currentPreview.length} entries
            </p>
          )}
        </div>
      </Card>

      {/* Generate Forms Button */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Generate Feedback Forms</h2>
              <p className="text-sm text-gray-600 mt-1">
                Auto-create feedback forms for each subject/division/batch combination
              </p>
            </div>
            <Button onClick={handleGenerateForms}>
              <RefreshIcon className="w-4 h-4 mr-2" />
              Generate Forms
            </Button>
          </div>
        </div>
      </Card>

      {/* Generated Forms Table */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generated Feedback Forms</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Form ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Subject</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Division/Batch</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Faculty</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody>
                {localForms.slice(0, 15).map(form => {
                  const subject = getSubjectById(form.subjectId);
                  const fac = getFacultyById(form.facultyId);
                  return (
                    <tr key={form.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900 font-mono text-xs">{form.id}</td>
                      <td className="py-3 px-4">
                        <p className="text-gray-900">{subject?.name}</p>
                        <p className="text-xs text-gray-500">{subject?.code}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {form.division}{form.batch ? ` / ${form.batch}` : ''}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{fac?.name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          form.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {form.status === 'active' ? 'Active' : 'Closed'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{form.createdAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {localForms.length > 15 && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Showing 15 of {localForms.length} forms
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
