// Briefing screen - agent-narrated home with insight cards
import { ColorLegend } from './HighlightedText';
import { InsightCard, type InsightData } from './InsightCard';

interface BriefingViewProps {
  insights: InsightData[];
  totalSignals: number;
  totalEdges: number;
  urgentCount: number;
  userName?: string;
  onSelectInsight: (insight: InsightData) => void;
  onShowFullGraph: () => void;
}

export function BriefingView({
  insights,
  totalSignals,
  totalEdges,
  urgentCount,
  userName = 'there',
  onSelectInsight,
  onShowFullGraph,
}: BriefingViewProps) {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const getGreeting = () => {
    const hour = currentDate.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen" style={{ background: '#13131a' }}>
      <div className="max-w-[620px] mx-auto px-8 py-11">
        {/* Header */}
        <div className="flex justify-between items-baseline mb-3">
          <span
            className="text-[13px] tracking-[0.15em]"
            style={{ fontWeight: 500, color: '#6b6b7b' }}
          >
            AUO
          </span>
          <span
            className="text-[11px]"
            style={{ fontWeight: 300, color: '#44444f' }}
          >
            {formattedDate}
          </span>
        </div>

        {/* Conversational greeting */}
        <p
          className="text-[18px] leading-[1.6] mb-4"
          style={{ fontWeight: 400, color: '#e8e8ed' }}
        >
          {getGreeting()}, {userName}.
        </p>

        {/* Summary */}
        <p
          className="text-[15px] leading-[1.7] mb-2.5"
          style={{ fontWeight: 400, color: '#b8b8c8' }}
        >
          I found{' '}
          <span style={{ color: '#e8e8ed' }}>{totalSignals} signals</span> this week
          with{' '}
          <span style={{ color: '#e8e8ed' }}>{totalEdges} connections</span> between
          them. They cluster into{' '}
          <span style={{ color: '#e8e8ed' }}>
            {insights.length} stor{insights.length !== 1 ? 'ies' : 'y'}
          </span>{' '}
          that are all moving at the same time.
        </p>

        {/* Urgency line */}
        <p
          className="text-[13px] leading-[1.6] mb-5"
          style={{ fontWeight: 300, color: '#6b6b7b' }}
        >
          {urgentCount > 0
            ? `${urgentCount} need attention this week. Here's what I'm seeing.`
            : "Here's what I'm seeing."}
        </p>

        {/* Color legend */}
        <div className="mb-7">
          <ColorLegend />
        </div>

        {/* Insight cards */}
        {insights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onClick={() => onSelectInsight(insight)}
          />
        ))}

        {/* Full graph option */}
        <div
          onClick={onShowFullGraph}
          className="mt-8 rounded-[14px] cursor-pointer text-center transition-all duration-200"
          style={{
            padding: '20px 24px',
            background: 'rgba(255,255,255,0.015)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.015)';
          }}
        >
          <span
            className="text-[13px]"
            style={{ fontWeight: 400, color: '#7a7a90' }}
          >
            See all {totalSignals} signals →
          </span>
        </div>

        {/* Footer */}
        <div
          className="mt-12 text-center text-[10px]"
          style={{ fontWeight: 300, color: '#33333d' }}
        >
          Tier 1-2 sources only · Context graph generated from post-meeting analysis
        </div>
      </div>
    </div>
  );
}
