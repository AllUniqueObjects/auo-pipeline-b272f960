// Insight card for the Briefing screen
import type { ClusterWithColor, Signal } from '@/hooks/useSignalGraphData';

export interface InsightData {
  id: string;
  cluster: ClusterWithColor;
  title: string;
  description: string;
  signals: Signal[];
  urgentCount: number;
  color: string;
}

interface InsightCardProps {
  insight: InsightData;
  onClick: () => void;
}

export function InsightCard({ insight, onClick }: InsightCardProps) {
  const urgencyLabel = insight.urgentCount > 0 ? 'urgent' : 'emerging';
  const signalCount = insight.signals.length;

  return (
    <div
      onClick={onClick}
      className="mb-3 rounded-[14px] cursor-pointer transition-all duration-200"
      style={{
        padding: '24px',
        background: 'rgba(255,255,255,0.02)',
        borderLeft: `3px solid ${insight.color}44`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.borderLeftColor = insight.color + '88';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
        e.currentTarget.style.borderLeftColor = insight.color + '44';
      }}
    >
      {/* Top row: urgency + count */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: insight.color, opacity: 0.7 }}
        />
        <span
          className="text-[10px] tracking-[0.06em] uppercase"
          style={{ fontWeight: 500, color: '#7a7a90' }}
        >
          {urgencyLabel} · {signalCount} signal{signalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Title */}
      <h3
        className="text-[16px] leading-[1.4] mb-3"
        style={{ fontWeight: 400, color: '#e8e8ed' }}
      >
        {insight.title}
      </h3>

      {/* Description */}
      <p
        className="text-[14px] leading-[1.7]"
        style={{ fontWeight: 300, color: '#9898a8' }}
      >
        {insight.description}
      </p>

      {/* CTA */}
      <div
        className="mt-4 text-[11px]"
        style={{ fontWeight: 500, color: insight.color, opacity: 0.6 }}
      >
        See how these connect →
      </div>
    </div>
  );
}
