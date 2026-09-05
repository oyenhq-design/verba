import React from 'react';
import { Play, Loader2, Zap, Check } from 'lucide-react';

interface Props {
  isAnalyzed: boolean;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  issuesCount: number;
  docStatus: string;
  analyzeError: string | null;
}

export function ReviewTab({ isAnalyzed, isAnalyzing, onAnalyze, issuesCount, docStatus, analyzeError }: Props) {
  if (analyzeError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
        <div className="w-12 h-12 rounded-full bg-[#FEF3F2] flex items-center justify-center mb-4 text-[#B42318]">
          <Zap size={24} />
        </div>
        <h3 className="text-[14px] font-semibold text-[#0B1628] mb-2">Analysis failed</h3>
        <p className="text-[13px] text-foreground-secondary mb-6 leading-relaxed max-w-[240px]">
          {analyzeError}
        </p>
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="w-full h-[36px] flex items-center justify-center bg-accent text-white font-medium rounded-md hover:bg-accent-hover transition-colors text-[13px] disabled:opacity-50"
        >
          {isAnalyzing ? <Loader2 size={14} className="animate-spin mr-2" /> : <Play size={14} className="mr-2 fill-current" />}
          Try Again
        </button>
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
        <p className="text-[13px] text-foreground-secondary mb-6 leading-relaxed max-w-[240px]">
          Analysis failed. Try again.
        </p>
        <button 
          onClick={onAnalyze} 
          disabled={isAnalyzing}
          className="w-full h-[36px] flex items-center justify-center bg-accent text-white font-medium rounded-md hover:bg-accent-hover transition-colors text-[13px] disabled:opacity-50"
        >
          {isAnalyzing ? <Loader2 size={14} className="animate-spin mr-2" /> : <Play size={14} className="mr-2 fill-current" />}
          Try Again
        </button>
      </div>
    );
  }

  if (!isAnalyzed) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4 text-accent">
          <Zap size={24} />
        </div>
        <h3 className="text-[14px] font-semibold text-[#0B1628] mb-2">Document Review</h3>
        <p className="text-[13px] text-foreground-secondary mb-6 leading-relaxed max-w-[240px]">
          Analyze this document to identify clarity and tone issues.
        </p>
        <button 
          onClick={onAnalyze} 
          disabled={isAnalyzing}
          className="w-full h-[36px] flex items-center justify-center bg-accent text-white font-medium rounded-md hover:bg-accent-hover transition-colors text-[13px] disabled:opacity-50"
        >
          {isAnalyzing ? <Loader2 size={14} className="animate-spin mr-2" /> : <Play size={14} className="mr-2 fill-current" />}
          Analyze Document
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
      <div className="w-12 h-12 rounded-full bg-status-success/10 flex items-center justify-center mb-4 text-status-success">
        <Check size={24} />
      </div>
      <h3 className="text-[14px] font-semibold text-[#0B1628] mb-2">Analysis complete</h3>
      <p className="text-[13px] text-foreground-secondary mb-6 leading-relaxed max-w-[240px]">
        {issuesCount === 0 
          ? "No writing issues were found." 
          : `Found ${issuesCount} writing ${issuesCount === 1 ? 'issue' : 'issues'}. Head over to the Assistant tab to review them.`}
      </p>
      <button 
        onClick={onAnalyze} 
        disabled={isAnalyzing}
        className="w-full h-[36px] flex items-center justify-center bg-white border border-border-light text-[#0B1628] font-medium rounded-md hover:bg-background-secondary transition-colors text-[13px] disabled:opacity-50"
      >
        {isAnalyzing ? <Loader2 size={14} className="animate-spin mr-2" /> : <Play size={14} className="mr-2" />}
        Re-analyze
      </button>
    </div>
  );
}
