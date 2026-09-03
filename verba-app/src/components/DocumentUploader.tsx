'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function DocumentUploader() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'empty' | 'selected' | 'uploading' | 'processing' | 'uploaded' | 'error'>('empty');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.docx') && selectedFile.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      setStatus('error');
      setErrorMessage('Only .docx files are supported.');
      return;
    }
    
    // Check max size (25MB as per prompt)
    if (selectedFile.size > 25 * 1024 * 1024) {
      setStatus('error');
      setErrorMessage('File size exceeds the 25MB limit.');
      return;
    }

    setFile(selectedFile);
    setStatus('selected');
    setErrorMessage('');
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setStatus('uploading');

      // 1. Upload to Supabase Storage
      const documentId = crypto.randomUUID(); 
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to upload a document.');
      }
      
      const userId = user.id;
      const storagePath = `${userId}/${documentId}/original.docx`;

      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (storageError) {
        throw new Error(`Storage error: ${storageError.message}`);
      }

      // 2. Insert record into Database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          id: documentId,
          user_id: userId,
          title: file.name.replace('.docx', ''),
          original_filename: file.name,
          mime_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          status: 'uploaded'
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      // 3. Trigger API processing route
      setStatus('processing');
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: documentId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process document');
      }

      setStatus('uploaded');
      
      setTimeout(() => {
        router.push(`/workspace/${documentId}`);
      }, 1000);

    } catch (err: unknown) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  };

  return (
    <div 
      className={`w-full bg-white border rounded-[12px] p-6 transition-colors flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4
        ${status === 'error' ? 'border-status-error bg-status-error/5' : 
          status === 'selected' || isDragOver ? 'border-accent bg-accent/5' : 'border-border-light hover:border-border-dark'
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ minHeight: '120px' }}
    >
      {/* Left side info */}
      <div className="flex items-center space-x-5">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0
          ${status === 'empty' || status === 'error' ? 'bg-background-secondary text-foreground-secondary' : 
            status === 'uploaded' ? 'bg-status-success/10 text-status-success' :
            'bg-accent/10 text-accent'
          }`}
        >
          {status === 'uploaded' ? <CheckCircle size={24} /> : 
           status === 'error' ? <AlertCircle size={24} /> :
           (status === 'uploading' || status === 'processing') ? <Loader2 size={24} className="animate-spin" /> :
           status === 'selected' ? <FileText size={24} /> :
           <Upload size={24} />}
        </div>
        
        <div>
          {status === 'empty' && (
            <>
              <h3 className="text-[16px] font-semibold text-ink">Upload a Word document</h3>
              <p className="text-[14px] text-foreground-secondary mt-0.5">Drop your .docx here or browse from your computer.</p>
              <p className="text-[12px] text-foreground-muted mt-1 font-medium tracking-wide">DOCX &middot; Maximum 25 MB</p>
            </>
          )}

          {status === 'selected' && file && (
            <>
              <h3 className="text-[16px] font-semibold text-ink">{file.name}</h3>
              <p className="text-[14px] text-foreground-secondary mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </>
          )}

          {(status === 'uploading' || status === 'processing') && (
            <>
              <h3 className="text-[16px] font-semibold text-ink">
                {status === 'uploading' ? 'Uploading document...' : 'Parsing document structure...'}
              </h3>
              <p className="text-[14px] text-foreground-secondary mt-0.5">
                {status === 'uploading' ? 'Securely storing your original file.' : 'Extracting headings and paragraphs.'}
              </p>
            </>
          )}

          {status === 'uploaded' && (
            <>
              <h3 className="text-[16px] font-semibold text-ink">Document Ready!</h3>
              <p className="text-[14px] text-foreground-secondary mt-0.5">Redirecting to your workspace...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <h3 className="text-[16px] font-semibold text-status-error">Processing Failed</h3>
              <p className="text-[14px] text-foreground-secondary mt-0.5">{errorMessage}</p>
            </>
          )}
        </div>
      </div>

      {/* Right side actions */}
      <div className="shrink-0 flex items-center space-x-3">
        {status === 'empty' && (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="h-[40px] px-5 inline-flex items-center justify-center bg-white border border-border-light text-ink font-semibold rounded-[8px] hover:bg-background-secondary transition-colors text-[14px]"
          >
            Choose document
          </button>
        )}

        {status === 'selected' && (
          <>
            <button 
              onClick={() => setStatus('empty')}
              className="h-[40px] px-5 inline-flex items-center justify-center bg-white border border-border-light text-ink font-medium rounded-[8px] hover:bg-background-secondary transition-colors text-[14px]"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpload}
              className="h-[40px] px-5 inline-flex items-center justify-center bg-accent text-white font-semibold rounded-[8px] hover:bg-accent-hover transition-colors text-[14px]"
            >
              Upload
            </button>
          </>
        )}

        {status === 'error' && (
          <button 
            onClick={() => setStatus('empty')}
            className="h-[40px] px-5 inline-flex items-center justify-center bg-white border border-border-light text-ink font-semibold rounded-[8px] hover:bg-background-secondary transition-colors text-[14px]"
          >
            Try Again
          </button>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileChange}
      />
    </div>
  );
}
