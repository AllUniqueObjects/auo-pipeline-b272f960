// Insight card for the Briefing screen – light theme redesign
import type { ClusterWithColor, Signal } from '@/hooks/useSignalGraphData';

export interface InsightData {
  id: string;
  cluster: ClusterWithColor;
  title: string;
  description: string;
  signals: Signal[];
  urgentCount: number;
  color: string;
  // New fields for redesigned cards
  category?: string;
  decisionQuestion?: string;
  referenceCount?: number;
  createdAt?: Date;
}

const categoryLabels: Record<string, string> = {
  competitive: 'COMPETITIVE INTELLIGENCE',
  market: 'MARKET DYNAMICS',
  technology: 'TECHNOLOGY',
  supply_chain: 'SUPPLY CHAIN',
  policy: 'POLICY & REGULATION',
  commercial: 'COMMERCIAL',
  brand: 'BRAND & CONSUMER',
};

interface InsightCardProps {
  insight: InsightData;
  onClick: () => void;
}

export function InsightCard({ insight, onClick }: InsightCardProps) {
  const signalCount = insight.signals.length;
  const refCount = insight.referenceCount ?? 0;
  const categoryLabel = categoryLabels[insight.category ?? ''] ?? insight.category?.toUpperCase() ?? 'INTELLIGENCE';

  return (
    <div
      onClick={onClick}
      className="mb-3 rounded-xl cursor-pointer transition-all duration-200 bg-card border border-border hover:border-ring/30"
      style={{ padding: '20px 24px' }}
    >
      {/* Top row: category + counts */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[10px] tracking-[0.08em] font-medium"
          style={{ color: insight.color }}
        >
          {categoryLabel}
        </span>
        <span className="text-[11px] text-muted-foreground font-light">
          {signalCount} signal{signalCount !== 1 ? 's' : ''}
          {refCount > 0 && `, ${refCount} refs`}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-[16px] leading-[1.4] font-medium text-foreground mb-2">
        {insight.title}
      </h3>

      {/* Decision question */}
      {insight.decisionQuestion && (
        <p className="text-[14px] leading-[1.6] italic text-muted-foreground mb-2">
          {insight.decisionQuestion}
        </p>
      )}

      {/* Description */}
      <p className="text-[13px] leading-[1.7] font-light text-muted-foreground">
        {insight.description}
      </p>
    </div>
  );
}
