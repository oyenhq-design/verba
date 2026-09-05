import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ALLOWED_CONTEXT_KEYS = new Set([
  'working_title', 'work_type', 'field', 'topic', 'problem', 'aim', 
  'objectives', 'scope', 'methodology', 'tools', 'geography', 
  'citation_style', 'economic_analysis', 'focus', 'constraints', 'context_summary'
]);

export async function POST(
  request: Request,
  { params }: { params: { workId: string } }
) {
  const supabase = createClient();
  const { workId } = params;

  try {
    const { message, messageId } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Missing or invalid message' }, { status: 400 });
    }

    const effectiveMessageId = messageId || crypto.randomUUID();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch work to verify ownership and get context/initial idea
    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id, user_id, initial_idea, context, stage, title')
      .eq('id', workId)
      .single();

    if (workError || !work || work.user_id !== user.id) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    // 3. Check if the message already exists (Idempotency for retries)
    let userMessageRecord;
    const { data: existingMessage } = await supabase
      .from('work_messages')
      .select('*')
      .eq('id', effectiveMessageId)
      .single();

    if (existingMessage) {
      userMessageRecord = existingMessage;
    } else {
      const { data: newMessage, error: userMessageError } = await supabase
        .from('work_messages')
        .insert({
          id: effectiveMessageId,
          work_id: workId,
          user_id: user.id,
          role: 'user',
          content: message
        })
        .select()
        .single();

      if (userMessageError) {
        console.error('[develop API] Failed to save user message:', userMessageError);
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
      }
      userMessageRecord = newMessage;
    }

    // 4. Fetch recent messages (e.g., last 10) for context
    const { data: recentMessages, error: messagesError } = await supabase
      .from('work_messages')
      .select('role, content')
      .eq('work_id', workId)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (messagesError) {
      console.error('[develop API] Failed to fetch recent messages:', messagesError);
      return NextResponse.json({ error: 'Failed to prepare context' }, { status: 500 });
    }

    // reverse so they are in chronological order for the model
    const chronologicalMessages = recentMessages.reverse();
    // Exclude the message we just inserted from recent_messages context, 
    // because it is passed separately in the request.
    const historyForEngine = chronologicalMessages.slice(0, -1);

    // 5. Call Python Engine
    const engineUrl = process.env.VERBA_ENGINE_URL;
    if (!engineUrl) {
      return NextResponse.json({ error: 'Engine configuration missing' }, { status: 500 });
    }

    const enginePayload = {
      work_id: workId,
      initial_idea: work.initial_idea,
      current_context: work.context || {},
      recent_messages: historyForEngine,
      message: message
    };

    let engineResponse;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const res = await fetch(`${engineUrl}/api/develop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enginePayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Engine returned ${res.status}`);
      }
      engineResponse = await res.json();
    } catch (e) {
      console.error('[develop API] Engine call failed:', e);
      // Return 207 Multi-Status or a specific structure so the client knows
      // the user message was saved but Verba failed to respond.
      return NextResponse.json({ 
        error: 'ENGINE_FAILURE', 
        message: 'Verba could not respond just now, but your message is saved.',
        savedMessage: userMessageRecord
      }, { status: 502 });
    }

    // 6. Validate Engine Response
    // Expecting: message, suggested_replies, context_updates, stage_suggestion, readiness
    if (!engineResponse || !engineResponse.message) {
      return NextResponse.json({ 
        error: 'INVALID_ENGINE_RESPONSE', 
        message: 'Verba returned an invalid response.',
        savedMessage: userMessageRecord
      }, { status: 502 });
    }

    // 7. Persist Verba response
    const { data: verbaMessageRecord, error: verbaMessageError } = await supabase
      .from('work_messages')
      .insert({
        work_id: workId,
        user_id: user.id,
        role: 'verba',
        content: engineResponse.message
      })
      .select()
      .single();

    if (verbaMessageError) {
      console.error('[develop API] Failed to save verba message:', verbaMessageError);
      // Depending on severity, we could still update context, but this is a DB issue.
    }

    // 8. Safely merge context updates
    const updatedContext = { ...work.context };

    if (engineResponse.context_updates && typeof engineResponse.context_updates === 'object') {
      for (const [key, value] of Object.entries(engineResponse.context_updates)) {
        if (ALLOWED_CONTEXT_KEYS.has(key)) {
          updatedContext[key] = value;
        }
      }
    }

    let nextTitle = work.title;
    if (work.title === 'Untitled work' && updatedContext.working_title) {
      nextTitle = updatedContext.working_title;
    }

    // Always update updated_at if anything succeeded
    const { error: updateError } = await supabase
      .from('works')
      .update({
        context: updatedContext,
        title: nextTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', workId);

    if (updateError) {
      console.error('[develop API] Failed to update work context:', updateError);
    }

    // 9. Return the complete updated state
    return NextResponse.json({
      verbaMessage: verbaMessageRecord,
      suggestedReplies: Array.isArray(engineResponse.suggested_replies) ? engineResponse.suggested_replies.slice(0, 4) : [],
      context: updatedContext,
      title: nextTitle,
      readiness: engineResponse.readiness || { can_plan: false, missing: [] }
    });

  } catch (error: unknown) {
    console.error('[develop API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
