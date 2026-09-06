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

  // Fetch readiness from engine
  let initialReadiness = null;
  const engineUrl = process.env.VERBA_ENGINE_URL;
  if (engineUrl && work.context) {
    try {
      const res = await fetch(`${engineUrl}/api/readiness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_type: work.context.work_type || 'general_document',
          context: work.context
        }),
        cache: 'no-store'
      });
      if (res.ok) {
        initialReadiness = await res.json();
      }
    } catch (e) {
      console.error('[ShapePage] Failed to calculate readiness:', e);
    }
  }

  return (
    <ShapeClientPage 
      workId={work.id}
      initialTitle={work.title}
      initialContext={work.context || {}}
      initialReadiness={initialReadiness}
    />
  );
}
