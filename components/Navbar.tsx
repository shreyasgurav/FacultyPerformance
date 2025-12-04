'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-gradient-to-r from-red-600 via-red-600 to-red-700 px-4 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-lg">FC</span>
          </div>
          <div className="hidden sm:block">
            <span className="text-lg font-semibold text-white">
              Faculty Curriculum Performance
            </span>
            <span className="text-sm text-red-100 block -mt-1">
              Feedback Automation System
            </span>
          </div>
        </Link>
      </div>
    </nav>
  );
}
