import React, { useState } from 'react';
import { ProveOverview } from './ProveOverview';
import { ProveNavigation, ProveTab } from './ProveNavigation';
import { WritingHistory } from './WritingHistory';
import { VersionHistory } from './VersionHistory';
import { useDocumentHistory } from '@/hooks/useDocumentHistory';

interface Props {
  documentId: string;
}

export function ProvePanel({ documentId }: Props) {
  const [activeTab, setActiveTab] = useState<ProveTab>('writing_history');
  const { events, versions, loading } = useDocumentHistory(documentId);

  const currentVersion = versions.length > 0 ? versions[0].version_number : 0;
  const currentWordCount = versions.length > 0 ? versions[0].word_count : null;
  const lastEvent = events.length > 0 ? events[0] : null;

  const handleRestoreSuccess = () => {
    // Tell the parent to reload the document, or reload the page for simplicity
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <ProveOverview 
        wordCount={currentWordCount} 
        editorVersion={currentVersion} 
        lastEvent={lastEvent} 
      />
      <ProveNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === 'writing_history' && (
        <WritingHistory events={events} loading={loading} />
      )}
      {activeTab === 'version_history' && (
        <VersionHistory 
          documentId={documentId} 
          versions={versions} 
          loading={loading} 
          onRestoreSuccess={handleRestoreSuccess}
          currentEditorVersion={currentVersion}
        />
      )}
      {activeTab === 'insights' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F9FAFB] text-center">
          <p className="text-[13px] text-foreground-secondary leading-relaxed">
            Insights will appear here once the model is trained.
          </p>
        </div>
      )}
    </div>
  );
}
