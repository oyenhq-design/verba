'use client';

import React, { useEffect, useState } from 'react';
import { Settings2, Loader2, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);

  // Editor Preferences State
  const [zoomLevel, setZoomLevel] = useState(100);
  const [openOutline, setOpenOutline] = useState(true);
  const [openAssistant, setOpenAssistant] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorSuccess, setEditorSuccess] = useState(false);

  useEffect(() => {
    // Load editor prefs from localStorage
    try {
      const prefs = localStorage.getItem('verba_editor_prefs');
      if (prefs) {
        const parsed = JSON.parse(prefs);
        if (parsed.zoomLevel) setZoomLevel(parsed.zoomLevel);
        if (typeof parsed.openOutline === 'boolean') setOpenOutline(parsed.openOutline);
        if (typeof parsed.openAssistant === 'boolean') setOpenAssistant(parsed.openAssistant);
      }
    } catch (e) {
      console.error('Failed to load prefs', e);
    }
    setLoading(false);
  }, []);

  const handleSaveEditorPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditorSaving(true);
    setEditorSuccess(false);

    try {
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 600));
      
      localStorage.setItem('verba_editor_prefs', JSON.stringify({
        zoomLevel,
        openOutline,
        openAssistant
      }));
      
      setEditorSuccess(true);
      setTimeout(() => setEditorSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setEditorSaving(false);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center bg-[#F6F8FB]"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>;

  return (
    <div className="flex flex-col h-full bg-[#F6F8FB] overflow-y-auto">
      {/* Header */}
      <header className="px-8 py-10 bg-white border-b border-border-light shrink-0">
        <div className="max-w-[1000px] mx-auto">
          <h1 className="text-[28px] font-semibold text-[#0B1628] mb-2">Settings</h1>
          <p className="text-[15px] text-foreground-secondary">Manage your workspace and writing preferences.</p>
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
        <div className="flex-1 max-w-[600px]">
          <div className="bg-white border border-border-light rounded-[12px] shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-border-light">
              <h2 className="text-[16px] font-semibold text-[#0B1628]">Editor Preferences</h2>
              <p className="text-[14px] text-foreground-secondary mt-1">
                Customize your writing environment.
              </p>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveEditorPrefs} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-[#0B1628]">Default Zoom Level</label>
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
                  <label className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      checked={openOutline}
                      onChange={(e) => setOpenOutline(e.target.checked)}
                      className="w-4 h-4 rounded text-accent border-border-light focus:ring-accent" 
                    />
                    <span className="text-[14px] text-[#0B1628]">Open outline by default</span>
                  </label>
                  
                  <label className="flex items-center space-x-3">
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
                  {editorSuccess && (
                    <span className="flex items-center text-[#027A48] text-[14px] mr-4">
                      <CheckCircle size={16} className="mr-1.5" /> Preferences saved
                    </span>
                  )}
                  <button 
                    type="submit" 
                    disabled={editorSaving}
                    className="h-[36px] px-4 bg-accent text-white font-medium rounded-[8px] hover:bg-accent/90 transition-colors text-[14px] disabled:opacity-50 flex items-center"
                  >
                    {editorSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                    Save preferences
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
