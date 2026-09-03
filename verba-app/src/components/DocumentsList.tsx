'use client';

import React, { useState } from 'react';
import { FileText, Search, Plus, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Document {
  id: string;
  title: string;
  word_count: number;
  status: string;
  created_at: string;
}

interface Props {
  initialDocuments: Document[];
}

export function DocumentsList({ initialDocuments }: Props) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    setError(null);
    
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', deletingId);

      if (deleteError) throw deleteError;

      setDocuments(docs => docs.filter(d => d.id !== deletingId));
      setDeletingId(null);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-6">
        <div>
          <h1 className="text-[28px] font-bold text-[#101828] mb-1">Documents</h1>
          <p className="text-[15px] text-[#667085]">
            Manage and continue working on your documents.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 h-[40px] px-5 inline-flex items-center justify-center bg-accent text-white font-medium rounded-[8px] hover:bg-accent-hover transition-colors text-[14px] shadow-sm"
        >
          <Plus size={18} className="mr-2" />
          New document
        </Link>
      </div>

      {/* Controls */}
      <div className="mb-6 flex items-center justify-between">
        <div className="relative w-full md:w-[320px]">
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

      {/* List */}
      {!documents || documents.length === 0 ? (
        <div className="bg-white border border-[#E5EAF0] rounded-[10px] flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)] h-[300px]">
          <div className="w-12 h-12 rounded-[10px] bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <FileText size={24} />
          </div>
          <h3 className="text-[15px] font-semibold text-[#101828] mb-1">No documents yet</h3>
          <p className="text-[14px] text-[#667085] max-w-sm mt-1 mb-6">
            Upload your first Word document to start writing and reviewing with Verba.
          </p>
          <Link 
            href="/dashboard"
            className="h-[38px] px-5 inline-flex items-center justify-center bg-accent text-white font-medium rounded-[8px] hover:bg-accent-hover transition-colors text-[13px] shadow-sm"
          >
            New document
          </Link>
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
                  <th className="px-5 py-3 text-[12px] font-medium text-[#667085] uppercase tracking-wider">Document</th>
                  <th className="px-5 py-3 text-[12px] font-medium text-[#667085] uppercase tracking-wider">Words</th>
                  <th className="px-5 py-3 text-[12px] font-medium text-[#667085] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[12px] font-medium text-[#667085] uppercase tracking-wider">Updated</th>
                  <th className="px-5 py-3 text-[12px] font-medium text-[#667085] uppercase tracking-wider w-[100px] text-right">Actions</th>
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
                      <td className="px-5 py-3.5 text-right flex justify-end space-x-2">
                        <Link href={`/workspace/${doc.id}`} className="text-[#667085] hover:text-accent text-[13px] font-medium p-1">
                          Open
                        </Link>
                        <button 
                          onClick={() => setDeletingId(doc.id)}
                          className="text-[#667085] hover:text-[#B42318] text-[13px] font-medium p-1"
                        >
                          Delete
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

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-[12px] shadow-xl w-full max-w-[400px] overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-[#FEF3F2] flex items-center justify-center mb-4">
                <AlertTriangle size={24} className="text-[#D92D20]" />
              </div>
              <h3 className="text-[18px] font-bold text-[#101828] mb-2">Delete document?</h3>
              <p className="text-[14px] text-[#667085] mb-6">
                Are you sure you want to delete this document? This action cannot be undone.
              </p>
              {error && (
                <div className="mb-4 p-3 bg-[#FEF3F2] text-[#B42318] text-[13px] rounded-[8px]">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeletingId(null);
                    setError(null);
                  }}
                  disabled={isDeleting}
                  className="flex-1 h-[40px] border border-[#D0D5DD] text-[#344054] font-medium rounded-[8px] hover:bg-slate-50 transition-colors text-[14px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 h-[40px] bg-[#D92D20] text-white font-medium rounded-[8px] hover:bg-[#B42318] transition-colors text-[14px] disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
