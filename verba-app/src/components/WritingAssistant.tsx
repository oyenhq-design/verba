'use client';

import React, { useState } from 'react';
import { Check, X, RefreshCw, Edit2, Loader2, ShieldCheck, Zap } from 'lucide-react';

interface Suggestion {
  id: string;
  suggested_text: string;
  explanation: string;
  status: string;
}

export interface Issue {
  id: string;
  issue_type: string;
  original_text: string;
  explanation: string;
  suggestions: Suggestion[];
}

interface Props {
  documentId: string;
  blockId: string;
  paragraphText: string;
  issue: Issue | null;
  onClose: () => void;
  onSuggestionAction: (issueId: string, suggestionId: string, action: 'accepted' | 'rejected' | 'manually_edited', newText?: string) => void;
  isAnalyzed: boolean;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  issuesCount?: number;
  docStatus?: string;
  analyzeError?: string | null;
}

export function WritingAssistant({ documentId, blockId, paragraphText, issue, onClose, onSuggestionAction, isAnalyzed, issuesCount = 0, docStatus = '', analyzeError = null }: Props) {
  const [loadingAlternative, setLoadingAlternative] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  // Analysis engine error takes top priority
  if (analyzeError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
        <div className="w-12 h-12 rounded-full bg-[#FEF3F2] flex items-center justify-center mb-4 text-[#B42318]">
          <Zap size={24} />
        </div>
        <h3 className="text-[14px] font-semibold text-[#0B1628] mb-2">Analysis failed</h3>
        <p className="text-[14px] text-foreground-secondary mb-6 leading-relaxed max-w-[240px]">
          {analyzeError}
        </p>
      </div>
    );
  }
  
  if (docStatus === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
        <div className="w-12 h-12 rounded-full bg-[#FEF3F2] flex items-center justify-center mb-4 text-[#B42318]">
          <Zap size={24} />
        </div>
        <h3 className="text-[14px] font-semibold text-[#0B1628] mb-2">Analysis failed</h3>
        <p className="text-[14px] text-foreground-secondary mb-6 leading-relaxed max-w-[240px]">
          Analysis failed. Head over to the Review tab to try again.
        </p>
      </div>
    );
  }

  if (!isAnalyzed) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
        <Zap className="w-10 h-10 mb-4 text-accent/40" />
        <h3 className="text-[15px] font-semibold text-[#0B1628] mb-2">Writing Assistant</h3>
        <p className="text-[14px] text-foreground-secondary mb-6 leading-relaxed max-w-[240px]">
          Head over to the Review tab to analyze this document.
        </p>
      </div>
    );
  }

  if (isAnalyzed && issuesCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
        <Check className="w-10 h-10 mb-4 text-status-success" />
        <h3 className="text-[15px] font-semibold text-[#0B1628] mb-2">Analysis complete</h3>
        <p className="text-[14px] text-foreground-secondary leading-relaxed max-w-[240px]">
          No writing issues were found.
        </p>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
        <ShieldCheck className="w-10 h-10 mb-4 text-foreground-muted" />
        <h3 className="text-[15px] font-semibold text-[#0B1628] mb-2">Analysis Complete</h3>
        <p className="text-[14px] text-foreground-secondary leading-relaxed">
          Select a highlighted passage to review Verba&apos;s suggestion.
        </p>
      </div>
    );
  }

  const activeSuggestion = issue.suggestions.find(s => s.status === 'pending') || issue.suggestions[issue.suggestions.length - 1];

  const handleTryAnother = async () => {
    try {
      setLoadingAlternative(true);
      const res = await fetch('/api/analyze/alternative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          blockId,
          issueId: issue.id,
          paragraphText
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestion) {
          issue.suggestions.push(data.suggestion);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAlternative(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditText(activeSuggestion?.suggested_text || issue.original_text);
  };

  const handleSaveEdit = () => {
    if (!activeSuggestion) return;
    onSuggestionAction(issue.id, activeSuggestion.id, 'manually_edited', editText);
    setIsEditing(false);
  };

  const formatIssueType = (type: string) => type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex items-center justify-between p-4 border-b border-border-light bg-white sticky top-0 z-10 shrink-0">
        <h3 className="text-[13px] font-semibold text-[#0B1628] uppercase tracking-wider">
          {formatIssueType(issue.issue_type)}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-background-secondary rounded text-foreground-secondary hover:text-[#0B1628] transition-colors">
          <X size={16} />
        </button>
      </div>
      
      <div className="p-5 flex-1 overflow-y-auto space-y-7">
        
        {/* Original */}
        <div>
          <h4 className="text-[11px] font-semibold text-foreground-secondary uppercase tracking-wider mb-2">Original</h4>
          <p className="text-[14px] text-ink bg-[#FEF0C7]/30 border border-[#FEF0C7] p-3 rounded-md line-through decoration-[#F59E0B]/50 leading-relaxed">
            {issue.original_text}
          </p>
        </div>

        {/* Suggested */}
        <div>
          <h4 className="text-[11px] font-semibold text-foreground-secondary uppercase tracking-wider mb-2">Suggested</h4>
          {isEditing ? (
            <div className="space-y-2">
              <textarea 
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full min-h-[100px] text-[14px] text-ink border border-accent rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-accent leading-relaxed bg-white"
              />
              <div className="flex justify-end space-x-2">
                <button onClick={() => setIsEditing(false)} className="text-[12px] font-medium px-3 py-1.5 text-foreground-secondary hover:bg-background-secondary rounded transition-colors">Cancel</button>
                <button onClick={handleSaveEdit} className="text-[12px] font-medium px-3 py-1.5 bg-accent text-white rounded hover:bg-accent-hover transition-colors">Save Edit</button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <p className="text-[14px] text-ink bg-status-success/10 border border-status-success/20 p-3 rounded-md leading-relaxed">
                {activeSuggestion?.suggested_text}
              </p>
              <button 
                onClick={handleEdit}
                className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-border-light rounded text-foreground-secondary opacity-0 group-hover:opacity-100 transition-opacity hover:text-accent"
                title="Edit suggestion"
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Explanation */}
        <div>
          <h4 className="text-[11px] font-semibold text-foreground-secondary uppercase tracking-wider mb-2">Why</h4>
          <p className="text-[13px] text-foreground-secondary leading-relaxed bg-background-pale p-3 rounded-md border border-border-light">
            {activeSuggestion?.explanation || issue.explanation}
          </p>
        </div>

        {/* Protected Items Checklist */}
        <div>
           <h4 className="text-[11px] font-semibold text-foreground-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
             <ShieldCheck size={14} className="text-foreground-secondary" /> Protected
           </h4>
           <ul className="text-[13px] text-foreground-secondary space-y-1.5">
             <li className="flex items-center gap-2"><Check size={14} className="text-status-success" /> <span className="text-[#0B1628]">Meaning preserved</span></li>
             <li className="flex items-center gap-2"><Check size={14} className="text-status-success" /> <span className="text-[#0B1628]">Numbers & Units</span></li>
             <li className="flex items-center gap-2"><Check size={14} className="text-status-success" /> <span className="text-[#0B1628]">Citations</span></li>
           </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border-light bg-white shrink-0 space-y-3 z-10">
        <div className="flex space-x-2">
          <button 
            onClick={() => activeSuggestion && onSuggestionAction(issue.id, activeSuggestion.id, 'rejected')}
            className="flex-1 h-[36px] bg-white border border-border-light text-[#0B1628] rounded-md hover:bg-background-secondary transition-colors text-[13px] font-medium"
          >
            Reject
          </button>
          <button 
            onClick={() => activeSuggestion && onSuggestionAction(issue.id, activeSuggestion.id, 'accepted')}
            className="flex-1 h-[36px] bg-accent text-white rounded-md hover:bg-accent-hover transition-colors text-[13px] font-medium"
          >
            Accept
          </button>
        </div>
        <button 
          onClick={handleTryAnother}
          disabled={loadingAlternative}
          className="w-full flex items-center justify-center space-x-2 h-[36px] text-foreground-secondary hover:bg-background-secondary rounded-md transition-colors text-[13px] font-medium disabled:opacity-50"
        >
          {loadingAlternative ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          <span>Try Another</span>
        </button>
      </div>
    </div>
  );
}
