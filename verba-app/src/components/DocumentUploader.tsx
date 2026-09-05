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
    <div className="bg-white rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-[#E5EAF0] h-full flex flex-col hover:border-[#CBD5E1] transition-colors p-6">
      <div 
        className={`w-full rounded-[8px] flex-grow flex flex-col items-start
          ${status === 'error' ? 'text-status-error' : 
            status === 'selected' || isDragOver ? 'text-accent' : 'text-[#101828]'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0 mb-4
          ${status === 'empty' || status === 'error' ? 'bg-[#F1F5F9] text-[#475569]' : 
            status === 'uploaded' ? 'bg-status-success/10 text-status-success' :
            'bg-accent/10 text-accent'
          }`}
        >
          {status === 'uploaded' ? <CheckCircle size={20} /> : 
           status === 'error' ? <AlertCircle size={20} /> :
           (status === 'uploading' || status === 'processing') ? <Loader2 size={20} className="animate-spin" /> :
           status === 'selected' ? <FileText size={20} /> :
           <Upload size={20} />}
        </div>
        
        <div className="flex-grow flex flex-col mb-6">
          {status === 'empty' && (
            <>
              <h2 className="text-[16px] font-bold text-[#101828] mb-1">Upload existing work</h2>
              <p className="text-[14px] text-[#667085] leading-relaxed">Already started? Bring your existing document into Verba and continue developing it here.</p>
            </>
          )}

          {status === 'selected' && file && (
            <>
              <h2 className="text-[16px] font-bold text-[#101828] mb-1">{file.name}</h2>
              <p className="text-[14px] text-[#667085]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </>
          )}

          {(status === 'uploading' || status === 'processing') && (
            <>
              <h2 className="text-[16px] font-bold text-[#101828] mb-1">
                {status === 'uploading' ? 'Uploading...' : 'Parsing structure...'}
              </h2>
              <p className="text-[14px] text-[#667085]">
                {status === 'uploading' ? 'Securely storing file.' : 'Extracting content.'}
              </p>
            </>
          )}

          {status === 'uploaded' && (
            <>
              <h2 className="text-[16px] font-bold text-[#101828] mb-1">Document Ready!</h2>
              <p className="text-[14px] text-[#667085]">Redirecting...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <h2 className="text-[16px] font-bold text-status-error mb-1">Processing Failed</h2>
              <p className="text-[14px] text-[#667085]">{errorMessage}</p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="w-full">
          {status === 'empty' && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-[38px] px-5 inline-flex items-center justify-center bg-white border border-[#E5EAF0] text-[#101828] font-semibold rounded-[8px] hover:bg-slate-50 transition-colors text-[14px] shadow-sm"
            >
              Choose document
            </button>
          )}

          {status === 'selected' && (
            <div className="flex gap-3">
              <button 
                onClick={() => setStatus('empty')}
                className="flex-1 h-[38px] px-5 inline-flex items-center justify-center bg-white border border-[#E5EAF0] text-[#101828] font-medium rounded-[8px] hover:bg-slate-50 transition-colors text-[14px]"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpload}
                className="flex-1 h-[38px] px-5 inline-flex items-center justify-center bg-accent text-white font-semibold rounded-[8px] hover:bg-accent-hover transition-colors text-[14px]"
              >
                Upload
              </button>
            </div>
          )}

          {status === 'error' && (
            <button 
              onClick={() => setStatus('empty')}
              className="w-full h-[38px] px-5 inline-flex items-center justify-center bg-white border border-[#E5EAF0] text-[#101828] font-semibold rounded-[8px] hover:bg-slate-50 transition-colors text-[14px]"
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
    </div>
  );
}
