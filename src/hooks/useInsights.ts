import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Insight = Tables<'insights'>;
export type Signal = Tables<'signals'>;
export type Tier = 'urgent' | 'emerging' | 'relevant';

export function getTier(urgency: string): Tier {
  if (urgency === 'urgent') return 'urgent';
  if (urgency === 'emerging') return 'emerging';
  return 'relevant';
}

export interface InsightWithData {
  insight: Insight;
  signals: Signal[];
  tier: Tier;
  totalRefs: number;
  clusterName: string;
  compositeScore: number;
}

export interface InsightEdge {
  insightA: string;
  insightB: string;
  type: string;
  label: string | null;
}

export function useInsightData() {
  const [insights, setInsights] = useState<InsightWithData[]>([]);
  const [insightEdges, setInsightEdges] = useState<InsightEdge[]>([]);
  const [clusterNames, setClusterNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [insightsRes, signalsRes, clustersRes, edgesRes] = await Promise.all([
          supabase.from('insights').select('*').eq('insight_type', 'push').order('sort_order'),
          supabase.from('signals').select('*'),
          supabase.from('clusters').select('*'),
          supabase.from('signal_edges').select('source_id, target_id, type, reason'),
        ]);

        if (insightsRes.error) throw insightsRes.error;
        if (signalsRes.error) throw signalsRes.error;

        const signalMap = new Map((signalsRes.data || []).map(s => [s.id, s]));
        const clMap: Record<string, string> = {};
        (clustersRes.data || []).forEach(c => { clMap[c.id] = c.name; });
        setClusterNames(clMap);

        const insightData: InsightWithData[] = (insightsRes.data || []).map(insight => {
          const signals = (insight.signal_ids || [])
            .map(id => signalMap.get(id))
            .filter((s): s is Signal => !!s);
          const totalRefs = signals.reduce((sum, s) => sum + (s.sources || 0), 0);
          const firstClusterId = signals[0]?.cluster_id;
          const clusterName = firstClusterId ? (clMap[firstClusterId] || firstClusterId) : 'INTELLIGENCE';
          // Composite score: weighted blend of references, momentum, and signal count
          const compositeScore =
            (totalRefs * 0.5) +
            ((insight.sort_order ? (100 - insight.sort_order) : 0) * 0.3) +
            (signals.length * 0.2 * 10);
          return { insight, signals, tier: getTier(insight.urgency), totalRefs, clusterName, compositeScore };
        });

        // Sort by composite score descending within each tier
        insightData.sort((a, b) => b.compositeScore - a.compositeScore);

        // Compute insight-to-insight edges
        const edges = edgesRes.data || [];
        const insightSignals = new Map<string, Set<string>>();
        insightData.forEach(d => insightSignals.set(d.insight.id, new Set(d.signals.map(s => s.id))));

        const computed: InsightEdge[] = [];
        const seen = new Set<string>();
        for (const edge of edges) {
          for (const [idA, sA] of insightSignals) {
            for (const [idB, sB] of insightSignals) {
              if (idA >= idB) continue;
              if ((sA.has(edge.source_id) && sB.has(edge.target_id)) ||
                  (sA.has(edge.target_id) && sB.has(edge.source_id))) {
                const key = `${idA}-${idB}`;
                if (!seen.has(key)) {
                  seen.add(key);
                  computed.push({ insightA: idA, insightB: idB, type: edge.type, label: edge.reason });
                }
              }
            }
          }
        }

        setInsights(insightData);
        setInsightEdges(computed);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch intelligence'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return { insights, insightEdges, clusterNames, loading, error };
}
