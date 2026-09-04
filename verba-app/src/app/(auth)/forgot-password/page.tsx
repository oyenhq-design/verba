import React from 'react';
import Link from 'next/link';
import { resetPassword } from '../actions';
import { AuthShell, AuthAlert, AuthButton, AuthInput } from '@/components/auth/AuthShell';

export const metadata = {
  title: 'Reset password — Verba',
  description: "Reset your Verba account password.",
};

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  const emailSent = Boolean(searchParams.message);

  return (
    <AuthShell>
      {/* Heading */}
      <div className="mb-8 text-center">
        <h1
          className="font-bold tracking-tight"
          style={{ fontSize: '38px', color: '#101828', lineHeight: 1.15 }}
        >
          Reset your password
        </h1>
        <p className="mt-2 text-[15.5px]" style={{ color: '#667085' }}>
          {emailSent
            ? "Check your email for reset instructions."
            : "Enter your email address and we'll send you a reset link."}
        </p>
      </div>

      {/* Alerts */}
      {searchParams.error && (
        <AuthAlert type="error" message={searchParams.error} />
      )}
      {searchParams.message && (
        <AuthAlert type="success" message="Check your email — we've sent password reset instructions to your address." />
      )}

      {/* Form — only shown when email hasn't been sent */}
      {!emailSent && (
        <form action={resetPassword} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <AuthInput
              id="email"
              name="email"
              type="email"
              icon="email"
              autoComplete="email"
              required
              placeholder="Email address"
            />
          </div>

          <div className="pt-2">
            <AuthButton label="Send reset link" />
          </div>
        </form>
      )}

      {/* Back to sign in */}
      <p className="mt-8 text-center text-[14.5px]" style={{ color: '#667085' }}>
        <Link
          href="/login"
          className="font-semibold transition-colors hover:text-accent-hover"
          style={{ color: '#1677FF' }}
        >
          ← Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
