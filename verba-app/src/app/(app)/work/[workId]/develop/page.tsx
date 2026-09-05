import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { DevelopClientPage } from './DevelopClientPage';

export const dynamic = 'force-dynamic';

export default async function DevelopPage({ params }: { params: { workId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch work details
  const { data: work, error: workError } = await supabase
    .from('works')
    .select('id, user_id, title, context, initial_idea, stage')
    .eq('id', params.workId)
    .single();

  if (workError || !work || work.user_id !== user.id) {
    notFound();
  }

  // Fetch messages
  const { data: messages, error: messagesError } = await supabase
    .from('work_messages')
    .select('id, role, content, created_at')
    .eq('work_id', params.workId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('Failed to fetch messages:', messagesError);
  }

  const initialMessages = messages || [];

  return (
    <DevelopClientPage 
      workId={work.id}
      initialTitle={work.title}
      initialContext={work.context || {}}
      initialMessages={initialMessages}
      initialIdea={work.initial_idea}
      stage={work.stage}
    />
  );
}
