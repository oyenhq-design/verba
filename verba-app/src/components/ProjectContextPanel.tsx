import React, { useMemo } from 'react';
import { Lightbulb, CheckCircle2, Circle, ArrowRight } from 'lucide-react';

interface ProjectContext {
  working_title?: string | null;
  work_type?: string | null;
  field?: string | null;
  topic?: string | null;
  problem?: string | null;
  aim?: string | null;
  objectives?: string[];
  scope?: string | null;
  methodology?: string | null;
  tools?: string[];
  geography?: string | null;
  citation_style?: string | null;
  economic_analysis?: boolean | null;
  focus?: string | null;
  constraints?: string[];
  context_summary?: string | null;
}

interface Props {
  context: ProjectContext;
  initialIdea?: string;
  onContinue?: () => void;
}

const FIELD_LABELS: Record<keyof ProjectContext, string> = {
  working_title: 'Working title',
  work_type: 'Work type',
  field: 'Field',
  topic: 'Topic',
  problem: 'Problem',
  aim: 'Aim',
  objectives: 'Objectives',
  scope: 'Scope',
  methodology: 'Methodology',
  tools: 'Tools',
  geography: 'Geography',
  citation_style: 'Citation style',
  economic_analysis: 'Economic analysis',
  focus: 'Focus',
  constraints: 'Constraints',
  context_summary: 'Context summary'
};

const RENDER_ORDER: (keyof ProjectContext)[] = [
  'working_title',
  'work_type',
  'field',
  'topic',
  'focus',
  'problem',
  'aim',
  'objectives',
  'scope',
  'methodology',
  'tools',
  'geography',
  'constraints'
];


export function ProjectContextPanel({ context, initialIdea, onContinue }: Props) {
  const isDefined = (val: unknown) => {
    if (val === null || val === undefined || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  };

  const progress = useMemo(() => {
    let definedCount = 0;
    
    // topic or focus counts as 1
    if (isDefined(context.topic) || isDefined(context.focus)) definedCount++;
    if (isDefined(context.problem)) definedCount++;
    if (isDefined(context.aim)) definedCount++;
    if (isDefined(context.objectives)) definedCount++;
    if (isDefined(context.scope)) definedCount++;
    if (isDefined(context.methodology)) definedCount++;
    if (isDefined(context.tools)) definedCount++;
    if (isDefined(context.geography)) definedCount++;
    
    return {
      count: definedCount,
      total: 8
    };
  }, [context]);

  const definedKeys = RENDER_ORDER.filter(key => isDefined(context[key]));
  const undefinedKeys = RENDER_ORDER.filter(key => !isDefined(context[key]));

  const renderValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-[#94A3B8] italic">Not defined yet</span>;
    }
    if (typeof value === 'boolean') {
      return <span className="text-[#101828]">{value ? 'Yes' : 'No'}</span>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      return (
        <ul className="list-disc pl-4 space-y-1">
          {value.map((item, idx) => (
            <li key={idx} className="text-[#101828]">{item}</li>
          ))}
        </ul>
      );
    }
    return <span className="text-[#101828] whitespace-pre-wrap">{String(value)}</span>;
  };

  return (
    <div className="bg-white flex flex-col w-full h-full relative">
      <div className="p-6 pb-5 border-b border-[#E5EAF0] shrink-0 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <h2 className="text-[18px] font-bold text-[#0F172A]">What we&apos;re shaping</h2>
        <p className="text-[13px] text-[#64748B] mt-1.5 leading-relaxed">
          Verba organises the key details as your idea takes shape.
        </p>

        {progress.count > 0 && (
          <div className="mt-4 flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] rounded-full px-4 py-2">
            <span className="text-[12px] font-semibold text-[#0F172A]">Project context</span>
            <span className="text-[12px] text-[#64748B] font-medium">{progress.count} of {progress.total} key areas shaped</span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-8 flex-grow">
        {/* Starting Idea */}
        {initialIdea && (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[#0F172A] font-semibold text-[14px]">
                <Lightbulb size={16} className="text-accent" />
                <span>Your starting idea</span>
              </div>
            </div>
            <p className="text-[14px] text-[#475569] leading-relaxed whitespace-pre-wrap">{initialIdea}</p>
          </div>
        )}

        {/* Progressive Shaping Section */}
        <div className="space-y-6">
          <h3 className="text-[15px] font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-2">So far</h3>
          
          <div className="space-y-5">
            {definedKeys.map((key) => (
              <div key={key} className="group">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-semibold text-[#0F172A] mb-1">
                      {FIELD_LABELS[key]}
                    </h4>
                    <div className="text-[14px] text-[#475569] leading-relaxed">
                      {renderValue(context[key])}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {definedKeys.length > 0 && undefinedKeys.length > 0 && (
              <div className="h-[1px] bg-[#E2E8F0] my-4" />
            )}

            {undefinedKeys.map((key) => (
              <div key={key} className="flex items-center gap-2 opacity-60">
                <Circle size={16} className="text-[#94A3B8] shrink-0" />
                <h4 className="text-[14px] font-medium text-[#64748B] flex-1">
                  {FIELD_LABELS[key]}
                </h4>
                <span className="text-[12px] text-[#94A3B8]">Not defined yet</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        {progress.count > 0 && onContinue && (
          <div className="mt-8 bg-gradient-to-b from-[#F8FAFC] to-white border border-[#E2E8F0] rounded-[12px] p-5 shadow-sm text-center">
            <p className="text-[14px] font-medium text-[#0F172A] mb-1">Your direction is taking shape.</p>
            <p className="text-[13px] text-[#64748B] mb-4">Continue refining, or move to the next step when you&apos;re ready.</p>
            <button 
              onClick={onContinue}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#E2E8F0] text-[#0F172A] rounded-[8px] text-[13px] font-bold hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all shadow-sm group"
            >
              Review & shape your work
              <ArrowRight size={16} className="text-[#64748B] group-hover:text-[#0F172A] group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
