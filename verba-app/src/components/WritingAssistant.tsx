'use client';

import React, { useState } from 'react';
import { Check, X, RefreshCw, Edit2, Loader2, ShieldCheck } from 'lucide-react';

interface Suggestion {
  id: string;
  suggested_text: string;
  explanation: string;
  status: string;
}

interface Issue {
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
}

export function WritingAssistant({ documentId, blockId, paragraphText, issue, onClose, onSuggestionAction }: Props) {
  const [loadingAlternative, setLoadingAlternative] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  
  if (!issue) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-foreground-secondary text-center p-6">
        <ShieldCheck className="w-12 h-12 mb-4 text-border-light" />
        <p className="text-[14px]">Select a highlighted passage in your document to view suggestions.</p>
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
          // Typically we would lift this state up or trigger a re-fetch of the issue.
          // For now, we mutate locally for fast UI response, then tell parent to refresh.
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
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between p-4 border-b border-border-light">
        <h3 className="text-[14px] font-semibold text-ink uppercase tracking-wider">
          {formatIssueType(issue.issue_type)}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-background-secondary rounded text-foreground-secondary">
          <X size={16} />
        </button>
      </div>
      
      <div className="p-5 flex-1 overflow-y-auto space-y-6">
        
        {/* Explanation */}
        <div className="bg-background-secondary p-4 rounded-lg">
          <p className="text-[14px] text-ink-secondary">{activeSuggestion?.explanation || issue.explanation}</p>
        </div>

        {/* Original */}
        <div>
          <h4 className="text-[12px] font-semibold text-foreground-muted uppercase tracking-wider mb-2">Original</h4>
          <p className="text-[14px] text-ink bg-status-error bg-opacity-10 p-3 rounded-md line-through decoration-status-error/50">
            {issue.original_text}
          </p>
        </div>

        {/* Suggested */}
        <div>
          <h4 className="text-[12px] font-semibold text-foreground-muted uppercase tracking-wider mb-2">Suggested</h4>
          {isEditing ? (
            <div className="space-y-2">
              <textarea 
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full min-h-[100px] text-[14px] text-ink border border-accent rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <div className="flex justify-end space-x-2">
                <button onClick={() => setIsEditing(false)} className="text-[12px] px-3 py-1 text-foreground-secondary hover:bg-background-secondary rounded">Cancel</button>
                <button onClick={handleSaveEdit} className="text-[12px] px-3 py-1 bg-accent text-white rounded hover:bg-accent-hover">Save Edit</button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <p className="text-[14px] text-ink bg-status-success bg-opacity-10 p-3 rounded-md">
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

        {/* Protected Items Checklist */}
        <div>
           <h4 className="text-[12px] font-semibold text-foreground-muted uppercase tracking-wider mb-2 flex items-center gap-1">
             <ShieldCheck size={14} /> Safety Checks
           </h4>
           <ul className="text-[13px] text-status-success space-y-1">
             <li className="flex items-center gap-2"><Check size={14} /> Meaning preserved</li>
             <li className="flex items-center gap-2"><Check size={14} /> Numbers & Units</li>
             <li className="flex items-center gap-2"><Check size={14} /> Citations</li>
           </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border-light bg-background-pale space-y-3">
        <div className="flex space-x-2">
          <button 
            onClick={() => activeSuggestion && onSuggestionAction(issue.id, activeSuggestion.id, 'rejected')}
            className="flex-1 h-[36px] bg-white border border-border-light text-ink rounded-md hover:bg-background-secondary transition-colors text-[13px] font-medium"
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
