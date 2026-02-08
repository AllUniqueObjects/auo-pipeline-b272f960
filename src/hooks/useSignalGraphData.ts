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

export interface ClusterEdge {
  clusterA: string;
  clusterB: string;
}

export function useSignalGraphData() {
  const { user } = useAuth();
  const [clusters, setClusters] = useState<ClusterWithColor[]>([]);
  const [standaloneSignals, setStandaloneSignals] = useState<Signal[]>([]);
  const [clusterEdges, setClusterEdges] = useState<ClusterEdge[]>([]);
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
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('signal_edges')
            .select('signal_a, signal_b, similarity'),
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

        // Build cluster-to-cluster edges
        const edges = edgesRes.data || [];
        const signalToCluster = new Map<string, string>();
        clustersWithColor.forEach((c) => {
          c.signals.forEach((s) => signalToCluster.set(s.id, c.id));
        });

        const clusterPairs = new Set<string>();
        const clusterEdgesList: ClusterEdge[] = [];

        edges
          .filter((e) => e.similarity > 0.5)
          .forEach((edge) => {
            const clusterA = signalToCluster.get(edge.signal_a);
            const clusterB = signalToCluster.get(edge.signal_b);

            if (clusterA && clusterB && clusterA !== clusterB) {
              const pairKey = [clusterA, clusterB].sort().join('-');
              if (!clusterPairs.has(pairKey)) {
                clusterPairs.add(pairKey);
                clusterEdgesList.push({ clusterA, clusterB });
              }
            }
          });

        setClusters(clustersWithColor);
        setStandaloneSignals(standalone);
        setClusterEdges(clusterEdgesList);
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
    clusterEdges,
    allSignals,
    loading,
    error,
    totalSignals: allSignals.length,
  };
}
