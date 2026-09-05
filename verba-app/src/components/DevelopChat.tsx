'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'verba';
  content: string;
  created_at?: string;
}

interface Props {
  workId: string;
  initialMessages: Message[];
  initialTitle: string;
  onContextUpdate: (newContext: Record<string, unknown>, newTitle: string) => void;
}

export function DevelopChat({ workId, initialMessages, initialTitle, onContextUpdate }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSubmitting]);

  const handleSubmit = async (textToSubmit: string) => {
    if (!textToSubmit.trim() || isSubmitting) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: textToSubmit,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSuggestedReplies([]);
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/works/${workId}/develop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: textToSubmit,
          messageId: userMessage.id
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle provider failure or timeout (502 from our proxy)
        if (data.savedMessage) {
          // If the backend returned the saved message from the DB, we can update our local ID
          // to match the real DB ID, but for the UI it's already there.
          setError(data.message || 'Verba could not respond just now. Your message is saved.');
        } else {
          setError(data.error || 'Something went wrong.');
          // Remove optimistic message if it wasn't saved
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        }
        setIsSubmitting(false);
        return;
      }

      if (data.verbaMessage) {
        setMessages((prev) => [...prev, data.verbaMessage]);
      }
      
      if (data.suggestedReplies) {
        setSuggestedReplies(data.suggestedReplies);
      }

      if (data.context) {
        onContextUpdate(data.context, data.title || initialTitle);
      }
      
    } catch (err) {
      console.error(err);
      setError('A network error occurred. Please try again.');
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E5EAF0] shrink-0 sticky top-0 bg-white z-10 flex items-center shadow-sm">
        <Sparkles size={20} className="text-accent mr-3" />
        <div>
          <h1 className="text-[16px] font-bold text-[#101828]">Developing: {initialTitle}</h1>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
        {messages.map((msg, idx) => (
          <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] rounded-[12px] p-4 text-[15px] leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-accent text-white rounded-br-[4px]' 
                  : 'bg-[#F1F5F9] text-[#101828] rounded-bl-[4px] border border-[#E5EAF0]'
              }`}
            >
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
          </div>
        ))}

        {isSubmitting && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-[12px] rounded-bl-[4px] p-4 bg-[#F1F5F9] border border-[#E5EAF0] text-[#667085] flex items-center space-x-2">
              <Loader2 size={16} className="animate-spin text-accent" />
              <span className="text-[14px]">Verba is thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center my-4">
            <div className="bg-red-50 border border-red-200 rounded-[8px] p-3 px-4 flex items-center space-x-3 text-red-700 max-w-md">
              <AlertCircle size={18} className="shrink-0" />
              <span className="text-[13px] font-medium">{error}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#E5EAF0] bg-white shrink-0">
        <div className="max-w-4xl mx-auto">
          {suggestedReplies.length > 0 && !isSubmitting && (
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestedReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSubmit(reply)}
                  className="px-3 py-1.5 bg-[#F8FAFC] border border-[#E5EAF0] text-[#475569] text-[13px] rounded-full hover:bg-[#F1F5F9] hover:border-[#CBD5E1] transition-colors text-left"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
          
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              placeholder={isSubmitting ? "Wait for Verba..." : "Type your message..."}
              className="w-full min-h-[60px] max-h-[200px] bg-[#F8FAFC] border border-[#E5EAF0] rounded-[10px] pl-4 pr-12 py-3 text-[15px] text-[#101828] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-accent focus:bg-white resize-none transition-colors disabled:opacity-50"
              rows={1}
            />
            <button
              onClick={() => handleSubmit(input)}
              disabled={!input.trim() || isSubmitting}
              className="absolute right-3 bottom-3 p-1.5 rounded-[6px] text-white bg-accent hover:bg-accent-hover disabled:bg-slate-300 disabled:text-slate-500 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="text-center mt-2">
            <span className="text-[11px] text-[#94A3B8]">Press Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
