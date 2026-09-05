import React from 'react';
import { Sparkles, Eye, Search, BookOpen, ShieldCheck } from 'lucide-react';

export type WorkspaceTab = 'assistant' | 'review' | 'research' | 'cite' | 'prove';

interface Props {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
}

export function WorkspaceNavigation({ activeTab, onTabChange }: Props) {
  const tabs = [
    { id: 'assistant', label: 'Assistant', icon: Sparkles },
    { id: 'review', label: 'Review', icon: Eye },
    { id: 'research', label: 'Research', icon: Search },
    { id: 'cite', label: 'Cite', icon: BookOpen },
    { id: 'prove', label: 'PROVE', icon: ShieldCheck },
  ] as const;

  return (
    <div className="flex items-center justify-between px-2 pt-2 pb-0 border-b border-border-light shrink-0">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-2 relative transition-colors ${
              isActive ? 'text-accent' : 'text-foreground-secondary hover:text-[#0B1628]'
            }`}
          >
            <tab.icon size={18} className="mb-1" />
            <span className="text-[11px] font-medium">{tab.label}</span>
            {isActive && (
              <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-accent rounded-t" />
            )}
          </button>
        );
      })}
    </div>
  );
}
