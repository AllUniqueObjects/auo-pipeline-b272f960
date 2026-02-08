import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

export type SignalCluster = Tables<'signal_clusters'>;
export type Signal = Tables<'signals'>;

export interface ClusterWithSignals extends SignalCluster {
  signals: Signal[];
}

const urgencyOrder: Record<string, number> = {
  urgent: 0,
  emerging: 1,
  monitor: 2,
  stable: 3,
};

export function useSignalClusters() {
  const { user } = useAuth();
  const [clusters, setClusters] = useState<ClusterWithSignals[]>([]);
  const [standaloneSignals, setStandaloneSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch all clusters
        const { data: clustersData, error: clustersError } = await supabase
          .from('signal_clusters')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (clustersError) throw clustersError;

        // Fetch all user signals
        const { data: signalsData, error: signalsError } = await supabase
          .from('signals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (signalsError) throw signalsError;

        const allSignals = signalsData || [];
        const signalMap = new Map(allSignals.map((s) => [s.id, s]));

        // Track which signals are in clusters
        const clusteredSignalIds = new Set<string>();

        // Build clusters with their signals
        const clustersWithSignals: ClusterWithSignals[] = (clustersData || []).map((cluster) => {
          const clusterSignals = (cluster.signal_ids || [])
            .map((id) => signalMap.get(id))
            .filter((s): s is Signal => s !== undefined);
          
          clusterSignals.forEach((s) => clusteredSignalIds.add(s.id));
          
          return {
            ...cluster,
            signals: clusterSignals,
          };
        });

        // Sort clusters by top_urgency
        clustersWithSignals.sort((a, b) => {
          const aOrder = urgencyOrder[a.top_urgency || 'stable'] ?? 3;
          const bOrder = urgencyOrder[b.top_urgency || 'stable'] ?? 3;
          return aOrder - bOrder;
        });

        // Find standalone signals (not in any cluster)
        const standalone = allSignals.filter((s) => !clusteredSignalIds.has(s.id));

        setClusters(clustersWithSignals);
        setStandaloneSignals(standalone);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch clusters'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to realtime changes for signals
    const signalsChannel = supabase
      .channel('signals-cluster-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signals',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch on any signal change
          fetchData();
        }
      )
      .subscribe();

    // Subscribe to realtime changes for clusters
    const clustersChannel = supabase
      .channel('clusters-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signal_clusters',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch on any cluster change
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(clustersChannel);
    };
  }, [user]);

  // Compute summary counts
  const urgentCount = clusters.filter((c) => c.top_urgency === 'urgent').length;
  const emergingCount = clusters.filter((c) => c.top_urgency === 'emerging').length;
  const monitorCount = clusters.filter((c) => c.top_urgency === 'monitor').length;
  const clustersNeedingAttention = urgentCount + emergingCount;

  return {
    clusters,
    standaloneSignals,
    loading,
    error,
    summary: {
      total: clusters.length,
      needsAttention: clustersNeedingAttention,
      urgent: urgentCount,
      emerging: emergingCount,
      monitor: monitorCount,
    },
  };
}
