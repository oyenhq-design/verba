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
    <div className="bg-white rounded-[10px] p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-[#E5EAF0]">
      <div 
        className={`w-full rounded-[8px] p-5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 border border-dashed
          ${status === 'error' ? 'border-status-error/50 bg-status-error/5' : 
            status === 'selected' || isDragOver ? 'border-accent/50 bg-accent/5' : 'border-[#CBD5E1] hover:border-slate-400 bg-[#FAFAFA]'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ minHeight: '120px' }}
      >
        {/* Left side info */}
        <div className="flex items-center space-x-5">
          <div className={`w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0 shadow-sm
            ${status === 'empty' || status === 'error' ? 'bg-white border border-[#E5EAF0] text-slate-600' : 
              status === 'uploaded' ? 'bg-status-success/10 text-status-success border border-status-success/20' :
              'bg-accent/10 text-accent border border-accent/20'
            }`}
          >
            {status === 'uploaded' ? <CheckCircle size={22} /> : 
             status === 'error' ? <AlertCircle size={22} /> :
             (status === 'uploading' || status === 'processing') ? <Loader2 size={22} className="animate-spin" /> :
             status === 'selected' ? <FileText size={22} /> :
             <Upload size={22} />}
          </div>
          
          <div>
            {status === 'empty' && (
              <>
                <h3 className="text-[15px] font-semibold text-[#101828]">Upload a document</h3>
                <p className="text-[14px] text-[#667085] mt-0.5">Drop a Word document here or select one from your computer.</p>
                <p className="text-[12px] text-slate-400 mt-1 font-medium tracking-wide">DOCX &middot; Maximum 25 MB</p>
              </>
            )}

            {status === 'selected' && file && (
              <>
                <h3 className="text-[15px] font-semibold text-[#101828]">{file.name}</h3>
                <p className="text-[14px] text-[#667085] mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </>
            )}

            {(status === 'uploading' || status === 'processing') && (
              <>
                <h3 className="text-[15px] font-semibold text-[#101828]">
                  {status === 'uploading' ? 'Uploading document...' : 'Parsing document structure...'}
                </h3>
                <p className="text-[14px] text-[#667085] mt-0.5">
                  {status === 'uploading' ? 'Securely storing your original file.' : 'Extracting headings and paragraphs.'}
                </p>
              </>
            )}

            {status === 'uploaded' && (
              <>
                <h3 className="text-[15px] font-semibold text-[#101828]">Document Ready!</h3>
                <p className="text-[14px] text-[#667085] mt-0.5">Redirecting to your workspace...</p>
              </>
            )}

            {status === 'error' && (
              <>
                <h3 className="text-[15px] font-semibold text-status-error">Processing Failed</h3>
                <p className="text-[14px] text-[#667085] mt-0.5">{errorMessage}</p>
              </>
            )}
          </div>
        </div>

        {/* Right side actions */}
        <div className="shrink-0 flex items-center space-x-3">
          {status === 'empty' && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="h-[38px] px-5 inline-flex items-center justify-center bg-white border border-[#E5EAF0] text-[#101828] font-semibold rounded-[8px] hover:bg-slate-50 hover:border-slate-300 transition-colors text-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              Choose document
            </button>
          )}

          {status === 'selected' && (
            <>
              <button 
                onClick={() => setStatus('empty')}
                className="h-[38px] px-5 inline-flex items-center justify-center bg-white border border-[#E5EAF0] text-[#101828] font-medium rounded-[8px] hover:bg-slate-50 transition-colors text-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpload}
                className="h-[38px] px-5 inline-flex items-center justify-center bg-accent text-white font-semibold rounded-[8px] hover:bg-accent-hover transition-colors text-[14px] shadow-sm"
              >
                Upload
              </button>
            </>
          )}

          {status === 'error' && (
            <button 
              onClick={() => setStatus('empty')}
              className="h-[38px] px-5 inline-flex items-center justify-center bg-white border border-[#E5EAF0] text-[#101828] font-semibold rounded-[8px] hover:bg-slate-50 transition-colors text-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
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
