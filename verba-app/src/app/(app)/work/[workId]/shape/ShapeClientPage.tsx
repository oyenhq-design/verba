'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, ArrowRight, Plus, Trash2, X } from 'lucide-react';

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
  workId: string;
  initialTitle: string;
  initialContext: ProjectContext;
}

const FIELD_GROUPS = [
  {
    title: 'Core Identity',
    fields: ['working_title', 'work_type', 'field', 'topic']
  },
  {
    title: 'Purpose',
    fields: ['problem', 'aim', 'objectives', 'focus']
  },
  {
    title: 'Approach',
    fields: ['scope', 'methodology', 'tools', 'geography', 'constraints']
  },
  {
    title: 'Other Details',
    fields: ['citation_style', 'economic_analysis', 'context_summary']
  }
];

const TEXTAREA_FIELDS = new Set(['problem', 'aim', 'scope', 'methodology', 'focus', 'context_summary']);
const LIST_FIELDS = new Set(['objectives', 'tools', 'constraints']);
const BOOLEAN_FIELDS = new Set(['economic_analysis']);

export function ShapeClientPage({ workId, initialTitle, initialContext }: Props) {
  const router = useRouter();
  const [context, setContext] = useState<ProjectContext>(initialContext);
  const [title, setTitle] = useState(initialTitle);
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

  const handleTextChange = (field: keyof ProjectContext, value: string) => {
    setContext(prev => ({ ...prev, [field]: value }));
  };

  const handleBooleanChange = (field: keyof ProjectContext, value: boolean) => {
    setContext(prev => ({ ...prev, [field]: value }));
  };

  const handleListChange = (field: keyof ProjectContext, newList: string[]) => {
    setContext(prev => ({ ...prev, [field]: newList }));
  };

  const handleAddListItem = (field: keyof ProjectContext) => {
    const currentList = (context[field] as string[]) || [];
    handleListChange(field, [...currentList, '']);
  };

  const handleUpdateListItem = (field: keyof ProjectContext, index: number, value: string) => {
    const currentList = [...((context[field] as string[]) || [])];
    currentList[index] = value;
    handleListChange(field, currentList);
  };

  const handleRemoveListItem = (field: keyof ProjectContext, index: number) => {
    const currentList = [...((context[field] as string[]) || [])];
    currentList.splice(index, 1);
    handleListChange(field, currentList);
  };

  const handleMoveListItem = (field: keyof ProjectContext, index: number, direction: 'up' | 'down') => {
    const currentList = [...((context[field] as string[]) || [])];
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
      setSaveMessage('Saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setSaveMessage('Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: string) => {
    const typedField = field as keyof ProjectContext;
    const label = field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    if (LIST_FIELDS.has(field)) {
      const list = (context[typedField] as string[]) || [];
      return (
        <div key={field} className="mb-6">
          <label className="block text-[14px] font-semibold text-[#334155] mb-2">{label}</label>
          <div className="space-y-2">
            {list.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 group">
                <div className="flex flex-col gap-1 mt-2 text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleMoveListItem(typedField, idx, 'up')} disabled={idx === 0} className="hover:text-accent disabled:opacity-30">↑</button>
                   <button onClick={() => handleMoveListItem(typedField, idx, 'down')} disabled={idx === list.length - 1} className="hover:text-accent disabled:opacity-30">↓</button>
                </div>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleUpdateListItem(typedField, idx, e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#E2E8F0] rounded-md focus:outline-none focus:border-accent text-[14px]"
                  placeholder={`Add ${label.toLowerCase()}...`}
                />
                <button 
                  onClick={() => handleRemoveListItem(typedField, idx)}
                  className="p-2 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button 
              onClick={() => handleAddListItem(typedField)}
              className="flex items-center gap-1 text-[13px] font-medium text-accent hover:text-accent-hover mt-2"
            >
              <Plus size={14} /> Add item
            </button>
          </div>
        </div>
      );
    }

    if (BOOLEAN_FIELDS.has(field)) {
      const val = context[typedField] as boolean | null;
      return (
        <div key={field} className="mb-6 flex items-center gap-3">
          <input
            type="checkbox"
            id={field}
            checked={val || false}
            onChange={(e) => handleBooleanChange(typedField, e.target.checked)}
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
            value={(context[typedField] as string) || ''}
            onChange={(e) => handleTextChange(typedField, e.target.value)}
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
          value={(context[typedField] as string) || ''}
          onChange={(e) => handleTextChange(typedField, e.target.value)}
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
            Build my document
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-[24px] font-bold text-[#0F172A] tracking-tight">Your work is taking shape</h2>
            <p className="text-[#64748B] mt-2 text-[15px]">
              Review and refine the project context gathered during your conversation. 
              These details will form the foundation of your document.
            </p>
          </div>

          <div className="space-y-8">
            {FIELD_GROUPS.map((group) => (
              <div key={group.title} className="bg-white p-6 rounded-xl border border-[#E5EAF0] shadow-sm">
                <h3 className="text-[16px] font-bold text-[#0F172A] mb-6 pb-2 border-b border-[#F1F5F9]">
                  {group.title}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  {group.fields.map(field => (
                    <div key={field} className={TEXTAREA_FIELDS.has(field) || LIST_FIELDS.has(field) ? 'md:col-span-2' : ''}>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
              Build my document
              <ArrowRight size={16} />
            </button>
          </div>
          
        </div>
      </div>

      {/* Build Modal */}
      {showBuildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-[#E2E8F0]">
              <h3 className="text-[18px] font-bold text-[#0F172A]">Ready to start writing?</h3>
              <button 
                onClick={() => setShowBuildModal(false)} 
                className="text-[#64748B] hover:text-[#0F172A] transition-colors"
                disabled={isBuilding}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 text-[15px] text-[#475467] leading-relaxed space-y-4">
              <p>
                Verba will turn your approved project structure into an editable document.
              </p>
              <p>
                Your conversation and Project Context will stay intact. The document will include:
              </p>
              <ul className="space-y-2 font-medium text-[#334155]">
                {title && <li className="flex items-center gap-2"><span className="text-accent">✓</span> Working title</li>}
                {context.problem && <li className="flex items-center gap-2"><span className="text-accent">✓</span> Problem statement</li>}
                {context.aim && <li className="flex items-center gap-2"><span className="text-accent">✓</span> Aim</li>}
                {(context.objectives && context.objectives.length > 0) && <li className="flex items-center gap-2"><span className="text-accent">✓</span> Objectives</li>}
                {context.scope && <li className="flex items-center gap-2"><span className="text-accent">✓</span> Scope</li>}
                {context.methodology && <li className="flex items-center gap-2"><span className="text-accent">✓</span> Methodology</li>}
                <li className="flex items-center gap-2"><span className="text-accent">✓</span> Planned sections</li>
              </ul>
              <p className="pt-2 font-semibold text-[#0F172A]">
                Verba will not write the full project for you.
              </p>
              {buildError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-[14px]">
                  {buildError}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#E2E8F0] bg-[#F8FAFC]">
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
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Building your document...
                  </>
                ) : (
                  <>
                    Build my document
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
