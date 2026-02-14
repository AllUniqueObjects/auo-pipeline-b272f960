import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Signal = Tables<'signals'>;
type Cluster = Tables<'clusters'>;

export interface ConnectedSignal {
  signal: Signal;
  edgeType: string;
  edgeLabel: string | null;
}

export function useSignalDetail(signalId: string | undefined) {
  const [signal, setSignal] = useState<Signal | null>(null);
  const [connectedSignals, setConnectedSignals] = useState<ConnectedSignal[]>([]);
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!signalId) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        const { data: sig, error: sigErr } = await supabase
          .from('signals').select('*').eq('id', signalId).single();
        if (sigErr) throw sigErr;
        setSignal(sig);

        // Fetch cluster
        if (sig.cluster_id) {
          const clusterRes = await supabase.from('clusters').select('*').eq('id', sig.cluster_id).maybeSingle();
          if (clusterRes.data) setCluster(clusterRes.data);
        }

        // Fetch edges
        const edgesRes = await supabase.from('signal_edges').select('*')
          .or(`source_id.eq.${signalId},target_id.eq.${signalId}`);
        const edges = edgesRes.data || [];

        if (edges.length > 0) {
          const connIds = [...new Set(edges.map(e =>
            e.source_id === signalId ? e.target_id : e.source_id
          ))];

          const { data: connSigs } = await supabase
            .from('signals').select('*').in('id', connIds);

          setConnectedSignals((connSigs || []).map(cs => {
            const edge = edges.find(e => e.source_id === cs.id || e.target_id === cs.id);
            return { signal: cs, edgeType: edge?.type || 'RELATED', edgeLabel: edge?.reason || null };
          }));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch signal'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [signalId]);

  return { signal, connectedSignals, cluster, loading, error };
}
