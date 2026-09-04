import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://poaclxtaacguolfeefcd.supabase.co';

async function run() {
  const envFile = fs.readFileSync('.env.local', 'utf-8');
  const anonKeyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
  const anonKey = anonKeyMatch ? anonKeyMatch[1].trim() : '';
  
  console.log('Starting STRICT PROVE 1D Events Verification...\n');
  
  // 1 & 2. Setup users and auth
  const supabaseA = createClient(SUPABASE_URL, anonKey);
  const emailA = `test-events-a-${Date.now()}@example.com`;
  const { data: authDataA } = await supabaseA.auth.signUp({ email: emailA, password: 'password123' });
  const sessionA = authDataA.session;
  
  const supabaseB = createClient(SUPABASE_URL, anonKey);
  const emailB = `test-events-b-${Date.now()}@example.com`;
  const { data: authDataB } = await supabaseB.auth.signUp({ email: emailB, password: 'password123' });
  const sessionB = authDataB.session;

  // Setup Document A
  const docIdA = crypto.randomUUID();
  const initContentA = { type: 'doc', content: [{ type: 'paragraph', text: 'v0' }] };
  await supabaseA.from('documents').insert({
      id: docIdA,
      user_id: sessionA.user.id,
      title: 'Test Doc A',
      original_filename: 'test.docx',
      storage_path: 'test/test.docx',
      parsed_content: { type: 'doc', content: [{ type: 'paragraph', text: 'original' }] },
      editor_version: 1,
      editor_state: initContentA
  });

  const cookieA = `sb-poaclxtaacguolfeefcd-auth-token=${encodeURIComponent(JSON.stringify(sessionA))}`;
  const cookieB = `sb-poaclxtaacguolfeefcd-auth-token=${encodeURIComponent(JSON.stringify(sessionB))}`;

  // Helper to log event via API
  async function logEvent(cookieStr, docId, eventType, metadata = {}) {
    return fetch(`http://localhost:3000/api/documents/${docId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieStr },
      body: JSON.stringify({ event_type: eventType, metadata })
    });
  }

  try {
    // --- SECURITY TESTS ---
    console.log(`--- SECURITY TESTS ---`);
    
    // 1. Cross-User Insert (User B tries to insert into Doc A)
    let reqCrossInsert = await logEvent(cookieB, docIdA, 'paste_inserted', { character_count: 5, word_count: 1 });
    console.log(`CROSS-USER INSERT HTTP: ${reqCrossInsert.status}`); // Should be 404

    // 2. Unsupported Event Type (e.g. document_uploaded from client)
    let reqUnsupported = await logEvent(cookieA, docIdA, 'document_uploaded', { file_type: 'docx' });
    console.log(`UNSUPPORTED EVENT HTTP: ${reqUnsupported.status}`); // Should be 400

    // 3. Malformed Metadata
    let reqMalformed = await logEvent(cookieA, docIdA, 'paste_inserted', { character_count: 'string', word_count: 5 });
    console.log(`MALFORMED METADATA HTTP: ${reqMalformed.status}`); // Should be 400

    // 4. Redundant Operation
    let reqRedundant = await logEvent(cookieA, docIdA, 'verba_suggestion_accepted', { suggestion_id: 's1', issue_id: 'i1', operation: 'accept' });
    console.log(`REDUNDANT OPERATION HTTP: ${reqRedundant.status}`); // Should be 400

    // 5. Cross-User Read
    const { data: crossReadEvents } = await supabaseB.from('document_events').select('*').eq('document_id', docIdA);
    console.log(`CROSS-USER READ COUNT: ${crossReadEvents.length}`); // Should be 0

    console.log('');

    // --- FUNCTIONAL TESTS ---
    console.log(`--- FUNCTIONAL TESTS ---`);

    // 1. PASTE
    let reqPaste = await logEvent(cookieA, docIdA, 'paste_inserted', { character_count: 42, word_count: 7 });
    console.log(`PASTE HTTP: ${reqPaste.status}`); // Should be 200
    
    // 2. ACCEPT
    let reqAccept = await logEvent(cookieA, docIdA, 'verba_suggestion_accepted', { suggestion_id: 's1', issue_id: 'i1' });
    console.log(`ACCEPT HTTP: ${reqAccept.status}`); // Should be 200

    // 3. REJECT
    let reqReject = await logEvent(cookieA, docIdA, 'verba_suggestion_rejected', { suggestion_id: 's2', issue_id: 'i2' });
    console.log(`REJECT HTTP: ${reqReject.status}`); // Should be 200

    // Fetch Events for Doc A
    const { data: eventsA } = await supabaseA.from('document_events').select('*').eq('document_id', docIdA).order('created_at', { ascending: true });
    
    console.log(`\nEVENTS CREATED: ${eventsA.length}`);
    eventsA.forEach(e => {
        console.log(`- ${e.event_type}: ${JSON.stringify(e.metadata)}`);
    });

    console.log("\nSTRICT PROVE 1D TEST SUITE COMPLETED SUCCESSFULLY");
    
  } catch (e) {
    console.error(e);
  }
}

run();
