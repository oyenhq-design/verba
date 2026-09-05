'use client';

import React, { useState } from 'react';
import { DocumentUploader } from '@/components/DocumentUploader';
import { FileText, MoreHorizontal, Search, Clock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { NewWorkModal } from '@/components/NewWorkModal';

interface Document {
  id: string;
  title: string;
  word_count: number;
  status: string;
  created_at: string;
}

interface Props {
  documents: Document[];
  userName: string | null;
}

export function DashboardContent({ documents, userName }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewWorkModalOpen, setIsNewWorkModalOpen] = useState(false);

  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const greeting = userName ? `Good afternoon, ${userName}.` : 'Welcome back.';
  const latestDoc = documents.length > 0 ? documents[0] : null;

  return (
    <div className="p-8 max-w-[1200px] mx-auto w-full pt-10 pb-24">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <h1 className="text-[28px] font-bold text-[#101828] mb-1">{greeting}</h1>
          <p className="text-[15px] font-medium text-[#101828] mt-2 mb-1">
            What are you working on?
          </p>
          <p className="text-[15px] text-[#667085]">
            Start wherever you are — from a rough thought to an existing draft.
          </p>
        </div>
        <div className="relative w-full md:w-[280px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-[#667085]" />
          </div>
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#E5EAF0] rounded-[8px] text-[14px] text-[#101828] placeholder-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-accent shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          />
        </div>
      </div>

      {/* Entry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        
        {/* Start with an idea */}
        <div className="bg-white border border-[#E5EAF0] rounded-[10px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col hover:border-[#CBD5E1] transition-colors h-full">
          <div className="w-10 h-10 rounded-[8px] bg-accent/10 flex items-center justify-center text-accent mb-4">
            <Sparkles size={20} />
          </div>
          <h2 className="text-[16px] font-bold text-[#101828] mb-1">Start with an idea</h2>
          <p className="text-[14px] text-[#667085] flex-grow mb-6">
            Have something in mind? Develop it into a clear piece of work with Verba.
          </p>
          <button 
            onClick={() => setIsNewWorkModalOpen(true)}
            className="w-full h-[38px] px-5 inline-flex items-center justify-center bg-white border border-[#E5EAF0] text-[#101828] font-semibold rounded-[8px] hover:bg-slate-50 transition-colors text-[14px] shadow-sm"
          >
            Start developing &rarr;
          </button>
        </div>

        {/* Start blank */}
        <div className="bg-white border border-[#E5EAF0] rounded-[10px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col hover:border-[#CBD5E1] transition-colors h-full">
          <div className="w-10 h-10 rounded-[8px] bg-[#F1F5F9] flex items-center justify-center text-[#475569] mb-4">
            <FileText size={20} />
          </div>
          <h2 className="text-[16px] font-bold text-[#101828] mb-1">Start blank</h2>
          <p className="text-[14px] text-[#667085] flex-grow mb-6">
            Know exactly what you need to write? Open an empty document.
          </p>
          <button 
            onClick={() => setIsNewWorkModalOpen(true)}
            className="w-full h-[38px] px-5 inline-flex items-center justify-center bg-white border border-[#E5EAF0] text-[#101828] font-semibold rounded-[8px] hover:bg-slate-50 transition-colors text-[14px] shadow-sm"
          >
            Open blank document
          </button>
        </div>

        {/* Upload existing work */}
        <div className="h-full">
           <DocumentUploader />
        </div>
      </div>

      {/* Continue where you left off */}
      {latestDoc && !searchQuery && (
        <div className="mb-10">
          <h2 className="text-[15px] font-semibold text-[#101828] mb-4">Continue where you left off</h2>
          <div className="bg-white border border-[#E5EAF0] rounded-[10px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-[#CBD5E1] transition-colors">
            <div className="flex items-center space-x-4 min-w-0">
              <div className="w-10 h-10 rounded-[8px] bg-accent/10 flex items-center justify-center shrink-0">
                <FileText size={20} className="text-accent" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-[#101828] truncate leading-snug">{latestDoc.title}</h3>
                <div className="flex items-center text-[13px] text-[#667085] mt-1 space-x-3">
                  <span className="flex items-center"><Clock size={14} className="mr-1.5" /> Updated {new Date(latestDoc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>&middot;</span>
                  <span>{latestDoc.word_count ? latestDoc.word_count.toLocaleString() : '0'} words</span>
                </div>
              </div>
            </div>
            <Link 
              href={`/workspace/${latestDoc.id}`}
              className="shrink-0 h-[36px] px-5 inline-flex items-center justify-center bg-white border border-[#E5EAF0] text-[#101828] font-medium rounded-[8px] hover:bg-slate-50 transition-colors text-[13px]"
            >
              Continue work
            </Link>
          </div>
        </div>
      )}

      {/* User Documents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-[#101828]">Recent work</h2>
        </div>

        {!documents || documents.length === 0 ? (
          <div className="bg-white border border-[#E5EAF0] rounded-[10px] flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)] h-[240px]">
            <div className="w-12 h-12 rounded-[10px] bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-[15px] font-semibold text-[#101828] mb-1">No work yet</h3>
            <p className="text-[14px] text-[#667085] max-w-sm mt-1 mb-6">
              Start with an idea, open a blank document, or upload existing work to get started.
            </p>
            <button 
              onClick={() => setIsNewWorkModalOpen(true)}
              className="h-[38px] px-5 inline-flex items-center justify-center bg-accent text-white font-medium rounded-[8px] hover:bg-accent-hover transition-colors text-[13px] shadow-sm"
            >
              Start new work
            </button>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-white border border-[#E5EAF0] rounded-[10px] flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)] h-[180px]">
            <p className="text-[14px] text-[#667085]">No documents match your search.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#E5EAF0] rounded-[10px] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#E5EAF0] bg-white">
                    <th className="px-5 py-3 text-[12px] font-medium text-[#667085] uppercase tracking-wider">Document Name</th>
                    <th className="px-5 py-3 text-[12px] font-medium text-[#667085] uppercase tracking-wider">Words</th>
                    <th className="px-5 py-3 text-[12px] font-medium text-[#667085] uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-[12px] font-medium text-[#667085] uppercase tracking-wider">Updated</th>
                    <th className="px-5 py-3 text-[12px] font-medium text-[#667085] uppercase tracking-wider w-[60px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {filteredDocuments.map((doc) => {
                    const statusConfig = {
                      uploaded: { color: 'text-slate-600', bg: 'bg-slate-100', label: 'Uploaded' },
                      processing: { color: 'text-accent', bg: 'bg-accent/10', label: 'Analyzing' },
                      analyzing: { color: 'text-accent', bg: 'bg-accent/10', label: 'Analyzing' },
                      ready: { color: 'text-[#027A48]', bg: 'bg-[#ECFDF3]', label: 'Ready' },
                      analyzed: { color: 'text-[#027A48]', bg: 'bg-[#ECFDF3]', label: 'Ready' },
                      failed: { color: 'text-[#B42318]', bg: 'bg-[#FEF3F2]', label: 'Failed' },
                    }[doc.status as string] || { color: 'text-[#344054]', bg: 'bg-[#F2F4F7]', label: 'Not analyzed' };

                    return (
                      <tr key={doc.id} className="hover:bg-[#F9FAFB] transition-colors group bg-white">
                        <td className="px-5 py-3.5">
                          <Link href={`/workspace/${doc.id}`} className="flex items-center w-fit max-w-[300px]">
                            <FileText size={18} className="text-[#94A3B8] mr-3 shrink-0" />
                            <span className="text-[14px] font-semibold text-[#101828] hover:text-accent transition-colors truncate">
                              {doc.title}.docx
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[14px] text-[#667085]">
                            {doc.word_count ? doc.word_count.toLocaleString() : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[14px] text-[#667085]">
                            {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button className="text-[#94A3B8] hover:text-[#101828] p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-[#F1F5F9]">
                            <MoreHorizontal size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <NewWorkModal 
        isOpen={isNewWorkModalOpen} 
        onClose={() => setIsNewWorkModalOpen(false)} 
        onUploadSelect={() => document.querySelector('input[type="file"]')?.dispatchEvent(new MouseEvent('click'))}
      />
    </div>
  );
}
