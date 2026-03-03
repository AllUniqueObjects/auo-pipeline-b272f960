import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, shadow, transition } from '../design-tokens';

const FONT = typography.fontFamily;

// ─── Types ──────────────────────────────────────────────────────────────────

interface CostRow {
  id: string;
  agent: string;
  run_type: string;
  run_id: string | null;
  haiku_input_tokens: number;
  haiku_output_tokens: number;
  sonnet_input_tokens: number;
  sonnet_output_tokens: number;
  exa_calls: number;
  serpapi_calls: number;
  tavily_calls: number;
  gemini_image_calls: number;
  resend_email_calls: number;
  total_cost_cents: number;
  created_at: string;
}

type TimeRange = 'today' | '7d' | '30d' | 'all';

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTokens(n: number): string {
  if (n === 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getDateFilter(range: TimeRange): string | null {
  const now = new Date();
  switch (range) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start.toISOString();
    }
    case '7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    case '30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    }
    case 'all':
      return null;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminCosts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [range, setRange] = useState<TimeRange>('7d');
  const [rows, setRows] = useState<CostRow[]>([]);
  const [hoveredRange, setHoveredRange] = useState<TimeRange | null>(null);

  // Auth check
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/feed', { replace: true }); return; }

      const ADMIN_EMAILS = ['dkkim2011@gmail.com'];
      const emailAdmin = user.email && ADMIN_EMAILS.includes(user.email);

      const { data } = await (supabase as any)
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (!data?.is_admin && !emailAdmin) {
        navigate('/feed', { replace: true });
        return;
      }
      setAuthorized(true);
      setLoading(false);
    })();
  }, [navigate]);

  // Fetch costs when authorized or range changes
  useEffect(() => {
    if (!authorized) return;

    (async () => {
      let query = (supabase as any)
        .from('agent_costs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      const dateFilter = getDateFilter(range);
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data } = await query;
      setRows(data || []);
    })();
  }, [authorized, range]);

  if (loading || !authorized) {
    return (
      <div style={{ minHeight: '100vh', background: colors.bg.light, fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, color: colors.text.muted.light }}>Loading...</span>
      </div>
    );
  }

  // ─── Compute summaries ──────────────────────────────────────────────────

  const totalCost = rows.reduce((s, r) => s + r.total_cost_cents, 0);
  const totalRuns = rows.length;
  const avgPerRun = totalRuns > 0 ? totalCost / totalRuns : 0;

  // Group by agent + run_type
  const agentGroups = new Map<string, { agent: string; run_type: string; runs: number; cost: number }>();
  for (const r of rows) {
    const key = `${r.agent}|${r.run_type}`;
    const g = agentGroups.get(key) || { agent: r.agent, run_type: r.run_type, runs: 0, cost: 0 };
    g.runs += 1;
    g.cost += r.total_cost_cents;
    agentGroups.set(key, g);
  }
  const groups = Array.from(agentGroups.values()).sort((a, b) => b.cost - a.cost);
  const maxGroupCost = groups.length > 0 ? Math.max(...groups.map(g => g.cost)) : 1;

  // Recent runs (first 50 already sorted by created_at desc)
  const recentRuns = rows.slice(0, 50);

  // ─── Styles ─────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    flex: 1,
    background: colors.bg.light,
    border: `1px solid ${colors.border.light}`,
    borderRadius: 12,
    padding: '16px 20px',
    minWidth: 140,
  };

  const rangeBtnStyle = (active: boolean, hovered: boolean): React.CSSProperties => ({
    padding: '5px 12px',
    borderRadius: 8,
    border: `1px solid ${active ? 'transparent' : colors.border.medium}`,
    background: active ? colors.text.primary.light : hovered ? 'rgba(0,0,0,0.04)' : 'transparent',
    color: active ? '#fff' : colors.text.secondary.light,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: transition.fast,
    fontFamily: FONT,
  });

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
    color: colors.text.muted.light,
    marginBottom: 12,
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bg.light, fontFamily: FONT }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        {/* Back */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'block', marginBottom: 16, background: 'none', border: 'none',
            fontSize: 13, color: colors.text.muted.light, cursor: 'pointer',
            fontFamily: FONT, transition: transition.fast, padding: 0,
          }}
        >
          &larr; Back to Feed
        </button>

        {/* Header + time range */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text.primary.light, margin: 0 }}>
            Pipeline Costs
          </h1>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['today', '7d', '30d', 'all'] as TimeRange[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                onMouseEnter={() => setHoveredRange(r)}
                onMouseLeave={() => setHoveredRange(null)}
                style={rangeBtnStyle(range === r, hoveredRange === r)}
              >
                {r === 'today' ? 'Today' : r === 'all' ? 'All' : r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.muted.light, textTransform: 'uppercase', letterSpacing: typography.letterSpacing.wide, marginBottom: 6 }}>
              Total Cost
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: colors.text.primary.light }}>
              {formatCost(totalCost)}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.muted.light, textTransform: 'uppercase', letterSpacing: typography.letterSpacing.wide, marginBottom: 6 }}>
              Runs
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: colors.text.primary.light }}>
              {totalRuns}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.muted.light, textTransform: 'uppercase', letterSpacing: typography.letterSpacing.wide, marginBottom: 6 }}>
              Avg / Run
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: colors.text.primary.light }}>
              {formatCost(Math.round(avgPerRun))}
            </div>
          </div>
        </div>

        {/* By Agent */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionLabelStyle}>By Agent</div>
          <div style={{ border: `1px solid ${colors.border.light}`, borderRadius: 12, overflow: 'hidden' }}>
            {groups.length === 0 && (
              <div style={{ padding: 20, fontSize: 13, color: colors.text.muted.light, textAlign: 'center' }}>
                No cost data for this period.
              </div>
            )}
            {groups.map((g, i) => {
              const barWidth = maxGroupCost > 0 ? Math.max(4, (g.cost / maxGroupCost) * 100) : 0;
              return (
                <div
                  key={`${g.agent}-${g.run_type}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    borderBottom: i < groups.length - 1 ? `1px solid ${colors.border.light}` : 'none',
                  }}
                >
                  <span style={{ width: 70, fontSize: 12, fontWeight: 600, color: colors.text.primary.light, textTransform: 'capitalize' }}>
                    {g.agent}
                  </span>
                  <span style={{ width: 110, fontSize: 12, color: colors.text.secondary.light }}>
                    {g.run_type}
                  </span>
                  <span style={{ width: 70, fontSize: 12, color: colors.text.muted.light }}>
                    {g.runs} runs
                  </span>
                  <span style={{ width: 60, fontSize: 12, fontWeight: 600, color: colors.text.primary.light, textAlign: 'right' }}>
                    {formatCost(g.cost)}
                  </span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: colors.bg.surface, overflow: 'hidden' }}>
                    <div style={{
                      width: `${barWidth}%`,
                      height: '100%',
                      borderRadius: 3,
                      background: g.agent === 'scanner' ? '#3B82F6' : g.agent === 'connector' ? '#8B5CF6' : '#F59E0B',
                      transition: transition.base,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Runs */}
        <div>
          <div style={sectionLabelStyle}>Recent Runs</div>
          <div style={{
            border: `1px solid ${colors.border.light}`, borderRadius: 12,
            overflow: 'auto',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: FONT }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border.light}` }}>
                  {['Agent', 'Type', 'Haiku', 'Sonnet', 'Search', 'Img', 'Cost', 'When'].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 12px', textAlign: 'left', fontWeight: 600,
                        color: colors.text.muted.light, fontSize: 11, textTransform: 'uppercase',
                        letterSpacing: typography.letterSpacing.wide,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentRuns.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 20, textAlign: 'center', color: colors.text.muted.light }}>
                      No runs in this period.
                    </td>
                  </tr>
                )}
                {recentRuns.map(r => {
                  const haikuStr = (r.haiku_input_tokens || r.haiku_output_tokens)
                    ? `${formatTokens(r.haiku_input_tokens)}/${formatTokens(r.haiku_output_tokens)}`
                    : '—';
                  const sonnetStr = (r.sonnet_input_tokens || r.sonnet_output_tokens)
                    ? `${formatTokens(r.sonnet_input_tokens)}/${formatTokens(r.sonnet_output_tokens)}`
                    : '—';
                  const searchTotal = r.exa_calls + r.serpapi_calls + r.tavily_calls;
                  const searchStr = searchTotal > 0 ? String(searchTotal) : '—';
                  const imgStr = r.gemini_image_calls > 0 ? String(r.gemini_image_calls) : '—';

                  return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border.light}` }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: colors.text.primary.light, textTransform: 'capitalize' }}>
                        {r.agent}
                      </td>
                      <td style={{ padding: '10px 12px', color: colors.text.secondary.light }}>
                        {r.run_type}
                      </td>
                      <td style={{ padding: '10px 12px', color: haikuStr === '—' ? colors.text.muted.light : colors.text.primary.light, fontFamily: 'monospace', fontSize: 11 }}>
                        {haikuStr}
                      </td>
                      <td style={{ padding: '10px 12px', color: sonnetStr === '—' ? colors.text.muted.light : colors.text.primary.light, fontFamily: 'monospace', fontSize: 11 }}>
                        {sonnetStr}
                      </td>
                      <td style={{ padding: '10px 12px', color: searchStr === '—' ? colors.text.muted.light : colors.text.primary.light }}>
                        {searchStr}
                      </td>
                      <td style={{ padding: '10px 12px', color: imgStr === '—' ? colors.text.muted.light : colors.text.primary.light }}>
                        {imgStr}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: colors.text.primary.light }}>
                        {formatCost(r.total_cost_cents)}
                      </td>
                      <td style={{ padding: '10px 12px', color: colors.text.muted.light }}>
                        {timeAgo(r.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
