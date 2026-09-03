'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { User as UserIcon, Settings2, Shield, Trash2, CheckCircle, Loader2, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'editor' | 'security' | 'danger'>('general');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Profile Form State
  const [fullName, setFullName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Editor Preferences State
  const [zoomLevel, setZoomLevel] = useState(100);
  const [openOutline, setOpenOutline] = useState(true);
  const [openAssistant, setOpenAssistant] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorSuccess, setEditorSuccess] = useState(false);

  // Security State
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState(false);
  const [securityError, setSecurityError] = useState('');

  // Danger Zone State
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setFullName(user.user_metadata?.full_name || '');
      }
      setLoading(false);
    }
    loadUser();

    // Load editor prefs from localStorage
    const savedZoom = localStorage.getItem('verba_editor_zoom');
    if (savedZoom) setZoomLevel(parseInt(savedZoom));
    
    const savedOutline = localStorage.getItem('verba_editor_outline');
    if (savedOutline !== null) setOpenOutline(savedOutline === 'true');
    
    const savedAssistant = localStorage.getItem('verba_editor_assistant');
    if (savedAssistant !== null) setOpenAssistant(savedAssistant === 'true');
  }, [supabase.auth]);

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileSuccess(false);
    try {
      await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setProfileSaving(false);
    }
  };

  const saveEditorPrefs = () => {
    setEditorSaving(true);
    setEditorSuccess(false);
    try {
      localStorage.setItem('verba_editor_zoom', zoomLevel.toString());
      localStorage.setItem('verba_editor_outline', openOutline.toString());
      localStorage.setItem('verba_editor_assistant', openAssistant.toString());
      setEditorSuccess(true);
      setTimeout(() => setEditorSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setEditorSaving(false);
    }
  };

  const changePassword = async () => {
    if (password !== passwordConfirm) {
      setSecurityError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setSecurityError('Password must be at least 6 characters');
      return;
    }
    
    setSecuritySaving(true);
    setSecurityError('');
    setSecuritySuccess(false);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setSecurityError('Failed to update password. Please try again.');
      } else {
        setSecuritySuccess(true);
        setPassword('');
        setPasswordConfirm('');
        setTimeout(() => setSecuritySuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
      setSecurityError('An unexpected error occurred.');
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="flex h-full items-center justify-center bg-[#F6F8FB]"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>;

  const TabButton = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: React.ElementType, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-md text-[14px] transition-colors
        ${activeTab === id 
          ? 'bg-accent/10 text-[#0B1628] font-medium' 
          : 'text-foreground-secondary hover:bg-black/5 hover:text-[#0B1628]'
        }
      `}
    >
      <Icon size={18} className={activeTab === id ? 'text-accent' : 'text-foreground-muted'} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-[#F6F8FB] overflow-y-auto">
      {/* Header */}
      <header className="px-8 py-10 bg-white border-b border-border-light shrink-0">
        <div className="max-w-[1000px] mx-auto">
          <h1 className="text-[28px] font-semibold text-[#0B1628] mb-2">Settings</h1>
          <p className="text-[15px] text-foreground-secondary">Manage your workspace, writing preferences, and account.</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-[1000px] mx-auto px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Left Navigation */}
        <nav className="w-full md:w-[240px] shrink-0 space-y-1">
          <TabButton id="general" icon={UserIcon} label="General" />
          <TabButton id="editor" icon={Settings2} label="Editor" />
          <TabButton id="security" icon={Shield} label="Security & Data" />
          <div className="my-4 border-t border-border-light" />
          <TabButton id="danger" icon={Trash2} label="Danger Zone" />
        </nav>

        {/* Right Content */}
        <div className="flex-1 max-w-[760px] bg-white rounded-xl border border-border-light shadow-sm overflow-hidden">
          
          {/* GENERAL */}
          {activeTab === 'general' && (
            <div className="p-8">
              <h2 className="text-[18px] font-semibold text-[#0B1628] mb-1">Profile</h2>
              <p className="text-[14px] text-foreground-secondary mb-6">Update your account details.</p>
              
              <div className="space-y-5 max-w-[480px]">
                <div>
                  <label className="block text-[13px] font-medium text-[#0B1628] mb-1.5">Email address</label>
                  <input 
                    type="email" 
                    disabled 
                    value={user?.email || ''} 
                    className="w-full h-[44px] px-3 bg-slate-50 border border-border-light rounded-md text-[14px] text-foreground-secondary cursor-not-allowed"
                  />
                  <p className="mt-1.5 text-[12px] text-foreground-muted">Email address changes currently require contacting support.</p>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#0B1628] mb-1.5">Full name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full h-[44px] px-3 bg-white border border-border-light rounded-md text-[14px] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>

                <div className="pt-4 border-t border-border-light flex items-center gap-4">
                  <button 
                    onClick={saveProfile}
                    disabled={profileSaving}
                    className="h-[40px] px-6 bg-accent text-white font-medium text-[14px] rounded-md hover:bg-accent-hover transition-colors disabled:opacity-70 flex items-center"
                  >
                    {profileSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                    {profileSaving ? 'Saving...' : 'Save changes'}
                  </button>
                  {profileSuccess && (
                    <span className="text-[13px] text-status-success flex items-center">
                      <CheckCircle size={14} className="mr-1.5" /> Saved successfully
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* EDITOR */}
          {activeTab === 'editor' && (
            <div className="p-8">
              <h2 className="text-[18px] font-semibold text-[#0B1628] mb-1">Editor Preferences</h2>
              <p className="text-[14px] text-foreground-secondary mb-6">Customize how the document workspace behaves.</p>
              
              <div className="space-y-6 max-w-[480px]">
                <div>
                  <label className="block text-[13px] font-medium text-[#0B1628] mb-1.5">Default zoom</label>
                  <select 
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                    className="w-full h-[44px] px-3 bg-white border border-border-light rounded-md text-[14px] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  >
                    <option value={75}>75%</option>
                    <option value={90}>90%</option>
                    <option value={100}>100%</option>
                    <option value={110}>110%</option>
                    <option value={125}>125%</option>
                    <option value={150}>150%</option>
                    <option value={0}>Fit Width</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={openOutline}
                      onChange={(e) => setOpenOutline(e.target.checked)}
                      className="mt-1 w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent" 
                    />
                    <div>
                      <span className="block text-[14px] font-medium text-[#0B1628]">Open Outline by default</span>
                      <span className="block text-[13px] text-foreground-secondary mt-0.5">Show the left document structure panel automatically.</span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={openAssistant}
                      onChange={(e) => setOpenAssistant(e.target.checked)}
                      className="mt-1 w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent" 
                    />
                    <div>
                      <span className="block text-[14px] font-medium text-[#0B1628]">Open Writing Assistant by default</span>
                      <span className="block text-[13px] text-foreground-secondary mt-0.5">Show the right analysis panel when opening a document.</span>
                    </div>
                  </label>
                </div>

                <div className="pt-4 border-t border-border-light flex items-center gap-4">
                  <button 
                    onClick={saveEditorPrefs}
                    disabled={editorSaving}
                    className="h-[40px] px-6 bg-accent text-white font-medium text-[14px] rounded-md hover:bg-accent-hover transition-colors disabled:opacity-70 flex items-center"
                  >
                    {editorSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                    {editorSaving ? 'Saving...' : 'Save preferences'}
                  </button>
                  {editorSuccess && (
                    <span className="text-[13px] text-status-success flex items-center">
                      <CheckCircle size={14} className="mr-1.5" /> Saved locally
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECURITY & DATA */}
          {activeTab === 'security' && (
            <div className="p-8">
              <h2 className="text-[18px] font-semibold text-[#0B1628] mb-1">Security & Data</h2>
              <p className="text-[14px] text-foreground-secondary mb-6">Manage your password and active sessions.</p>
              
              <div className="space-y-8 max-w-[480px]">
                {/* Change Password */}
                <div className="space-y-4">
                  <h3 className="text-[14px] font-semibold text-[#0B1628]">Change Password</h3>
                  <div>
                    <label className="block text-[13px] font-medium text-[#0B1628] mb-1.5">New password</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full h-[44px] px-3 bg-white border border-border-light rounded-md text-[14px] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#0B1628] mb-1.5">Confirm new password</label>
                    <input 
                      type="password" 
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full h-[44px] px-3 bg-white border border-border-light rounded-md text-[14px] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                    />
                  </div>
                  
                  {securityError && <p className="text-[13px] text-status-error">{securityError}</p>}

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={changePassword}
                      disabled={securitySaving || !password || !passwordConfirm}
                      className="h-[40px] px-6 bg-[#0B1628] text-white font-medium text-[14px] rounded-md hover:bg-black transition-colors disabled:opacity-50 flex items-center"
                    >
                      {securitySaving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                      Update Password
                    </button>
                    {securitySuccess && (
                      <span className="text-[13px] text-status-success flex items-center">
                        <CheckCircle size={14} className="mr-1.5" /> Password updated
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-border-light pt-6">
                  <h3 className="text-[14px] font-semibold text-[#0B1628] mb-3">Sessions</h3>
                  <button 
                    onClick={handleSignOut}
                    className="h-[40px] px-4 border border-border-light bg-white text-[#0B1628] font-medium text-[14px] rounded-md hover:bg-slate-50 transition-colors flex items-center"
                  >
                    <LogOut size={16} className="mr-2" />
                    Sign out
                  </button>
                  <p className="text-[12px] text-foreground-muted mt-2">Signs you out of this device securely.</p>
                </div>
              </div>
            </div>
          )}

          {/* DANGER ZONE */}
          {activeTab === 'danger' && (
            <div className="p-8">
              <h2 className="text-[18px] font-semibold text-status-error mb-1 flex items-center">
                <Trash2 size={20} className="mr-2" /> Danger Zone
              </h2>
              <p className="text-[14px] text-foreground-secondary mb-6">Permanently delete your account and all data.</p>
              
              <div className="p-5 border border-red-200 bg-red-50 rounded-lg max-w-[480px]">
                <h3 className="text-[15px] font-semibold text-red-800 mb-2">Delete your Verba account?</h3>
                <p className="text-[13px] text-red-700 leading-relaxed mb-4">
                  This will permanently delete your documents, analysis history, and account data. <strong>This action cannot be undone.</strong>
                </p>
                
                <label className="block text-[13px] font-medium text-red-900 mb-1.5">Type DELETE to confirm</label>
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full h-[44px] px-3 bg-white border border-red-200 rounded-md text-[14px] focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors mb-4"
                />

                <button 
                  disabled={deleteConfirmText !== 'DELETE'}
                  className="w-full h-[44px] flex items-center justify-center bg-status-error text-white font-medium text-[14px] rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Permanently delete account
                </button>
              </div>
              <p className="text-[12px] text-foreground-muted mt-4 max-w-[480px]">
                Note: Client-side deletion is disabled for security. Contacting the administrator or deploying the required backend migration route is necessary to complete this action.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
