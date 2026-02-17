export interface MockInsight {
  id: string;
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

export interface MockEvidenceRef {
  number: string;
  signal_excerpt: string;
}

export interface MockChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

export const MOCK_INSIGHTS: MockInsight[] = [
  {
    id: '1',
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
  },
  {
    id: '2',
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

// Combined position briefs keyed by sorted insight ID combos
export const MULTI_POSITION_BRIEFS: Record<string, { title: string; call: string; why: string; assumptions: string[] }> = {
  '1,4': {
    title: 'Vietnam Supply Chain Lock',
    call: 'Lock FOB at $18.40 + accelerate Maine expansion timeline',
    why: 'Double compression from tariff risk and Vietnam labor inflation demands immediate dual-track hedge',
    assumptions: ['Tariffs land at 20%+', 'Maine reaches 35-40% capacity by FW27', 'Vietnam labor inflation holds at 7-8%'],
  },
  '1,3': {
    title: 'Vietnam FOB + Pricing Hedge',
    call: 'Lock FOB at $18.40 and hold 880 v15 at $150 with FuelCell messaging',
    why: 'Absorb upstream cost risk while defending consumer price point — margin compression is temporary',
    assumptions: ['Tariffs land at 20%+', 'Consumer price resistance peaks pre-tariff', 'FuelCell differentiates at $150'],
  },
  '2,6': {
    title: 'Shelf Defense Strategy',
    call: "Lock Dick's placement for 880 v15 + counter Brooks Ghost 16 with FuelCell differentiation",
    why: "Leadership vacuum + Brooks $1B milestone create converging shelf threats — act before March vendor reviews",
    assumptions: ['Foot Locker churn persists through March', 'Ghost 16 momentum plateaus at $140', "Dick's consolidation favors NB relationship"],
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
    id: '1',
    role: 'assistant',
    content: "Good morning. Three things need your attention today:\n\n**1. 880 v15 shelf window closing** — Foot Locker leadership churn gives you 60 days to lock Dick's placement before Nike wholesale floods the channel.\n\n**2. Vietnam FOB decision** — BOM lock deadline is 8-12 weeks before Supreme Court tariff clarity. You're deciding blind on $18.40/pair.\n\n**3. Brooks Ghost 16 hit $1B** — resets the neutral cushion hierarchy at $140. Your $150 price point needs justification.\n\nWhich one do you want to dig into?",
  },
  {
    id: '2',
    role: 'user',
    content: 'Tell me more about the Vietnam FOB situation',
  },
  {
    id: '3',
    role: 'assistant',
    content: "Here's the convergence: Vietnam FOB is at $18.40/pair today. If the Supreme Court upholds the 20-25% tariff, landed cost jumps to $22-23. But your FW26 BOM locks 8-12 weeks *before* that ruling.\n\nThree signals driving this:\n- **Tariff overhang**: 57 sources tracking the Supreme Court timeline\n- **Vietnam labor**: Wages rising 7-8% annually independent of tariffs\n- **Maine capacity**: Your $8-12M expansion could reach 35-40% domestic by FW27\n\nThe decision: Lock Vietnam FOB at $18.40 now and accept inflation risk, or wait for clarity and risk the tariff hit. Maine expansion becomes your hedge either way.\n\nWant me to pull the specific signals?",
  },
];
