import React from 'react';

export type ProveTab = 'writing_history' | 'version_history' | 'insights';

interface Props {
  activeTab: ProveTab;
  onTabChange: (tab: ProveTab) => void;
}

export function ProveNavigation({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex items-center px-4 pt-3 pb-0 border-b border-border-light bg-[#F9FAFB] shrink-0">
      <button
        onClick={() => onTabChange('writing_history')}
        className={`flex-1 py-2 text-[12px] font-medium text-center relative transition-colors ${
          activeTab === 'writing_history' ? 'text-white bg-accent rounded-t-md' : 'text-foreground-secondary hover:text-[#0B1628]'
        }`}
      >
        Writing history
      </button>
      <button
        onClick={() => onTabChange('version_history')}
        className={`flex-1 py-2 text-[12px] font-medium text-center relative transition-colors ${
          activeTab === 'version_history' ? 'text-[#0B1628] bg-white border-t border-l border-r border-border-light rounded-t-md -mb-[1px]' : 'text-foreground-secondary hover:text-[#0B1628]'
        }`}
      >
        Version history
      </button>
      <button
        onClick={() => onTabChange('insights')}
        className={`flex-1 py-2 text-[12px] font-medium text-center relative transition-colors ${
          activeTab === 'insights' ? 'text-[#0B1628] bg-white border-t border-l border-r border-border-light rounded-t-md -mb-[1px]' : 'text-foreground-secondary hover:text-[#0B1628]'
        }`}
      >
        Insights
      </button>
    </div>
  );
}
