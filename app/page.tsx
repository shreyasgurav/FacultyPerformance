import Link from 'next/link';
import { UsersIcon, BuildingIcon } from '@/components/Icons';

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 to-slate-100">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full">
        <Link
          href="/student/dashboard"
          className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-blue-400 transition-all"
        >
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
            <UsersIcon className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Continue as Student
          </h2>
          <p className="text-gray-600 text-sm">
            View and submit feedback for your assigned subjects and lab batches.
          </p>
        </Link>

        <Link
          href="/faculty/dashboard"
          className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-green-400 transition-all"
        >
          <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
            <UsersIcon className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Continue as Faculty
          </h2>
          <p className="text-gray-600 text-sm">
            View consolidated feedback scores and student comments for your subjects.
          </p>
        </Link>

        <Link
          href="/admin/dashboard"
          className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-purple-400 transition-all"
        >
          <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
            <BuildingIcon className="w-7 h-7 text-purple-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Continue as Committee
          </h2>
          <p className="text-gray-600 text-sm">
            Upload timetables, manage users, monitor feedback, and generate reports.
          </p>
        </Link>
      </div>

      <div className="mt-12 text-center text-sm text-gray-500">
        <p>This is a prototype for demonstration purposes only.</p>
        <p>No real authentication or Excel parsing is implemented.</p>
      </div>
    </div>
  );
}
