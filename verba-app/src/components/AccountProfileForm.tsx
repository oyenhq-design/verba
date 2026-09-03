'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, Loader2 } from 'lucide-react';

interface Props {
  initialName: string;
  email: string;
  createdAt: string;
}

export function AccountProfileForm({ initialName, email, createdAt }: Props) {
  const [fullName, setFullName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const memberSince = new Date(createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-center space-x-2 text-[14px] text-[#667085] mb-4">
        <span>Member since {memberSince}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[14px] font-medium text-[#344054]">Display Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2 border border-[#E5EAF0] rounded-[8px] text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            placeholder="Your name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[14px] font-medium text-[#344054]">Email address</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-2 border border-[#E5EAF0] bg-slate-50 text-slate-500 rounded-[8px] text-[14px] cursor-not-allowed"
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
            <CheckCircle size={16} className="mr-1.5" /> Saved
          </span>
        )}
        <button
          type="submit"
          disabled={saving || fullName === initialName}
          className="h-[40px] px-5 bg-accent text-white font-medium rounded-[8px] hover:bg-accent-hover transition-colors text-[14px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
        >
          {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
