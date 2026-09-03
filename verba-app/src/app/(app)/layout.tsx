import React from 'react';
import Link from 'next/link';
import { SidebarNav } from '@/components/SidebarNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F6F8FB]">
      {/* Sidebar */}
      <aside className="w-[240px] bg-white border-r border-[#E5EAF0] flex-col hidden md:flex shrink-0">
        <div className="h-[64px] flex items-center px-6 shrink-0 mt-2">
          <Link href="/dashboard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Verba" className="h-[24px] w-auto object-contain" />
          </Link>
        </div>
        
        <SidebarNav />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile only) */}
        <header className="h-[64px] bg-white border-b border-[#E5EAF0] flex items-center justify-between px-4 md:hidden shrink-0">
          <Link href="/dashboard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Verba" className="h-[24px] w-auto object-contain" />
          </Link>
          <button className="p-2 text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
