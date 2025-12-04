'use client';

import Link from 'next/link';
import Card from '@/components/Card';
import {
  UsersIcon,
  ClipboardIcon,
  UploadIcon,
  ChartIcon,
} from '@/components/Icons';

export default function AdminDashboardPage() {
  const navCards = [
    {
      title: 'Generate Forms',
      description: 'Create feedback forms for divisions or batches',
      href: '/admin/generate-forms',
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
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Manage the Faculty Curriculum Performance Feedback System
        </p>
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {navCards.map(card => (
          <Link
            key={card.href}
            href={card.href}
            className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 hover:-translate-y-1 transition-all duration-200"
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.bgColor} ${card.textColor} group-hover:scale-110 transition-transform duration-200`}
            >
              {card.icon}
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{card.title}</h3>
            <p className="text-sm text-gray-500">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
