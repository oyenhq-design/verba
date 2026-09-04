import React from 'react';
import Link from 'next/link';
import { login } from '../actions';
import { AuthShell, AuthAlert, AuthButton, AuthInput } from '@/components/auth/AuthShell';

export const metadata = {
  title: 'Sign in — Verba',
  description: 'Sign in to your Verba writing workspace.',
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <AuthShell>
      {/* Heading */}
      <div className="mb-8 text-center">
        <h1
          className="font-bold tracking-tight"
          style={{ fontSize: '42px', color: '#101828', lineHeight: 1.15 }}
        >
          Sign in
        </h1>
        <p className="mt-2 text-[15.5px]" style={{ color: '#667085' }}>
          to continue to your Verba account.
        </p>
      </div>

      {/* Error alert */}
      {searchParams.error && (
        <AuthAlert type="error" message={searchParams.error} />
      )}

      {/* Form — action unchanged */}
      <form action={login} className="space-y-4">
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
            autoComplete="current-password"
            required
            placeholder="Password"
          />
        </div>

        {/* Forgot password */}
        <div className="flex justify-end pt-0.5 pb-1">
          <Link
            href="/forgot-password"
            className="text-[13.5px] font-medium transition-colors hover:text-accent-hover"
            style={{ color: '#1677FF' }}
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <AuthButton label="Sign in" />
        </div>
      </form>

      {/* Switch to signup */}
      <p className="mt-8 text-center text-[14.5px]" style={{ color: '#667085' }}>
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="font-semibold transition-colors hover:text-accent-hover"
          style={{ color: '#1677FF' }}
        >
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
