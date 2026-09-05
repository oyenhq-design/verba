'use client';

import React, { useState } from 'react';
import { DevelopChat } from '@/components/DevelopChat';
import { ProjectContextPanel } from '@/components/ProjectContextPanel';

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
      <div className="hidden lg:block w-[350px] shrink-0 h-full border-l border-[#E5EAF0]">
        <ProjectContextPanel context={context} />
      </div>
    </div>
  );
}
