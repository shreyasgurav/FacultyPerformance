'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="relative flex h-12 sm:h-14">
      {/* Red section on left - matches image width */}
      <div className="hidden lg:block lg:w-[55%] bg-red-800" />
      {/* Darker red section on right */}
      <div className="w-full lg:w-[45%] bg-red-900" />
      {/* Red tab extending down from right - hidden on mobile */}
      <div className="hidden lg:block absolute top-0 right-0 w-32 h-24 bg-red-900" />
    </nav>
  );
}
