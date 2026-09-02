import React from 'react';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background-pale">
      {/* Sidebar */}
      <aside className="w-[240px] bg-white border-r border-border-light flex flex-col hidden md:flex">
        <div className="h-[64px] flex items-center px-6 border-b border-border-light shrink-0">
          <Link href="/">
            <img src="/logo.png" alt="Verba" className="h-[28px] w-auto object-contain" />
          </Link>
        </div>
        
        <div className="p-4">
          <Link href="/upload" className="flex items-center justify-center w-full h-[40px] bg-accent text-white font-semibold rounded-[8px] hover:bg-accent-hover transition-colors text-[14px]">
            New Document
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1">
          <Link href="/dashboard" className="flex items-center px-3 py-2 text-[14px] font-medium rounded-md bg-background-secondary text-ink">
            Home
          </Link>
          <Link href="/documents" className="flex items-center px-3 py-2 text-[14px] font-medium text-foreground-secondary hover:bg-background-secondary hover:text-ink transition-colors rounded-md">
            Documents
          </Link>
        </nav>
        
        <div className="p-4 border-t border-border-light space-y-1">
          <Link href="/settings" className="flex items-center px-3 py-2 text-[14px] font-medium text-foreground-secondary hover:bg-background-secondary hover:text-ink transition-colors rounded-md">
            Settings
          </Link>
          <button className="flex items-center px-3 py-2 text-[14px] font-medium text-foreground-secondary hover:bg-background-secondary hover:text-ink transition-colors rounded-md w-full text-left">
            Account
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile only) */}
        <header className="h-[64px] bg-white border-b border-border-light flex items-center justify-between px-4 md:hidden shrink-0">
          <Link href="/">
            <img src="/logo.png" alt="Verba" className="h-[24px] w-auto object-contain" />
          </Link>
          <button className="p-2 text-foreground-secondary">
            Menu
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
