'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';

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
  stage?: string;
  onContextUpdate: (newContext: Record<string, unknown>, newTitle: string) => void;
}

export function DevelopChat({ workId, initialMessages, initialTitle, stage, onContextUpdate }: Props) {
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
        if (data.savedMessage) {
          setError(data.message || "Verba couldn't respond just now. Your thought is safely saved.");
        } else {
          setError(data.error || 'Something went wrong.');
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

  const handleRetry = async () => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') return;
    
    setIsSubmitting(true);
    setError(null);
    setSuggestedReplies([]);

    try {
      const res = await fetch(`/api/works/${workId}/develop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: lastMessage.content,
          messageId: lastMessage.id // Preserving idempotency
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Verba couldn't respond just now. Your thought is safely saved.");
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

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[#E5EAF0] shrink-0 sticky top-0 bg-white/80 backdrop-blur-md z-20 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-[12px] text-[#64748B] font-medium mb-1.5 flex items-center gap-1.5">
            <span>Home</span>
            <span className="text-[#CBD5E1]">›</span>
            <span>New work</span>
            <span className="text-[#CBD5E1]">›</span>
            <span className="text-accent">Develop</span>
          </div>
          <div className="flex items-center">
            <Sparkles size={18} className="text-accent mr-2" />
            <h1 className="text-[18px] font-bold text-[#0F172A]">Develop your idea</h1>
          </div>
        </div>
        
        {stage && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full">
            <div className="w-2 h-2 rounded-full bg-accent"></div>
            <span className="text-[12px] font-medium text-[#475569] capitalize">{stage}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
        {messages.length <= 1 && !isSubmitting && (
          <div className="max-w-2xl mx-auto text-center py-12 flex flex-col items-center">
            <div className="w-12 h-12 bg-[#F1F5F9] rounded-2xl flex items-center justify-center mb-6">
              <Sparkles className="text-accent" size={24} />
            </div>
            <h2 className="text-[20px] font-bold text-[#0F172A] mb-3">Let&apos;s develop your idea</h2>
            <p className="text-[#64748B] text-[15px] leading-relaxed max-w-md">
              Your starting thought is saved.<br/>
              Verba will help you explore it, narrow the direction and turn it into a structured piece of work.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={msg.id || idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            {msg.role === 'verba' && (
              <div className="flex items-center gap-2 mb-2 ml-1">
                <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
                  <Sparkles size={12} className="text-white" />
                </div>
                <span className="text-[13px] font-medium text-[#0F172A]">Verba</span>
              </div>
            )}
            
            <div 
              className={`max-w-[80%] rounded-[16px] p-4 text-[15px] leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-white border border-[#E2E8F0] text-[#0F172A] rounded-tr-[4px]' 
                  : 'bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] rounded-tl-[4px]'
              }`}
            >
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
            
            {msg.created_at && (
              <span className={`text-[11px] text-[#94A3B8] mt-1.5 ${msg.role === 'user' ? 'mr-2' : 'ml-2'}`}>
                {formatTime(msg.created_at)}
              </span>
            )}
          </div>
        ))}

        {isSubmitting && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-2 ml-1">
              <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
                <Sparkles size={12} className="text-white" />
              </div>
              <span className="text-[13px] font-medium text-[#0F172A]">Verba</span>
            </div>
            <div className="max-w-[80%] rounded-[16px] rounded-tl-[4px] p-4 bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] flex items-center space-x-2">
              <Loader2 size={16} className="animate-spin text-accent" />
              <span className="text-[14px]">Thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center mt-6 mb-2">
            <div className="flex flex-col items-center gap-3">
              <span className="text-[14px] text-[#64748B]">{error}</span>
              <button 
                onClick={handleRetry}
                className="px-4 py-2 bg-white border border-[#E2E8F0] text-[#0F172A] text-[13px] font-medium rounded-md hover:bg-[#F8FAFC] transition-colors shadow-sm"
              >
                Try again
              </button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#E5EAF0] bg-white shrink-0">
        <div className="max-w-4xl mx-auto">
          {suggestedReplies.length > 0 && !isSubmitting && !error && (
            <div className="flex flex-wrap gap-2 mb-4">
              {suggestedReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSubmit(reply)}
                  className="px-4 py-2 bg-white border border-accent text-accent text-[13px] font-medium rounded-full hover:bg-[#F0F7FF] transition-colors text-left shadow-sm"
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
              className="w-full min-h-[60px] max-h-[200px] bg-white border border-[#E2E8F0] shadow-sm rounded-[12px] pl-4 pr-12 py-3.5 text-[15px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none transition-all disabled:opacity-50"
              rows={1}
            />
            <button
              onClick={() => handleSubmit(input)}
              disabled={!input.trim() || isSubmitting}
              className="absolute right-3 bottom-3 p-2 rounded-[8px] text-white bg-accent hover:bg-accent-hover disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] transition-colors shadow-sm"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="flex justify-between items-center mt-2 px-1">
            <span className="text-[12px] text-[#94A3B8] flex items-center gap-1.5">
              <span className="font-medium">Enter</span> to send
              <span className="mx-1">•</span>
              <span className="font-medium">Shift+Enter</span> for new line
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
