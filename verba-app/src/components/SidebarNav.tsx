'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, Plus, User, LogOut } from 'lucide-react';
import { logout } from '@/app/(auth)/actions';
import { useState } from 'react';
import { NewWorkModal } from '@/components/NewWorkModal';

export function SidebarNav() {
  const pathname = usePathname();
  const [isNewWorkModalOpen, setIsNewWorkModalOpen] = useState(false);

  const primaryNav = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Documents', href: '/documents', icon: FileText },
  ];
  
  const settingsNav = [
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const profileNav = [
    { name: 'Account', href: '/account', icon: User },
  ];

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="p-4 pt-6">
        <button 
          onClick={() => setIsNewWorkModalOpen(true)}
          className="flex items-center justify-center w-full h-[44px] bg-accent text-white font-medium rounded-[8px] hover:bg-accent-hover transition-colors text-[14px] shadow-sm"
        >
          <Plus size={18} className="mr-2" />
          New document
        </button>
      </div>
      
      <nav className="px-3 py-2 space-y-1">
        {primaryNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className={`flex items-center px-3 py-2.5 h-[40px] text-[14px] font-medium transition-colors rounded-[8px] ${
                isActive 
                  ? 'bg-accent/10 text-accent' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={18} className={`mr-3 shrink-0 ${isActive ? 'text-accent' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-2 my-1 border-t border-slate-100">
        {settingsNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className={`flex items-center px-3 py-2.5 h-[40px] text-[14px] font-medium transition-colors rounded-[8px] ${
                isActive 
                  ? 'bg-accent/10 text-accent' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={18} className={`mr-3 shrink-0 ${isActive ? 'text-accent' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </div>
      
      <div className="mt-auto px-3 py-4 border-t border-slate-100 space-y-1">
        {profileNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className={`flex items-center px-3 py-2.5 h-[40px] text-[14px] font-medium transition-colors rounded-[8px] ${
                isActive 
                  ? 'bg-accent/10 text-accent' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={18} className={`mr-3 shrink-0 ${isActive ? 'text-accent' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
        <form action={logout} className="w-full">
          <button type="submit" className="flex items-center px-3 py-2.5 h-[40px] text-[14px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors rounded-[8px] w-full text-left">
            <LogOut size={18} className="mr-3 shrink-0 text-slate-400" />
            Sign out
          </button>
        </form>
      </div>

      <NewWorkModal 
        isOpen={isNewWorkModalOpen} 
        onClose={() => setIsNewWorkModalOpen(false)} 
        onUploadSelect={() => {
          // Redirect to dashboard with upload intent, or we could handle it via context
          window.location.href = '/dashboard';
        }}
      />
    </div>
  );
}
