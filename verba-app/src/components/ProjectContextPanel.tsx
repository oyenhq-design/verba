import React from 'react';
import { Lightbulb, CheckCircle2, Circle, ArrowRight } from 'lucide-react';

interface Readiness {
  is_ready: boolean;
  work_type: string;
  work_type_label: string;
  shaped_count: number;
  total_relevant: number;
  missing_core: string[];
  missing_optional: string[];
  structure_ready: boolean;
  direction_summary: string;
  approach_summary: string;
}


interface Props {
  context: Record<string, unknown>;
  initialIdea?: string;
  readiness?: Readiness | null;
  onContinue?: () => void;
}

interface FieldConfig {
  label: string;
  group: 'Project' | 'Direction' | 'Approach' | 'Requirements' | 'Structure';
  order: number;
}

const CONTEXT_FIELD_CONFIG: Record<string, FieldConfig> = {
  working_title: { label: 'Working title', group: 'Project', order: 1 },
  work_type: { label: 'Work type', group: 'Project', order: 2 },
  field: { label: 'Field', group: 'Project', order: 3 },
  academic_level: { label: 'Academic level', group: 'Project', order: 4 },
  topic: { label: 'Topic', group: 'Project', order: 5 },
  
  problem: { label: 'Problem', group: 'Direction', order: 10 },
  aim: { label: 'Aim', group: 'Direction', order: 11 },
  objectives: { label: 'Objectives', group: 'Direction', order: 12 },
  research_questions: { label: 'Research questions', group: 'Direction', order: 13 },
  hypotheses: { label: 'Hypotheses', group: 'Direction', order: 14 },
  position: { label: 'Position', group: 'Direction', order: 15 },
  main_arguments: { label: 'Main arguments', group: 'Direction', order: 16 },
  scope: { label: 'Scope', group: 'Direction', order: 17 },
  focus: { label: 'Focus', group: 'Direction', order: 18 },
  
  methodology: { label: 'Methodology', group: 'Approach', order: 20 },
  research_design: { label: 'Research design', group: 'Approach', order: 21 },
  population: { label: 'Population', group: 'Approach', order: 22 },
  sample: { label: 'Sample', group: 'Approach', order: 23 },
  variables: { label: 'Variables', group: 'Approach', order: 24 },
  data_requirements: { label: 'Data requirements', group: 'Approach', order: 25 },
  data_sources: { label: 'Data sources', group: 'Approach', order: 26 },
  analysis_approach: { label: 'Analysis approach', group: 'Approach', order: 27 },
  tools: { label: 'Tools', group: 'Approach', order: 28 },
  software: { label: 'Software', group: 'Approach', order: 29 },
  geography: { label: 'Geography', group: 'Approach', order: 30 },
  assumptions: { label: 'Assumptions', group: 'Approach', order: 31 },
  limitations: { label: 'Limitations', group: 'Approach', order: 32 },
  constraints: { label: 'Constraints', group: 'Approach', order: 33 },
  evidence_needs: { label: 'Evidence needs', group: 'Approach', order: 34 },
  literature_themes: { label: 'Literature themes', group: 'Approach', order: 35 },
  literature_gap: { label: 'Literature gap', group: 'Approach', order: 36 },
  technical_focus: { label: 'Technical focus', group: 'Approach', order: 37 },
  economic_analysis: { label: 'Economic analysis', group: 'Approach', order: 38 },
  validation_approach: { label: 'Validation approach', group: 'Approach', order: 39 },

  citation_style: { label: 'Citation style', group: 'Requirements', order: 50 },
  target_length: { label: 'Target length', group: 'Requirements', order: 51 },
  deadline: { label: 'Deadline', group: 'Requirements', order: 52 },
  institution_requirements: { label: 'Institution requirements', group: 'Requirements', order: 53 },
  course_requirements: { label: 'Course requirements', group: 'Requirements', order: 54 },
  
  proposed_outline: { label: 'Proposed outline', group: 'Structure', order: 60 }
};

const GROUP_ORDER = ['Project', 'Direction', 'Approach', 'Requirements', 'Structure'];

export function ProjectContextPanel({ context, initialIdea, readiness, onContinue }: Props) {
  const isDefined = (val: unknown) => {
    if (val === null || val === undefined || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === 'object' && Object.keys(val).length === 0) return false;
    return true;
  };

  const renderValue = (value: unknown) => {
    if (!isDefined(value)) {
      return <span className="text-[#94A3B8] italic">Not defined yet</span>;
    }
    if (typeof value === 'boolean') {
      return <span className="text-[#101828]">{value ? 'Yes' : 'No'}</span>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      return (
        <ul className="list-disc pl-4 space-y-1">
          {value.map((item, idx) => {
            if (typeof item === 'object' && item !== null) {
              const outlineItem = item as { title?: string; description?: string; status?: string };
              if (outlineItem.title) {
                return (
                  <li key={idx} className="text-[#101828]">
                    <strong>{outlineItem.title}</strong>
                    {outlineItem.description && <span className="text-[#475569] block text-[13px]">{outlineItem.description}</span>}
                  </li>
                );
              }
            }
            return <li key={idx} className="text-[#101828]">{String(item)}</li>;
          })}
        </ul>
      );
    }
    return <span className="text-[#101828] whitespace-pre-wrap">{String(value)}</span>;
  };

  // Extract keys that are defined in context
  const definedKeys = Object.keys(context).filter(k => isDefined(context[k]) && CONTEXT_FIELD_CONFIG[k]);
  
  // Sort them by group and order
  const groupedDefinedKeys: Record<string, string[]> = {};
  GROUP_ORDER.forEach(g => groupedDefinedKeys[g] = []);
  
  definedKeys.forEach(k => {
    const config = CONTEXT_FIELD_CONFIG[k];
    groupedDefinedKeys[config.group].push(k);
  });
  
  // Sort inside each group
  Object.keys(groupedDefinedKeys).forEach(g => {
    groupedDefinedKeys[g].sort((a, b) => CONTEXT_FIELD_CONFIG[a].order - CONTEXT_FIELD_CONFIG[b].order);
  });

  const missingToShape = (readiness?.missing_core || []).concat(readiness?.missing_optional || []);
  const missingWithLabels = missingToShape
    .filter(k => CONTEXT_FIELD_CONFIG[k])
    .map(k => CONTEXT_FIELD_CONFIG[k].label);

  return (
    <div className="bg-white flex flex-col w-full h-full relative">
      <div className="p-6 pb-5 border-b border-[#E5EAF0] shrink-0 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <h2 className="text-[18px] font-bold text-[#0F172A]">What we&apos;re shaping</h2>
        <p className="text-[13px] text-[#64748B] mt-1.5 leading-relaxed">
          Verba organises the key details as your idea takes shape.
        </p>

        {readiness && (
          <div className="mt-4 flex flex-col gap-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] p-4">
            <span className="text-[13px] font-semibold text-[#0F172A]">{readiness.work_type_label}</span>
            <span className="text-[12px] text-[#64748B] font-medium">
              {readiness.is_ready ? 'Core direction ready' : 'Developing direction'} • {readiness.shaped_count} of {readiness.total_relevant} relevant areas shaped
            </span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-8 flex-grow">
        {/* Starting Idea */}
        {initialIdea && (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[#0F172A] font-semibold text-[14px] mb-3">
              <Lightbulb size={16} className="text-accent" />
              <span>Your starting idea</span>
            </div>
            <p className="text-[14px] text-[#475569] leading-relaxed whitespace-pre-wrap">{initialIdea}</p>
          </div>
        )}

        {/* Defined Context Fields */}
        <div className="space-y-8">
          {GROUP_ORDER.map(group => {
            const keys = groupedDefinedKeys[group];
            if (!keys || keys.length === 0) return null;
            
            return (
              <div key={group} className="space-y-4">
                <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">{group}</h3>
                <div className="space-y-5">
                  {keys.map(key => (
                    <div key={key} className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[14px] font-semibold text-[#0F172A] mb-1">
                          {CONTEXT_FIELD_CONFIG[key].label}
                        </h4>
                        <div className="text-[14px] text-[#475569] leading-relaxed">
                          {renderValue(context[key])}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Missing Relevant Fields */}
        {missingWithLabels.length > 0 && (
          <div className="pt-6 border-t border-[#E2E8F0]">
            <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-4">Still to shape</h3>
            <div className="space-y-3">
              {missingWithLabels.map(label => (
                <div key={label} className="flex items-center gap-2 opacity-60">
                  <Circle size={16} className="text-[#94A3B8] shrink-0" />
                  <span className="text-[13px] font-medium text-[#64748B] flex-1">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {readiness && onContinue && (
          <div className="mt-8 bg-gradient-to-b from-[#F8FAFC] to-white border border-[#E2E8F0] rounded-[12px] p-5 shadow-sm text-center">
            <p className="text-[14px] font-medium text-[#0F172A] mb-1">
              {readiness.is_ready ? 'Your direction is ready.' : 'Your direction is taking shape.'}
            </p>
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
