// Briefing screen – light theme with cluster filters, temporal grouping, chat input
import { useState, useMemo } from 'react';
import { InsightCard, type InsightData } from './InsightCard';
import { Send } from 'lucide-react';

interface BriefingViewProps {
  insights: InsightData[];
  totalSignals: number;
  totalEdges: number;
  urgentCount: number;
  userName?: string;
  onSelectInsight: (insight: InsightData) => void;
  onShowFullGraph: () => void;
}

function getTimeBucket(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date >= today) return 'EARLIER TODAY';
  if (date >= yesterday) return 'YESTERDAY';
  return 'THIS WEEK';
}

const BUCKET_ORDER = ['EARLIER TODAY', 'YESTERDAY', 'THIS WEEK'];

export function BriefingView({
  insights,
  totalSignals,
  totalEdges,
  urgentCount,
  onSelectInsight,
  onShowFullGraph,
}: BriefingViewProps) {
  const [activeTab, setActiveTab] = useState<'briefing' | 'radar'>('briefing');
  const [activeCluster, setActiveCluster] = useState<string | null>(null);

  // Unique clusters for filter chips
  const clusterChips = useMemo(() => {
    const seen = new Map<string, { name: string; color: string; count: number }>();
    insights.forEach((i) => {
      const key = i.cluster.id;
      if (!seen.has(key)) {
        seen.set(key, { name: i.cluster.name, color: i.color, count: i.signals.length });
      }
    });
    return Array.from(seen.entries()).map(([id, data]) => ({ id, ...data }));
  }, [insights]);

  // Filter insights
  const filtered = useMemo(() => {
    if (!activeCluster) return insights;
    return insights.filter((i) => i.cluster.id === activeCluster);
  }, [insights, activeCluster]);

  // Group by time bucket
  const grouped = useMemo(() => {
    const groups = new Map<string, InsightData[]>();
    filtered.forEach((i) => {
      const bucket = i.createdAt ? getTimeBucket(i.createdAt) : 'THIS WEEK';
      if (!groups.has(bucket)) groups.set(bucket, []);
      groups.get(bucket)!.push(i);
    });
    // Sort buckets
    return BUCKET_ORDER
      .filter((b) => groups.has(b))
      .map((b) => ({ bucket: b, items: groups.get(b)! }));
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav bar */}
      <div className="border-b border-border">
        <div className="max-w-[680px] mx-auto px-6 flex items-center justify-between h-14">
          <span className="text-[13px] tracking-[0.15em] font-medium text-muted-foreground">
            AUO
          </span>
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('briefing')}
              className={`text-[13px] font-medium pb-0.5 transition-colors ${
                activeTab === 'briefing'
                  ? 'text-foreground border-b-2 border-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Briefing
            </button>
            <button
              onClick={() => setActiveTab('radar')}
              className={`text-[13px] font-medium pb-0.5 transition-colors ${
                activeTab === 'radar'
                  ? 'text-foreground border-b-2 border-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Radar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[680px] mx-auto px-6 pt-6 pb-28">
        {/* Cluster filter chips */}
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => setActiveCluster(null)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
              activeCluster === null
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-muted-foreground border-border hover:border-ring/40'
            }`}
          >
            All
            <span className="text-[11px] opacity-70">{totalSignals}</span>
          </button>
          {clusterChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveCluster(activeCluster === chip.id ? null : chip.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                activeCluster === chip.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border hover:border-ring/40'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: chip.color }}
              />
              {chip.name}
              <span className="text-[11px] opacity-70">{chip.count}</span>
            </button>
          ))}
        </div>

        {/* Temporal groups */}
        {grouped.map((group) => (
          <div key={group.bucket} className="mb-6">
            <div className="text-[10px] tracking-[0.1em] font-medium text-muted-foreground mb-3">
              {group.bucket}
            </div>
            {group.items.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onClick={() => onSelectInsight(insight)}
              />
            ))}
          </div>
        ))}

        {/* Full graph link */}
        <div
          onClick={onShowFullGraph}
          className="mt-4 rounded-xl cursor-pointer text-center py-4 bg-card border border-border transition-colors hover:border-ring/30"
        >
          <span className="text-[13px] font-normal text-muted-foreground">
            See all {totalSignals} signals →
          </span>
        </div>
      </div>

      {/* Chat input bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="max-w-[680px] mx-auto px-6 py-3">
          <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2.5">
            <input
              type="text"
              placeholder="Ask AUO anything..."
              className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
              readOnly
            />
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
