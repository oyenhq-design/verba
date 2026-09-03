import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { DashboardContent } from '@/components/DashboardContent';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, word_count, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Get user name from metadata if it exists
  const userName = user.user_metadata?.full_name || user.user_metadata?.name || null;

  return <DashboardContent documents={documents || []} userName={userName} />;
}
