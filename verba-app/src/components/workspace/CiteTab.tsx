import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Trash2, Edit2, Loader2, FileText, ChevronDown } from 'lucide-react';
import { useCitationContext } from './CitationContext';
import { formatBibliographyEntry } from '@/lib/citations/formatter';

interface CiteTabProps {
  documentId: string;
  workId: string | null;
  onInsertCitation: (sourceId: string) => void;
  editorHasFocus: boolean; // Tells us if we can insert
}

export function CiteTab({ documentId, workId, onInsertCitation, editorHasFocus }: CiteTabProps) {
  const { sources, style, documentCitations } = useCitationContext();
  const [loading, setLoading] = useState(false);
  const [localSources, setLocalSources] = useState(sources);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    authors: '', // comma separated for simple input
    publication_year: '',
    source_type: 'journal_article',
  });
  const [errorMsg, setErrorMsg] = useState('');

  // Sync with context if it updates
  useEffect(() => {
    setLocalSources(sources);
  }, [sources]);

  if (!workId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-[#F6F8FB]">
        <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mb-4 text-foreground-muted">
          <BookOpen size={24} />
        </div>
        <p className="text-[13px] text-foreground-secondary leading-relaxed max-w-[240px]">
          This document isn't connected to a Verba work yet.
        </p>
      </div>
    );
  }

  const handleAddSource = async () => {
    if (!formData.title) {
      setErrorMsg('Title is required');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const parsedAuthors = formData.authors.split(',').map(a => {
        const parts = a.trim().split(' ');
        if (parts.length === 1) return { given: '', family: parts[0] };
        const family = parts.pop() || '';
        const given = parts.join(' ');
        return { given, family };
      }).filter(a => a.family);

      const payload = {
        title: formData.title,
        publication_year: formData.publication_year ? parseInt(formData.publication_year, 10) : null,
        source_type: formData.source_type,
        authors: parsedAuthors,
        source_provider: 'manual'
      };

      const res = await fetch(`/api/works/${workId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save source');
      
      setLocalSources([data, ...localSources]);
      setShowAddForm(false);
      setFormData({ title: '', authors: '', publication_year: '', source_type: 'journal_article' });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sourceId: string) => {
    const isCited = documentCitations.some(c => c.sourceId === sourceId);
    if (isCited) {
      alert("This source is used in this document. Remove its citations before deleting it.");
      return;
    }
    
    if (!confirm("Are you sure you want to delete this source?")) return;

    try {
      const res = await fetch(`/api/works/${workId}/sources/${sourceId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete');
      }
      setLocalSources(localSources.filter(s => s.id !== sourceId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredSources = localSources.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.authors && s.authors.some((a: any) => a.family.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="flex flex-col h-full bg-[#F6F8FB]">
      <div className="p-4 border-b border-border-light shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input 
            type="text" 
            placeholder="Search your sources..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-[13px] bg-white border border-border-light rounded focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {localSources.length === 0 && !showAddForm ? (
          <div className="text-center py-8">
            <BookOpen size={24} className="mx-auto text-foreground-muted mb-3" />
            <p className="text-[13px] text-foreground-secondary mb-4">No sources saved yet.</p>
            <button 
              onClick={() => setShowAddForm(true)}
              className="text-[13px] font-medium text-accent hover:underline"
            >
              Add a source manually now.
            </button>
            <p className="text-[12px] text-foreground-muted mt-2">Research will also let you save sources here when it is connected.</p>
          </div>
        ) : (
          <>
            {!showAddForm && (
              <button 
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center gap-1.5 h-8 bg-white border border-border-light rounded text-[13px] font-medium text-[#0B1628] hover:bg-black/5"
              >
                <Plus size={14} /> Add Source
              </button>
            )}

            {showAddForm && (
              <div className="bg-white p-3 border border-border-light rounded text-[13px] space-y-3 shadow-sm">
                <div className="font-semibold text-[#0B1628] mb-1">Add Source</div>
                <select 
                  value={formData.source_type} 
                  onChange={e => setFormData({...formData, source_type: e.target.value})}
                  className="w-full h-8 px-2 border border-border-light rounded outline-none"
                >
                  <option value="journal_article">Journal Article</option>
                  <option value="book">Book</option>
                  <option value="website">Website</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Title" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full h-8 px-2 border border-border-light rounded outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Authors (e.g. John Doe, Jane Smith)" 
                  value={formData.authors}
                  onChange={e => setFormData({...formData, authors: e.target.value})}
                  className="w-full h-8 px-2 border border-border-light rounded outline-none"
                />
                <input 
                  type="number" 
                  placeholder="Year" 
                  value={formData.publication_year}
                  onChange={e => setFormData({...formData, publication_year: e.target.value})}
                  className="w-full h-8 px-2 border border-border-light rounded outline-none"
                />
                {errorMsg && <div className="text-status-error text-[12px]">{errorMsg}</div>}
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={handleAddSource} disabled={loading} className="flex-1 bg-accent text-white h-8 rounded font-medium disabled:opacity-50">
                    {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Save'}
                  </button>
                  <button onClick={() => setShowAddForm(false)} className="flex-1 bg-black/5 text-[#0B1628] h-8 rounded font-medium">Cancel</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {filteredSources.map(source => (
                <div key={source.id} className="bg-white border border-border-light rounded p-3 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="text-[13px] text-foreground-secondary mb-3 leading-relaxed">
                    {formatBibliographyEntry(source, style, undefined)}
                  </div>
                  <div className="flex items-center justify-between border-t border-border-light pt-2 -mx-3 px-3">
                    <button 
                      onClick={() => source.id && onInsertCitation(source.id)}
                      disabled={!editorHasFocus || !source.id}
                      className="text-[12px] font-medium text-accent disabled:text-foreground-muted disabled:cursor-not-allowed"
                      title={!editorHasFocus ? "Place your cursor in the document to insert a citation" : ""}
                    >
                      Insert Citation
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => source.id && handleDelete(source.id)} className="p-1.5 text-status-error hover:bg-status-error/10 rounded">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
