'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'empty' | 'selected' | 'uploading' | 'processing' | 'uploaded' | 'error'>('empty');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.docx') && selectedFile.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      setStatus('error');
      setErrorMessage('Only .docx files are supported for this phase.');
      return;
    }
    
    // Check max size (e.g. 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setStatus('error');
      setErrorMessage('File size exceeds the 10MB limit.');
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
      const documentId = crypto.randomUUID(); // Temporary stable ID for this session
      const userId = '00000000-0000-0000-0000-000000000000'; // Placeholder for auth
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
      
      // Navigate to Workspace after a short delay
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
    <div className="p-8 max-w-3xl mx-auto w-full h-full flex flex-col items-center justify-center">
      <div className="w-full text-center mb-8">
        <h1 className="text-[28px] font-bold text-ink mb-2">Upload Document</h1>
        <p className="text-foreground-secondary">Upload a Word document to begin refining your writing.</p>
      </div>

      <div 
        className={`w-full bg-white border-2 border-dashed rounded-[16px] p-12 text-center transition-colors ${
          status === 'empty' || status === 'error' ? 'border-border-light hover:border-accent' : 
          status === 'selected' ? 'border-accent bg-accent-light bg-opacity-20' : 'border-border-light'
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {status === 'empty' && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-background-secondary flex items-center justify-center text-foreground-secondary mb-2">
              <Upload size={28} />
            </div>
            <div>
              <h3 className="text-[18px] font-semibold text-ink">Drag & drop your .docx file here</h3>
              <p className="text-foreground-secondary mt-1">or click to browse from your computer</p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 h-[40px] px-6 inline-flex items-center justify-center bg-white border border-border-light text-ink font-semibold rounded-[8px] hover:bg-background-secondary transition-colors text-[14px]"
            >
              Choose Document
            </button>
          </div>
        )}

        {status === 'selected' && file && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center mb-2">
              <FileText size={28} />
            </div>
            <div>
              <h3 className="text-[18px] font-semibold text-ink">{file.name}</h3>
              <p className="text-foreground-secondary mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div className="flex space-x-3 mt-6">
              <button 
                onClick={() => setStatus('empty')}
                className="h-[40px] px-6 inline-flex items-center justify-center bg-white border border-border-light text-ink font-semibold rounded-[8px] hover:bg-background-secondary transition-colors text-[14px]"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpload}
                className="h-[40px] px-6 inline-flex items-center justify-center bg-accent text-white font-semibold rounded-[8px] hover:bg-accent-hover transition-colors text-[14px]"
              >
                Upload & Parse
              </button>
            </div>
          </div>
        )}

        {(status === 'uploading' || status === 'processing') && (
          <div className="flex flex-col items-center justify-center space-y-6">
            <Loader2 className="w-12 h-12 text-accent animate-spin" />
            <div>
              <h3 className="text-[18px] font-semibold text-ink">
                {status === 'uploading' ? 'Uploading document...' : 'Parsing document structure...'}
              </h3>
              <p className="text-foreground-secondary mt-2">
                {status === 'uploading' ? 'Securely storing your original file.' : 'Extracting headings and paragraphs.'}
              </p>
            </div>
          </div>
        )}

        {status === 'uploaded' && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-status-success bg-opacity-10 text-status-success flex items-center justify-center mb-2">
              <CheckCircle size={32} />
            </div>
            <div>
              <h3 className="text-[18px] font-semibold text-ink">Document Ready!</h3>
              <p className="text-foreground-secondary mt-1">Redirecting to your workspace...</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-status-error bg-opacity-10 text-status-error flex items-center justify-center mb-2">
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 className="text-[18px] font-semibold text-ink">Processing Failed</h3>
              <p className="text-status-error mt-2 font-medium">{errorMessage}</p>
            </div>
            <div className="flex space-x-3 mt-6">
              <button 
                onClick={() => setStatus('empty')}
                className="h-[40px] px-6 inline-flex items-center justify-center bg-white border border-border-light text-ink font-semibold rounded-[8px] hover:bg-background-secondary transition-colors text-[14px]"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

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
