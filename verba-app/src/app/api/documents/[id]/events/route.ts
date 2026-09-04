import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  try {
    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { event_type, metadata } = body;

    if (!event_type) {
      return NextResponse.json({ error: 'Missing event_type' }, { status: 400 });
    }

    // 2. Strict Whitelist & Validation
    const allowedClientEvents = ['paste_inserted', 'verba_suggestion_accepted', 'verba_suggestion_rejected'];
    if (!allowedClientEvents.includes(event_type)) {
      return NextResponse.json({ error: `Event type ${event_type} is not allowed from the client.` }, { status: 400 });
    }

    if (!metadata || typeof metadata !== 'object') {
      return NextResponse.json({ error: 'Metadata must be a JSON object' }, { status: 400 });
    }

    if (event_type === 'paste_inserted') {
      if (typeof metadata.character_count !== 'number' || typeof metadata.word_count !== 'number') {
        return NextResponse.json({ error: 'Invalid paste_inserted metadata' }, { status: 400 });
      }
    } else if (event_type === 'verba_suggestion_accepted' || event_type === 'verba_suggestion_rejected') {
      if (typeof metadata.suggestion_id !== 'string' || typeof metadata.issue_id !== 'string') {
        return NextResponse.json({ error: `Invalid ${event_type} metadata` }, { status: 400 });
      }
      if (metadata.operation) {
        return NextResponse.json({ error: 'Redundant operation field not allowed' }, { status: 400 });
      }
    }

    // 3. Validate Ownership (server-side check)
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (docError || !docData) {
      return NextResponse.json({ error: 'Document not found or unauthorized' }, { status: 404 });
    }

    // 4. Insert event
    const { data: eventData, error: eventError } = await supabase
      .from('document_events')
      .insert({
        document_id: params.id,
        user_id: user.id,
        event_type,
        metadata
      })
      .select('id')
      .single();

    if (eventError) {
      console.error('[events] Failed to insert event:', eventError);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    return NextResponse.json({ success: true, eventId: eventData.id });

  } catch (error: unknown) {
    console.error('[events] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
