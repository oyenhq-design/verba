'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { logout } from '@/app/(auth)/actions';

export function AccountSecurityForm() {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      setPassword('');
      setPasswordConfirm('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Password Update */}
      <form onSubmit={handleUpdatePassword} className="space-y-6">
        <h3 className="text-[15px] font-semibold text-[#101828]">Change Password</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[14px] font-medium text-[#344054]">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-[#E5EAF0] rounded-[8px] text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[14px] font-medium text-[#344054]">Confirm Password</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full px-4 py-2 border border-[#E5EAF0] rounded-[8px] text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[#FEF3F2] text-[#B42318] text-[13px] rounded-[8px]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end pt-2">
          {success && (
            <span className="flex items-center text-[#027A48] text-[14px] mr-4">
              <CheckCircle size={16} className="mr-1.5" /> Password updated
            </span>
          )}
          <button
            type="submit"
            disabled={saving || !password}
            className="h-[40px] px-5 bg-white border border-[#D0D5DD] text-[#344054] font-medium rounded-[8px] hover:bg-slate-50 transition-colors text-[14px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            {saving ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </form>

      <div className="h-px bg-[#E5EAF0] my-8" />

      {/* Session / Sign out */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-[#101828]">Sign out</h3>
          <p className="text-[14px] text-[#667085] mt-1">
            Sign out of your account on this device.
          </p>
        </div>
        <form action={logout}>
          <button type="submit" className="h-[40px] px-5 bg-white border border-[#D0D5DD] text-[#344054] font-medium rounded-[8px] hover:bg-slate-50 transition-colors text-[14px] shadow-sm flex items-center">
            <LogOut size={16} className="mr-2" />
            Sign out
          </button>
        </form>
      </div>

      <div className="h-px bg-[#E5EAF0] my-8" />

      {/* Danger Zone */}
      <div>
        <div className="flex items-start">
          <div className="mt-1 bg-[#FEF3F2] p-2 rounded-full mr-4 shrink-0">
            <ShieldAlert size={20} className="text-[#D92D20]" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-[#101828]">Danger Zone</h3>
            <p className="text-[14px] text-[#667085] mt-1 mb-4">
              Permanently delete your account and all associated documents. This action cannot be undone.
            </p>
            <button
              disabled
              className="h-[40px] px-5 bg-[#D92D20] text-white font-medium rounded-[8px] text-[14px] opacity-50 cursor-not-allowed shadow-sm"
            >
              Delete account
            </button>
            <p className="text-[13px] text-[#667085] mt-3">
              Account deletion is currently only available by contacting support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
