import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, shadow, transition } from '../design-tokens';

const FONT = typography.fontFamily;

// ─── Types ──────────────────────────────────────────────────────────────────

interface ThreadHealth {
  id: string;
  title: string;
  level: string;
  dominant_direction: string | null;
  direction_confidence: number | null;
  signalCount: number;
  positionCount: number;
}

interface AgentEvent {
  id: string;
  event_type: string;
  source_agent: string;
  created_at: string;
}

interface ToneCount {
  tone: string;
  count: number;
}

interface PerspectiveCount {
  perspective: string;
  count: number;
}

interface ScanSourceCount {
  scan_source: string;
  count: number;
}

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

function cutoff(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function cutoffDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminEval() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Throughput
  const [signals24h, setSignals24h] = useState(0);
  const [signals7d, setSignals7d] = useState(0);
  const [positions24h, setPositions24h] = useState(0);
  const [positions7d, setPositions7d] = useState(0);
  const [linked24h, setLinked24h] = useState(0);

  // Thread health
  const [threads, setThreads] = useState<ThreadHealth[]>([]);

  // Position quality
  const [tones, setTones] = useState<ToneCount[]>([]);
  const [avgConfidence, setAvgConfidence] = useState(0);

  // Agent events
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [eventsError, setEventsError] = useState(false);

  // Signal coverage
  const [perspectives, setPerspectives] = useState<PerspectiveCount[]>([]);
  const [scanSources, setScanSources] = useState<ScanSourceCount[]>([]);

  // Auth check — same as AdminCosts
  useEffect(() => {
    const ADMIN_EMAILS = ['dkkim2011@gmail.com'];

    const check = async (email: string | undefined, uid: string) => {
      const emailAdmin = !!(email && ADMIN_EMAILS.includes(email));

      let dbAdmin = false;
      try {
        const { data } = await (supabase as any)
          .from('users')
          .select('is_admin')
          .eq('id', uid)
          .maybeSingle();
        dbAdmin = !!data?.is_admin;
      } catch { /* fall through */ }

      if (!dbAdmin && !emailAdmin) {
        navigate('/', { replace: true });
        return;
      }
      setAuthorized(true);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        check(session.user.email ?? undefined, session.user.id);
      } else {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          subscription.unsubscribe();
          if (!session?.user) { navigate('/', { replace: true }); setLoading(false); return; }
          check(session.user.email ?? undefined, session.user.id);
        });
      }
    });
  }, [navigate]);

  // Fetch all data once authorized
  useEffect(() => {
    if (!authorized) return;

    const fetchAll = async () => {
      const c24h = cutoff(24);
      const c7d = cutoffDays(7);

      // ── Throughput counts ──
      const [sig24, sig7, pos24, pos7, lnk24] = await Promise.all([
        (supabase as any).from('signals').select('id', { count: 'exact', head: true }).gte('created_at', c24h),
        (supabase as any).from('signals').select('id', { count: 'exact', head: true }).gte('created_at', c7d),
        (supabase as any).from('positions').select('id', { count: 'exact', head: true }).gte('created_at', c24h),
        (supabase as any).from('positions').select('id', { count: 'exact', head: true }).gte('created_at', c7d),
        (supabase as any).from('decision_signals').select('id', { count: 'exact', head: true }).gte('added_at', c24h),
      ]);
      setSignals24h(sig24.count ?? 0);
      setSignals7d(sig7.count ?? 0);
      setPositions24h(pos24.count ?? 0);
      setPositions7d(pos7.count ?? 0);
      setLinked24h(lnk24.count ?? 0);

      // ── Thread health ──
      const { data: threadRows } = await (supabase as any)
        .from('decision_threads')
        .select('id, title, level, dominant_direction, direction_confidence');

      if (threadRows) {
        const healthPromises = threadRows.map(async (t: any) => {
          const [{ count: sc }, { count: pc }] = await Promise.all([
            (supabase as any).from('decision_signals').select('id', { count: 'exact', head: true }).eq('decision_thread_id', t.id),
            (supabase as any).from('positions').select('id', { count: 'exact', head: true }).eq('decision_thread_id', t.id),
          ]);
          return {
            id: t.id,
            title: t.title,
            level: t.level || '—',
            dominant_direction: t.dominant_direction,
            direction_confidence: t.direction_confidence,
            signalCount: sc ?? 0,
            positionCount: pc ?? 0,
          } as ThreadHealth;
        });
        const threadHealth = await Promise.all(healthPromises);
        threadHealth.sort((a, b) => b.signalCount - a.signalCount);
        setThreads(threadHealth);
      }

      // ── Position quality — tones 7d ──
      const { data: posRows } = await (supabase as any)
        .from('positions')
        .select('tone, fact_confidence')
        .gte('created_at', c7d);

      if (posRows && posRows.length > 0) {
        const toneMap = new Map<string, number>();
        let confSum = 0;
        let confCount = 0;
        for (const p of posRows) {
          const t = p.tone || 'UNKNOWN';
          toneMap.set(t, (toneMap.get(t) || 0) + 1);
          if (p.fact_confidence != null) {
            confSum += p.fact_confidence;
            confCount += 1;
          }
        }
        const toneArr = Array.from(toneMap.entries())
          .map(([tone, count]) => ({ tone, count }))
          .sort((a, b) => b.count - a.count);
        setTones(toneArr);
        setAvgConfidence(confCount > 0 ? confSum / confCount : 0);
      }

      // ── Agent events ──
      try {
        const { data: evtRows, error: evtErr } = await (supabase as any)
          .from('agent_events')
          .select('id, event_type, source_agent, created_at')
          .order('created_at', { ascending: false })
          .limit(20);
        if (evtErr) {
          setEventsError(true);
        } else {
          setEvents(evtRows || []);
        }
      } catch {
        setEventsError(true);
      }

      // ── Signal coverage 7d ──
      const { data: sigRows } = await (supabase as any)
        .from('signals')
        .select('perspective, scan_source')
        .gte('created_at', c7d);

      if (sigRows) {
        const perspMap = new Map<string, number>();
        const srcMap = new Map<string, number>();
        for (const s of sigRows) {
          const p = s.perspective || 'unknown';
          const src = s.scan_source || 'unknown';
          perspMap.set(p, (perspMap.get(p) || 0) + 1);
          srcMap.set(src, (srcMap.get(src) || 0) + 1);
        }
        setPerspectives(
          Array.from(perspMap.entries())
            .map(([perspective, count]) => ({ perspective, count }))
            .sort((a, b) => b.count - a.count)
        );
        setScanSources(
          Array.from(srcMap.entries())
            .map(([scan_source, count]) => ({ scan_source, count }))
            .sort((a, b) => b.count - a.count)
        );
      }
    };

    fetchAll();
  }, [authorized]);

  // ─── Loading / Not Authorized ─────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: colors.bg.light, fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 14, color: colors.text.muted.light }}>Loading…</span>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={{ minHeight: '100vh', background: colors.bg.light, fontFamily: FONT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, color: colors.text.secondary.light }}>Not authorized</span>
        <button onClick={() => navigate('/')} style={{ fontSize: 13, color: colors.text.muted.light, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, textDecoration: 'underline' }}>
          Back to Feed
        </button>
      </div>
    );
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    flex: 1,
    background: colors.bg.light,
    border: `1px solid ${colors.border.light}`,
    borderRadius: 12,
    padding: '16px 20px',
    minWidth: 120,
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
    color: colors.text.muted.light,
    marginBottom: 12,
  };

  const cardLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: colors.text.muted.light,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
    marginBottom: 6,
  };

  const cardValueStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 700,
    color: colors.text.primary.light,
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 600,
    color: colors.text.muted.light,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 12,
    color: colors.text.primary.light,
  };

  // ─── Computed ─────────────────────────────────────────────────────────────

  const maxTone = tones.length > 0 ? Math.max(...tones.map(t => t.count)) : 1;
  const maxPersp = perspectives.length > 0 ? Math.max(...perspectives.map(p => p.count)) : 1;
  const maxSrc = scanSources.length > 0 ? Math.max(...scanSources.map(s => s.count)) : 1;

  const toneColor = (tone: string): string => {
    if (tone === 'BREAKING') return '#ef4444';
    if (tone === 'ACT NOW' || tone === 'ACT_NOW') return '#f97316';
    if (tone === 'WATCH') return '#f59e0b';
    return '#94a3b8';
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: colors.bg.light, fontFamily: FONT }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>

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

        {/* Header */}
        <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text.primary.light, margin: '0 0 28px 0' }}>
          Pipeline Eval
        </h1>

        {/* ── A. Pipeline Throughput ────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionLabelStyle}>Pipeline Throughput</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Signals 24h</div>
              <div style={cardValueStyle}>{signals24h}</div>
            </div>
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Signals 7d</div>
              <div style={cardValueStyle}>{signals7d}</div>
            </div>
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Positions 24h</div>
              <div style={cardValueStyle}>{positions24h}</div>
            </div>
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Positions 7d</div>
              <div style={cardValueStyle}>{positions7d}</div>
            </div>
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Linked 24h</div>
              <div style={cardValueStyle}>{linked24h}</div>
            </div>
          </div>
        </div>

        {/* ── B. Thread Health ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionLabelStyle}>Thread Health</div>
          <div style={{ border: `1px solid ${colors.border.light}`, borderRadius: 12, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: FONT }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border.light}` }}>
                  {['Title', 'Level', 'Signals', 'Positions', 'Direction', 'Conf'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {threads.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 20, textAlign: 'center', color: colors.text.muted.light }}>
                      No threads found.
                    </td>
                  </tr>
                )}
                {threads.map(t => (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${colors.border.light}` }}>
                    <td style={{ ...tdStyle, fontWeight: 600, maxWidth: 260 }}>
                      {truncate(t.title, 40)}
                    </td>
                    <td style={{ ...tdStyle, color: colors.text.secondary.light, textTransform: 'capitalize' }}>
                      {t.level}
                    </td>
                    <td style={tdStyle}>{t.signalCount}</td>
                    <td style={{
                      ...tdStyle,
                      color: t.positionCount > 5 ? '#ef4444' : colors.text.primary.light,
                      fontWeight: t.positionCount > 5 ? 700 : 400,
                    }}>
                      {t.positionCount}{t.positionCount > 5 ? ' !' : ''}
                    </td>
                    <td style={{ ...tdStyle, color: colors.text.secondary.light }}>
                      {t.dominant_direction || '—'}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>
                      {t.direction_confidence != null ? t.direction_confidence.toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── C. Position Quality ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionLabelStyle}>Position Quality (7d)</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Avg Confidence</div>
              <div style={cardValueStyle}>{avgConfidence > 0 ? avgConfidence.toFixed(2) : '—'}</div>
            </div>
            <div style={cardStyle}>
              <div style={cardLabelStyle}>Total Positions</div>
              <div style={cardValueStyle}>{tones.reduce((s, t) => s + t.count, 0)}</div>
            </div>
          </div>
          <div style={{ border: `1px solid ${colors.border.light}`, borderRadius: 12, overflow: 'hidden' }}>
            {tones.length === 0 && (
              <div style={{ padding: 20, fontSize: 13, color: colors.text.muted.light, textAlign: 'center' }}>
                No positions in the last 7 days.
              </div>
            )}
            {tones.map((t, i) => {
              const barWidth = maxTone > 0 ? Math.max(4, (t.count / maxTone) * 100) : 0;
              return (
                <div
                  key={t.tone}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    borderBottom: i < tones.length - 1 ? `1px solid ${colors.border.light}` : 'none',
                  }}
                >
                  <span style={{ width: 90, fontSize: 12, fontWeight: 600, color: toneColor(t.tone) }}>
                    {t.tone}
                  </span>
                  <span style={{ width: 40, fontSize: 12, fontWeight: 600, color: colors.text.primary.light, textAlign: 'right' }}>
                    {t.count}
                  </span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: colors.bg.surface, overflow: 'hidden' }}>
                    <div style={{
                      width: `${barWidth}%`,
                      height: '100%',
                      borderRadius: 3,
                      background: toneColor(t.tone),
                      transition: transition.base,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── D. Recent Agent Events ───────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionLabelStyle}>Recent Agent Events</div>
          {eventsError ? (
            <div style={{
              padding: 20, fontSize: 13, color: colors.text.muted.light,
              border: `1px solid ${colors.border.light}`, borderRadius: 12, textAlign: 'center',
            }}>
              Agent events not accessible
            </div>
          ) : (
            <div style={{ border: `1px solid ${colors.border.light}`, borderRadius: 12, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: FONT }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border.light}` }}>
                    {['When', 'Agent', 'Event'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: 20, textAlign: 'center', color: colors.text.muted.light }}>
                        No recent events.
                      </td>
                    </tr>
                  )}
                  {events.map(e => (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${colors.border.light}` }}>
                      <td style={{ ...tdStyle, color: colors.text.muted.light }}>{timeAgo(e.created_at)}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, textTransform: 'capitalize' }}>{e.source_agent}</td>
                      <td style={{ ...tdStyle, color: colors.text.secondary.light }}>{e.event_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── E. Signal Coverage (7d) ──────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionLabelStyle}>Signal Coverage — Perspective (7d)</div>
          <div style={{ border: `1px solid ${colors.border.light}`, borderRadius: 12, overflow: 'hidden' }}>
            {perspectives.length === 0 && (
              <div style={{ padding: 20, fontSize: 13, color: colors.text.muted.light, textAlign: 'center' }}>
                No signal data.
              </div>
            )}
            {perspectives.map((p, i) => {
              const barWidth = maxPersp > 0 ? Math.max(4, (p.count / maxPersp) * 100) : 0;
              return (
                <div
                  key={p.perspective}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    borderBottom: i < perspectives.length - 1 ? `1px solid ${colors.border.light}` : 'none',
                  }}
                >
                  <span style={{ width: 140, fontSize: 12, fontWeight: 600, color: colors.text.primary.light, textTransform: 'capitalize' }}>
                    {p.perspective.replace(/_/g, ' ')}
                  </span>
                  <span style={{ width: 40, fontSize: 12, fontWeight: 600, color: colors.text.primary.light, textAlign: 'right' }}>
                    {p.count}
                  </span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: colors.bg.surface, overflow: 'hidden' }}>
                    <div style={{
                      width: `${barWidth}%`,
                      height: '100%',
                      borderRadius: 3,
                      background: '#3B82F6',
                      transition: transition.base,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 48 }}>
          <div style={sectionLabelStyle}>Signal Coverage — Scan Source (7d)</div>
          <div style={{ border: `1px solid ${colors.border.light}`, borderRadius: 12, overflow: 'hidden' }}>
            {scanSources.length === 0 && (
              <div style={{ padding: 20, fontSize: 13, color: colors.text.muted.light, textAlign: 'center' }}>
                No signal data.
              </div>
            )}
            {scanSources.map((s, i) => {
              const barWidth = maxSrc > 0 ? Math.max(4, (s.count / maxSrc) * 100) : 0;
              return (
                <div
                  key={s.scan_source}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    borderBottom: i < scanSources.length - 1 ? `1px solid ${colors.border.light}` : 'none',
                  }}
                >
                  <span style={{ width: 140, fontSize: 12, fontWeight: 600, color: colors.text.primary.light, textTransform: 'capitalize' }}>
                    {s.scan_source.replace(/_/g, ' ')}
                  </span>
                  <span style={{ width: 40, fontSize: 12, fontWeight: 600, color: colors.text.primary.light, textAlign: 'right' }}>
                    {s.count}
                  </span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: colors.bg.surface, overflow: 'hidden' }}>
                    <div style={{
                      width: `${barWidth}%`,
                      height: '100%',
                      borderRadius: 3,
                      background: '#8B5CF6',
                      transition: transition.base,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
