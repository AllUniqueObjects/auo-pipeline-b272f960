import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, shadow, transition } from '../design-tokens';

const FONT = typography.fontFamily;

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserOption {
  id: string;
  name: string | null;
  company: string | null;
}

interface PipelineAgent {
  name: string;
  lastHeartbeat: string | null;
  lastCompleted: string | null;
  completedPayload: Record<string, any> | null;
}

interface ThreadHealth {
  id: string;
  title: string;
  level: string;
  dominant_direction: string | null;
  direction_confidence: number | null;
  signalCount: number;
  positionCount: number;
  lastSignalAt: string | null;
}

interface AgentEvent {
  id: string;
  event_type: string;
  source_agent: string;
  created_at: string;
  payload: Record<string, any> | null;
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

function hoursAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3600000;
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

function statusDot(agentName: string, lastHeartbeat: string | null): { color: string; label: string } {
  if (!lastHeartbeat) return { color: '#ef4444', label: 'No heartbeat' };
  const h = hoursAgo(lastHeartbeat);
  // Scanner cron = 8h interval, breaking = 20min; connector/writer are event-driven
  if (agentName === 'scanner') {
    // Breaking runs every 20min, so heartbeat should be <30min
    if (h < 0.5) return { color: '#22c55e', label: timeAgo(lastHeartbeat) };
    if (h < 1) return { color: '#f59e0b', label: timeAgo(lastHeartbeat) };
    return { color: '#ef4444', label: timeAgo(lastHeartbeat) };
  }
  // Connector/Writer: event-driven, expect within a few hours of scanner
  if (h < 2) return { color: '#22c55e', label: timeAgo(lastHeartbeat) };
  if (h < 4) return { color: '#f59e0b', label: timeAgo(lastHeartbeat) };
  return { color: '#ef4444', label: timeAgo(lastHeartbeat) };
}

function agentColor(agent: string): string {
  if (agent === 'scanner') return '#3B82F6';
  if (agent === 'connector') return '#8B5CF6';
  if (agent === 'writer') return '#D97706';
  return '#94a3b8';
}

function payloadPreview(payload: Record<string, any> | null): string {
  if (!payload) return '—';
  const keys = Object.keys(payload).filter(k => k !== 'user_id');
  if (keys.length === 0) return '—';
  const parts = keys.slice(0, 3).map(k => {
    const v = payload[k];
    if (v == null) return `${k}: null`;
    if (typeof v === 'number') return `${k}: ${v}`;
    if (typeof v === 'string') return `${k}: ${truncate(v, 20)}`;
    return k;
  });
  return parts.join(', ') + (keys.length > 3 ? ' …' : '');
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminEval() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // User selector
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  // Pipeline status
  const [pipelineAgents, setPipelineAgents] = useState<PipelineAgent[]>([]);
  const [lastPositionAt, setLastPositionAt] = useState<string | null>(null);

  // Throughput
  const [signals24h, setSignals24h] = useState(0);
  const [signals7d, setSignals7d] = useState(0);
  const [positions24h, setPositions24h] = useState(0);
  const [positions7d, setPositions7d] = useState(0);
  const [linked24h, setLinked24h] = useState(0);

  // Pipeline funnel
  const [funnelSignals, setFunnelSignals] = useState(0);
  const [funnelLinked, setFunnelLinked] = useState(0);
  const [funnelPositions, setFunnelPositions] = useState(0);

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

  // Auth check
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

  // Fetch users list once authorized
  useEffect(() => {
    if (!authorized) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('users')
        .select('id, name, company');
      if (data) setUsers(data);
    })();
  }, [authorized]);

  // Fetch pipeline status (always global)
  useEffect(() => {
    if (!authorized) return;

    const fetchPipelineStatus = async () => {
      const agentConfigs: { name: string; heartbeatType: string; completedType: string }[] = [
        { name: 'scanner', heartbeatType: 'scanner_breaking_heartbeat', completedType: 'scanner_completed' },
        { name: 'connector', heartbeatType: 'connector_heartbeat', completedType: 'connector_completed' },
        { name: 'writer', heartbeatType: 'writer_heartbeat', completedType: 'position_created' },
      ];

      const results = await Promise.all(
        agentConfigs.map(async ({ name, heartbeatType, completedType }) => {
          const [hbResp, compResp] = await Promise.all([
            (supabase as any)
              .from('agent_events')
              .select('created_at')
              .eq('event_type', heartbeatType)
              .order('created_at', { ascending: false })
              .limit(1),
            (supabase as any)
              .from('agent_events')
              .select('created_at, payload')
              .eq('event_type', completedType)
              .order('created_at', { ascending: false })
              .limit(1),
          ]);
          return {
            name,
            lastHeartbeat: hbResp.data?.[0]?.created_at ?? null,
            lastCompleted: compResp.data?.[0]?.created_at ?? null,
            completedPayload: compResp.data?.[0]?.payload ?? null,
          } as PipelineAgent;
        })
      );
      setPipelineAgents(results);

      // Last position created_at for Writer card
      const { data: lastPos } = await (supabase as any)
        .from('positions')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      setLastPositionAt(lastPos?.[0]?.created_at ?? null);
    };

    fetchPipelineStatus();
  }, [authorized]);

  // Fetch all data (user-filtered where applicable)
  useEffect(() => {
    if (!authorized) return;
    const uid = selectedUserId !== 'all' ? selectedUserId : null;

    const fetchAll = async () => {
      const c24h = cutoff(24);
      const c7d = cutoffDays(7);

      // ── Throughput counts ──
      if (uid) {
        // User-filtered: signals via decision_signals → decision_threads.user_id
        // Get thread IDs for this user
        const { data: userThreads } = await (supabase as any)
          .from('decision_threads')
          .select('id')
          .eq('user_id', uid);
        const threadIds = (userThreads || []).map((t: any) => t.id);

        if (threadIds.length > 0) {
          const [lnk24Result, lnk7dResult, pos24Result, pos7dResult] = await Promise.all([
            (supabase as any).from('decision_signals').select('id', { count: 'exact', head: true })
              .in('decision_thread_id', threadIds).gte('added_at', c24h),
            (supabase as any).from('decision_signals').select('id', { count: 'exact', head: true })
              .in('decision_thread_id', threadIds).gte('added_at', c7d),
            (supabase as any).from('positions').select('id', { count: 'exact', head: true })
              .eq('user_id', uid).gte('created_at', c24h),
            (supabase as any).from('positions').select('id', { count: 'exact', head: true })
              .eq('user_id', uid).gte('created_at', c7d),
          ]);
          setSignals24h(lnk24Result.count ?? 0);
          setSignals7d(lnk7dResult.count ?? 0);
          setPositions24h(pos24Result.count ?? 0);
          setPositions7d(pos7dResult.count ?? 0);
          setLinked24h(lnk24Result.count ?? 0);
        } else {
          setSignals24h(0); setSignals7d(0); setPositions24h(0); setPositions7d(0); setLinked24h(0);
        }
      } else {
        // Global
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
      }

      // ── Pipeline Funnel (7d) ──
      if (uid) {
        const { data: userThreads } = await (supabase as any)
          .from('decision_threads')
          .select('id')
          .eq('user_id', uid);
        const threadIds = (userThreads || []).map((t: any) => t.id);

        if (threadIds.length > 0) {
          const [linkedResult, posResult] = await Promise.all([
            (supabase as any).from('decision_signals').select('id', { count: 'exact', head: true })
              .in('decision_thread_id', threadIds).gte('added_at', c7d),
            (supabase as any).from('positions').select('id', { count: 'exact', head: true })
              .eq('user_id', uid).gte('created_at', c7d),
          ]);
          // For user-filtered, signals = linked signals (can't attribute unlinked)
          const linked = linkedResult.count ?? 0;
          setFunnelSignals(linked);
          setFunnelLinked(linked);
          setFunnelPositions(posResult.count ?? 0);
        } else {
          setFunnelSignals(0); setFunnelLinked(0); setFunnelPositions(0);
        }
      } else {
        const [sigResult, linkedResult, posResult] = await Promise.all([
          (supabase as any).from('signals').select('id', { count: 'exact', head: true }).gte('created_at', c7d),
          (supabase as any).from('decision_signals').select('id', { count: 'exact', head: true }).gte('added_at', c7d),
          (supabase as any).from('positions').select('id', { count: 'exact', head: true }).gte('created_at', c7d),
        ]);
        setFunnelSignals(sigResult.count ?? 0);
        setFunnelLinked(linkedResult.count ?? 0);
        setFunnelPositions(posResult.count ?? 0);
      }

      // ── Thread health ──
      let threadQuery = (supabase as any)
        .from('decision_threads')
        .select('id, title, monitor_level, dominant_direction, direction_confidence');
      if (uid) threadQuery = threadQuery.eq('user_id', uid);

      const { data: threadRows } = await threadQuery;

      if (threadRows) {
        const healthPromises = threadRows.map(async (t: any) => {
          const [{ count: sc }, { count: pc }] = await Promise.all([
            (supabase as any).from('decision_signals').select('id', { count: 'exact', head: true }).eq('decision_thread_id', t.id),
            (supabase as any).from('positions').select('id', { count: 'exact', head: true }).eq('decision_thread_id', t.id),
          ]);
          // Last signal added_at
          const { data: lastSig } = await (supabase as any)
            .from('decision_signals')
            .select('added_at')
            .eq('decision_thread_id', t.id)
            .order('added_at', { ascending: false })
            .limit(1);
          return {
            id: t.id,
            title: t.title,
            level: t.monitor_level || '—',
            dominant_direction: t.dominant_direction,
            direction_confidence: t.direction_confidence,
            signalCount: sc ?? 0,
            positionCount: pc ?? 0,
            lastSignalAt: lastSig?.[0]?.added_at ?? null,
          } as ThreadHealth;
        });
        const threadHealth = await Promise.all(healthPromises);
        threadHealth.sort((a, b) => b.signalCount - a.signalCount);
        setThreads(threadHealth);
      }

      // ── Position quality — tones 7d ──
      let posQuery = (supabase as any)
        .from('positions')
        .select('tone, fact_confidence')
        .gte('created_at', c7d);
      if (uid) posQuery = posQuery.eq('user_id', uid);

      const { data: posRows } = await posQuery;

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
      } else {
        setTones([]);
        setAvgConfidence(0);
      }

      // ── Agent events (always global) ──
      try {
        const { data: evtRows, error: evtErr } = await (supabase as any)
          .from('agent_events')
          .select('id, event_type, source_agent, created_at, payload')
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

      // ── Signal coverage 7d (always global) ──
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
  }, [authorized, selectedUserId]);

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

  const conversionRate = funnelSignals > 0
    ? ((funnelPositions / funnelSignals) * 100).toFixed(1)
    : '0.0';

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

        {/* Header + User Selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text.primary.light, margin: 0 }}>
            Pipeline Eval
          </h1>
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            style={{
              fontFamily: FONT,
              fontSize: 13,
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${colors.border.medium}`,
              background: colors.bg.light,
              color: colors.text.primary.light,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">All Users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name || 'Unnamed'}{u.company ? ` — ${u.company}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* ── Pipeline Status ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionLabelStyle}>Pipeline Status</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {pipelineAgents.map(agent => {
              const { color, label } = statusDot(agent.name, agent.lastHeartbeat);
              const scannerExtra = agent.name === 'scanner' && agent.completedPayload
                ? (() => {
                    const created = agent.completedPayload.signals_created ?? agent.completedPayload.new_signals;
                    const updated = agent.completedPayload.signals_updated ?? agent.completedPayload.updated_signals;
                    if (created != null || updated != null) {
                      return `${created ?? 0} created, ${updated ?? 0} updated`;
                    }
                    return null;
                  })()
                : null;
              const writerExtra = agent.name === 'writer' && lastPositionAt
                ? `Last position: ${timeAgo(lastPositionAt)}`
                : null;

              return (
                <div key={agent.name} style={{ ...cardStyle, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: color,
                      boxShadow: `0 0 6px ${color}`,
                    }} />
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: agentColor(agent.name),
                      textTransform: 'capitalize',
                    }}>
                      {agent.name}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: colors.text.secondary.light, marginBottom: 2 }}>
                    Heartbeat: {label}
                  </div>
                  <div style={{ fontSize: 11, color: colors.text.muted.light, marginBottom: 4 }}>
                    Last completed: {agent.lastCompleted ? timeAgo(agent.lastCompleted) : '—'}
                  </div>
                  {scannerExtra && (
                    <div style={{ fontSize: 11, color: colors.text.muted.light }}>
                      {scannerExtra}
                    </div>
                  )}
                  {writerExtra && (
                    <div style={{ fontSize: 11, color: colors.text.muted.light }}>
                      {writerExtra}
                    </div>
                  )}
                </div>
              );
            })}
            {pipelineAgents.length === 0 && (
              <div style={{ ...cardStyle, textAlign: 'center', color: colors.text.muted.light, fontSize: 13 }}>
                Loading pipeline status…
              </div>
            )}
          </div>
        </div>

        {/* ── Pipeline Throughput ─────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionLabelStyle}>
            Pipeline Throughput
            {selectedUserId !== 'all' && (
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
                (filtered)
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: colors.text.muted.light, marginBottom: 10, lineHeight: 1.5 }}>
            Healthy: 50-200 signals/day (3 cron + 72 breaking scans). 2-8 positions/day. Linked = signals matched to threads.
          </div>
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

        {/* ── Pipeline Funnel (7d) ───────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionLabelStyle}>
            Pipeline Funnel (7d)
            {selectedUserId !== 'all' && (
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
                (filtered)
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: colors.text.muted.light, marginBottom: 10, lineHeight: 1.5 }}>
            Most signals are noise — that's by design. Expect 1-5% conversion. Low conversion = scanner is casting wide. 0% = pipeline broken.
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            border: `1px solid ${colors.border.light}`, borderRadius: 12,
            padding: '20px 24px',
            background: colors.bg.light,
          }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={cardLabelStyle}>Signals</div>
              <div style={cardValueStyle}>{funnelSignals}</div>
            </div>
            <div style={{ fontSize: 20, color: colors.text.muted.light, padding: '0 12px' }}>→</div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={cardLabelStyle}>Linked</div>
              <div style={cardValueStyle}>{funnelLinked}</div>
            </div>
            <div style={{ fontSize: 20, color: colors.text.muted.light, padding: '0 12px' }}>→</div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={cardLabelStyle}>Positions</div>
              <div style={cardValueStyle}>{funnelPositions}</div>
            </div>
            <div style={{
              marginLeft: 24,
              padding: '8px 16px',
              borderRadius: 8,
              background: colors.bg.surface,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.muted.light, textTransform: 'uppercase', letterSpacing: typography.letterSpacing.wide }}>
                Conversion
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: colors.text.primary.light }}>
                {conversionRate}%
              </div>
            </div>
          </div>
        </div>

        {/* ── Thread Health ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionLabelStyle}>
            Thread Health
            {selectedUserId !== 'all' && (
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
                (filtered)
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: colors.text.muted.light, marginBottom: 10, lineHeight: 1.5 }}>
            Signals = raw intelligence from scanners. Positions = analyst-grade insights written for you (max 5 per thread, 7-day window).
            Red rows = 0 signals, thread has no data flowing. Aim for 30+ signals and 1-5 positions per active thread.
          </div>
          <div style={{ border: `1px solid ${colors.border.light}`, borderRadius: 12, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: FONT }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border.light}` }}>
                  {['Title', 'Level', 'Signals', 'Positions', 'Last Signal', 'Direction', 'Conf'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {threads.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 20, textAlign: 'center', color: colors.text.muted.light }}>
                      No threads found.
                    </td>
                  </tr>
                )}
                {threads.map(t => (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: `1px solid ${colors.border.light}`,
                      background: t.signalCount === 0 ? 'rgba(239,68,68,0.06)' : 'transparent',
                    }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600, maxWidth: 220 }}>
                      {truncate(t.title, 36)}
                    </td>
                    <td style={{ ...tdStyle, color: colors.text.secondary.light, textTransform: 'capitalize' }}>
                      {t.level}
                    </td>
                    <td style={{
                      ...tdStyle,
                      color: t.signalCount === 0 ? '#ef4444' : colors.text.primary.light,
                      fontWeight: t.signalCount === 0 ? 700 : 400,
                    }}>
                      {t.signalCount}
                    </td>
                    <td style={{
                      ...tdStyle,
                      color: t.positionCount > 5 ? '#ef4444' : colors.text.primary.light,
                      fontWeight: t.positionCount > 5 ? 700 : 400,
                    }}>
                      {t.positionCount}{t.positionCount > 5 ? ' !' : ''}
                    </td>
                    <td style={{ ...tdStyle, color: colors.text.muted.light, fontSize: 11 }}>
                      {t.lastSignalAt ? timeAgo(t.lastSignalAt) : '—'}
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

        {/* ── Position Quality ────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={sectionLabelStyle}>
            Position Quality (7d)
            {selectedUserId !== 'all' && (
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
                (filtered)
              </span>
            )}
          </div>
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

        {/* ── Recent Agent Events ────────────────────────────────────── */}
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
                    {['When', 'Agent', 'Event', 'Details'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: 20, textAlign: 'center', color: colors.text.muted.light }}>
                        No recent events.
                      </td>
                    </tr>
                  )}
                  {events.map(e => (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${colors.border.light}` }}>
                      <td style={{ ...tdStyle, color: colors.text.muted.light }}>{timeAgo(e.created_at)}</td>
                      <td style={{
                        ...tdStyle,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        color: agentColor(e.source_agent),
                      }}>
                        {e.source_agent}
                      </td>
                      <td style={{ ...tdStyle, color: colors.text.secondary.light }}>{e.event_type}</td>
                      <td style={{ ...tdStyle, color: colors.text.muted.light, fontSize: 11, maxWidth: 260 }}>
                        {payloadPreview(e.payload)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Signal Coverage — Perspective (7d) ─────────────────────── */}
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
