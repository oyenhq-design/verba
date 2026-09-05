'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles, FileText, Upload, Loader2, ArrowRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUploadSelect: () => void;
}

export function NewWorkModal({ isOpen, onClose, onUploadSelect }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<'options' | 'idea'>('options');
  const [ideaText, setIdeaText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleStartBlank = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/documents/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'blank' }),
      });
      if (res.ok) {
        const { documentId } = await res.json();
        router.push(`/workspace/${documentId}`);
      } else {
        setIsSubmitting(false);
      }
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  const handleIdeaSubmit = async () => {
    if (!ideaText.trim()) return;
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialIdea: ideaText }),
      });
      if (res.ok) {
        const { workId } = await res.json();
        router.push(`/work/${workId}/develop`);
      } else {
        setIsSubmitting(false);
      }
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]">
      <div className="bg-white rounded-[12px] shadow-xl w-full max-w-[480px] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-light shrink-0">
          <div>
            <h2 className="text-[18px] font-bold text-[#101828]">Create new work</h2>
            {step === 'options' && (
              <p className="text-[14px] text-[#667085] mt-1">How would you like to begin?</p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-[#667085] hover:text-[#101828] hover:bg-slate-100 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto">
          {step === 'options' ? (
            <div className="space-y-3">
              <button 
                onClick={() => setStep('idea')}
                className="w-full flex items-start text-left p-4 rounded-[10px] border border-[#E5EAF0] hover:border-accent hover:shadow-sm bg-white hover:bg-accent/5 transition-all group"
              >
                <div className="w-10 h-10 rounded-[8px] bg-accent/10 flex items-center justify-center text-accent shrink-0 mr-4">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#101828] group-hover:text-accent transition-colors">Start with an idea</h3>
                  <p className="text-[13px] text-[#667085] mt-0.5">Talk through what you&apos;re thinking.</p>
                </div>
              </button>

              <button 
                onClick={handleStartBlank}
                disabled={isSubmitting}
                className="w-full flex items-start text-left p-4 rounded-[10px] border border-[#E5EAF0] hover:border-[#CBD5E1] hover:shadow-sm bg-white hover:bg-[#FAFAFA] transition-all group disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-[8px] bg-[#F1F5F9] flex items-center justify-center text-[#475569] shrink-0 mr-4">
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#101828]">Start blank</h3>
                  <p className="text-[13px] text-[#667085] mt-0.5">Open an empty document.</p>
                </div>
              </button>

              <button 
                onClick={() => {
                  onClose();
                  onUploadSelect();
                }}
                className="w-full flex items-start text-left p-4 rounded-[10px] border border-[#E5EAF0] hover:border-[#CBD5E1] hover:shadow-sm bg-white hover:bg-[#FAFAFA] transition-all group"
              >
                <div className="w-10 h-10 rounded-[8px] bg-[#F1F5F9] flex items-center justify-center text-[#475569] shrink-0 mr-4">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#101828]">Upload existing work</h3>
                  <p className="text-[13px] text-[#667085] mt-0.5">Continue from a DOCX.</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-200">
              <h3 className="text-[16px] font-semibold text-[#101828] mb-2">What are you thinking about?</h3>
              <p className="text-[14px] text-[#667085] mb-4">
                Describe the idea, problem, report or project in your own words.
              </p>
              
              <textarea
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                placeholder="I want to work on..."
                className="w-full h-[160px] p-3 text-[14px] border border-[#E5EAF0] rounded-[8px] focus:outline-none focus:ring-1 focus:ring-accent resize-none text-[#101828]"
                autoFocus
              />

              <div className="flex justify-between items-center mt-6">
                <button 
                  onClick={() => setStep('options')}
                  className="text-[14px] text-[#667085] hover:text-[#101828] font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleIdeaSubmit}
                  disabled={isSubmitting || !ideaText.trim()}
                  className="h-[40px] px-6 flex items-center justify-center bg-accent text-white font-medium rounded-[8px] hover:bg-accent-hover transition-colors disabled:opacity-50 text-[14px]"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  Continue
                  {!isSubmitting && <ArrowRight size={16} className="ml-2" />}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
