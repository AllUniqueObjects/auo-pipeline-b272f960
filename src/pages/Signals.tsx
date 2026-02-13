import { useState, useEffect, useCallback, useMemo } from 'react';
import { BriefingView } from '@/components/signals/BriefingView';
import { InsightGraphView } from '@/components/signals/InsightGraphView';
import { FullSignalMap } from '@/components/signals/FullSignalMap';
import { SignalDetailView } from '@/components/signals/SignalDetailView';
import { MobileSignalList } from '@/components/signals/MobileSignalList';
import { useSignalGraphData } from '@/hooks/useSignalGraphData';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Signal, ClusterWithColor } from '@/hooks/useSignalGraphData';
import type { InsightData } from '@/components/signals/InsightCard';
import { getClusterColor } from '@/lib/clusterColors';

type ViewState = 'briefing' | 'insight' | 'fullmap' | 'detail';

// ── Mock data for UI development ──────────────────────────────────────
const now = new Date();
const earlier = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - 2);
const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 14);
const twoDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 10);

function makeMockSignal(id: string, title: string, urgency: string): Signal {
  return {
    id,
    title,
    urgency,
    sources: 3,
    summary: null,
    cluster_id: null,
    created_at: now.toISOString(),
    updated_at: null,
    credibility: 0.8,
    days_active: 5,
    momentum: 0.6,
    priority_score: 70,
    adjacent_layer: null,
    analysis_context: null,
    analyzed_at: null,
    bridge_reason: null,
    decision_question: null,
    discovery_type: null,
    entities: null,
    entity_tags: null,
    first_seen: null,
    last_scanned_at: null,
    last_source_count: null,
    nb_relevance: null,
    query_origin: null,
    raw_sources: null,
    scan_source: null,
    source_count_history: null,
    watch_topic_match: null,
  };
}

function makeMockCluster(id: string, name: string, colorIdx: number, signalTitles: string[], urgencies: string[]): ClusterWithColor {
  const signals = signalTitles.map((t, i) => makeMockSignal(`${id}-sig-${i}`, t, urgencies[i] || 'emerging'));
  return {
    id,
    name,
    description: `Cluster around ${name.toLowerCase()} trends`,
    signal_count: signals.length,
    signal_ids: signals.map((s) => s.id),
    user_id: 'mock',
    created_at: now.toISOString(),
    avg_confidence: 'high',
    top_urgency: urgencies.includes('urgent') ? 'urgent' : 'emerging',
    color: getClusterColor(colorIdx),
    signals,
  };
}

const mockClusters: ClusterWithColor[] = [
  makeMockCluster('c1', 'Competitive Intelligence', 0,
    ['Rival launches AI-native planning tool', 'Category spend shifting to automation', 'Key competitor hiring surge in ML', 'New entrant backed by $40M Series B'],
    ['urgent', 'emerging', 'emerging', 'emerging']
  ),
  makeMockCluster('c2', 'Market Dynamics', 1,
    ['Consumer sentiment shifting toward value', 'Retail media spend accelerating in EU', 'Private-label growth outpacing branded'],
    ['emerging', 'urgent', 'emerging']
  ),
  makeMockCluster('c3', 'Technology & Innovation', 2,
    ['GenAI adoption in creative workflows', 'Edge computing costs dropping 30% YoY'],
    ['emerging', 'emerging']
  ),
  makeMockCluster('c4', 'Supply Chain', 3,
    ['Southeast Asia shipping delays extend', 'Raw material costs stabilizing after Q3 spike', 'New tariff proposals under review'],
    ['urgent', 'emerging', 'emerging']
  ),
];

const mockInsights: InsightData[] = [
  {
    id: 'i1',
    cluster: mockClusters[0],
    title: 'Competitive landscape is shifting toward AI-native tools',
    description: 'Four signals point to accelerating investment in AI-powered planning and automation among direct competitors.',
    signals: mockClusters[0].signals,
    urgentCount: 1,
    color: mockClusters[0].color.text,
    category: 'competitive',
    decisionQuestion: 'Should we accelerate our own AI roadmap before the window closes?',
    referenceCount: 12,
    createdAt: earlier,
  },
  {
    id: 'i2',
    cluster: mockClusters[1],
    title: 'Value-driven consumer behavior reshaping category dynamics',
    description: 'Sentiment data and spend patterns suggest a structural shift toward private-label and value positioning.',
    signals: mockClusters[1].signals,
    urgentCount: 1,
    color: mockClusters[1].color.text,
    category: 'market',
    decisionQuestion: 'Do we need to revisit our premium pricing strategy for Q2?',
    referenceCount: 8,
    createdAt: earlier,
  },
  {
    id: 'i3',
    cluster: mockClusters[2],
    title: 'Creative workflow automation reaching inflection point',
    description: 'GenAI tools and falling compute costs are creating new efficiency opportunities in content production.',
    signals: mockClusters[2].signals,
    urgentCount: 0,
    color: mockClusters[2].color.text,
    category: 'technology',
    decisionQuestion: 'Is now the right time to pilot AI-assisted creative production?',
    referenceCount: 6,
    createdAt: yesterday,
  },
  {
    id: 'i4',
    cluster: mockClusters[3],
    title: 'Supply chain disruptions and policy shifts converging',
    description: 'Shipping delays in Southeast Asia combined with new tariff proposals could impact Q2 margins.',
    signals: mockClusters[3].signals,
    urgentCount: 1,
    color: mockClusters[3].color.text,
    category: 'supply_chain',
    decisionQuestion: 'Should we diversify sourcing before tariff decisions land?',
    referenceCount: 9,
    createdAt: yesterday,
  },
];

// ── Component ─────────────────────────────────────────────────────────

export default function Signals() {
  const isMobile = useIsMobile();
  const { clusters, standaloneSignals, signalEdges, totalSignals, loading } =
    useSignalGraphData();

  const [view, setView] = useState<ViewState>('briefing');
  const [selectedInsight, setSelectedInsight] = useState<InsightData | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterWithColor | null>(null);
  const [previousView, setPreviousView] = useState<ViewState>('briefing');

  // Use mock data when DB returns nothing
  const useMock = !loading && clusters.length === 0;

  const displayClusters = useMock ? mockClusters : clusters;

  // Convert clusters to insights
  const insights: InsightData[] = useMemo(() => {
    if (useMock) return mockInsights;
    return displayClusters.map((cluster) => {
      const urgentCount = cluster.signals.filter((s) => s.urgency === 'urgent').length;
      return {
        id: cluster.id,
        cluster,
        title: cluster.name,
        description: cluster.description,
        signals: cluster.signals,
        urgentCount,
        color: cluster.color.text,
      };
    });
  }, [displayClusters, useMock]);

  const displayTotalSignals = useMock
    ? mockClusters.reduce((n, c) => n + c.signals.length, 0)
    : totalSignals;

  const urgentCount = useMemo(() => {
    return displayClusters.reduce(
      (count, c) => count + c.signals.filter((s) => s.urgency === 'urgent').length,
      0
    );
  }, [displayClusters]);

  // ── Navigation ──
  const handleSelectInsight = useCallback((insight: InsightData) => {
    setSelectedInsight(insight);
    setPreviousView('briefing');
    setView('insight');
  }, []);

  const handleShowFullGraph = useCallback(() => {
    setPreviousView('briefing');
    setView('fullmap');
  }, []);

  const handleSelectSignal = useCallback(
    (signal: Signal, cluster?: ClusterWithColor | null) => {
      setSelectedSignal(signal);
      setSelectedCluster(cluster ?? selectedInsight?.cluster ?? null);
      setPreviousView(view);
      setView('detail');
    },
    [view, selectedInsight]
  );

  const handleBack = useCallback(() => {
    if (view === 'detail') {
      setView(previousView);
      setSelectedSignal(null);
    } else if (view === 'insight' || view === 'fullmap') {
      setView('briefing');
      setSelectedInsight(null);
    }
  }, [view, previousView]);

  const handleSelectRelatedSignal = useCallback((signal: Signal) => {
    setSelectedSignal(signal);
  }, []);

  useEffect(() => {
    const handlePopState = () => handleBack();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handleBack]);

  useEffect(() => {
    if (view !== 'briefing') {
      window.history.pushState({ view }, '');
    }
  }, [view]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-[13px] font-light text-muted-foreground">Loading…</span>
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileSignalList
        clusters={displayClusters}
        standaloneSignals={useMock ? [] : standaloneSignals}
        totalSignals={displayTotalSignals}
      />
    );
  }

  if (view === 'detail' && selectedSignal) {
    const relatedSignals = selectedCluster
      ? selectedCluster.signals.filter((s) => s.id !== selectedSignal.id)
      : [];
    return (
      <div className="min-h-screen bg-background">
        <SignalDetailView
          signal={selectedSignal}
          cluster={selectedCluster}
          relatedSignals={relatedSignals}
          onBack={handleBack}
          onSelectSignal={handleSelectRelatedSignal}
        />
      </div>
    );
  }

  if (view === 'insight' && selectedInsight) {
    return (
      <InsightGraphView
        insight={selectedInsight}
        signalEdges={signalEdges}
        onBack={handleBack}
        onSelectSignal={(signal) => handleSelectSignal(signal, selectedInsight.cluster)}
      />
    );
  }

  if (view === 'fullmap') {
    return (
      <FullSignalMap
        clusters={displayClusters}
        standaloneSignals={useMock ? [] : standaloneSignals}
        signalEdges={signalEdges}
        onBack={handleBack}
        onSelectSignal={handleSelectSignal}
      />
    );
  }

  return (
    <BriefingView
      insights={insights}
      totalSignals={displayTotalSignals}
      totalEdges={signalEdges.length}
      urgentCount={urgentCount}
      onSelectInsight={handleSelectInsight}
      onShowFullGraph={handleShowFullGraph}
    />
  );
}
