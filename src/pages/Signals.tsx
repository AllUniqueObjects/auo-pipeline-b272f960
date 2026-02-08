import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ClusterPane } from '@/components/signals/ClusterPane';
import { SignalDetailPane } from '@/components/signals/SignalDetailPane';
import { useSignalClusters } from '@/hooks/useSignalClusters';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Signal } from '@/hooks/useSignals';

export default function Signals() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { clusters, standaloneSignals, loading, summary } = useSignalClusters();
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  // Get all signals for keyboard navigation
  const allSignals = [
    ...clusters.flatMap((c) => c.signals),
    ...standaloneSignals,
  ];

  const handleSelectSignal = useCallback(
    (signal: Signal) => {
      if (isMobile) {
        // On mobile, navigate to detail page
        navigate(`/signals/${signal.id}`);
      } else {
        setSelectedSignal(signal);
      }
    },
    [isMobile, navigate]
  );

  // Keyboard navigation
  useEffect(() => {
    if (isMobile || allSignals.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = selectedSignal
          ? allSignals.findIndex((s) => s.id === selectedSignal.id)
          : -1;

        let nextIndex: number;
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex < allSignals.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : allSignals.length - 1;
        }

        setSelectedSignal(allSignals[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, allSignals, selectedSignal]);

  // Auto-select first urgent signal on desktop
  useEffect(() => {
    if (!isMobile && !selectedSignal && allSignals.length > 0) {
      // Find first urgent signal or just first signal
      const urgentSignal = allSignals.find((s) => s.urgency === 'urgent');
      setSelectedSignal(urgentSignal || allSignals[0]);
    }
  }, [isMobile, selectedSignal, allSignals]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex overflow-hidden">
        {isMobile ? (
          // Mobile: Full-width cluster pane only
          <div className="w-full h-full">
            <ClusterPane
              clusters={clusters}
              standaloneSignals={standaloneSignals}
              loading={loading}
              summary={summary}
              selectedSignalId={null}
              onSelectSignal={handleSelectSignal}
            />
          </div>
        ) : (
          // Desktop: Split pane
          <>
            {/* Left pane - 40% */}
            <div className="w-[40%] min-w-[320px] max-w-[480px] h-full border-r border-border/50">
              <ClusterPane
                clusters={clusters}
                standaloneSignals={standaloneSignals}
                loading={loading}
                summary={summary}
                selectedSignalId={selectedSignal?.id || null}
                onSelectSignal={handleSelectSignal}
              />
            </div>
            {/* Right pane - 60% */}
            <div className="flex-1 h-full bg-card">
              <SignalDetailPane signal={selectedSignal} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
