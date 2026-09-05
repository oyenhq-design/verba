import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface DocumentEvent {
  id: string;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DocumentVersion {
  id: string;
  version_number: number;
  source: string;
  word_count: number;
  created_at: string;
}

export function useDocumentHistory(documentId: string) {
  const [events, setEvents] = useState<DocumentEvent[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchHistory = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, versionsRes] = await Promise.all([
        supabase
          .from('document_events')
          .select('id, event_type, metadata, created_at')
          .eq('document_id', documentId)
          .order('created_at', { ascending: false }),
        supabase
          .from('document_versions')
          .select('id, version_number, source, word_count, created_at')
          .eq('document_id', documentId)
          .order('version_number', { ascending: false })
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (versionsRes.error) throw versionsRes.error;

      setEvents(eventsRes.data || []);
      setVersions(versionsRes.data || []);
    } catch (err: unknown) {
      console.error('[useDocumentHistory] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch document history');
    } finally {
      setLoading(false);
    }
  }, [documentId, supabase]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { events, versions, loading, error, refetch: fetchHistory };
}
