import React from 'react';
import Link from 'next/link';
import { logout } from '@/app/(auth)/actions';
import { SidebarNav } from '@/components/SidebarNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F6F8FB]">
      {/* Sidebar */}
      <aside className="w-[240px] bg-white border-r border-border-light flex-col hidden md:flex shrink-0">
        <div className="h-[64px] flex items-center px-6 shrink-0">
          <Link href="/dashboard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Verba" className="h-[24px] w-auto object-contain" />
          </Link>
        </div>
        
        <SidebarNav />
        
        <div className="p-4 space-y-0.5 mb-2">
          <form action={logout} className="w-full">
            <button type="submit" className="flex items-center px-3 py-2.5 h-[40px] text-[14px] font-medium text-foreground-secondary hover:bg-background-secondary hover:text-ink transition-colors rounded-[6px] w-full text-left">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 shrink-0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile only) */}
        <header className="h-[64px] bg-white border-b border-border-light flex items-center justify-between px-4 md:hidden shrink-0">
          <Link href="/dashboard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Verba" className="h-[24px] w-auto object-contain" />
          </Link>
          <button className="p-2 text-foreground-secondary">
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
