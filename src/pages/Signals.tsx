import { Header } from '@/components/Header';
import { SignalCard } from '@/components/SignalCard';
import { Radio } from 'lucide-react';
import { useSignals } from '@/hooks/useSignals';
import { Skeleton } from '@/components/ui/skeleton';

export default function Signals() {
  const { signals, loading, error } = useSignals();

  const formatSignalForCard = (signal: typeof signals[0]) => ({
    id: signal.id,
    category: signal.category as 'competitive' | 'market' | 'technology' | 'supply_chain' | 'policy' | 'commercial' | 'brand',
    title: signal.title,
    summary: signal.summary,
    urgency: (signal.urgency || 'stable') as 'urgent' | 'emerging' | 'monitor' | 'stable',
    sourceCount: signal.source_ids?.length || 0,
    createdAt: signal.created_at || new Date().toISOString(),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-6">
        <div className="content-wrapper">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-[10px] border border-border bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-3" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-destructive text-sm">Failed to load signals. Please try again.</p>
            </div>
          ) : signals.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary mb-4">
                <Radio className="w-5 h-5 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-medium mb-2">No signals yet</h2>
              <p className="text-muted-foreground text-sm max-w-[280px] mx-auto">
                Your daily intelligence briefing will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {signals.map((signal) => (
                <SignalCard key={signal.id} signal={formatSignalForCard(signal)} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
