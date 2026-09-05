import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function useDocumentUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'empty' | 'selected' | 'uploading' | 'processing' | 'uploaded' | 'error'>('empty');
  const [errorMessage, setErrorMessage] = useState('');
  const supabase = createClient();

  const validateAndSetFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.docx') && selectedFile.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      setStatus('error');
      setErrorMessage('Only .docx files are supported.');
      return false;
    }
    
    if (selectedFile.size > 25 * 1024 * 1024) {
      setStatus('error');
      setErrorMessage('File size exceeds the 25MB limit.');
      return false;
    }

    setFile(selectedFile);
    setStatus('selected');
    setErrorMessage('');
    return true;
  };

  const uploadFile = async (fileToUpload = file) => {
    if (!fileToUpload) return;
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
        .upload(storagePath, fileToUpload, {
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
          title: fileToUpload.name.replace('.docx', ''),
          original_filename: fileToUpload.name,
          mime_type: fileToUpload.type,
          file_size: fileToUpload.size,
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

  const reset = () => {
    setFile(null);
    setStatus('empty');
    setErrorMessage('');
  };

  return { file, status, errorMessage, validateAndSetFile, uploadFile, reset };
}
