import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { type EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/dashboard';

  if (token_hash && type) {
    const supabase = createClient();
    
    // verifyOtp handles establishing the session from the token_hash
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    });

    if (!error) {
      // Redirect successfully
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Redirect to login page with a clean error message
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('error', 'Your confirmation link is invalid or has expired. Request a new one.');
  return NextResponse.redirect(loginUrl);
}
