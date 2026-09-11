'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, ArrowRight, Plus, Trash2, X, CheckCircle2, Circle } from 'lucide-react';

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

interface ProjectContext {
  [key: string]: unknown;
}

interface Props {
  workId: string;
  initialTitle: string;
  initialContext: ProjectContext;
  initialReadiness?: Readiness | null;
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

const TEXTAREA_FIELDS = new Set(['problem', 'aim', 'scope', 'methodology', 'focus', 'context_summary', 'research_design', 'analysis_approach', 'literature_gap']);
const LIST_FIELDS = new Set(['objectives', 'tools', 'constraints', 'research_questions', 'hypotheses', 'main_arguments', 'counterarguments', 'variables', 'data_requirements', 'data_sources', 'assumptions', 'limitations', 'evidence_needs', 'literature_themes']);
const BOOLEAN_FIELDS = new Set(['economic_analysis']);

export function ShapeClientPage({ workId, initialTitle, initialContext, initialReadiness }: Props) {
  const router = useRouter();
  const [context, setContext] = useState<ProjectContext>(initialContext);
  const [title, setTitle] = useState(initialTitle);
  const [readiness, setReadiness] = useState<Readiness | null>(initialReadiness || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState('');

  const handleBuildDocument = async () => {
    setIsBuilding(true);
    setBuildError('');
    try {
      const res = await fetch(`/api/works/${workId}/build-document`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Failed to prepare the document.');
      }
      const data = await res.json();
      if (data.documentId) {
        router.push(`/workspace/${data.documentId}`);
      }
    } catch (err) {
      console.error(err);
      setBuildError("We couldn't prepare the document just now. Your project plan is safe.");
    } finally {
      setIsBuilding(false);
    }
  };

  const handleTextChange = (field: string, value: string) => {
    setContext(prev => ({ ...prev, [field]: value }));
  };

  const handleBooleanChange = (field: string, value: boolean) => {
    setContext(prev => ({ ...prev, [field]: value }));
  };

  const handleListChange = (field: string, newList: string[]) => {
    setContext(prev => ({ ...prev, [field]: newList }));
  };

  const handleAddListItem = (field: string) => {
    const currentList = (context[field] as string[]) || [];
    handleListChange(field, [...currentList, '']);
  };

  const handleUpdateListItem = (field: string, index: number, value: string) => {
    const currentList = [...((context[field] as string[]) || [])];
    currentList[index] = value;
    handleListChange(field, currentList);
  };

  const handleRemoveListItem = (field: string, index: number) => {
    const currentList = [...((context[field] as string[]) || [])];
    currentList.splice(index, 1);
    handleListChange(field, currentList);
  };

  const handleMoveListItem = (field: string, index: number, direction: 'up' | 'down') => {
    const currentList = [...((context[field] as any[]) || [])];
    if (direction === 'up' && index > 0) {
      const temp = currentList[index - 1];
      currentList[index - 1] = currentList[index];
      currentList[index] = temp;
      handleListChange(field, currentList);
    } else if (direction === 'down' && index < currentList.length - 1) {
      const temp = currentList[index + 1];
      currentList[index + 1] = currentList[index];
      currentList[index] = temp;
      handleListChange(field, currentList);
    }
  };

  const handleUpdateOutlineItem = (index: number, key: string, value: string) => {
    const currentList = [...((context['proposed_outline'] as any[]) || [])];
    currentList[index] = { ...currentList[index], [key]: value };
    handleListChange('proposed_outline', currentList);
  };

  const handleAddOutlineItem = () => {
    const currentList = [...((context['proposed_outline'] as any[]) || [])];
    handleListChange('proposed_outline', [...currentList, { title: '', description: '', status: 'pending' }]);
  };

  const saveChanges = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch(`/api/works/${workId}/context`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      setContext(data.context);
      setTitle(data.title);
      if (data.readiness) {
        setReadiness(data.readiness);
      }
      setSaveMessage('Saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setSaveMessage('Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  const isDefined = (val: unknown) => {
    if (val === null || val === undefined || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === 'object' && Object.keys(val).length === 0) return false;
    return true;
  };

  const definedKeys = Object.keys(context).filter(k => isDefined(context[k]) && CONTEXT_FIELD_CONFIG[k]);
  
  const groupedDefinedKeys: Record<string, string[]> = {};
  GROUP_ORDER.forEach(g => groupedDefinedKeys[g] = []);
  
  definedKeys.forEach(k => {
    groupedDefinedKeys[CONTEXT_FIELD_CONFIG[k].group].push(k);
  });
  
  Object.keys(groupedDefinedKeys).forEach(g => {
    groupedDefinedKeys[g].sort((a, b) => CONTEXT_FIELD_CONFIG[a].order - CONTEXT_FIELD_CONFIG[b].order);
  });

  const renderField = (field: string) => {
    const label = CONTEXT_FIELD_CONFIG[field]?.label || field;

    if (LIST_FIELDS.has(field)) {
      const list = (context[field] as string[]) || [];
      return (
        <div key={field} className="mb-6">
          <label className="block text-[14px] font-semibold text-[#334155] mb-2">{label}</label>
          <div className="space-y-2">
            {list.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 group">
                <div className="flex flex-col gap-1 mt-2 text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleMoveListItem(field, idx, 'up')} disabled={idx === 0} className="hover:text-accent disabled:opacity-30">↑</button>
                   <button onClick={() => handleMoveListItem(field, idx, 'down')} disabled={idx === list.length - 1} className="hover:text-accent disabled:opacity-30">↓</button>
                </div>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleUpdateListItem(field, idx, e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:border-accent text-[14px]"
                  placeholder={field === 'planned_sections' ? `Section name...` : `Add ${label.toLowerCase()}...`}
                />
                <button 
                  onClick={() => handleRemoveListItem(field, idx)}
                  className="p-2 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button 
              onClick={() => handleAddListItem(field)}
              className="flex items-center gap-1 text-[13px] font-medium text-accent hover:text-accent-hover mt-2"
            >
              <Plus size={14} /> Add item
            </button>
          </div>
        </div>
      );
    }

    if (field === 'proposed_outline') {
      const list = (context[field] as any[]) || [];
      return (
        <div key={field} className="mb-6">
          <label className="block text-[14px] font-semibold text-[#334155] mb-2">{label}</label>
          <div className="space-y-4">
            {list.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 group bg-white border border-[#E2E8F0] p-4 rounded-xl shadow-sm">
                <div className="flex flex-col gap-1 mt-1 text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleMoveListItem(field, idx, 'up')} disabled={idx === 0} className="hover:text-accent disabled:opacity-30">↑</button>
                   <button onClick={() => handleMoveListItem(field, idx, 'down')} disabled={idx === list.length - 1} className="hover:text-accent disabled:opacity-30">↓</button>
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    value={item.title || ''}
                    onChange={(e) => handleUpdateOutlineItem(idx, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:border-accent text-[14px] font-semibold"
                    placeholder="Section title"
                  />
                  <textarea
                    value={item.description || ''}
                    onChange={(e) => handleUpdateOutlineItem(idx, 'description', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:border-accent text-[13px] text-[#475569] resize-none"
                    placeholder="What will this section cover?"
                  />
                </div>
                <button 
                  onClick={() => handleRemoveListItem(field, idx)}
                  className="p-2 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button 
              onClick={() => handleAddOutlineItem()}
              className="flex items-center gap-1 text-[13px] font-medium text-accent hover:text-accent-hover mt-2"
            >
              <Plus size={14} /> Add section
            </button>
          </div>
        </div>
      );
    }

    if (BOOLEAN_FIELDS.has(field)) {
      const val = context[field] as boolean | null;
      return (
        <div key={field} className="mb-6 flex items-center gap-3">
          <input
            type="checkbox"
            id={field}
            checked={val || false}
            onChange={(e) => handleBooleanChange(field, e.target.checked)}
            className="w-4 h-4 text-accent border-[#E2E8F0] rounded focus:ring-accent cursor-pointer"
          />
          <label htmlFor={field} className="text-[14px] font-semibold text-[#334155] cursor-pointer">
            {label}
          </label>
        </div>
      );
    }

    if (TEXTAREA_FIELDS.has(field)) {
      return (
        <div key={field} className="mb-6">
          <label className="block text-[14px] font-semibold text-[#334155] mb-2">{label}</label>
          <textarea
            value={(context[field] as string) || ''}
            onChange={(e) => handleTextChange(field, e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:border-accent text-[14px] resize-y min-h-[100px]"
            placeholder={`Describe the ${label.toLowerCase()}...`}
          />
        </div>
      );
    }

    return (
      <div key={field} className="mb-6">
        <label className="block text-[14px] font-semibold text-[#334155] mb-2">{label}</label>
        <input
          type="text"
          value={(context[field] as string) || ''}
          onChange={(e) => handleTextChange(field, e.target.value)}
          className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:border-accent text-[14px]"
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5EAF0] px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push(`/work/${workId}/develop`)}
            className="flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] text-[14px] font-medium transition-colors px-3 py-1.5 rounded-md hover:bg-[#F1F5F9]"
          >
            <ArrowLeft size={16} />
            Keep developing
          </button>
          <div className="h-4 w-[1px] bg-[#E2E8F0]" />
          <div className="flex flex-col">
            <h1 className="text-[16px] font-bold text-[#0F172A]">Shape & Plan</h1>
            <span className="text-[12px] text-[#64748B]">{title}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {saveMessage && (
            <span className={`text-[13px] ${saveMessage.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
              {saveMessage}
            </span>
          )}
          <button 
            onClick={saveChanges}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E2E8F0] text-[#0F172A] rounded-md text-[14px] font-medium hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
          
          <button 
            onClick={() => setShowBuildModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md text-[14px] font-medium hover:bg-accent-hover transition-colors"
          >
            Start writing
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            {readiness && (
              <div className="mb-2">
                <span className="text-[13px] font-semibold text-accent uppercase tracking-wide">{readiness.work_type_label}</span>
                <div className="text-[#64748B] text-[14px] mt-1 font-medium flex items-center gap-2">
                  {readiness.is_ready ? (
                    <><span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={16} /> Core direction ready</span> • </>
                  ) : (
                    <><span className="text-amber-500">Developing direction</span> • </>
                  )}
                  <span>{readiness.shaped_count} of {readiness.total_relevant} relevant areas shaped</span>
                </div>
              </div>
            )}
            <h2 className="text-[24px] font-bold text-[#0F172A] tracking-tight">Your work is taking shape</h2>
            <p className="text-[#64748B] mt-2 text-[15px]">
              Review and refine the project context gathered during your conversation. 
              These details will form the foundation of your document.
            </p>
          </div>

          <div className="space-y-8">
            {GROUP_ORDER.map((group) => {
              const keys = groupedDefinedKeys[group];
              if (!keys || keys.length === 0) return null;

              return (
                <div key={group} className="bg-white p-6 rounded-xl border border-[#E5EAF0] shadow-sm">
                  <h3 className="text-[16px] font-bold text-[#0F172A] mb-6 pb-2 border-b border-[#F1F5F9]">
                    {group}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    {keys.map(field => (
                      <div key={field} className={TEXTAREA_FIELDS.has(field) || LIST_FIELDS.has(field) || field === 'proposed_outline' ? 'md:col-span-2' : ''}>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="mt-8 pt-8 border-t border-[#E5EAF0] flex justify-between items-center">
            <button 
              onClick={() => router.push(`/work/${workId}/develop`)}
              className="px-5 py-2.5 bg-white border border-[#E2E8F0] text-[#475467] rounded-md text-[14px] font-medium hover:bg-[#F8FAFC] transition-colors"
            >
              Keep developing
            </button>
            <button 
              onClick={() => setShowBuildModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-md text-[14px] font-medium hover:bg-accent-hover transition-colors shadow-sm"
            >
              Start writing
              <ArrowRight size={16} />
            </button>
          </div>
          
        </div>
      </div>

      {/* Start Writing Modal */}
      {showBuildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-start p-6 border-b border-[#E2E8F0]">
              <div>
                <span className="text-[12px] font-bold text-emerald-500 flex items-center gap-1.5 mb-1 tracking-wide uppercase">
                  <CheckCircle2 size={14} /> Your plan is ready
                </span>
                <h3 className="text-[20px] font-bold text-[#0F172A]">Ready to start writing?</h3>
              </div>
              <button 
                onClick={() => setShowBuildModal(false)} 
                className="text-[#64748B] hover:text-[#0F172A] transition-colors"
                disabled={isBuilding}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 text-[15px] text-[#475467] leading-relaxed bg-[#F8FAFC]">
              <p className="mb-6">
                Verba has shaped your idea into a working structure. You can keep refining it, or open it as an editable document and start writing.
              </p>

              {/* Document Preview Card */}
              <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-5 mb-4">
                <div className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Your Document</div>
                <h4 className="text-[16px] font-bold text-[#0F172A] mb-4">
                  {String(context.working_title || 'Untitled Work')}
                </h4>

                {readiness?.direction_summary && (
                  <div className="mb-3">
                    <span className="text-[12px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">Direction</span>
                    <p className="text-[14px] text-[#475467]">{readiness.direction_summary}</p>
                  </div>
                )}
                
                {readiness?.approach_summary && (
                  <div className="mb-4">
                    <span className="text-[12px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">Approach</span>
                    <p className="text-[14px] text-[#475467]">{readiness.approach_summary}</p>
                  </div>
                )}

                {Array.isArray(context.proposed_outline) && context.proposed_outline.length > 0 && (
                  <div>
                    <span className="text-[12px] font-bold text-[#64748B] uppercase tracking-wider block mb-2">Structure</span>
                    <ul className="space-y-1.5">
                      {(context.proposed_outline as any[]).slice(0, 5).map((section: any, idx: number) => (
                        <li key={idx} className="text-[14px] text-[#0F172A] font-medium flex items-center gap-2">
                          <span className="text-[#94A3B8] w-5 text-right font-mono text-[12px]">
                            {String(idx + 1).padStart(2, '0')}
                          </span> 
                          {section.title}
                        </li>
                      ))}
                      {(context.proposed_outline as any[]).length > 5 && (
                        <li className="text-[13px] text-[#64748B] italic pl-7">
                          + {(context.proposed_outline as any[]).length - 5} more sections
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {readiness?.missing_optional && readiness.missing_optional.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                  <span className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-2">Still to decide</span>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {readiness.missing_optional.slice(0, 3).map((key) => (
                      <li key={key} className="text-[13px] text-[#64748B] flex items-center gap-1.5">
                        <Circle size={10} className="text-[#CBD5E1]" />
                        {CONTEXT_FIELD_CONFIG[key]?.label || key}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[13px] text-[#94A3B8] mt-2 italic">You can continue shaping these while you write.</p>
                </div>
              )}

              {buildError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-[14px] mt-4">
                  {buildError}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between p-6 border-t border-[#E2E8F0] bg-white">
              <span className="text-[13px] text-[#64748B]">
                Your conversation and project context will stay connected to this work.
              </span>
              <div className="flex gap-3 shrink-0 ml-4">
                <button 
                  onClick={() => setShowBuildModal(false)}
                  disabled={isBuilding}
                  className="px-4 py-2 text-[14px] font-medium text-[#475467] hover:text-[#0F172A] transition-colors disabled:opacity-50"
                >
                  Keep refining
                </button>
                <button 
                  onClick={handleBuildDocument}
                  disabled={isBuilding}
                  className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-md text-[14px] font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isBuilding ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : null}
                  Start writing
                  {!isBuilding && <ArrowRight size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
