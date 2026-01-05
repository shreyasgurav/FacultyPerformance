'use client';

import Link from 'next/link';
import Card from '@/components/Card';
import {
  UsersIcon,
  MonitorSearchIcon,
  DocumentIcon,
  ChartIcon,
} from '@/components/Icons';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

function AdminDashboardContent() {
  const { userRole, signOut } = useAuth();
  const navCards = [
    {
      title: 'Generate Forms',
      description: 'Create feedback forms for divisions or batches',
      href: '/admin/generate-forms',
      icon: <DocumentIcon className="w-5 h-5 sm:w-7 sm:h-7" />,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
    },
    {
      title: 'User Management',
      description: 'Manage students and faculty accounts',
      href: '/admin/users',
      icon: <UsersIcon className="w-5 h-5 sm:w-7 sm:h-7" />,
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
    },
    {
      title: 'Feedback Monitoring',
      description: 'Monitor feedback collection and status',
      href: '/admin/feedback',
      icon: <MonitorSearchIcon className="w-5 h-5 sm:w-7 sm:h-7" />,
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
    },
    {
      title: 'Reports & Analytics',
      description: 'View department-wise analytics and export reports',
      href: '/admin/reports',
      icon: <ChartIcon className="w-5 h-5 sm:w-7 sm:h-7" />,
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header section - responsive */}
        <div className="flex flex-row items-start justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="flex-1 min-w-0 pr-2">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight">Admin Dashboard</h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1.5 sm:mt-1 leading-relaxed break-words max-w-full">
              Manage the Faculty Curriculum Performance Feedback System
            </p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 whitespace-nowrap"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>

        {/* Quick Action Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {navCards.map(card => (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-white rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6 min-h-[200px] sm:min-h-[240px] md:min-h-[280px] hover:shadow-lg hover:border-gray-200 hover:-translate-y-1 transition-all duration-200 flex flex-col relative"
            >
              {/* Top section: Icon (left) and Arrow (right) */}
              <div className="flex items-start justify-between mb-auto">
              <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl flex items-center justify-center ${card.bgColor} ${card.textColor} group-hover:scale-110 transition-transform duration-200`}
              >
                {card.icon}
                </div>
                <svg 
                  className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              
              {/* Bottom section: Title and Description */}
              <div className="mt-auto">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2">{card.title}</h3>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{card.description}</p>
              </div>
            </Link>
          ))}
        </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
