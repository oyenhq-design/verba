'use client';

import React, { useState } from 'react';
import { DevelopChat } from '@/components/DevelopChat';
import { ProjectContextPanel } from '@/components/ProjectContextPanel';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

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
}

export function DevelopClientPage({ workId, initialTitle, initialContext, initialMessages }: Props) {
  const [context, setContext] = useState(initialContext);
  const [title, setTitle] = useState(initialTitle);

  const handleContextUpdate = (newContext: Record<string, unknown>, newTitle: string) => {
    setContext(newContext);
    setTitle(newTitle);
  };

  const router = useRouter();

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      {/* Left side: Chat */}
      <div className="flex-1 min-w-0 h-full">
        <DevelopChat 
          workId={workId}
          initialMessages={initialMessages}
          initialTitle={title}
          onContextUpdate={handleContextUpdate}
        />
      </div>

      {/* Right side: Context Panel */}
      <div className="hidden lg:flex w-[350px] shrink-0 h-full border-l border-[#E5EAF0] flex-col bg-[#F8FAFC]">
        <div className="flex-1 overflow-y-auto">
          <ProjectContextPanel context={context} />
        </div>
        <div className="p-6 border-t border-[#E5EAF0] shrink-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
          <button 
            onClick={() => router.push(`/work/${workId}/shape`)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-md text-[14px] font-medium hover:bg-accent-hover transition-colors shadow-sm"
          >
            Continue to plan
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
