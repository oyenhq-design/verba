import React from 'react';
import Link from 'next/link';
import { signup } from '../actions';
import { AuthShell, AuthAlert, AuthButton, AuthInput } from '@/components/auth/AuthShell';

export const metadata = {
  title: 'Create account — Verba',
  description: 'Start writing with more clarity and confidence.',
};

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  return (
    <AuthShell>
      {/* Heading */}
      <div className="mb-8 text-center">
        <h1
          className="font-bold tracking-tight"
          style={{ fontSize: '38px', color: '#101828', lineHeight: 1.15 }}
        >
          Create your account
        </h1>
        <p className="mt-2 text-[15.5px]" style={{ color: '#667085' }}>
          Start your Verba workspace.
        </p>
      </div>

      {/* Alerts */}
      {searchParams.error && (
        <AuthAlert type="error" message={searchParams.error} />
      )}
      {searchParams.message && (
        <AuthAlert type="success" message={searchParams.message} />
      )}

      {/* Show form only when there's no success message */}
      {!searchParams.message && (
        <form action={signup} className="space-y-4">
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

          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <AuthInput
              id="password"
              name="password"
              type="password"
              icon="password"
              autoComplete="new-password"
              required
              placeholder="Password"
            />
          </div>

          <div className="pt-2">
            <AuthButton label="Create account" />
          </div>
        </form>
      )}

      {/* Switch to login */}
      <p className="mt-8 text-center text-[14.5px]" style={{ color: '#667085' }}>
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold transition-colors hover:text-accent-hover"
          style={{ color: '#1677FF' }}
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
