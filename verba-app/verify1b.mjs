import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://poaclxtaacguolfeefcd.supabase.co';

async function run() {
  const envFile = fs.readFileSync('.env.local', 'utf-8');
  const anonKeyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
  const anonKey = anonKeyMatch ? anonKeyMatch[1].trim() : '';
  const supabase = createClient(SUPABASE_URL, anonKey);

  const emailA = `test-a-${Date.now()}@example.com`;
  const { data: authDataA } = await supabase.auth.signUp({ email: emailA, password: 'password123' });
  const sessionA = authDataA.session;
  
  const docId = crypto.randomUUID();
  const { error: insertError } = await supabase.from('documents').insert({
      id: docId,
      user_id: sessionA.user.id,
      title: 'Test Doc',
      original_filename: 'test.docx',
      storage_path: 'test/test.docx',
      parsed_content: { type: 'doc', content: [{ type: 'paragraph' }] },
      editor_version: 0
  });

  if (insertError) {
    console.error('Insert doc failed:', insertError);
    return;
  }
  
  // Set the cookie header that Next.js expects for SSR auth
  const cookieStr = `sb-poaclxtaacguolfeefcd-auth-token=${encodeURIComponent(JSON.stringify(sessionA))}`;

  const req1 = await fetch(`http://localhost:3000/api/documents/${docId}/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieStr
    },
    body: JSON.stringify({
      editorState: { type: 'doc', content: [{ type: 'paragraph', text: 'Hello' }] },
      wordCount: 1,
      expectedVersion: 0,
      saveType: 'manual_save'
    })
  });

  console.log('Save API Status:', req1.status);
  console.log('Save API Response:', await req1.text());
}
run();
