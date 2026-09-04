'use client';

import React, { useEffect, useState } from 'react';
import { Settings2, Loader2, CheckCircle, AlertCircle, Save } from 'lucide-react';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);

  // ── Editor / Layout Preferences (localStorage — device-level) ─────────────
  const [zoomLevel, setZoomLevel] = useState(100);
  const [openOutline, setOpenOutline] = useState(true);
  const [openAssistant, setOpenAssistant] = useState(false);
  const [layoutSaveState, setLayoutSaveState] = useState<SaveState>('idle');

  // ── Autosave Preference (Supabase — cross-device) ─────────────────────────
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [autosaveLoading, setAutosaveLoading] = useState(false);
  const [autosaveSaveState, setAutosaveSaveState] = useState<SaveState>('idle');

  // ── Load all preferences ───────────────────────────────────────────────────
  useEffect(() => {
    const loadPreferences = async () => {
      // 1. Load layout prefs from localStorage (device-level, no auth needed)
      try {
        const prefs = localStorage.getItem('verba_editor_prefs');
        if (prefs) {
          const parsed = JSON.parse(prefs);
          if (typeof parsed.zoomLevel === 'number') setZoomLevel(parsed.zoomLevel);
          if (typeof parsed.openOutline === 'boolean') setOpenOutline(parsed.openOutline);
          if (typeof parsed.openAssistant === 'boolean') setOpenAssistant(parsed.openAssistant);
        }
      } catch {
        // ignore localStorage errors
      }

      // 2. Load autosave preference from Supabase (real persisted setting)
      try {
        const res = await fetch('/api/preferences');
        if (res.ok) {
          const data = await res.json();
          if (typeof data.autosave_enabled === 'boolean') {
            setAutosaveEnabled(data.autosave_enabled);
          }
        }
      } catch {
        // Non-fatal — default to true
      }

      setLoading(false);
    };

    loadPreferences();
  }, []);

  // ── Save layout preferences (localStorage) ────────────────────────────────
  const handleSaveLayoutPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setLayoutSaveState('saving');

    try {
      localStorage.setItem(
        'verba_editor_prefs',
        JSON.stringify({ zoomLevel, openOutline, openAssistant })
      );
      setLayoutSaveState('success');
      setTimeout(() => setLayoutSaveState('idle'), 3000);
    } catch {
      setLayoutSaveState('error');
    }
  };

  // ── Save autosave preference (Supabase) ───────────────────────────────────
  const handleAutosaveToggle = async (newValue: boolean) => {
    setAutosaveEnabled(newValue);
    setAutosaveLoading(true);
    setAutosaveSaveState('idle');

    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autosave_enabled: newValue }),
      });

      if (res.ok) {
        setAutosaveSaveState('success');
        setTimeout(() => setAutosaveSaveState('idle'), 3000);
      } else {
        setAutosaveEnabled(!newValue); // revert on failure
        setAutosaveSaveState('error');
      }
    } catch {
      setAutosaveEnabled(!newValue); // revert on failure
      setAutosaveSaveState('error');
    } finally {
      setAutosaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F6F8FB]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F6F8FB] overflow-y-auto">
      {/* Header */}
      <header className="px-8 py-10 bg-white border-b border-border-light shrink-0">
        <div className="max-w-[1000px] mx-auto">
          <h1 className="text-[28px] font-semibold text-[#0B1628] mb-2">Settings</h1>
          <p className="text-[15px] text-foreground-secondary">
            Manage your workspace and writing preferences.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-[1000px] mx-auto px-8 py-8 flex flex-col md:flex-row gap-8">

        {/* Left Navigation */}
        <div className="w-full md:w-[240px] shrink-0 space-y-1">
          <div className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-md text-[14px] transition-colors bg-accent/10 text-[#0B1628] font-medium">
            <Settings2 size={18} className="text-accent" />
            <span>Editor Preferences</span>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 max-w-[600px] space-y-6">

          {/* ── Saving Behaviour Card ──────────────────────────────────────── */}
          <div className="bg-white border border-border-light rounded-[12px] shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-border-light">
              <h2 className="text-[16px] font-semibold text-[#0B1628]">Saving</h2>
              <p className="text-[14px] text-foreground-secondary mt-1">
                Control how your document edits are saved.
              </p>
            </div>
            <div className="p-6">
              {/* Autosave toggle row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#0B1628]">
                    Automatically save changes
                  </p>
                  <p className="text-[13px] text-foreground-secondary mt-0.5 leading-relaxed">
                    Save document changes automatically while you work.
                    When off, use the <strong>Save</strong> button or{' '}
                    <kbd className="px-1 py-0.5 text-[11px] bg-black/5 border border-border-light rounded font-mono">
                      Ctrl+S
                    </kbd>{' '}
                    to save manually.
                  </p>
                </div>

                {/* Toggle switch */}
                <button
                  id="autosave-toggle"
                  type="button"
                  role="switch"
                  aria-checked={autosaveEnabled}
                  disabled={autosaveLoading}
                  onClick={() => handleAutosaveToggle(!autosaveEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 ${
                    autosaveEnabled ? 'bg-accent' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      autosaveEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Autosave save feedback */}
              {autosaveLoading && (
                <div className="mt-3 flex items-center text-[13px] text-foreground-secondary">
                  <Loader2 size={13} className="animate-spin mr-1.5" />
                  Saving preference…
                </div>
              )}
              {autosaveSaveState === 'success' && (
                <div className="mt-3 flex items-center text-[13px] text-[#027A48]">
                  <CheckCircle size={13} className="mr-1.5" />
                  Preference saved
                </div>
              )}
              {autosaveSaveState === 'error' && (
                <div className="mt-3 flex items-center text-[13px] text-[#B42318]">
                  <AlertCircle size={13} className="mr-1.5" />
                  Failed to save preference. Please try again.
                </div>
              )}
            </div>
          </div>

          {/* ── Editor Layout Card ─────────────────────────────────────────── */}
          <div className="bg-white border border-border-light rounded-[12px] shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-border-light">
              <h2 className="text-[16px] font-semibold text-[#0B1628]">Editor Layout</h2>
              <p className="text-[14px] text-foreground-secondary mt-1">
                Customize your writing environment on this device.
              </p>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveLayoutPrefs} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-[#0B1628]">
                    Default Zoom Level
                  </label>
                  <select
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border-light rounded-[8px] text-[14px] focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value={75}>75%</option>
                    <option value={100}>100% (Default)</option>
                    <option value={125}>125%</option>
                    <option value={150}>150%</option>
                  </select>
                </div>

                <div className="space-y-4 pt-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={openOutline}
                      onChange={(e) => setOpenOutline(e.target.checked)}
                      className="w-4 h-4 rounded text-accent border-border-light focus:ring-accent"
                    />
                    <span className="text-[14px] text-[#0B1628]">Open outline by default</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={openAssistant}
                      onChange={(e) => setOpenAssistant(e.target.checked)}
                      className="w-4 h-4 rounded text-accent border-border-light focus:ring-accent"
                    />
                    <span className="text-[14px] text-[#0B1628]">Open assistant on start</span>
                  </label>
                </div>

                <div className="flex items-center justify-end pt-4">
                  {layoutSaveState === 'success' && (
                    <span className="flex items-center text-[#027A48] text-[13px] mr-4">
                      <CheckCircle size={14} className="mr-1.5" />
                      Layout preferences saved
                    </span>
                  )}
                  {layoutSaveState === 'error' && (
                    <span className="flex items-center text-[#B42318] text-[13px] mr-4">
                      <AlertCircle size={14} className="mr-1.5" />
                      Failed to save. Please try again.
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={layoutSaveState === 'saving'}
                    className="h-[36px] px-4 bg-accent text-white font-medium rounded-[8px] hover:bg-accent/90 transition-colors text-[14px] disabled:opacity-50 flex items-center gap-2"
                  >
                    {layoutSaveState === 'saving'
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Save size={14} />
                    }
                    Save layout
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
