import React from 'react';
import { BookOpen } from 'lucide-react';

export function CiteTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-white">
      <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mb-4 text-foreground-muted">
        <BookOpen size={24} />
      </div>
      <h3 className="text-[14px] font-semibold text-[#0B1628] mb-2">Cite</h3>
      <p className="text-[13px] text-foreground-secondary leading-relaxed max-w-[240px]">
        Your source library and citation tools will appear here once CITE is implemented.
      </p>
    </div>
  );
}
