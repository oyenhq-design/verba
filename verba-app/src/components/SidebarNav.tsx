'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, Plus } from 'lucide-react';

export function SidebarNav() {
  const pathname = usePathname();

  const primaryNav = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Documents', href: '/documents', icon: FileText },
  ];
  
  const bottomNav = [
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col flex-1">
      <div className="p-4 pt-6">
        <Link 
          href="/dashboard"
          className="flex items-center justify-center w-full h-[40px] bg-accent text-white font-semibold rounded-[6px] hover:bg-accent-hover transition-colors text-[14px]"
        >
          <Plus size={16} className="mr-2" />
          New document
        </Link>
      </div>
      
      <nav className="flex-1 px-4 py-2 space-y-0.5">
        {primaryNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className={`flex items-center px-3 py-2.5 h-[40px] text-[14px] font-medium transition-colors rounded-[6px] ${
                isActive 
                  ? 'bg-accent/10 text-accent' 
                  : 'text-foreground-secondary hover:bg-background-secondary hover:text-ink'
              }`}
            >
              <item.icon size={16} className={`mr-3 shrink-0 ${isActive ? 'text-accent' : 'text-foreground-secondary'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="px-4 py-2 space-y-0.5 border-t border-border-light pt-4">
        {bottomNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className={`flex items-center px-3 py-2.5 h-[40px] text-[14px] font-medium transition-colors rounded-[6px] ${
                isActive 
                  ? 'bg-accent/10 text-accent' 
                  : 'text-foreground-secondary hover:bg-background-secondary hover:text-ink'
              }`}
            >
              <item.icon size={16} className={`mr-3 shrink-0 ${isActive ? 'text-accent' : 'text-foreground-secondary'}`} />
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
