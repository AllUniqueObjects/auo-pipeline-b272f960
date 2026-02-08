import { useState, useEffect, useCallback } from 'react';
import { SignalGraph } from '@/components/signals/SignalGraph';
import { SignalDetailView } from '@/components/signals/SignalDetailView';
import { MobileSignalList } from '@/components/signals/MobileSignalList';
import { useSignalGraphData } from '@/hooks/useSignalGraphData';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Signal, ClusterWithColor } from '@/hooks/useSignalGraphData';

type ViewState = 'graph' | 'detail';

export default function Signals() {
  const isMobile = useIsMobile();
  const { clusters, standaloneSignals, signalEdges, totalSignals, loading } =
    useSignalGraphData();

  const [view, setView] = useState<ViewState>('graph');
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterWithColor | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSelectSignal = useCallback(
    (signal: Signal, cluster: ClusterWithColor | null) => {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedSignal(signal);
        setSelectedCluster(cluster);
        setView('detail');
        setIsTransitioning(false);
      }, 200);
    },
    []
  );

  const handleBack = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setView('graph');
      setSelectedSignal(null);
      setSelectedCluster(null);
      setIsTransitioning(false);
    }, 200);
  }, []);

  const handleSelectRelatedSignal = useCallback(
    (signal: Signal) => {
      setSelectedSignal(signal);
      // Cluster stays the same since it's from the same cluster
    },
    []
  );

  // Browser back button support
  useEffect(() => {
    const handlePopState = () => {
      if (view === 'detail') {
        handleBack();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view, handleBack]);

  // Push state when entering detail view
  useEffect(() => {
    if (view === 'detail' && selectedSignal) {
      window.history.pushState({ view: 'detail', signalId: selectedSignal.id }, '');
    }
  }, [view, selectedSignal]);

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

  const currentDate = new Date();
  const formattedDate = `${currentDate.getDate()} ${currentDate.toLocaleString('en', { month: 'short' })}`;

  // Related signals for detail view (same cluster, excluding current)
  const relatedSignals =
    selectedCluster && selectedSignal
      ? selectedCluster.signals.filter((s) => s.id !== selectedSignal.id)
      : [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#13131a' }}>
      {view === 'graph' && (
        <div
          className={`flex-1 flex flex-col transition-opacity duration-200 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-10 h-12">
            <span
              className="text-[13px] tracking-[0.15em]"
              style={{ fontWeight: 500, color: '#6b6b7b' }}
            >
              AUO
            </span>
            <span className="text-[11px]" style={{ fontWeight: 300, color: '#44444f' }}>
              {formattedDate} · {totalSignals}
            </span>
          </div>

          {/* Summary line */}
          <div className="px-10 py-2">
            <span className="text-[13px]" style={{ fontWeight: 400, color: '#6b6b7b' }}>
              {clusters.length} cluster{clusters.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Graph area - fills remaining viewport */}
          <div 
            className="px-10 pb-10"
            style={{ height: 'calc(100vh - 120px)' }}
          >
              {clusters.length === 0 && standaloneSignals.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <span className="text-[13px]" style={{ fontWeight: 300, color: '#44444f' }}>
                    No signals yet
                  </span>
                </div>
              ) : (
                <SignalGraph
                  clusters={clusters}
                  standaloneSignals={standaloneSignals}
                  signalEdges={signalEdges}
                  onSelectSignal={handleSelectSignal}
                />
              )}
          </div>
        </div>
      )}

      {view === 'detail' && selectedSignal && (
        <div
          className={`flex-1 transition-opacity duration-200 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <SignalDetailView
            signal={selectedSignal}
            cluster={selectedCluster}
            relatedSignals={relatedSignals}
            onBack={handleBack}
            onSelectSignal={handleSelectRelatedSignal}
          />
        </div>
      )}
    </div>
  );
}
