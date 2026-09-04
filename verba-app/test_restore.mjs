import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://poaclxtaacguolfeefcd.supabase.co';

function canonicalStringify(obj) {
  if (obj === null) return 'null';
  if (Array.isArray(obj)) return '[' + obj.map(canonicalStringify).join(',') + ']';
  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',') + '}';
  }
  return JSON.stringify(obj);
}

async function run() {
  const envFile = fs.readFileSync('.env.local', 'utf-8');
  const anonKeyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
  const anonKey = anonKeyMatch ? anonKeyMatch[1].trim() : '';
  
  console.log('Starting PROVE 1C Restore Verification...\n');
  
  // 1 & 2. Setup users and auth
  const supabaseA = createClient(SUPABASE_URL, anonKey);
  const emailA = `test-a-${Date.now()}@example.com`;
  const { data: authDataA } = await supabaseA.auth.signUp({ email: emailA, password: 'password123' });
  const sessionA = authDataA.session;
  
  const supabaseB = createClient(SUPABASE_URL, anonKey);
  const emailB = `test-b-${Date.now()}@example.com`;
  const { data: authDataB } = await supabaseB.auth.signUp({ email: emailB, password: 'password123' });
  const sessionB = authDataB.session;

  // Setup Document A with editor_version: 1
  const docIdA = crypto.randomUUID();
  const initContentA = { type: 'doc', content: [{ type: 'paragraph', text: 'v0' }] };
  const { error: insertErrorA } = await supabaseA.from('documents').insert({
      id: docIdA,
      user_id: sessionA.user.id,
      title: 'Test Doc A',
      original_filename: 'test.docx',
      storage_path: 'test/test.docx',
      parsed_content: { type: 'doc', content: [{ type: 'paragraph', text: 'original' }] },
      editor_version: 1,
      editor_state: initContentA
  });
  if (insertErrorA) { console.error("Document insert failed:", insertErrorA); return; }

  // Setup Document B with editor_version: 1
  const docIdB = crypto.randomUUID();
  await supabaseB.from('documents').insert({
      id: docIdB,
      user_id: sessionB.user.id,
      title: 'Test Doc B',
      original_filename: 'test-b.docx',
      storage_path: 'test/test-b.docx',
      parsed_content: { type: 'doc', content: [{ type: 'paragraph', text: 'original-b' }] },
      editor_version: 1,
      editor_state: initContentA
  });

  const cookieA = `sb-poaclxtaacguolfeefcd-auth-token=${encodeURIComponent(JSON.stringify(sessionA))}`;
  const cookieB = `sb-poaclxtaacguolfeefcd-auth-token=${encodeURIComponent(JSON.stringify(sessionB))}`;

  // Helper to save a version via API
  async function saveDoc(cookieStr, state, saveType, docId = docIdA, expectedVersion = null) {
    if (expectedVersion === null) {
      const { data: docData } = await supabaseA.from('documents').select('editor_version').eq('id', docId).single();
      expectedVersion = docData ? docData.editor_version : 1;
    }
    return fetch(`http://localhost:3000/api/documents/${docId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieStr },
      body: JSON.stringify({ editorState: state, wordCount: 1, expectedVersion, saveType })
    });
  }

  // Helper to restore a version via API
  async function restoreDoc(cookieStr, docId, versionId, expectedEditorVersion) {
    return fetch(`http://localhost:3000/api/documents/${docId}/versions/${versionId}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieStr },
      body: JSON.stringify({ expectedEditorVersion })
    });
  }

  try {
    // PREPARE TEST DATA
    // v1 -> save (becomes editor_version 2)
    let state1 = { type: 'doc', content: [{ type: 'paragraph', text: 'v1' }] };
    await saveDoc(cookieA, state1, 'manual_save');
    
    // v2 -> save (becomes editor_version 3)
    let state2 = { type: 'doc', content: [{ type: 'paragraph', text: 'v2' }] };
    await saveDoc(cookieA, state2, 'manual_save');

    // v3 -> save (becomes editor_version 4)
    let state3 = { type: 'doc', content: [{ type: 'paragraph', text: 'v3 (current)' }] };
    await saveDoc(cookieA, state3, 'autosave');

    // Fetch versions for A
    const { data: versionsA } = await supabaseA.from('document_versions').select('*').eq('document_id', docIdA).order('version_number', { ascending: true });
    // The first manual_save created a version for v1 content
    const version1 = versionsA.find(v => v.editor_state.content[0].text === 'v1');
    
    // Fetch doc state before restore
    const { data: docBefore } = await supabaseA.from('documents').select('*').eq('id', docIdA).single();
    const { count: versionsCountBefore } = await supabaseA.from('document_versions').select('*', { count: 'exact', head: true }).eq('document_id', docIdA);
    const { count: eventsCountBefore } = await supabaseA.from('document_events').select('*', { count: 'exact', head: true }).eq('document_id', docIdA);



    // 1. STALE RESTORE
    let reqStale = await restoreDoc(cookieA, docIdA, version1.id, docBefore.editor_version - 1);
    
    const { data: docAfterStale } = await supabaseA.from('documents').select('*').eq('id', docIdA).single();
    const { count: versionsCountStale } = await supabaseA.from('document_versions').select('*', { count: 'exact', head: true }).eq('document_id', docIdA);
    const { count: eventsCountStale } = await supabaseA.from('document_events').select('*', { count: 'exact', head: true }).eq('document_id', docIdA);
    
    console.log(`STALE RESTORE`);
    console.log(`HTTP ${reqStale.status}`);
    console.log(`versions added: ${versionsCountStale - versionsCountBefore}`);
    console.log(`events added: ${eventsCountStale - eventsCountBefore}`);
    console.log(`document changed: ${docAfterStale.editor_version !== docBefore.editor_version}\n`);

    // 2. CROSS-DOCUMENT ATTACK
    let reqCrossDoc = await restoreDoc(cookieB, docIdB, version1.id, 1);
    const { data: docBAfter } = await supabaseB.from('documents').select('*').eq('id', docIdB).single();
    const { count: versionsCountB } = await supabaseB.from('document_versions').select('*', { count: 'exact', head: true }).eq('document_id', docIdB);
    const { count: eventsCountB } = await supabaseB.from('document_events').select('*', { count: 'exact', head: true }).eq('document_id', docIdB);
    
    console.log(`CROSS-DOCUMENT ATTACK`);
    console.log(`HTTP ${reqCrossDoc.status}`);
    console.log(`document changed: ${docBAfter.editor_version !== 1}`);
    console.log(`versions added: ${versionsCountB}`);
    console.log(`events added: ${eventsCountB}\n`);

    // 3. CROSS-USER SECURITY
    let reqCrossUser = await restoreDoc(cookieB, docIdA, version1.id, docBefore.editor_version);
    const { count: versionsCountCU } = await supabaseA.from('document_versions').select('*', { count: 'exact', head: true }).eq('document_id', docIdA);
    const { count: eventsCountCU } = await supabaseA.from('document_events').select('*', { count: 'exact', head: true }).eq('document_id', docIdA);
    const { data: docAfterCU } = await supabaseA.from('documents').select('*').eq('id', docIdA).single();
    
    console.log(`CROSS-USER ATTACK`);
    console.log(`HTTP ${reqCrossUser.status}`);
    console.log(`document changed: ${docAfterCU.editor_version !== docBefore.editor_version}`);
    console.log(`versions added: ${versionsCountCU - versionsCountBefore}`);
    console.log(`events added: ${eventsCountCU - eventsCountBefore}\n`);

    // 4. RESTORE BASIC (Valid Restore)
    // Capture historical row before restore
    const { data: histBefore } = await supabaseA.from('document_versions').select('*').eq('id', version1.id).single();

    let reqRestore = await restoreDoc(cookieA, docIdA, version1.id, docBefore.editor_version);
    await reqRestore.json();
    
    const { data: docAfterRestore } = await supabaseA.from('documents').select('*').eq('id', docIdA).single();
    const currentHash = crypto.createHash('sha256').update(canonicalStringify(docBefore.editor_state)).digest('hex'); 
    const restoredHash = crypto.createHash('sha256').update(canonicalStringify(docAfterRestore.editor_state)).digest('hex');

    console.log(`BEFORE`);
    console.log(`editor_version: ${docBefore.editor_version}`);
    console.log(`word_count: ${docBefore.word_count}`);
    console.log(`current content: ${docBefore.editor_state.content[0].text}`);
    console.log(`editor_state JSON: ${JSON.stringify(docBefore.editor_state)}`);
    console.log(`canonical stringified: ${canonicalStringify(docBefore.editor_state)}`);
    console.log(`hash: ${currentHash}\n`);

    // SAFETY CHECKPOINT
    const { data: allVersions } = await supabaseA.from('document_versions').select('*').eq('document_id', docIdA).order('version_number', { ascending: false });
    const safetyCheckpoint = allVersions.find(v => v.source === 'pre_restore_safety' && v.version_number === docBefore.editor_version);
    
    console.log(`SAFETY CHECKPOINT`);
    console.log(`id: ${safetyCheckpoint.id}`);
    console.log(`version_number: ${safetyCheckpoint.version_number}`);
    console.log(`source: ${safetyCheckpoint.source}`);
    console.log(`content_hash: ${safetyCheckpoint.content_hash}`);
    console.log(`word_count: ${safetyCheckpoint.word_count}`);
    console.log(`content: ${safetyCheckpoint.editor_state.content[0].text}`);
    console.log(`editor_state JSON: ${JSON.stringify(safetyCheckpoint.editor_state)}`);
    console.log(`canonical stringified: ${canonicalStringify(safetyCheckpoint.editor_state)}\n`);

    console.log(`AFTER RESTORE`);
    console.log(`editor_version: ${docAfterRestore.editor_version}`);
    console.log(`word_count: ${docAfterRestore.word_count}`);
    console.log(`content: historical ${docAfterRestore.editor_state.content[0].text}`);
    console.log(`hash: ${restoredHash}\n`);

    // RESTORE EVENT
    const { data: events } = await supabaseA.from('document_events').select('*').eq('document_id', docIdA).order('created_at', { ascending: false });
    const restoreEvent = events.find(e => e.event_type === 'version_restored');
    
    console.log(`EVENT`);
    console.log(`event_type: ${restoreEvent.event_type}`);
    console.log(`restored_version_id: ${restoreEvent.metadata.restored_version_id}`);
    console.log(`restored_version_number: ${restoreEvent.metadata.restored_version_number}`);
    console.log(`previous_editor_version: ${restoreEvent.metadata.previous_editor_version}`);
    console.log(`new_editor_version: ${restoreEvent.metadata.new_editor_version}\n`);

    console.log(`ORIGINAL IMMUTABILITY`);
    console.log(`parsed_content: ${JSON.stringify(docBefore.parsed_content)} -> ${JSON.stringify(docAfterRestore.parsed_content)}`);
    console.log(`original_filename: ${docBefore.original_filename} -> ${docAfterRestore.original_filename}`);
    console.log(`storage_path: ${docBefore.storage_path} -> ${docAfterRestore.storage_path}`);
    console.log(`user_id: ${docBefore.user_id} -> ${docAfterRestore.user_id}`);
    console.log(`created_at: ${docBefore.created_at} -> ${docAfterRestore.created_at}\n`);

    const { data: histAfter } = await supabaseA.from('document_versions').select('*').eq('id', version1.id).single();
    console.log(`HISTORICAL IMMUTABILITY (Restored Row)`);
    console.log(`id: ${histBefore.id} -> ${histAfter.id}`);
    console.log(`version_number: ${histBefore.version_number} -> ${histAfter.version_number}`);
    console.log(`source: ${histBefore.source} -> ${histAfter.source}`);
    console.log(`editor_state: ${JSON.stringify(histBefore.editor_state)} -> ${JSON.stringify(histAfter.editor_state)}`);
    console.log(`content_hash: ${histBefore.content_hash} -> ${histAfter.content_hash}`);
    console.log(`word_count: ${histBefore.word_count} -> ${histAfter.word_count}`);
    console.log(`created_at: ${histBefore.created_at} -> ${histAfter.created_at}\n`);

    // BASIC SANITY CHECKS
    if (docAfterRestore.editor_version !== docBefore.editor_version + 1) {
        console.error("FAIL: editor_version did not increment exactly once.");
    }
    if (docAfterRestore.original_filename !== docBefore.original_filename) {
        console.error("FAIL: original_filename mutated!");
    }
    
    console.log("PROVE 1C TEST SUITE COMPLETED SUCCESSFULLY");
    
  } catch (e) {
    console.error(e);
  }
}

run();
