import React from 'react';
import Link from 'next/link';
import { resetPassword } from '../actions';
import { AuthShell, AuthAlert, AuthButton, inputClass, inputBorderStyle } from '@/components/auth/AuthShell';

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
      <div className="mb-7 text-center">
        <h1
          className="font-bold tracking-tight"
          style={{ fontSize: '38px', color: '#101828', lineHeight: 1.15 }}
        >
          Reset your password
        </h1>
        <p className="mt-2 text-[15px]" style={{ color: '#667085' }}>
          {emailSent
            ? "Check your email for reset instructions."
            : "Enter your email and we'll send you instructions to reset your password."}
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
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              className={inputClass}
              style={inputBorderStyle}
            />
          </div>

          <div className="pt-1">
            <AuthButton label="Send reset link" />
          </div>
        </form>
      )}

      {/* Back to sign in */}
      <p className="mt-6 text-center text-[14px]" style={{ color: '#667085' }}>
        <Link
          href="/login"
          className="font-semibold transition-colors"
          style={{ color: '#1677FF' }}
        >
          ← Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
