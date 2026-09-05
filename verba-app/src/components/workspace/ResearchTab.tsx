import React from 'react';
import { Search } from 'lucide-react';

export function ResearchTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-white">
      <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mb-4 text-foreground-muted">
        <Search size={24} />
      </div>
      <h3 className="text-[14px] font-semibold text-[#0B1628] mb-2">Research</h3>
      <p className="text-[13px] text-foreground-secondary leading-relaxed max-w-[240px]">
        Research tools will appear here as we build the source workflow.
      </p>
    </div>
  );
}
