'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="relative flex h-12 sm:h-14">
      {/* Red section on left - #ed1c24 */}
      <div className="hidden lg:block lg:w-[55%]" style={{ backgroundColor: '#ed1c24' }} />
      {/* Darker red section on right - #b7202e */}
      <div className="w-full lg:w-[45%]" style={{ backgroundColor: '#b7202e' }} />
      {/* Red tab extending down from right - hidden on mobile */}
      <div className="hidden lg:block absolute top-0 right-0 w-32 h-24" style={{ backgroundColor: '#b7202e' }} />
    </nav>
  );
}
