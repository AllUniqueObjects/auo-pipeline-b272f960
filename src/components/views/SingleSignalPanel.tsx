import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SignalCard, type SignalCardData } from './SignalCard';

interface SingleSignalPanelProps {
  signalId: string;
  onBack: () => void;
}

export function SingleSignalPanel({ signalId, onBack }: SingleSignalPanelProps) {
  const [signal, setSignal] = useState<SignalCardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data } = await supabase
        .from('signals')
        .select('id, title, credibility, last_source_count, created_at, nb_relevance, raw_sources, summary')
        .eq('id', signalId)
        .maybeSingle();

      if (data) {
        const sources = Array.isArray(data.raw_sources)
          ? (data.raw_sources as any[]).map(s => ({
              title: s.title ?? s.source_title ?? '',
              url: s.url ?? s.source_url ?? '',
              domain: s.domain ?? '',
            }))
          : [];

        setSignal({
          id: data.id,
          title: data.title,
          credibility: data.credibility ?? 0,
          sources: data.last_source_count ?? 0,
          created_at: data.created_at ?? '',
          analysis_context: data.summary ?? '',
          nb_relevance: data.nb_relevance ?? undefined,
          source_urls: sources,
        });
      }
      setLoading(false);
    }
    fetch();
  }, [signalId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Signal not found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back
      </button>
      <SignalCard signal={signal} expanded onToggle={() => {}} />
    </div>
  );
}
