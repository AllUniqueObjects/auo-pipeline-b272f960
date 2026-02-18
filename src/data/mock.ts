export interface MockInsight {
  id: string;
  projectId: string;
  title: string;
  tier: 'breaking' | 'developing' | 'established';
  category: string;
  decision_question: string;
  user_relevance: string;
  signal_count: number;
  evidence_count: number;
  tier_reasoning: string;
  convergence_reasoning?: string;
  signal_ids?: string[];
  momentum?: string;
}

export interface MockSourceUrl {
  title: string;
  url: string;
  domain: string;
}

export interface MockSignal {
  id: string;
  title: string;
  sources: number;
  credibility: number;
  created_at: string;
  analysis_context: string;
  nb_relevance: string;
  source_urls: MockSourceUrl[];
}

export interface MockPosition {
  id: string;
  insightId: string;
  insightIds: string[];
  title: string;
  status: 'draft' | 'shared';
  createdAt: string;
}

export interface PositionSignal {
  id: string;
  insight_id: string;
  title: string;
  summary: string;
  analysis_context: string[];
  credibility: number;
  sources: number;
  source_url: string;
  source: 'ambient' | 'on_demand';
  comment_count: number;
  created_at: string;
}

export interface PositionData {
  id: string;
  title: string;
  tier: 'breaking' | 'developing' | 'established';
  created_at: string;
  davids_take: string;
  insights_referenced: { id: string; title: string; tier: string }[];
  signals: PositionSignal[];
  sections: { id: string; title: string; content: string }[];
  collaborators: { id: string; name: string; initials: string; color: string }[];
}

export interface MockEvidenceRef {
  number: string;
  signal_excerpt: string;
}

export interface MockChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  signalCard?: {
    title: string;
    category: string;
    tier: 'breaking' | 'developing' | 'established';
    credibility: number;
    sources: number;
  };
  showDecisionReflection?: boolean;
  showBuildButton?: boolean;
  isContextGap?: boolean;
}

export const MOCK_INSIGHTS: MockInsight[] = [
  {
    id: '1',
    projectId: 'p1',
    title: 'Supreme Court Tariff Ruling Forces Maine Expansion Decision Before FW26 BOM Lock',
    tier: 'breaking',
    category: 'VIETNAM MANUFACTURING SQUEEZE',
    decision_question: 'Should NB lock Vietnam FOB contracts at $18.40/pair by March 2025 and accept 7-8% inflation risk, or wait for Q2 Supreme Court clarity and risk 20-25% tariff pushing landed costs to $22-23/pair?',
    user_relevance: 'Your FW26 BOM lock deadline precedes tariff clarity by 8-12 weeks',
    signal_count: 5,
    evidence_count: 5,
    tier_reasoning: 'Vietnam tariff response and FW26 BOM finalization are both active priorities. The Supreme Court ruling timeline creates a forced decision window.',
    convergence_reasoning: 'Three independent forces — tariff policy uncertainty, Vietnam labor inflation, and Maine expansion capacity — converge on the same 60-day decision window for FW26 BOM lock.',
    signal_ids: ['scan-001', 'scan-002', 'scan-003', 'scan-004'],
    momentum: '↑ Breaking since yesterday',
  },
  {
    id: '2',
    projectId: 'p1',
    title: 'Foot Locker Leadership Vacuum Opens 60-Day 880 v15 Shelf Lock Window',
    tier: 'breaking',
    category: 'RETAIL SHELF COMPETITION',
    decision_question: "Should 880 v15 lock Dick's-Foot Locker placement commitments within 60 days during leadership churn, or wait for Nike wholesale flood clarity?",
    user_relevance: 'Your 880 v15 shelf lock window closes before March vendor reviews',
    signal_count: 5,
    evidence_count: 5,
    tier_reasoning: 'March vendor review prep is happening now. The 60-90 day window to lock shelf commitments is an immediate action trigger.',
    convergence_reasoning: "Dick's-Foot Locker consolidation creates unprecedented buyer concentration. Leadership turnover opens a negotiation window that closes with March vendor reviews.",
    signal_ids: ['scan-001', 'scan-002'],
  },
  {
    id: '3',
    projectId: 'p1',
    title: 'Consumer Price Resistance Hits Before Tariffs Land; 880 v15 Faces Dual-Compression',
    tier: 'breaking',
    category: 'RETAIL SHELF COMPETITION',
    decision_question: 'Should 880 v15 retail at $150 and absorb 3-5% margin hit, or push $165 and risk 12-18% volume loss?',
    user_relevance: 'Your 880 v15 pricing decision locks in 60 days — before tariff clarity arrives',
    signal_count: 5,
    evidence_count: 8,
    tier_reasoning: 'The 880 v15 is in FW26 BOM lock. Pricing decision must be made before tariff impact is known.',
    signal_ids: ['scan-002', 'scan-003'],
  },
  {
    id: '4',
    projectId: 'p2',
    title: 'Vietnam FOB Inflation Plus Tariff Risk Compresses 880 v15 Margin by 8-12 Points',
    tier: 'developing',
    category: 'VIETNAM MANUFACTURING SQUEEZE',
    decision_question: 'Should NB accelerate Maine expansion timeline to lock skilled labor, or delay to assess Supreme Court tariff ruling impact?',
    user_relevance: 'Your Maine expansion locks competitive advantage before labor runs out',
    signal_count: 5,
    evidence_count: 6,
    tier_reasoning: 'Directly intersects Vietnam tariff response, FW26 BOM, and Maine facility expansion priorities.',
    signal_ids: ['scan-003', 'scan-004'],
  },
  {
    id: '5',
    projectId: 'p3',
    title: "On's Automation Cost Edge Collides with CloudMonster Quality Crisis",
    tier: 'developing',
    category: 'COMPETITIVE TECHNOLOGY',
    decision_question: "Should NB lead Dick's negotiations with defect rate differentiation, or match On's automation cost structure?",
    user_relevance: "Your 880 v15 shelf position gains leverage from On's quality failure",
    signal_count: 4,
    evidence_count: 4,
    tier_reasoning: "On's quality failures validate Maine facility expansion ROI that David is stewarding.",
    signal_ids: ['scan-001'],
  },
  {
    id: '6',
    projectId: 'p2',
    title: 'Brooks $1B Ghost 16 Milestone Resets Neutral Cushion Shelf Hierarchy',
    tier: 'developing',
    category: 'RETAIL SHELF COMPETITION',
    decision_question: 'Should 880 v15 defend $150 premium with FuelCell messaging, or drop to $140 to match Ghost 16?',
    user_relevance: "Your 880 v15 faces $10 premium defense during Dick's shelf resets",
    signal_count: 5,
    evidence_count: 6,
    tier_reasoning: 'Five-way competition at $140-160 directly threatens planogram commitments for March vendor review.',
    signal_ids: ['scan-001', 'scan-002'],
  },
  {
    id: '7',
    projectId: 'p3',
    title: "Anta's $1.8B Puma Investment Creates 574-Line Threat in 6-9 Month Window",
    tier: 'developing',
    category: 'COMPETITIVE TECHNOLOGY',
    decision_question: "Should NB lock Dick's shelf allocation for 574 during Puma's ownership distraction window?",
    user_relevance: 'Your 574 line faces funded lifestyle competition in 6-9 months',
    signal_count: 5,
    evidence_count: 6,
    tier_reasoning: 'Monitoring Puma lifestyle threat to 574 is an explicit priority. Anta capital converts Puma from nuisance to funded adversary.',
    signal_ids: ['scan-001'],
  },
  {
    id: '8',
    projectId: 'p3',
    title: 'ASICS-Saucony Copy NB Collaboration Playbook at 990v6 Price Band',
    tier: 'established',
    category: 'COMPETITIVE TECHNOLOGY',
    decision_question: 'Should NB defend 990v6 with quality differentiation, or accelerate collaboration cadence?',
    user_relevance: 'Your collaboration strategy is now being copied by ASICS and Saucony',
    signal_count: 5,
    evidence_count: 5,
    tier_reasoning: 'Known competitive dynamic. Collaboration arms race has been building for multiple seasons.',
    signal_ids: ['scan-001', 'scan-002'],
  },
  {
    id: '9',
    projectId: 'p2',
    title: 'Salomon and Arc\'teryx Squeeze 574/990 Lifestyle Positioning',
    tier: 'established',
    category: 'COMPETITIVE TECHNOLOGY',
    decision_question: 'Should NB develop a technical outdoor lifestyle line, or defend heritage positioning?',
    user_relevance: 'Your 574/990 lines now compete against Salomon and Jordan for same shelf space',
    signal_count: 4,
    evidence_count: 0,
    tier_reasoning: 'Widely covered trend building for 12+ months. No novel timing trigger.',
    signal_ids: ['scan-001'],
  },
];

export const MOCK_SIGNALS: MockSignal[] = [
  {
    id: 'scan-001',
    title: "Footwear Retail Expansion: Dick's Integrates Foot Locker; JD Sports Opens Canadian Flagship",
    sources: 1,
    credibility: 1.0,
    created_at: '2026-02-12T00:00:00Z',
    analysis_context: "Dick's integrating Foot Locker operations creates 2,200+ door consolidated buyer — single largest wholesale partner now has internal SKU allocation pressure",
    nb_relevance: "Nike's supply chain failures create immediate shelf availability advantage for NB's 880 v15 FW26 launch",
    source_urls: [
      { title: "Dick's Sporting Goods Completes Foot Locker Acquisition", url: 'https://example.com/dicks-fl', domain: 'wsj.com' },
      { title: 'JD Sports Canadian Flagship Opening Analysis', url: 'https://example.com/jd-canada', domain: 'retaildive.com' },
    ],
  },
  {
    id: 'scan-002',
    title: "Nike Expands Wholesale Channel Strategy; Amazon Return and JD Sports Partnership Signal Retail Rebalancing",
    sources: 1,
    credibility: 0.67,
    created_at: '2026-02-12T00:00:00Z',
    analysis_context: "Nike's Amazon return + JD Sports expansion = 12-18% wholesale SKU count increase by Q2 2025",
    nb_relevance: "Direct threat to 880/1080 shelf placement at Dick's, Foot Locker in $140-160 neutral cushion segment",
    source_urls: [
      { title: 'Nike Returns to Amazon Marketplace', url: 'https://example.com/nike-amazon', domain: 'bloomberg.com' },
      { title: 'Nike Wholesale Strategy Shift Q1 2026', url: 'https://example.com/nike-wholesale', domain: 'footwearnews.com' },
    ],
  },
  {
    id: 'scan-003',
    title: 'US Tariff Policy Creates 2026 Overhang for Footwear Supply Chain; Supreme Court Ruling Awaited',
    sources: 57,
    credibility: 0.85,
    created_at: '2026-02-13T00:00:00Z',
    analysis_context: "Current Vietnam FOB $18.40 may jump 20-25% if tariffs land. NB's 30% Vietnam exposure vs Nike's 51%.",
    nb_relevance: 'FW26 BOM lock decision window closes before tariff clarity arrives',
    source_urls: [
      { title: 'Supreme Court Docket: Trade Policy Review', url: 'https://example.com/scotus', domain: 'supremecourt.gov' },
      { title: 'Vietnam FOB Price Index Q1 2026', url: 'https://example.com/fob-index', domain: 'reuters.com' },
      { title: 'Footwear Tariff Impact Analysis', url: 'https://example.com/tariff', domain: 'tradegov.com' },
    ],
  },
  {
    id: 'scan-004',
    title: 'Climate Disruption Accelerates Southeast Asia Manufacturing Risk; Vietnam Labor Costs Rising',
    sources: 23,
    credibility: 0.72,
    created_at: '2026-02-14T00:00:00Z',
    analysis_context: 'Vietnam labor wages rising 7-8% annually. Domestic expansion ($8-12M, 18-month build) reaches 35-40% capacity by FW27.',
    nb_relevance: 'Maine expansion becomes competitive moat as competitors face reshoring cost barriers',
    source_urls: [
      { title: 'Vietnam Manufacturing Wage Report 2026', url: 'https://example.com/vietnam-wages', domain: 'ilo.org' },
      { title: 'Southeast Asia Climate Risk to Supply Chains', url: 'https://example.com/climate-sea', domain: 'mckinsey.com' },
    ],
  },
];

export const MOCK_POSITIONS: MockPosition[] = [
  { id: 'pos-1', insightId: '1', insightIds: ['1'], title: 'Vietnam FOB Lock', status: 'draft', createdAt: '2026-02-15T10:00:00Z' },
  { id: 'pos-2', insightId: '2', insightIds: ['2'], title: '880 v15 Shelf Lock', status: 'shared', createdAt: '2026-02-14T14:30:00Z' },
  { id: 'pos-3', insightId: '3', insightIds: ['3'], title: '880 v15 Pricing at $150', status: 'draft', createdAt: '2026-02-13T09:00:00Z' },
];

// AUO insight recommendations: for each insight, related insights to suggest
export const INSIGHT_RECOMMENDATIONS: Record<string, string[]> = {
  '1': ['4', '3'],
  '2': ['6', '5'],
  '3': ['1', '6'],
  '4': ['1'],
  '5': ['2', '7'],
  '6': ['3', '2'],
  '7': ['5'],
  '8': ['9'],
  '9': ['8'],
};

// Proactive briefings: AUO sends these immediately when insights are selected
export const PROACTIVE_BRIEFINGS: Record<string, string> = {
  '1': `A few things worth knowing here...

Vietnam FOB is sitting at $18.40, but that number hides two converging pressures: labor inflation running 7-8% annually AND a Supreme Court tariff ruling that lands 8-12 weeks after your BOM lock deadline.

The timing mismatch is the real issue — you're deciding blind.

There's also a margin compression angle I'm tracking that connects to this:

__INSIGHT_RECS__4,3

Want me to pull those threads together?`,

  '2': `Worth flagging what's converging here...

Foot Locker's leadership vacuum isn't just organizational noise — it's a negotiation window. New buyers take 60-90 days to establish vendor relationships, and March vendor reviews are when planograms reset.

Meanwhile, Nike's wholesale flood is about to hit the same shelves you're targeting for 880 v15. The question isn't whether to lock placement — it's whether you can lock it before the window closes.

I see a shelf hierarchy angle that connects:

__INSIGHT_RECS__6,5

Should I map how these interact?`,

  '3': `Here's what's tricky about this one...

Consumer price resistance is hitting *before* tariff clarity arrives. That means your $150 vs $165 decision has to be made without knowing your actual cost basis for FW26.

The dual-compression: upstream costs are rising (Vietnam FOB + potential tariffs), but downstream you're hitting price ceilings. FuelCell differentiation is the only lever that doesn't involve eating margin.

Related threads I'm watching:

__INSIGHT_RECS__1,6

Want me to run the margin math both ways?`,

  '1,4': `Interesting combination. Here's what connects these two:

Vietnam FOB lock at $18.40 + the margin compression story are two sides of the same squeeze. If tariffs land at 20%+, you're looking at 8-12 points of margin erosion unless Maine expansion accelerates.

The hedge: lock FOB now AND pull Maine timeline forward. One without the other leaves a gap.

Three data points that matter:
- Vietnam labor wages rising 7-8% annually — this is structural, not cyclical
- Maine expansion reaches 35-40% capacity by FW27 — but only if timeline accelerates now
- Supreme Court ruling 8-12 weeks after your BOM deadline — you can't wait

I also see a thread to pricing:

__INSIGHT_RECS__3

This is becoming a dual-track hedge story.`,

  '1,3': `These two are more connected than they look...

Upstream cost risk (Vietnam FOB + tariffs) flows directly into the consumer price defense question. If you lock FOB at $18.40 and tariffs land at 20%, your landed cost jumps to $22-23. That makes $150 retail extremely tight on margin.

But here's the counterpoint: if you push to $165, you lose 12-18% volume in a segment where Brooks Ghost 16 just reset expectations at $140.

The play might be: lock FOB (protect the floor), hold $150 (protect volume), and let FuelCell messaging do the margin work.

One more thread worth pulling in:

__INSIGHT_RECS__4

The margin math changes if Maine accelerates.`,

  '2,6': `Two shelf threats converging at once...

Foot Locker leadership churn opens a negotiation window, but Brooks hitting $1B with Ghost 16 resets what "default neutral cushion" means on the shelf. Your 880 v15 at $150 is now $10 above the category anchor.

The window: lock Dick's placement during churn AND lead with FuelCell differentiation to justify the $10 premium. If you wait for both to settle, you lose leverage on placement AND price positioning.

Worth considering the competitive tech angle:

__INSIGHT_RECS__5

On's quality issues might be your strongest argument for shelf priority.`,
};

export interface PositionSection {
  label: string;
  content: string;
  items?: string[];
}

export interface FluidPositionBrief {
  title: string;
  sections: PositionSection[];
  basedOn?: string[];
}

// Fluid position briefs — single insight (lean)
export const MOCK_POSITION_BRIEFS: Record<string, FluidPositionBrief> = {
  '1': {
    title: 'Vietnam FOB Lock',
    sections: [
      { label: 'Call', content: 'Lock at $18.40/pair before BOM deadline' },
      { label: 'Why this matters', content: 'Asymmetric tariff risk too high to wait — BOM lock closes 8-12 weeks before Supreme Court clarity. You\'re paying inflation-adjusted fair price regardless.' },
      { label: 'Key assumptions', content: '', items: ['Tariffs land at 20%+', 'Maine not ready for FW26 volume', 'Supreme Court ruling comes after BOM lock'] },
    ],
  },
  '2': {
    title: '880 v15 Shelf Lock',
    sections: [
      { label: 'Recommendation', content: "Lock Dick's-Foot Locker placement within 60 days during leadership churn" },
      { label: 'Context', content: 'New buyers take 60-90 days to establish vendor relationships. March vendor reviews reset planograms. Nike wholesale flood hits Q2.' },
      { label: 'Dependencies', content: '', items: ['Foot Locker leadership churn persists through March', 'Nike wholesale flood hits Q2 not Q1', "Dick's consolidation favors existing NB relationship"] },
      { label: 'Timeline', content: '60-day window closes with March vendor reviews' },
    ],
  },
  '3': {
    title: '880 v15 Pricing Hold',
    sections: [
      { label: 'Position', content: 'Hold at $150 with FuelCell differentiation messaging' },
      { label: 'Trade-off', content: '$165 risks 12-18% volume loss in a segment where Ghost 16 reset expectations at $140. $150 absorbs 3-5% margin but holds volume and shelf position.' },
      { label: 'What changes this', content: '', items: ['Tariff clarity arrives before BOM lock', 'Ghost 16 momentum stalls', 'FuelCell testing data strengthens premium justification'] },
    ],
  },
};

// Fluid position briefs — multi-insight synthesis (rich)
export const MULTI_POSITION_BRIEFS: Record<string, FluidPositionBrief> = {
  '1,4': {
    title: 'Vietnam Supply Chain Lock',
    sections: [
      { label: 'Strategic call', content: 'Lock FOB at $18.40 + accelerate Maine expansion timeline' },
      { label: 'What connects these', content: 'Double compression from tariff risk and Vietnam labor inflation demands immediate dual-track hedge. One without the other leaves a gap.' },
      { label: 'What must be true', content: '', items: ['Tariffs land at 20%+', 'Maine reaches 35-40% capacity by FW27', 'Vietnam labor inflation holds at 7-8% annually'] },
      { label: 'Evidence', content: '', items: ['Vietnam FOB at $18.40 may jump 20-25% if tariffs land', 'Labor wages rising 7-8% annually — structural, not cyclical', 'Maine $8-12M investment, 18-month build timeline'] },
      { label: 'Risk if wrong', content: 'Overpay 7-8% vs spot — but that\'s inflation-adjusted fair price regardless of tariff outcome' },
      { label: 'Decision window', content: '8-12 weeks before Supreme Court ruling; BOM lock precedes clarity' },
    ],
  },
  '1,3': {
    title: 'Vietnam FOB + Pricing Hedge',
    sections: [
      { label: 'Combined position', content: 'Lock FOB at $18.40 and hold 880 v15 at $150 with FuelCell messaging' },
      { label: 'Margin math', content: 'If tariffs land at 20%, landed cost jumps to $22-23. At $150 retail that\'s tight. But $165 loses 12-18% volume. FuelCell differentiation is the only lever that doesn\'t eat margin or volume.' },
      { label: 'Assumptions', content: '', items: ['Tariffs land at 20%+', 'Consumer price resistance peaks pre-tariff', 'FuelCell differentiates at $150 vs Ghost 16 at $140'] },
      { label: 'Open questions', content: '', items: ['Can Maine timeline accelerate to improve FW27 cost basis?', 'What\'s the floor if tariffs don\'t land?', 'Does FuelCell testing data support premium messaging?'] },
    ],
  },
  '2,6': {
    title: 'Shelf Defense Strategy',
    sections: [
      { label: 'Shelf strategy', content: "Lock Dick's placement for 880 v15 + counter Brooks Ghost 16 with FuelCell differentiation" },
      { label: 'Competitive context', content: "Leadership vacuum + Brooks $1B milestone create converging shelf threats. Ghost 16 resets neutral cushion anchor at $140 — your $150 needs justification." },
      { label: 'Action items', content: '', items: ["Lock Dick's placement during leadership churn window", 'Lead negotiations with FuelCell performance data', 'Position against Ghost 16 on technology, not price'] },
      { label: 'Timing', content: '60-day window closes with March vendor reviews. Brooks momentum may plateau but shelf position locks now.' },
    ],
  },
};

export const MOCK_EVIDENCE_REFS: MockEvidenceRef[] = [
  { number: '2,200+ door', signal_excerpt: "Dick's integrating Foot Locker operations creates 2,200+ door consolidated buyer" },
  { number: '60-90 day', signal_excerpt: 'Use 60-90 day Foot Locker leadership uncertainty to negotiate 880 v15 placement guarantees' },
  { number: '$140-160', signal_excerpt: "Dick's neutral cushion wall ($140-160) is battlefield" },
  { number: 'March', signal_excerpt: "March vendor reviews are when Dick's/Foot Locker reset planograms" },
  { number: '12-18 month', signal_excerpt: "Dick's-Foot Locker consolidation creates 12-18 month planogram reset window" },
];

export const MOCK_PROJECTS = [
  { id: 'p1', name: 'NB 880 Pipeline' },
  { id: 'p2', name: 'Q2 Strategy' },
  { id: 'p3', name: 'Competitive Intel' },
];

export const MOCK_CHAT_MESSAGES: MockChatMessage[] = [
  {
    id: 'ctx-1',
    role: 'assistant',
    content: "Morning David. Two things since yesterday — Supreme Court set the April hearing date (confirmed, Reuters), and Nike moved their Vietnam commitment up 3 weeks. Both hit your FOB decision.\n\nFull briefing or just the Vietnam thread?",
  },
  {
    id: 'ctx-2',
    role: 'user',
    content: "Vietnam thread.",
  },
  {
    id: 'ctx-3',
    role: 'assistant',
    content: "April hearing confirmed — Reuters plus two trade sources. Vietnam FOB window to lock at current rates is 4–6 weeks. Nike already moved their commitment up by 3 weeks.",
    signalCard: {
      title: "Vietnam FOB contracts trending $18.40 with 7–8% annual labor inflation",
      category: "Macroeconomics",
      tier: 'breaking',
      credibility: 0.92,
      sources: 3,
    },
  },
  {
    id: 'ctx-4',
    role: 'user',
    content: "How certain is that window?",
  },
  {
    id: 'ctx-5',
    role: 'assistant',
    content: "High confidence. Factory allocation calendars confirmed. March vendor review date is on Foot Locker's procurement calendar from their IR filings.",
  },
  {
    id: 'ctx-6',
    role: 'user',
    content: "Lock it. Vietnam FOB at $18.40. Maine accelerates in parallel.",
  },
  {
    id: 'ctx-7',
    role: 'assistant',
    content: "Makes sense — the BOM timeline doesn't leave room to wait for the Supreme Court ruling.\n\nI'll note you're locking Vietnam FOB at $18.40/pair for FW26, with Maine capacity accelerating in parallel.\n\nWant me to log this?",
    showDecisionReflection: true,
  },
  {
    id: 'ctx-8',
    role: 'user',
    content: "Yes, log it.",
  },
  {
    id: 'ctx-9',
    role: 'assistant',
    content: "Logged. Want me to build a position from this?",
    showBuildButton: true,
  },
  {
    id: 'ctx-10',
    role: 'assistant',
    content: "Which lines are getting the most attention from your team right now, beyond the 880 v15?",
    isContextGap: true,
  },
];
