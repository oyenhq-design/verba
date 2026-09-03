import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AccountProfileForm } from '@/components/AccountProfileForm';
import { AccountSecurityForm } from '@/components/AccountSecurityForm';

export default async function AccountPage() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
  const email = user.email || '';
  const createdAt = user.created_at;

  return (
    <div className="p-4 md:p-8 max-w-[800px] mx-auto w-full pt-10 pb-24">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-[28px] font-bold text-[#101828] mb-1">Account</h1>
        <p className="text-[15px] text-[#667085]">
          Manage your personal information and account access.
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="bg-white border border-[#E5EAF0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E5EAF0]">
            <h2 className="text-[16px] font-semibold text-[#101828]">Profile</h2>
            <p className="text-[14px] text-[#667085] mt-1">
              Update your personal details.
            </p>
          </div>
          <div className="p-6">
            <AccountProfileForm 
              initialName={name} 
              email={email} 
              createdAt={createdAt} 
            />
          </div>
        </section>

        {/* Security Section */}
        <section className="bg-white border border-[#E5EAF0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E5EAF0]">
            <h2 className="text-[16px] font-semibold text-[#101828]">Security</h2>
            <p className="text-[14px] text-[#667085] mt-1">
              Manage your password and account security.
            </p>
          </div>
          <div className="p-6">
            <AccountSecurityForm />
          </div>
        </section>
      </div>
    </div>
  );
}
