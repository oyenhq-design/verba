import React from 'react';
import { DocumentUploader } from '@/components/DocumentUploader';

export default function UploadPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto w-full h-full flex flex-col pt-16">
      <div className="w-full mb-8">
        <h1 className="text-[28px] font-bold text-ink mb-2">Upload Document</h1>
        <p className="text-foreground-secondary">Upload a Word document to begin refining your writing.</p>
      </div>

      <DocumentUploader />
    </div>
  );
}
