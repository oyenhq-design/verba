import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { DocumentUploader } from '@/components/DocumentUploader';
import { FileText, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null; // Handled by middleware redirect
  }

  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, word_count, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="p-8 max-w-[1200px] mx-auto w-full pt-12 md:pt-16 pb-24">
      {/* Workspace Header */}
      <div className="mb-10">
        <h1 className="text-[26px] font-bold text-[#0B1628] mb-1">Documents</h1>
        <p className="text-[14px] text-foreground-secondary">
          Manage, review and continue working on your documents.
        </p>
      </div>

      {/* Primary Upload Experience */}
      <div className="mb-12">
        <DocumentUploader />
      </div>

      {/* User Documents */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[16px] font-semibold text-[#0B1628]">Recent documents</h2>
          {documents && documents.length > 0 && (
            <Link href="/documents" className="text-[14px] font-medium text-accent hover:text-accent-hover transition-colors">
              View all
            </Link>
          )}
        </div>

        {!documents || documents.length === 0 ? (
          <div className="bg-white border border-border-light rounded-[12px] p-12 flex flex-col items-center justify-center text-center shadow-sm" style={{ minHeight: '260px' }}>
            <div className="w-12 h-12 rounded-full bg-background-secondary text-foreground-secondary flex items-center justify-center mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-[16px] font-semibold text-[#0B1628] mb-1">No documents yet</h3>
            <p className="text-[14px] text-foreground-secondary max-w-sm mt-1">
              Upload your first Word document to start reviewing and refining your writing.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-border-light rounded-[12px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-border-light bg-[#F6F8FB]">
                    <th className="px-6 py-4 text-[13px] font-semibold text-foreground-secondary uppercase tracking-wider">Document</th>
                    <th className="px-6 py-4 text-[13px] font-semibold text-foreground-secondary uppercase tracking-wider">Words</th>
                    <th className="px-6 py-4 text-[13px] font-semibold text-foreground-secondary uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[13px] font-semibold text-foreground-secondary uppercase tracking-wider">Updated</th>
                    <th className="px-6 py-4 text-[13px] font-semibold text-foreground-secondary uppercase tracking-wider w-[80px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {documents.map((doc) => {
                    const statusConfig = {
                      uploaded: { color: 'text-foreground-secondary', bg: 'bg-background-secondary', label: 'Uploaded' },
                      processing: { color: 'text-accent', bg: 'bg-accent/10', label: 'Analyzing' },
                      ready: { color: 'text-status-success', bg: 'bg-status-success/10', label: 'Ready' },
                      failed: { color: 'text-status-error', bg: 'bg-status-error/10', label: 'Failed' },
                    }[doc.status as string] || { color: 'text-foreground-secondary', bg: 'bg-background-secondary', label: 'Unknown' };

                    return (
                      <tr key={doc.id} className="hover:bg-background-pale/50 transition-colors group bg-white">
                        <td className="px-6 py-4">
                          <Link href={`/workspace/${doc.id}`} className="flex items-center w-fit">
                            <FileText size={16} className="text-foreground-secondary mr-3 shrink-0" />
                            <span className="text-[14px] font-medium text-[#0B1628] hover:text-accent transition-colors truncate">
                              {doc.title}.docx
                            </span>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[14px] text-foreground-secondary">
                            {doc.word_count ? doc.word_count.toLocaleString() : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[14px] text-foreground-secondary">
                            {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-foreground-secondary hover:text-ink p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-background-secondary">
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
    </div>
  );
}
