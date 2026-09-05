import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { DocumentEvent } from '@/hooks/useDocumentHistory';

interface Props {
  wordCount: number | null;
  editorVersion: number;
  lastEvent: DocumentEvent | null;
}

export function ProveOverview({ wordCount, editorVersion, lastEvent }: Props) {
  // Format the last activity time
  let lastActivityTime = 'None';
  let lastActivityDate = 'No activity yet';
  if (lastEvent) {
    const d = new Date(lastEvent.created_at);
    // e.g. "10:42"
    lastActivityTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // e.g. "Today, 10:42" or "4 Sept 2026, 10:42"
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    lastActivityDate = isToday ? `Today, ${lastActivityTime}` : `${d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}, ${lastActivityTime}`;
  }

  return (
    <div className="p-4 border-b border-border-light shrink-0">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded bg-accent/10 flex items-center justify-center text-accent shrink-0 mt-1">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-[#0B1628]">PROVE</h2>
          <p className="text-[13px] font-medium text-[#0B1628] mt-0.5">Document development record</p>
          <p className="text-[12px] text-foreground-secondary mt-1 leading-relaxed">
            A clear, objective history of how this document has evolved.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Words */}
        <div>
          <div className="text-[15px] font-semibold text-[#0B1628]">{wordCount ?? 0}</div>
          <div className="text-[11px] text-foreground-secondary uppercase tracking-wide mt-0.5">Words</div>
          <div className="text-[11px] text-foreground-muted mt-0.5 truncate">Current document</div>
        </div>

        {/* Current Version */}
        <div>
          <div className="text-[15px] font-semibold text-[#0B1628]">{editorVersion}</div>
          <div className="text-[11px] text-foreground-secondary uppercase tracking-wide mt-0.5">Current version</div>
          <div className="text-[11px] text-foreground-muted mt-0.5 truncate">Latest</div>
        </div>

        {/* Last Activity */}
        <div>
          <div className="text-[13px] font-semibold text-[#0B1628] leading-tight mb-1">{lastActivityDate}</div>
          <div className="text-[11px] text-foreground-secondary uppercase tracking-wide">Last activity</div>
          <div className="text-[11px] text-status-success mt-0.5 flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 bg-status-success rounded-full"></span>
            Active now
          </div>
        </div>
      </div>
    </div>
  );
}
