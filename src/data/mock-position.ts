import type { PositionData } from './mock';

export const mockPosition: PositionData = {
  id: 'pos-active-1',
  title: 'Vietnam FOB Lock + Maine Expansion Dual-Track Hedge',
  tier: 'breaking',
  created_at: '2026-02-17T09:30:00Z',
  davids_take:
    "Lock at $18.40 now. Yes, we're paying inflation-adjusted fair price, but the asymmetric risk of waiting for Supreme Court clarity is too high. If tariffs land at 20%+, we're looking at $22-23 landed — that kills the 880 v15 margin story entirely. Maine expansion needs to accelerate in parallel. One without the other leaves a gap.",
  insights_referenced: [
    { id: '1', title: 'Supreme Court Tariff Ruling Forces Maine Expansion Decision Before FW26 BOM Lock', tier: 'breaking' },
    { id: '4', title: 'Vietnam FOB Inflation Plus Tariff Risk Compresses 880 v15 Margin by 8-12 Points', tier: 'developing' },
  ],
  signals: [
    {
      id: 'sig-001',
      insight_id: '1',
      title: 'Supreme Court docket confirms trade policy review hearing for April 2026',
      summary: 'Oral arguments scheduled for April 14. Ruling expected late June — 8 weeks after FW26 BOM lock.',
      analysis_context: ['Timing creates forced decision window', 'No precedent for expedited ruling in trade cases'],
      credibility: 0.92,
      sources: 3,
      source_url: 'https://supremecourt.gov',
      source: 'ambient',
      comment_count: 3,
      created_at: '2026-02-15T08:00:00Z',
    },
    {
      id: 'sig-002',
      insight_id: '1',
      title: 'Vietnam FOB contracts trending $18.40 with 7-8% annual labor inflation baked in',
      summary: 'Current pricing reflects labor cost acceleration. Locking now prevents further drift but accepts structural inflation.',
      analysis_context: ['Labor wages rising 7-8% annually — structural, not cyclical', 'FOB floor unlikely to return to sub-$17 levels'],
      credibility: 0.78,
      sources: 2,
      source_url: 'https://reuters.com',
      source: 'ambient',
      comment_count: 0,
      created_at: '2026-02-14T12:00:00Z',
    },
    {
      id: 'sig-003',
      insight_id: '4',
      title: 'Maine facility expansion reaches permit approval — 18-month build timeline confirmed',
      summary: 'State approval grants clear path to 35-40% domestic capacity by FW27. Skilled labor pool adequate if hiring starts Q2.',
      analysis_context: ['$8-12M investment approved', 'Competitor reshoring costs 2-3x higher due to later start'],
      credibility: 0.85,
      sources: 1,
      source_url: 'https://newbalance.com',
      source: 'on_demand',
      comment_count: 1,
      created_at: '2026-02-16T10:00:00Z',
    },
  ],
  sections: [
    {
      id: 'sec-1',
      title: 'The Call',
      content: 'Lock Vietnam FOB at $18.40/pair before BOM deadline AND accelerate Maine expansion timeline. Dual-track hedge protects against both tariff scenarios.',
    },
    {
      id: 'sec-2',
      title: 'Risk If Wrong',
      content: 'Overpay 7-8% vs spot if tariffs don\'t land — but that\'s inflation-adjusted fair price regardless of tariff outcome. Maine investment is sunk cost if domestic demand doesn\'t materialize by FW28.',
    },
    {
      id: 'sec-3',
      title: 'Decision Window',
      content: 'BOM lock closes in 8-12 weeks. Supreme Court ruling comes after. Maine hiring window opens Q2 2026 — skilled labor pool depletes if delayed to Q3.',
    },
  ],
  collaborators: [
    { id: 'c1', name: 'David Fontes', initials: 'DF', color: 'hsl(220, 14%, 45%)' },
    { id: 'c2', name: 'Sarah Chen', initials: 'SC', color: 'hsl(142, 71%, 35%)' },
    { id: 'c3', name: 'Mike Torres', initials: 'MT', color: 'hsl(38, 92%, 45%)' },
  ],
};
