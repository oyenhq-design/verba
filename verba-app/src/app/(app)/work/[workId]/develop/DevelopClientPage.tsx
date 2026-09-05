'use client';

import React, { useState } from 'react';
import { DevelopChat } from '@/components/DevelopChat';
import { ProjectContextPanel } from '@/components/ProjectContextPanel';
import { useRouter } from 'next/navigation';
import { ChevronRight, PanelRight } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'verba';
  content: string;
  created_at?: string;
}

interface Props {
  workId: string;
  initialTitle: string;
  initialContext: Record<string, unknown>;
  initialMessages: Message[];
  initialIdea?: string;
  stage?: string;
}

export function DevelopClientPage({ workId, initialTitle, initialContext, initialMessages, initialIdea, stage }: Props) {
  const [context, setContext] = useState(initialContext);
  const [title, setTitle] = useState(initialTitle);
  const [showMobileContext, setShowMobileContext] = useState(false);

  const handleContextUpdate = (newContext: Record<string, unknown>, newTitle: string) => {
    setContext(newContext);
    setTitle(newTitle);
  };

  const router = useRouter();

  return (
    <div className="flex h-full w-full bg-white overflow-hidden relative">
      {/* Left side: Chat */}
      <div className="flex-1 min-w-0 h-full flex flex-col relative">
        <DevelopChat 
          workId={workId}
          initialMessages={initialMessages}
          initialTitle={title}
          stage={stage}
          onContextUpdate={handleContextUpdate}
        />
        
        {/* Mobile trigger for context */}
        <button 
          onClick={() => setShowMobileContext(true)}
          className="lg:hidden absolute top-4 right-4 p-2 bg-white rounded-md shadow-sm border border-[#E5EAF0] text-[#667085] hover:text-[#101828]"
        >
          <PanelRight size={20} />
        </button>
      </div>

      {/* Right side: Context Panel */}
      <div className={`
        fixed inset-y-0 right-0 z-50 w-full max-w-[360px] bg-white lg:static lg:flex lg:w-[360px] xl:w-[400px] shrink-0 border-l border-[#E5EAF0] flex-col transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
        ${showMobileContext ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Header for Context */}
        <div className="lg:hidden h-[64px] border-b border-[#E5EAF0] flex items-center px-4 bg-white shrink-0">
          <button 
            onClick={() => setShowMobileContext(false)}
            className="p-2 text-[#667085] hover:text-[#101828]"
          >
            <ChevronRight size={24} />
          </button>
          <span className="ml-2 font-bold text-[#101828]">Project Context</span>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          <ProjectContextPanel context={context} initialIdea={initialIdea} onContinue={() => router.push(`/work/${workId}/shape`)} />
        </div>
      </div>

      {/* Overlay for mobile context drawer */}
      {showMobileContext && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setShowMobileContext(false)}
        />
      )}
    </div>
  );
}
