import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/preferences
 * Returns the authenticated user's preferences.
 * If no row exists yet, returns defaults without writing (lazy-insert on PUT).
 */
export async function GET() {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('autosave_enabled')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = "no rows returned" — expected for new users
    console.error('[preferences GET] Supabase error:', error.message);
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
  }

  // Return row if it exists, otherwise return defaults
  return NextResponse.json({
    autosave_enabled: data?.autosave_enabled ?? true,
  });
}

/**
 * PUT /api/preferences
 * Upserts the authenticated user's preferences.
 * Body: { autosave_enabled: boolean }
 */
export async function PUT(request: Request) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { autosave_enabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (typeof body.autosave_enabled !== 'boolean') {
    return NextResponse.json({ error: 'autosave_enabled must be a boolean' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: user.id,          // server-side identity — never from browser body
        autosave_enabled: body.autosave_enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[preferences PUT] Supabase error:', error.message);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }

  return NextResponse.json({ success: true, autosave_enabled: body.autosave_enabled });
}
