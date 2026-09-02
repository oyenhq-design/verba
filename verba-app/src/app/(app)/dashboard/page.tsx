import React from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[24px] font-bold text-ink">Your documents</h1>
        <Link href="/upload" className="h-[40px] px-4 flex items-center justify-center bg-accent text-white font-semibold rounded-[8px] hover:bg-accent-hover transition-colors text-[14px]">
          New Document
        </Link>
      </div>

      <div className="bg-white border border-border-light rounded-[12px] p-8 text-center mb-10">
        <div className="max-w-md mx-auto">
          <h2 className="text-[18px] font-semibold text-ink mb-2">Drop your Word document here</h2>
          <p className="text-[14px] text-foreground-secondary mb-6">Or select a file from your computer</p>
          <button className="h-[40px] px-6 inline-flex items-center justify-center bg-white border border-border-light text-ink font-semibold rounded-[8px] hover:bg-background-secondary transition-colors text-[14px]">
            Choose Document
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-[16px] font-semibold text-ink mb-4">Recent Documents</h3>
        
        {/* Empty state */}
        <div className="bg-white border border-border-light rounded-[12px] p-12 text-center">
          <h4 className="text-[16px] font-semibold text-ink mb-2">Your writing workspace is ready.</h4>
          <p className="text-[14px] text-foreground-secondary mb-6 max-w-sm mx-auto">
            Upload your first document to start refining your writing.
          </p>
          <Link href="/upload" className="h-[40px] px-6 inline-flex items-center justify-center bg-accent text-white font-semibold rounded-[8px] hover:bg-accent-hover transition-colors text-[14px]">
            Upload Document
          </Link>
        </div>
      </div>
    </div>
  );
}
