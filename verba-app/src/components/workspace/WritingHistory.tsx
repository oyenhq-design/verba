import React from 'react';
import { DocumentEvent } from '@/hooks/useDocumentHistory';
import { Save, Clipboard, Sparkles, UploadCloud, RotateCcw, MoreVertical, ShieldCheck } from 'lucide-react';

interface Props {
  events: DocumentEvent[];
  loading: boolean;
}

export function WritingHistory({ events, loading }: Props) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F9FAFB]">
        <div className="text-[13px] text-foreground-secondary">Loading history...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F9FAFB] text-center">
        <p className="text-[13px] text-foreground-secondary">
          No writing history yet.<br /><br />
          As you work on this document, meaningful activity will appear here.
        </p>
      </div>
    );
  }

  const renderEventIcon = (type: string) => {
    switch (type) {
      case 'manual_save':
      case 'autosave_checkpoint':
        return <div className="w-8 h-8 rounded-full bg-[#E5F3EF] flex items-center justify-center text-[#0F766E]"><Save size={14} /></div>;
      case 'paste_inserted':
        return <div className="w-8 h-8 rounded-full bg-[#F3E8FF] flex items-center justify-center text-[#7E22CE]"><Clipboard size={14} /></div>;
      case 'verba_suggestion_accepted':
      case 'verba_suggestion_rejected':
        return <div className="w-8 h-8 rounded-full bg-[#E0F2FE] flex items-center justify-center text-[#0369A1]"><Sparkles size={14} /></div>;
      case 'document_uploaded':
        return <div className="w-8 h-8 rounded-full bg-[#FFEDD5] flex items-center justify-center text-[#C2410C]"><UploadCloud size={14} /></div>;
      case 'version_restored':
        return <div className="w-8 h-8 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[#334155]"><RotateCcw size={14} /></div>;
      default:
        return <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-foreground-muted"><div className="w-2 h-2 rounded-full bg-current" /></div>;
    }
  };

  const renderEventDetails = (event: DocumentEvent) => {
    const meta = event.metadata;
    switch (event.event_type) {
      case 'manual_save':
        return { title: 'Manual save', subtitle: `Version ${meta.checkpoint_version_number as number || '?'}` };
      case 'autosave_checkpoint':
        return { title: 'Autosave checkpoint', subtitle: `Version ${meta.checkpoint_version_number as number || '?'}` };
      case 'paste_inserted':
        return { title: 'Text pasted', subtitle: `${meta.word_count as number || 0} words (${meta.character_count as number || 0} characters)` };
      case 'verba_suggestion_accepted':
        return { title: 'Verba suggestion accepted', subtitle: 'Clarity and tone improvement' };
      case 'verba_suggestion_rejected':
        return { title: 'Verba suggestion rejected', subtitle: 'Clarity and tone improvement' };
      case 'document_uploaded':
        return { title: 'Document uploaded', subtitle: `${meta.file_size_bytes ? Math.round((meta.file_size_bytes as number) / 1024) + ' KB' : 'Unknown size'}` };
      case 'version_restored':
        return { title: 'Earlier version restored', subtitle: `Version ${meta.restored_version_number as number} restored` };
      default:
        return { title: event.event_type, subtitle: 'System event' };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-4 relative">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[12px] font-semibold text-[#0B1628]">Today — {new Date().toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</h4>
        <button className="text-[12px] text-accent font-medium flex items-center hover:underline">
          Filter <span className="ml-1 text-[8px]">▼</span>
        </button>
      </div>

      <div className="space-y-4">
        {events.map((event, idx) => {
          const time = new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const { title, subtitle } = renderEventDetails(event);
          
          return (
            <div key={event.id} className="flex items-start gap-3 relative">
              {idx !== events.length - 1 && (
                <div className="absolute left-16 top-8 bottom-[-16px] w-[2px] bg-border-light z-0"></div>
              )}
              <div className="text-[11px] text-foreground-muted w-12 text-right pt-2 shrink-0">{time}</div>
              <div className="z-10 bg-[#F9FAFB] shrink-0 pt-0.5">
                {renderEventIcon(event.event_type)}
              </div>
              <div className="flex-1 pt-1 min-w-0 pr-6 relative">
                <p className="text-[13px] font-medium text-[#0B1628] truncate">{title}</p>
                <p className="text-[12px] text-foreground-secondary truncate">{subtitle}</p>
                <button className="absolute right-0 top-1 text-foreground-muted hover:text-[#0B1628]">
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 mb-2 text-center">
        <button className="w-full py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0B1628] text-[13px] font-medium rounded-md transition-colors">
          View full writing history →
        </button>
      </div>
      
      <div className="mt-4 p-3 bg-accent/5 border border-accent/10 rounded-md flex items-start gap-2 text-accent">
        <div className="mt-0.5"><ShieldCheck size={14} /></div>
        <p className="text-[11px] leading-relaxed">
          <strong>PROVE records what happened, not authorship claims.</strong><br/>
          This is an objective record of your document&apos;s development.
        </p>
      </div>
    </div>
  );
}
