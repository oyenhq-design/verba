"use client";

import { useState } from "react";
import { mockDocument as initialDocument, mockIssues as initialIssues } from "@/lib/mockDocument";
import { Block, Run, DocumentModel, WritingIssue } from "@/types/document";
import { Check, X, Edit2, RefreshCw } from "lucide-react";

export default function EditorPage({}: { params: { id: string } }) {
  const [documentModel, setDocumentModel] = useState<DocumentModel>(initialDocument);
  const [issues, setIssues] = useState<WritingIssue[]>(initialIssues);
  const [activeIssueId, setActiveIssueId] = useState<string | null>("issue-1");

  const activeIssue = issues.find(i => i.id === activeIssueId);

  // Extract all headings for the outline
  const headings = documentModel.sections.flatMap(section => 
    section.blocks.filter(b => b.type === "heading")
  );

  const handleAccept = (issue: WritingIssue) => {
    setDocumentModel(prev => {
      const newDoc = { ...prev, sections: [...prev.sections] };
      for (const section of newDoc.sections) {
        const blockIndex = section.blocks.findIndex(b => b.id === issue.blockId);
        if (blockIndex !== -1) {
          const block = section.blocks[blockIndex];
          // Simplified replacement: just replace the text in whatever run contains it
          const newRuns = block.runs.map(run => ({
            ...run,
            text: run.text.replace(issue.originalText, issue.suggestedText)
          }));
          section.blocks[blockIndex] = { ...block, runs: newRuns };
        }
      }
      return newDoc;
    });

    // Remove issue and clear active
    setIssues(prev => prev.filter(i => i.id !== issue.id));
    setActiveIssueId(null);
  };

  const handleReject = (issue: WritingIssue) => {
    setIssues(prev => prev.filter(i => i.id !== issue.id));
    setActiveIssueId(null);
  };

  const renderRun = (run: Run, idx: number, isHighlighted: boolean) => {
    let classes = "";
    if (run.bold) classes += " font-bold";
    if (run.italic) classes += " italic";
    if (run.underline) classes += " underline";

    if (isHighlighted) {
      classes += " bg-accent/20 text-accent-hover rounded px-0.5 cursor-pointer";
    }

    return <span key={idx} className={classes}>{run.text}</span>;
  };

  const renderBlock = (block: Block) => {
    const blockIssues = issues.filter(issue => issue.blockId === block.id);
    const hasIssue = blockIssues.length > 0;
    const isIssueActive = blockIssues.some(i => i.id === activeIssueId);
    
    switch (block.type) {
      case "heading":
        if (block.style === "Heading1") {
          return <h1 key={block.id} className="text-3xl font-semibold mb-6 mt-8">{block.runs.map((r, i) => renderRun(r, i, false))}</h1>;
        }
        if (block.style === "Heading2") {
          return <h2 key={block.id} className="text-2xl font-semibold mb-4 mt-6">{block.runs.map((r, i) => renderRun(r, i, false))}</h2>;
        }
        return <h3 key={block.id} className="text-xl font-semibold mb-3 mt-4">{block.runs.map((r, i) => renderRun(r, i, false))}</h3>;
      
      case "paragraph":
        return (
          <p 
            key={block.id} 
            className={`mb-4 leading-relaxed ${isIssueActive ? 'border border-accent/30 bg-accent/5 p-3 rounded-md relative' : ''}`}
            onClick={() => hasIssue ? setActiveIssueId(blockIssues[0].id) : null}
          >
            {isIssueActive && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-8 bg-accent rounded-r-md" />}
            {block.runs.map((r, i) => {
              // Highlight the run if it contains the issue's original text
              const shouldHighlight = hasIssue && blockIssues.some(issue => r.text.includes(issue.originalText) || issue.originalText.includes(r.text) && r.text.length > 5);
              return renderRun(r, i, shouldHighlight);
            })}
          </p>
        );
      
      default:
        return <div key={block.id}>{block.runs.map((r, i) => renderRun(r, i, false))}</div>;
    }
  };

  return (
    <div className="flex h-full w-full bg-background -m-6 md:-m-8"> 
      {/* LEFT: Outline */}
      <div className="w-64 border-r border-border bg-surface shrink-0 hidden lg:block overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Document Outline</h2>
        </div>
        <div className="p-4 space-y-2">
          {headings.map(h => (
            <div 
              key={h.id} 
              className={`text-sm cursor-pointer hover:text-foreground transition-colors ${h.style === 'Heading1' ? 'font-medium text-foreground-secondary' : 'pl-4 text-foreground-muted'}`}
            >
              {h.runs.map(r => r.text).join("")}
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: Document */}
      <div className="flex-1 overflow-y-auto bg-background relative px-8 py-12">
        <div className="max-w-3xl mx-auto bg-background min-h-full">
          <div className="mb-12 border-b border-border pb-4">
            <h1 className="text-4xl font-bold tracking-tight">{documentModel.title}</h1>
          </div>
          
          {documentModel.sections.map(section => (
            <div key={section.id}>
              {section.blocks.map(block => renderBlock(block))}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Assistant */}
      <div className="w-80 border-l border-border bg-surface shrink-0 hidden xl:block overflow-y-auto flex flex-col">
        {activeIssue ? (
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Writing Insights</h2>
              <button onClick={() => setActiveIssueId(null)} className="text-foreground-muted hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6 flex-1">
              <div>
                <h3 className="text-sm font-bold text-status-warning uppercase tracking-wider mb-2">Wordiness</h3>
                <p className="text-sm text-foreground-secondary leading-relaxed">
                  {activeIssue.explanation}
                </p>
              </div>
              
              <div className="bg-background border border-border rounded-lg p-4 space-y-2">
                <span className="text-xs text-foreground-muted uppercase font-medium">Suggested</span>
                <p className="text-sm font-medium">
                  &quot;{activeIssue.suggestedText}&quot;
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <button 
                onClick={() => handleAccept(activeIssue)}
                className="w-full flex items-center justify-center gap-2 bg-accent text-background py-2.5 rounded-md text-sm font-medium hover:bg-accent-hover transition"
              >
                <Check className="w-4 h-4" /> Accept
              </button>
              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 bg-surface-secondary border border-border py-2 rounded-md text-sm font-medium hover:bg-surface transition">
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button 
                  onClick={() => handleReject(activeIssue)}
                  className="flex-1 flex items-center justify-center gap-2 bg-surface-secondary border border-border py-2 rounded-md text-sm font-medium hover:bg-surface transition"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
              <button className="w-full flex items-center justify-center gap-2 text-foreground-muted hover:text-foreground py-2 text-sm transition">
                <RefreshCw className="w-4 h-4" /> Try Another
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-6">Writing Insights</h2>
            
            <div className="text-center p-8 bg-background border border-border rounded-xl mb-8 shadow-sm">
              <span className="block text-4xl font-bold text-status-success mb-1">84</span>
              <span className="text-sm text-foreground-secondary">Writing Quality</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-secondary">Clarity</span>
                <div className="w-32 h-2 bg-surface-secondary rounded-full overflow-hidden">
                  <div className="w-[90%] h-full bg-status-success" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-secondary">Naturalness</span>
                <div className="w-32 h-2 bg-surface-secondary rounded-full overflow-hidden">
                  <div className="w-[70%] h-full bg-status-warning" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-secondary">Repetition</span>
                <div className="w-32 h-2 bg-surface-secondary rounded-full overflow-hidden">
                  <div className="w-[85%] h-full bg-status-success" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
