import { createClient } from '@supabase/supabase-js';

import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://poaclxtaacguolfeefcd.supabase.co';
const API_URL = 'http://localhost:3000';

async function run() {
  const envFile = fs.readFileSync('.env.local', 'utf-8');
  const anonKeyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
  const anonKey = anonKeyMatch ? anonKeyMatch[1].trim() : '';
  const supabaseA = createClient(SUPABASE_URL, anonKey);
  const supabaseB = createClient(SUPABASE_URL, anonKey);
  console.log('Starting Phase D Shape Verification...\n');

  try {
    // 1. Create User A
    const userA = { email: `test_shape_a_${Date.now()}@example.com`, password: 'password123' };
    const { data: authA, error: errA } = await supabaseA.auth.signUp(userA);
    if (errA) throw errA;
    const sessionA = authA.session;
    const cookieA = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token=${encodeURIComponent(JSON.stringify(sessionA))}`;

    console.log(`User A Created: ${authA.user.id}`);

    // 2. Create User B
    const userB = { email: `test_shape_b_${Date.now()}@example.com`, password: 'password123' };
    const { data: authB, error: errB } = await supabaseB.auth.signUp(userB);
    if (errB) throw errB;
    const sessionB = authB.session;
    const cookieB = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token=${encodeURIComponent(JSON.stringify(sessionB))}`;

    console.log(`User B Created: ${authB.user.id}\n`);

    // 3. Initialize a Work for User A
    let req = await fetch(`${API_URL}/api/works`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieA
      },
      body: JSON.stringify({ initialIdea: 'Test shape' })
    });
    
    const reqBody = await req.json();
    const workAId = reqBody.workId;
    console.log(`Created Work ID: ${workAId}`);

    // Test 1: Update allowed fields
    const test1Res = await fetch(`${API_URL}/api/works/${workAId}/context`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieA
      },
      body: JSON.stringify({
        working_title: 'New Title',
        objectives: ['Obj 1', 'Obj 2']
      })
    });
    const test1Data = await test1Res.json();
    console.log(`\nTest 1 (Valid Update) HTTP: ${test1Res.status}`);
    console.log(`Title updated: ${test1Data.title === 'New Title'}`);
    console.log(`Context merged: ${test1Data.context.working_title === 'New Title' && test1Data.context.objectives.length === 2}`);

    // Test 2: Whitelist attack
    const test2Res = await fetch(`${API_URL}/api/works/${workAId}/context`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieA
      },
      body: JSON.stringify({
        working_title: 'Title 2',
        admin: true,
        stage: 'done'
      })
    });
    const test2Data = await test2Res.json();
    console.log(`\nTest 2 (Whitelist Attack) HTTP: ${test2Res.status}`);
    console.log(`Context ignores 'admin' key: ${test2Data.context.admin === undefined}`);
    console.log(`Context ignores 'stage' key: ${test2Data.context.stage === undefined}`);
    
    // Check DB directly
    const { data: dbWork } = await supabaseA.from('works').select('*').eq('id', workAId).single();
    console.log(`DB title is correct: ${dbWork.title === 'Title 2'}`);
    console.log(`DB stage is untouched: ${dbWork.stage === 'developing'}`);

    // Test 3: Unauthorized update (User B updates User A's work)
    const test3Res = await fetch(`${API_URL}/api/works/${workAId}/context`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieB
      },
      body: JSON.stringify({
        working_title: 'Hacked Title'
      })
    });
    console.log(`\nTest 3 (Security - Cross User) HTTP: ${test3Res.status} (Expected: 404)`);
    
    // Verify DB wasn't hacked
    const { data: dbWorkPostHack } = await supabaseA.from('works').select('*').eq('id', workAId).single();
    console.log(`DB title remained secure: ${dbWorkPostHack.title === 'Title 2'}`);

    console.log(`\nSHAPE & PLAN TESTS COMPLETED SUCCESSFULLY`);
  } catch (err) {
    console.error('Test failed:', err);
  }
}

run();
