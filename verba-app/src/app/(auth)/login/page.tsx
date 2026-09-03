import React from 'react';
import Link from 'next/link';
import { login } from '../actions';
import { AlertCircle } from 'lucide-react';

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background-pale px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-[16px] shadow-sm border border-border-light">
        <div className="text-center">
          <h2 className="text-[28px] font-bold tracking-tight text-ink">Sign in to Verba</h2>
          <p className="mt-2 text-[14px] text-foreground-secondary">
            Or{' '}
            <Link href="/signup" className="font-semibold text-accent hover:text-accent-hover transition-colors">
              create a new account
            </Link>
          </p>
        </div>

        {searchParams.error && (
          <div className="bg-status-error bg-opacity-10 border border-status-error text-status-error p-4 rounded-md flex items-center text-sm">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
            <p>{searchParams.error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" action={login}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-md border border-border-light px-3 py-2 text-ink placeholder-foreground-muted focus:z-10 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-md border border-border-light px-3 py-2 text-ink placeholder-foreground-muted focus:z-10 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <div className="text-sm">
              <Link href="/forgot-password" className="font-semibold text-accent hover:text-accent-hover transition-colors">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors h-[40px] items-center"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
