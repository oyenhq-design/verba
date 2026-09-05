import React, { useState } from 'react';
import { DocumentVersion } from '@/hooks/useDocumentHistory';
import { RotateCcw, Loader2 } from 'lucide-react';

interface Props {
  documentId: string;
  versions: DocumentVersion[];
  loading: boolean;
  onRestoreSuccess: () => void;
  currentEditorVersion: number;
}

export function VersionHistory({ documentId, versions, loading, onRestoreSuccess, currentEditorVersion }: Props) {
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestore = async (versionId: string) => {
    if (!confirm('Are you sure you want to restore this version? This will become the new current state.')) return;
    
    setRestoringId(versionId);
    try {
      const res = await fetch(`/api/documents/${documentId}/versions/${versionId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_editor_version: currentEditorVersion })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to restore version');
      }
      
      onRestoreSuccess();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to restore');
    } finally {
      setRestoringId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F9FAFB]">
        <div className="text-[13px] text-foreground-secondary">Loading versions...</div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F9FAFB] text-center">
        <p className="text-[13px] text-foreground-secondary">
          No saved versions yet.<br /><br />
          Manual saves and meaningful checkpoints will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-4">
      <div className="space-y-3">
        {versions.map((v, idx) => {
          const isLatest = idx === 0;
          const time = new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const date = new Date(v.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' });
          
          return (
            <div key={v.id} className="p-3 bg-white border border-border-light rounded-md shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-[13px] font-medium text-[#0B1628] flex items-center gap-2">
                    Version {v.version_number}
                    {isLatest && <span className="px-1.5 py-0.5 bg-accent/10 text-accent text-[10px] uppercase font-bold rounded">Current</span>}
                  </h4>
                  <p className="text-[12px] text-foreground-secondary mt-0.5">
                    {date}, {time} · {v.word_count || 0} words
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-foreground-muted bg-black/5 px-2 py-1 rounded inline-block mb-3">
                {v.source === 'manual_save' ? 'Manual save' : v.source === 'autosave' ? 'Autosave checkpoint' : v.source}
              </div>
              
              {!isLatest && (
                <div className="flex gap-2">
                  <button
                    disabled={restoringId !== null}
                    onClick={() => handleRestore(v.id)}
                    className="flex-1 h-[28px] flex items-center justify-center bg-white border border-border-light text-[#0B1628] rounded hover:bg-background-secondary transition-colors text-[11px] font-medium disabled:opacity-50"
                  >
                    {restoringId === v.id ? <Loader2 size={12} className="animate-spin mr-1" /> : <RotateCcw size={12} className="mr-1" />}
                    Restore
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
