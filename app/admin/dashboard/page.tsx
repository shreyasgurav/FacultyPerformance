'use client';

import Link from 'next/link';
import Card, { StatCard } from '@/components/Card';
import {
  departments,
  faculty,
  students,
  subjects,
  feedbackForms,
  feedbackResponses,
} from '@/lib/mockData';
import {
  BuildingIcon,
  UsersIcon,
  BookIcon,
  ClipboardIcon,
  UploadIcon,
  ChartIcon,
} from '@/components/Icons';

export default function AdminDashboardPage() {
  const activeForms = feedbackForms.filter(f => f.status === 'active').length;
  const totalResponses = feedbackResponses.length;
  
  // Calculate completion percentage (mock)
  const expectedResponses = activeForms * 5; // Assume 5 students per form on average
  const completionRate = expectedResponses > 0 
    ? Math.min(100, Math.round((totalResponses / expectedResponses) * 100))
    : 0;

  const navCards = [
    {
      title: 'Timetable Upload',
      description: 'Upload timetable and auto-generate feedback forms',
      href: '/admin/timetable',
      icon: <UploadIcon className="w-8 h-8" />,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
    },
    {
      title: 'User Management',
      description: 'Manage students and faculty accounts',
      href: '/admin/users',
      icon: <UsersIcon className="w-8 h-8" />,
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
    },
    {
      title: 'Feedback Monitoring',
      description: 'Monitor feedback collection and status',
      href: '/admin/feedback',
      icon: <ClipboardIcon className="w-8 h-8" />,
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
    },
    {
      title: 'Reports & Analytics',
      description: 'View department-wise analytics and export reports',
      href: '/admin/reports',
      icon: <ChartIcon className="w-8 h-8" />,
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin / Committee Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage the Faculty Curriculum Performance Feedback System</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard title="Departments" value={departments.length} color="blue" />
        <StatCard title="Faculty" value={faculty.length} color="green" />
        <StatCard title="Students" value={students.length} color="purple" />
        <StatCard title="Subjects" value={subjects.length} color="orange" />
        <StatCard title="Active Forms" value={activeForms} color="red" />
        <StatCard title="Completion" value={`${completionRate}%`} color="blue" />
      </div>

      {/* Navigation Cards */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {navCards.map(card => (
          <Link
            key={card.href}
            href={card.href}
            className="group bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all"
          >
            <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-4 ${card.bgColor} ${card.textColor} group-hover:scale-105 transition-transform`}>
              {card.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{card.title}</h3>
            <p className="text-sm text-gray-600">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
