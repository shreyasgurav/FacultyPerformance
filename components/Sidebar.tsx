'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  links: SidebarLink[];
  title: string;
}

export default function Sidebar({ links, title }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)]">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          {title}
        </h2>
        <nav className="space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
