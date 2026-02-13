import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';
import { getClusterColor } from '@/lib/clusterColors';

export type Signal = Tables<'signals'>;
export type SignalCluster = Tables<'signal_clusters'>;

export interface SignalEdge {
  signal_a: string;
  signal_b: string;
  similarity: number;
}

export interface ClusterWithColor extends SignalCluster {
  color: ReturnType<typeof getClusterColor>;
  signals: Signal[];
}

export function useSignalGraphData() {
  const { user } = useAuth();
  const [clusters, setClusters] = useState<ClusterWithColor[]>([]);
  const [standaloneSignals, setStandaloneSignals] = useState<Signal[]>([]);
  const [signalEdges, setSignalEdges] = useState<SignalEdge[]>([]);
  const [allSignals, setAllSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch all data in parallel
        const [clustersRes, signalsRes, edgesRes] = await Promise.all([
          supabase
            .from('signal_clusters')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('signals')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('signal_edges')
            .select('source_id, target_id, similarity'),
        ]);

        if (clustersRes.error) throw clustersRes.error;
        if (signalsRes.error) throw signalsRes.error;
        if (edgesRes.error) throw edgesRes.error;

        const allSignalsData = signalsRes.data || [];
        const signalMap = new Map(allSignalsData.map((s) => [s.id, s]));
        setAllSignals(allSignalsData);

        // Track which signals are in clusters
        const clusteredSignalIds = new Set<string>();

        // Build clusters with colors and signals
        const clustersWithColor: ClusterWithColor[] = (clustersRes.data || []).map(
          (cluster, index) => {
            const clusterSignals = (cluster.signal_ids || [])
              .map((id) => signalMap.get(id))
              .filter((s): s is Signal => s !== undefined);

            clusterSignals.forEach((s) => clusteredSignalIds.add(s.id));

            return {
              ...cluster,
              color: getClusterColor(index),
              signals: clusterSignals,
            };
          }
        );

        // Find standalone signals
        const standalone = allSignalsData.filter((s) => !clusteredSignalIds.has(s.id));

        // Store raw signal edges for graph rendering
        const edges: SignalEdge[] = (edgesRes.data || []).map((e: any) => ({
          signal_a: e.source_id,
          signal_b: e.target_id,
          similarity: e.similarity,
        }));

        setClusters(clustersWithColor);
        setStandaloneSignals(standalone);
        setSignalEdges(edges);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return {
    clusters,
    standaloneSignals,
    signalEdges,
    allSignals,
    loading,
    error,
    totalSignals: allSignals.length,
  };
}
