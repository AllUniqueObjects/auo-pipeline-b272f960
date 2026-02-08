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

type ViewState = 'briefing' | 'insight' | 'fullmap' | 'detail';

export default function Signals() {
  const isMobile = useIsMobile();
  const { clusters, standaloneSignals, signalEdges, totalSignals, loading } =
    useSignalGraphData();

  const [view, setView] = useState<ViewState>('briefing');
  const [selectedInsight, setSelectedInsight] = useState<InsightData | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterWithColor | null>(null);
  const [previousView, setPreviousView] = useState<ViewState>('briefing');

  // Convert clusters to insights for the Briefing screen
  const insights: InsightData[] = useMemo(() => {
    return clusters.map((cluster) => {
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
  }, [clusters]);

  // Count urgent signals
  const urgentCount = useMemo(() => {
    return clusters.reduce(
      (count, c) => count + c.signals.filter((s) => s.urgency === 'urgent').length,
      0
    );
  }, [clusters]);

  // Handle navigation
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

  // Browser back button support
  useEffect(() => {
    const handlePopState = () => {
      handleBack();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handleBack]);

  // Push state when entering non-briefing views
  useEffect(() => {
    if (view !== 'briefing') {
      window.history.pushState({ view }, '');
    }
  }, [view]);

  // Loading state
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#13131a' }}
      >
        <span className="text-[13px]" style={{ fontWeight: 300, color: '#6b6b7b' }}>
          Loading…
        </span>
      </div>
    );
  }

  // Mobile: simple list view
  if (isMobile) {
    return (
      <MobileSignalList
        clusters={clusters}
        standaloneSignals={standaloneSignals}
        totalSignals={totalSignals}
      />
    );
  }

  // Signal Detail screen
  if (view === 'detail' && selectedSignal) {
    const relatedSignals = selectedCluster
      ? selectedCluster.signals.filter((s) => s.id !== selectedSignal.id)
      : [];

    return (
      <div className="min-h-screen" style={{ background: '#13131a' }}>
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

  // Insight Graph screen
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

  // Full Signal Map screen
  if (view === 'fullmap') {
    return (
      <FullSignalMap
        clusters={clusters}
        standaloneSignals={standaloneSignals}
        signalEdges={signalEdges}
        onBack={handleBack}
        onSelectSignal={handleSelectSignal}
      />
    );
  }

  // Briefing screen (default)
  return (
    <BriefingView
      insights={insights}
      totalSignals={totalSignals}
      totalEdges={signalEdges.length}
      urgentCount={urgentCount}
      onSelectInsight={handleSelectInsight}
      onShowFullGraph={handleShowFullGraph}
    />
  );
}
