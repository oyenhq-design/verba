import React, { useState } from 'react';
import { WorkspaceNavigation, WorkspaceTab } from './WorkspaceNavigation';
import { ResearchTab } from './ResearchTab';
import { CiteTab } from './CiteTab';
import { ReviewTab } from './ReviewTab';
import { ProvePanel } from './ProvePanel';
import { WritingAssistant, Issue } from '../WritingAssistant';
import { PanelRightClose } from 'lucide-react';

interface Props {
  documentId: string;
  onClose: () => void;
  // Assistant Props
  blockId: string;
  paragraphText: string;
  issue: Issue | null;
  onSuggestionAction: (issueId: string, suggestionId: string, action: 'accepted' | 'rejected' | 'manually_edited', newText?: string) => void;
  onCloseIssue: () => void;
  // Review Props
  isAnalyzed: boolean;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  issuesCount: number;
  docStatus: string;
  analyzeError: string | null;
}

export function VerbaWorkspace({
  documentId,
  onClose,
  blockId,
  paragraphText,
  issue,
  onSuggestionAction,
  onCloseIssue,
  isAnalyzed,
  isAnalyzing,
  onAnalyze,
  issuesCount,
  docStatus,
  analyzeError,
}: Props) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('assistant');

  return (
    <aside className="w-[340px] bg-white border-l border-border-light shrink-0 flex flex-col h-full relative z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] md:shadow-none transition-all duration-300">
      <div className="flex items-center justify-between p-4 pb-2 border-b border-border-light shrink-0">
        <div>
          <h2 className="text-[14px] font-semibold text-[#0B1628] flex items-center gap-2">
            <span className="w-5 h-5 bg-accent text-white rounded-[4px] flex items-center justify-center text-[12px] font-bold">V</span>
            Verba Workspace
          </h2>
          <p className="text-[12px] text-foreground-secondary mt-1">Everything you need, right here.</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-foreground-muted hover:text-[#0B1628] hover:bg-black/5 rounded transition-colors"
          title="Close Workspace"
        >
          <PanelRightClose size={16} />
        </button>
      </div>

      <WorkspaceNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'assistant' && (
          <WritingAssistant
            documentId={documentId}
            blockId={blockId}
            paragraphText={paragraphText}
            issue={issue}
            onClose={onCloseIssue}
            onSuggestionAction={onSuggestionAction}
            isAnalyzed={isAnalyzed}
            isAnalyzing={isAnalyzing}
            onAnalyze={onAnalyze}
            issuesCount={issuesCount}
            docStatus={docStatus}
            analyzeError={analyzeError}
          />
        )}
        {activeTab === 'review' && (
          <ReviewTab 
            isAnalyzed={isAnalyzed}
            isAnalyzing={isAnalyzing}
            onAnalyze={onAnalyze}
            issuesCount={issuesCount}
            docStatus={docStatus}
            analyzeError={analyzeError}
          />
        )}
        {activeTab === 'research' && <ResearchTab />}
        {activeTab === 'cite' && <CiteTab />}
        {activeTab === 'prove' && <ProvePanel documentId={documentId} />}
      </div>
    </aside>
  );
}
