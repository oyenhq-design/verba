import React from 'react';

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

export function ProjectContextPanel({ context }: Props) {
  const renderValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-[#94A3B8] italic">Not defined yet</span>;
    }
    if (typeof value === 'boolean') {
      return <span className="text-[#101828]">{value ? 'Yes' : 'No'}</span>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-[#94A3B8] italic">Not defined yet</span>;
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
    <div className="bg-[#F8FAFC] flex flex-col w-full">
      <div className="p-6 pb-4 border-b border-[#E5EAF0] shrink-0 sticky top-0 bg-[#F8FAFC] z-10">
        <h2 className="text-[16px] font-bold text-[#101828]">Project Context</h2>
        <p className="text-[13px] text-[#667085] mt-1">
          Verba updates this as your project takes shape.
        </p>
      </div>

      <div className="p-6 space-y-6 flex-grow">
        {RENDER_ORDER.map((key) => (
          <div key={key}>
            <h3 className="text-[13px] font-semibold text-[#667085] uppercase tracking-wider mb-1.5">
              {FIELD_LABELS[key]}
            </h3>
            <div className="text-[14px]">
              {renderValue(context[key as keyof ProjectContext])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
