import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ShapeClientPage } from './ShapeClientPage';

export const dynamic = 'force-dynamic';

export default async function ShapePage({ params }: { params: { workId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch work details
  const { data: work, error: workError } = await supabase
    .from('works')
    .select('id, user_id, title, context')
    .eq('id', params.workId)
    .single();

  if (workError || !work || work.user_id !== user.id) {
    notFound();
  }

  return (
    <ShapeClientPage 
      workId={work.id}
      initialTitle={work.title}
      initialContext={work.context || {}}
    />
  );
}
