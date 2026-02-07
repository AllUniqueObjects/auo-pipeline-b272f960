import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataPoint {
  label: string;
  value: string;
}

interface Source {
  title: string;
  url: string;
}

interface SignalDetail {
  id: string;
  category: 'competitive' | 'market' | 'technology' | 'supply_chain' | 'policy' | 'commercial' | 'brand';
  title: string;
  summary: string;
  body: string;
  reasoning: string;
  urgency: 'urgent' | 'emerging' | 'monitor' | 'stable';
  dataPoints: DataPoint[];
  sources: Source[];
  createdAt: string;
}

const categoryColors: Record<SignalDetail['category'], string> = {
  competitive: '#f87171',
  market: '#34d399',
  technology: '#a78bfa',
  supply_chain: '#f5a623',
  policy: '#4a9eff',
  commercial: '#22d3ee',
  brand: '#ec4899',
};

const categoryLabels: Record<SignalDetail['category'], string> = {
  competitive: 'Competitive',
  market: 'Market',
  technology: 'Technology',
  supply_chain: 'Supply Chain',
  policy: 'Policy',
  commercial: 'Commercial',
  brand: 'Brand',
};

const urgencyLabels: Record<SignalDetail['urgency'], string> = {
  urgent: 'Urgent',
  emerging: 'Emerging',
  monitor: 'Monitor',
  stable: 'Stable',
};

const mockSignalDetails: Record<string, SignalDetail> = {
  "1": {
    id: "1",
    category: "competitive",
    title: "Hoka Takes 12% US Running Share — Closing Gap on NB's #3",
    summary: "Hoka's US running market share hit 12%, narrowing the gap with NB from 8pts to 3pts in 18 months.",
    body: `Hoka One One continued its aggressive market share expansion in Q4 2025, capturing 12% of the US running footwear market according to NPD Group data. This represents a 4-point gain year-over-year and marks the brand's fastest growth period since its mainstream breakthrough in 2021.

The brand's success is being driven by strong sell-through in the specialty running channel (where it now leads with 28% share) and expanding distribution in sporting goods retailers. Dick's Sporting Goods increased Hoka floor space by 40% in Q4, and the brand is now the #2 performance running brand at Fleet Feet behind Brooks.

Notably, Hoka's growth is coming at the expense of traditional performance brands rather than lifestyle crossover. The FreshFoam X and FuelCell lines have seen the steepest declines in doors where Hoka has expanded.`,
    reasoning: `This is the most significant competitive threat signal of the quarter. The gap between NB (#3) and Hoka (#4) has narrowed from 8 points to 3 points in just 18 months. At current trajectory, Hoka could overtake NB's #3 position by Q4 2026.

Immediate action required: Accelerate FuelCell v5 launch timeline and increase specialty running channel investment. Consider defensive pricing strategy in the $150-180 segment where Hoka is strongest.`,
    urgency: "urgent",
    dataPoints: [
      { label: "Hoka Share", value: "12%" },
      { label: "Gap to NB", value: "3pts" },
      { label: "YoY Growth", value: "+4pts" },
      { label: "Specialty Share", value: "28%" },
    ],
    sources: [
      { title: "NPD Q4 2025 Running Footwear Report", url: "https://example.com/npd-report" },
      { title: "Deckers Brands Q4 Earnings Call Transcript", url: "https://example.com/deckers-earnings" },
      { title: "Running Insight: Specialty Channel Analysis", url: "https://example.com/running-insight" },
      { title: "Dick's Sporting Goods Investor Presentation", url: "https://example.com/dicks-presentation" },
    ],
    createdAt: "2026-02-07"
  },
  "2": {
    id: "2",
    category: "policy",
    title: "USTR Signals 5% Tariff Increase on Vietnamese Footwear",
    summary: "Draft proposal would raise Section 301 tariffs on Vietnam-origin footwear from 20% to 25% by Q3 2026.",
    body: `The Office of the United States Trade Representative (USTR) released a draft proposal on February 5th signaling potential increases to Section 301 tariffs on Vietnamese-origin footwear. The proposal targets athletic and performance footwear categories specifically, with implementation expected in Q3 2026.

The increase from 20% to 25% would affect an estimated $4.2B in annual footwear imports. Industry groups including the Footwear Distributors and Retailers of America (FDRA) have already begun mobilizing opposition, citing potential consumer price increases of 8-12% on affected products.

Vietnam currently accounts for approximately 35% of US footwear imports by value, making it the second-largest source country after China. The proposal appears to be part of broader trade rebalancing efforts rather than targeted at specific trade practices.`,
    reasoning: `NB sources approximately 40% of US-destined performance footwear from Vietnam, above the industry average of 35%. This exposure creates both risk and potential competitive advantage depending on response speed.

Recommended actions: (1) Accelerate Indonesia and Cambodia capacity expansion already in progress, (2) Model pricing scenarios for affected SKUs, (3) Engage with FDRA lobbying efforts given NB's US manufacturing credibility.`,
    urgency: "emerging",
    dataPoints: [
      { label: "Current Tariff", value: "20%" },
      { label: "Proposed", value: "25%" },
      { label: "Affected Imports", value: "$4.2B" },
      { label: "Timeline", value: "Q3 2026" },
    ],
    sources: [
      { title: "USTR Draft Proposal FR-2026-0234", url: "https://example.com/ustr-proposal" },
      { title: "FDRA Industry Impact Analysis", url: "https://example.com/fdra-analysis" },
      { title: "Reuters: US-Vietnam Trade Tensions", url: "https://example.com/reuters-vietnam" },
    ],
    createdAt: "2026-02-07"
  },
  "3": {
    id: "3",
    category: "technology",
    title: "BASF Launches Next-Gen PEBA Foam — 15% Lighter Than FuelCell",
    summary: "New Elastopan Sport compound could reshape the super-foam race. Available for sampling Q2 2026.",
    body: `BASF announced the commercial availability of Elastopan Sport NRG, a next-generation PEBA-based foam compound that achieves 15% weight reduction compared to current market-leading midsole foams while maintaining equivalent energy return properties.

The compound was developed in partnership with a major athletic footwear brand (unannounced) and has completed 18 months of wear-testing. Key specifications include 85% energy return (vs. industry standard 80%), density of 0.09 g/cm³, and improved durability over 500km of wear.

BASF is offering sampling to qualified footwear manufacturers beginning Q2 2026, with full commercial availability expected Q4 2026. Minimum order quantities and pricing have not been disclosed but are expected to carry a 20-30% premium over standard EVA compounds.`,
    reasoning: `This represents a potential generational leap in midsole technology. If BASF's claims hold, the current FuelCell compound would be at a measurable disadvantage within 18 months.

Recommendation: Request immediate access to sampling program. Evaluate for FuelCell v6 development timeline (currently scheduled 2027). Consider whether to accelerate v6 or wait for competitive response data.`,
    urgency: "emerging",
    dataPoints: [
      { label: "Weight Reduction", value: "15%" },
      { label: "Energy Return", value: "85%" },
      { label: "Density", value: "0.09 g/cm³" },
      { label: "Available", value: "Q2 2026" },
    ],
    sources: [
      { title: "BASF Performance Materials Press Release", url: "https://example.com/basf-release" },
      { title: "Plastics Today: PEBA Innovations", url: "https://example.com/plastics-today" },
    ],
    createdAt: "2026-02-06"
  },
  "4": {
    id: "4",
    category: "market",
    title: "Gen Z Trail Running Participation Up 34% YoY",
    summary: "SFIA data shows trail running is the fastest-growing outdoor activity among 18-24 demo, outpacing hiking.",
    body: `The Sports & Fitness Industry Association (SFIA) 2025 Participation Report reveals trail running as the fastest-growing outdoor activity among Gen Z consumers (ages 18-24), with participation up 34% year-over-year. This outpaces hiking (+12%), camping (+8%), and road running (+3%) in the same demographic.

The growth is concentrated in urban and suburban areas with accessible trail systems, suggesting this is not purely a pandemic-era outdoor trend but reflects genuine preference shifts. Social media influence appears significant, with trail running content on TikTok and Instagram growing 280% in engagement over the past year.

Importantly, Gen Z trail runners show different purchase patterns than older demographics: higher willingness to pay for technical features, stronger brand loyalty once established, and preference for brands with authentic outdoor credibility.`,
    reasoning: `NB's trail running portfolio is currently underweight relative to this opportunity. The Hierro line has strong performance credentials but limited Gen Z awareness. Fresh Foam X Trail is better positioned but faces stiff competition from Salomon and Hoka Speedgoat.

Opportunity: Develop Gen Z-targeted trail campaign leveraging authentic athlete partnerships. Consider limited-edition collaborations with outdoor/adventure content creators rather than traditional athletes.`,
    urgency: "monitor",
    dataPoints: [
      { label: "YoY Growth", value: "+34%" },
      { label: "Demo", value: "18-24" },
      { label: "Social Growth", value: "+280%" },
    ],
    sources: [
      { title: "SFIA 2025 Participation Report", url: "https://example.com/sfia-report" },
      { title: "Outdoor Industry Association Trends Brief", url: "https://example.com/oia-trends" },
    ],
    createdAt: "2026-02-05"
  }
};

export default function SignalDetail() {
  const { id } = useParams();
  const signal = id ? mockSignalDetails[id] : null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (!signal) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="content-wrapper py-6">
            <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
              <Link to="/signals">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to signals
              </Link>
            </Button>
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">Signal not found.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="content-wrapper py-6">
          {/* Back button */}
          <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
            <Link to="/signals">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to signals
            </Link>
          </Button>

          {/* Category + Urgency badges */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium"
              style={{ 
                backgroundColor: `${categoryColors[signal.category]}20`,
                color: categoryColors[signal.category]
              }}
            >
              {categoryLabels[signal.category]}
            </span>
            {signal.urgency !== 'stable' && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  backgroundColor: signal.urgency === 'urgent' ? 'rgba(239, 68, 68, 0.15)' :
                                   signal.urgency === 'emerging' ? 'rgba(245, 158, 11, 0.15)' :
                                   'rgba(156, 163, 175, 0.15)',
                  color: signal.urgency === 'urgent' ? '#ef4444' :
                         signal.urgency === 'emerging' ? '#f59e0b' :
                         '#9ca3af'
                }}
              >
                {signal.urgency === 'urgent' && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                )}
                {signal.urgency === 'emerging' && (
                  <span className="inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                )}
                {signal.urgency === 'monitor' && (
                  <span className="inline-flex rounded-full h-1.5 w-1.5 bg-gray-400" />
                )}
                {urgencyLabels[signal.urgency]}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-[24px] font-bold text-foreground mb-3 leading-tight">
            {signal.title}
          </h1>

          {/* Summary */}
          <p className="text-[16px] text-muted-foreground mb-8 leading-relaxed">
            {signal.summary}
          </p>

          {/* Analysis / Body */}
          <section className="mb-8">
            <h2 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
              Analysis
            </h2>
            <div className="text-[14px] text-foreground leading-relaxed space-y-4">
              {signal.body.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* Reasoning - Highlighted box */}
          <section className="mb-8">
            <h2 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
              Why This Matters for NB
            </h2>
            <div 
              className="rounded-lg p-4 border"
              style={{
                backgroundColor: 'rgba(74, 158, 255, 0.05)',
                borderColor: 'rgba(74, 158, 255, 0.25)'
              }}
            >
              <div className="text-[14px] text-foreground leading-relaxed space-y-4">
                {signal.reasoning.split('\n\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>

          {/* Data Points */}
          {signal.dataPoints.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
                Key Data
              </h2>
              <div className="flex flex-wrap gap-2">
                {signal.dataPoints.map((dp, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-[13px]"
                  >
                    <span className="text-muted-foreground">{dp.label}:</span>
                    <span className="font-medium text-foreground">{dp.value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Sources */}
          {signal.sources.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
                Sources
              </h2>
              <ul className="space-y-2">
                {signal.sources.map((source, index) => (
                  <li key={index}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] text-primary hover:underline"
                    >
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Created date */}
          <div className="pt-6 border-t border-border">
            <p className="text-[12px] text-muted-foreground/60">
              Created {formatDate(signal.createdAt)}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
