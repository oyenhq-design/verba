import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DocumentsList } from '@/components/DocumentsList';

export default async function DocumentsPage() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .select('id, title, word_count, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (docsError) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto w-full pt-10 pb-24 text-center">
        <h2 className="text-xl font-bold text-[#B42318]">Unable to load your documents.</h2>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto w-full pt-10 pb-24">
      <DocumentsList initialDocuments={documents || []} />
    </div>
  );
}
