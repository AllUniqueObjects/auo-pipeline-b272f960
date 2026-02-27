import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { parseSections } from '@/lib/position-utils';
import { colors, typography, spacing, radius, transition, shadow } from '../design-tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignalBasis {
  source_quality: number;
  recency_score: number;
  convergence_score: number;
  source_names: string[];
  signal_count: number;
  most_recent_date: string | null;
}

interface Position {
  id: string;
  title: string;
  tone: string | null;
  why_now: string | null;
  reasoning: string | null;
  position_essence: string | null;
  cover_image_url: string | null;
  signal_refs: unknown[] | null;
  fact_confidence: number | null;
  signal_basis: SignalBasis | null;
  sections: unknown | null;
  created_at: string;
  decision_thread_id: string;
}

interface ThreadInfo {
  id: string;
  title: string;
  lens: string;
  key_question: string | null;
  cover_image_url: string | null;
}

interface Signal {
  id: string;
  title: string;
  credibility: number | null;
  summary: string | null;
  role_in_insight: string | null;
  urgency: string;
  scan_source: string | null;
  first_seen: string | null;
  raw_sources: unknown | null;
  created_at: string | null;
}

// Memo bullet types — new Writer format
interface MemoBullet {
  text: string;
  highlights?: Record<string, string | null>; // phrase → signal_id
}

interface ParsedBulletSegment {
  text: string;
  isHighlight: boolean;
  phrase: string | null;
  signalId: string | null;
}

interface ParsedBullet {
  segments: ParsedBulletSegment[];
  raw: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FONT = typography.fontFamily;

const formatLens = (lens: string) =>
  lens?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatRecency = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(dateStr);
};

const formatRole = (role: string): string => {
  if (!role) return 'SIGNAL';
  const r = role.toLowerCase();
  if (r.includes('regulatory') || r.includes('compliance') ||
      r.includes('audit') || r.includes('deadline') ||
      r.includes('blocker') || r.includes('trigger')) return 'REGULATORY';
  if (r.includes('market') || r.includes('price') ||
      r.includes('cost') || r.includes('trade')) return 'MARKET';
  if (r.includes('industry') || r.includes('brand') ||
      r.includes('company') || r.includes('competitor')) return 'INDUSTRY';
  if (r.includes('innovation') || r.includes('tech') ||
      r.includes('material')) return 'INNOVATION';
  return 'ANALYSIS';
};

const normalizeTone = (raw: string): string => {
  if (raw === 'CONSIDER') return 'WATCH';
  if (raw === 'ACT_NOW') return 'ACT NOW';
  return raw;
};

const TONE_COLORS: Record<string, string> = {
  BREAKING: '#ef4444',
  'ACT NOW': '#ef4444',
  WATCH: '#f59e0b',
};

function ToneBadge({ tone }: { tone: string }) {
  const normalized = normalizeTone(tone);
  const color = TONE_COLORS[normalized] || '#f59e0b';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: `${color}18`, fontSize: 11,
      fontWeight: 700, letterSpacing: '0.06em',
      color,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: color, display: 'inline-block',
      }} />
      {normalized}
    </span>
  );
}

// Extract the best URL from raw_sources, filtering out exa.ai
function getBestUrl(rawSources: unknown): string | null {
  if (!rawSources) return null;
  try {
    const arr = Array.isArray(rawSources) ? rawSources : [];
    const withUrl = arr
      .filter((src: any) => {
        const url = typeof src === 'string' ? src : src?.url;
        return url && typeof url === 'string' && url.startsWith('http') && !url.includes('exa.ai');
      })
      .sort((a: any, b: any) => ((b as any).credibility || 0) - ((a as any).credibility || 0));

    if (withUrl.length > 0) {
      const best = withUrl[0];
      return typeof best === 'string' ? best : (best as any).url;
    }
  } catch { /* ignore */ }
  return null;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

// ─── Memo bullet parsing ─────────────────────────────────────────────────────

const parseBullet = (bullet: MemoBullet | string): ParsedBullet => {
  const text = typeof bullet === 'string' ? bullet : bullet.text;
  const highlights = typeof bullet === 'string' ? {} : (bullet.highlights || {});

  const segments: ParsedBulletSegment[] = [];
  const regex = /\[\[(.+?)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        isHighlight: false,
        phrase: null,
        signalId: null,
      });
    }

    const phrase = match[1];
    segments.push({
      text: phrase,
      isHighlight: true,
      phrase,
      signalId: highlights[phrase] || null,
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isHighlight: false,
      phrase: null,
      signalId: null,
    });
  }

  return { segments, raw: text };
};

const parseMemoBullets = (memoContent: MemoBullet[] | string): ParsedBullet[] => {
  if (typeof memoContent === 'string') {
    return memoContent
      .split(/(?<=[.。])\s+/)
      .filter(s => s.trim().length > 20)
      .map(s => parseBullet(s.trim()));
  }
  if (Array.isArray(memoContent)) {
    return memoContent.map(parseBullet);
  }
  return [];
};

// Extract memo content from any sections format
const getMemoContent = (sections: unknown, reasoning: string | null, essence: string | null): MemoBullet[] | string => {
  if (!sections) return reasoning || essence || '';

  let obj: unknown = sections;
  if (typeof sections === 'string') {
    try { obj = JSON.parse(sections); } catch { return reasoning || essence || ''; }
  }

  // Array format: [{ type: "memo", content: ... }]
  if (Array.isArray(obj)) {
    const memo = (obj as any[]).find(s => s.type === 'memo');
    if (memo?.content) return memo.content;
  }

  // Object format: { memo: string | MemoBullet[] }
  if (typeof obj === 'object' && obj !== null && 'memo' in obj) {
    return (obj as any).memo;
  }

  return reasoning || essence || '';
};

// ─── SignalTooltip ────────────────────────────────────────────────────────────

function SignalTooltip({
  signal,
  visible,
  onClose,
}: {
  signal: Signal | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!visible || !signal) return null;

  const url = getBestUrl(signal.raw_sources);
  const domain = url ? getDomain(url) : (signal.scan_source || '');

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 49 }}
      />

      <div style={{
        position: 'absolute',
        zIndex: 50,
        bottom: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 280,
        background: colors.text.primary.light,
        borderRadius: radius.md,
        padding: '12px 14px',
        boxShadow: shadow.lg,
        color: colors.text.primary.dark,
      }}>
        {/* Arrow */}
        <div style={{
          position: 'absolute',
          bottom: -6,
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          width: 12,
          height: 12,
          background: colors.text.primary.light,
          borderRadius: 2,
        }} />

        <p style={{
          fontSize: 12, fontWeight: 600, lineHeight: 1.4,
          margin: '0 0 8px', color: '#fff',
        }}>
          {signal.title}
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: 'rgba(255,255,255,0.5)',
          marginBottom: url ? 10 : 0,
        }}>
          {domain && <span>{domain}</span>}
          {signal.first_seen && (
            <>
              {domain && <span>·</span>}
              <span>{formatDate(signal.first_seen)}</span>
            </>
          )}
        </div>

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: typography.weight.semibold,
              color: colors.accent.amber, textDecoration: 'none',
            }}
          >
            Read source ↗
          </a>
        )}
      </div>
    </>
  );
}

// ─── HighlightMark ────────────────────────────────────────────────────────────

function HighlightMark({
  phrase,
  signalId,
  signals,
}: {
  phrase: string;
  signalId: string | null;
  signals: Signal[];
}) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  const signal = signalId
    ? signals.find(s => s.id === signalId) || null
    : null;

  const isClickable = signal !== null;

  return (
    <span style={{ position: 'relative', display: 'inline' }}>
      <mark
        onClick={() => isClickable && setTooltipVisible(v => !v)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered
            ? colors.accent.amberHover
            : colors.accent.amberLight,
          color: 'inherit',
          borderRadius: 2,
          padding: '1px 2px',
          fontWeight: typography.weight.semibold,
          cursor: isClickable ? 'pointer' : 'default',
          borderBottom: isClickable
            ? `1px solid ${colors.accent.amber}`
            : 'none',
          transition: transition.fast,
        }}
      >
        {phrase}
        {isClickable && (
          <span style={{
            fontSize: 9, verticalAlign: 'super',
            color: colors.accent.amber, marginLeft: 2, fontWeight: typography.weight.bold,
          }}>
            ↗
          </span>
        )}
      </mark>

      {tooltipVisible && (
        <SignalTooltip
          signal={signal}
          visible={tooltipVisible}
          onClose={() => setTooltipVisible(false)}
        />
      )}
    </span>
  );
}

// ─── Render bullet with highlights ────────────────────────────────────────────

function BulletContent({ parsed, signals }: { parsed: ParsedBullet; signals: Signal[] }) {
  return (
    <span>
      {parsed.segments.map((seg, i) =>
        seg.isHighlight ? (
          <HighlightMark
            key={i}
            phrase={seg.text}
            signalId={seg.signalId}
            signals={signals}
          />
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}

// ─── InsightDetail ────────────────────────────────────────────────────────────

export default function InsightDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [position, setPosition] = useState<Position | null>(null);
  const [thread, setThread] = useState<ThreadInfo | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllSignals, setShowAllSignals] = useState(false);
  const [hoveredSignal, setHoveredSignal] = useState<string | null>(null);
  const [hoveredExpand, setHoveredExpand] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        // Fetch position by ID
        const { data: posData } = await (supabase as any)
          .from('positions')
          .select('id, title, tone, why_now, reasoning, position_essence, cover_image_url, signal_refs, fact_confidence, signal_basis, sections, validated_at, validation_issues, created_at, decision_thread_id')
          .eq('id', id)
          .single();

        const pos = posData;
        if (pos) setPosition(pos);

        // Fetch thread info from position's decision_thread_id
        if (pos?.decision_thread_id) {
          const { data: threadData } = await (supabase as any)
            .from('decision_threads')
            .select('id, title, lens, key_question, cover_image_url')
            .eq('id', pos.decision_thread_id)
            .single();
          if (threadData) setThread(threadData);
        }

        // Fetch signals from signal_refs
        const sigRefs = pos?.signal_refs || [];
        const signalIds: string[] = sigRefs
          .map((ref: any) => (typeof ref === 'string' ? ref : ref?.id))
          .filter(Boolean);

        if (signalIds.length > 0) {
          const { data: sigData } = await supabase
            .from('signals')
            .select('id, title, credibility, summary, role_in_insight, urgency, scan_source, first_seen, raw_sources, created_at')
            .in('id', signalIds)
            .order('credibility', { ascending: false });
          if (sigData) setSignals(sigData);
        }
      } catch (err) {
        console.error('[InsightDetail] Error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ─── Loading / Error ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#aaa', fontSize: 14 }}>Loading insight...</p>
      </div>
    );
  }

  if (!position) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <p style={{ color: '#aaa', fontSize: 14 }}>Insight not found.</p>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#111', textDecoration: 'underline' }}
        >
          ← Back to feed
        </button>
      </div>
    );
  }

  const visibleSignals = showAllSignals ? signals : signals.slice(0, 3);

  // ─── Parse sections ──────────────────────────────────────────────────────

  const { parsed: sectionsParsed } = parseSections(position.sections);
  const keyNumbers = sectionsParsed?.key_numbers;

  const memoContent = getMemoContent(position.sections, position.reasoning, position.position_essence);
  const memoBullets = parseMemoBullets(memoContent);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT }}>

      {/* Header — matches Feed */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: colors.bg.light, borderBottom: `1px solid ${colors.border.light}`,
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span
          onClick={() => navigate('/')}
          style={{ fontSize: 24, fontWeight: 900, letterSpacing: typography.letterSpacing.tight, color: colors.text.primary.light, cursor: 'pointer' }}
        >
          AUO
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: '#9ca3af' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#111', color: '#fff', border: 'none',
              borderRadius: 20, padding: '8px 18px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#374151')}
            onMouseLeave={e => (e.currentTarget.style.background = '#111')}
          >
            <span style={{ fontSize: 17, lineHeight: 1 }}>+</span> Add topic
          </button>
          <div onClick={() => navigate('/alert-sources')} style={{
            width: 34, height: 34, borderRadius: '50%', background: '#111', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>D</div>
        </div>
      </header>

      {/* Sub-nav — back link */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: '#666',
            display: 'flex', alignItems: 'center', gap: 4,
            padding: 0,
          }}
        >
          ← Your insights
        </button>
      </div>

      {/* Page content — with bottom padding for fixed chat bar */}
      <div style={{ paddingBottom: 80 }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Hero */}
          <div style={{ padding: '32px 24px 24px' }}>
            {/* Meta row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <ToneBadge tone={position.tone || 'WATCH'} />
              {thread?.lens && (
                <span style={{ fontSize: 13, color: '#666' }}>{formatLens(thread.lens)}</span>
              )}
              <span style={{ fontSize: 13, color: '#aaa' }}>·</span>
              <span style={{ fontSize: 13, color: '#aaa' }}>{signals.length} signal{signals.length !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: 13, color: '#aaa' }}>·</span>
              <span style={{ fontSize: 13, color: '#aaa' }}>{timeAgo(position.created_at)}</span>
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: 28, fontWeight: 700, lineHeight: 1.25,
              marginBottom: 16, color: '#111', letterSpacing: '-0.02em',
            }}>
              {position.title}
            </h1>

            {/* why_now — full */}
            {position.why_now && (
              <p style={{
                fontSize: 16, lineHeight: 1.6, color: '#444',
                margin: 0, borderLeft: '3px solid #111', paddingLeft: 16,
              }}>
                {position.why_now}
              </p>
            )}
          </div>

          {/* SIGNAL BASIS */}
          {position.signal_basis && (
            <div style={{
              padding: '20px 24px',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              gap: 24,
              flexWrap: 'wrap' as const,
            }}>
              {/* Sources */}
              {position.signal_basis.source_names?.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    color: '#bbb', textTransform: 'uppercase' as const, marginBottom: 6,
                  }}>
                    Sources
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                    {position.signal_basis.source_names.map((domain: string) => (
                      <span key={domain} style={{
                        fontSize: 12, fontWeight: 500, color: '#444',
                        padding: '2px 8px', borderRadius: 4, background: '#F0F0F0',
                      }}>
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Signal count */}
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  color: '#bbb', textTransform: 'uppercase' as const, marginBottom: 6,
                }}>
                  Signals
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                  {position.signal_basis.signal_count} independent signal{position.signal_basis.signal_count !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Most recent */}
              {position.signal_basis.most_recent_date && (
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    color: '#bbb', textTransform: 'uppercase' as const, marginBottom: 6,
                  }}>
                    Most Recent
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                    {formatRecency(position.signal_basis.most_recent_date)}
                  </div>
                </div>
              )}

              {/* Evidence strength bars */}
              <div style={{ width: '100%' }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  color: '#bbb', textTransform: 'uppercase' as const, marginBottom: 8,
                }}>
                  Evidence Strength
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                  {([
                    { label: 'Source quality', value: position.signal_basis.source_quality },
                    { label: 'Recency', value: position.signal_basis.recency_score },
                    { label: 'Convergence', value: position.signal_basis.convergence_score },
                  ] as const).map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: '#888', width: 110, flexShrink: 0 }}>
                        {label}
                      </span>
                      <div style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: '#EBEBEB', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          width: `${Math.round((value || 0) * 100)}%`,
                          background: (value || 0) >= 0.75
                            ? colors.evidence.strong
                            : (value || 0) >= 0.5
                            ? colors.evidence.moderate
                            : colors.evidence.weak,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#aaa', width: 32, textAlign: 'right' as const }}>
                        {Math.round((value || 0) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* WHY THIS MATTERS — amber highlight section */}
          {memoBullets.length > 0 && (
            <div style={{
              padding: `${spacing["6"]} ${spacing["6"]}`,
              borderTop: `1px solid ${colors.border.light}`,
              borderLeft: `3px solid ${colors.accent.amber}`,
              background: colors.accent.amberLight,
              marginLeft: spacing["6"],
              marginRight: spacing["6"],
              marginTop: spacing["6"],
              borderRadius: `0 ${radius.md} ${radius.md} 0`,
            }}>
              <h3 style={{
                fontSize: typography.size.xs,
                fontWeight: typography.weight.bold,
                letterSpacing: typography.letterSpacing.wider,
                color: colors.accent.amber,
                marginBottom: spacing["4"],
                textTransform: 'uppercase' as const,
              }}>
                Why this matters
              </h3>

              <ul style={{
                margin: 0, padding: 0, listStyle: 'none',
                display: 'flex', flexDirection: 'column', gap: spacing["3"],
              }}>
                {memoBullets.map((bullet, i) => (
                  <li key={i} style={{
                    display: 'flex', gap: spacing["3"], alignItems: 'flex-start',
                  }}>
                    <span style={{
                      color: colors.accent.amber,
                      fontWeight: typography.weight.bold,
                      marginTop: '2px',
                      flexShrink: 0,
                      fontSize: typography.size.md,
                    }}>
                      •
                    </span>
                    <span style={{
                      fontSize: typography.size.md,
                      lineHeight: typography.lineHeight.relaxed,
                      color: colors.text.primary.light,
                    }}>
                      <BulletContent parsed={bullet} signals={signals} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key numbers grid */}
          {keyNumbers && keyNumbers.length > 0 && (
            <div style={{ padding: `${spacing["6"]} ${spacing["6"]}`, background: colors.bg.surface }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
              }}>
                {keyNumbers.map((kn, i) => (
                  <div key={i} style={{
                    padding: '14px 16px',
                    borderRadius: radius.md,
                    background: colors.bg.card.light,
                    border: `1px solid ${colors.border.light}`,
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 4 }}>
                      {kn.value}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {kn.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SIGNALS */}
          {signals.length > 0 && (
            <div style={{ padding: 24 }}>
              <h3 style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                color: '#999', marginBottom: 16, textTransform: 'uppercase' as const,
              }}>
                Signals ({signals.length})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {visibleSignals.map(signal => {
                  const url = getBestUrl(signal.raw_sources);
                  const domain = url ? getDomain(url) : null;

                  return (
                    <div
                      key={signal.id}
                      onMouseEnter={() => setHoveredSignal(signal.id)}
                      onMouseLeave={() => setHoveredSignal(null)}
                      style={{
                        padding: 16, borderRadius: radius.md,
                        border: hoveredSignal === signal.id
                          ? `1px solid rgba(0,0,0,0.2)`
                          : `1px solid ${colors.border.light}`,
                        background: colors.bg.card.light,
                        boxShadow: hoveredSignal === signal.id ? shadow.sm : 'none',
                        transition: transition.base,
                        cursor: 'pointer',
                      }}
                    >
                      {/* Role badge */}
                      <div style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                        background: '#F0F0F0', fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.06em', color: '#666', marginBottom: 8,
                        textTransform: 'uppercase' as const,
                      }}>
                        {formatRole(signal.role_in_insight || '')}
                      </div>

                      {/* Title */}
                      <p style={{
                        fontSize: 14, fontWeight: 600, color: '#111',
                        marginBottom: 6, lineHeight: 1.4,
                      }}>
                        {signal.title}
                      </p>

                      {/* Summary */}
                      {signal.summary && (
                        <p style={{
                          fontSize: 13, color: '#666', marginBottom: 10, lineHeight: 1.5,
                        }}>
                          {signal.summary}
                        </p>
                      )}

                      {/* Meta row + source link */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: 8,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#999' }}>
                          {domain && <span>{domain}</span>}
                          {signal.first_seen && (
                            <>
                              {domain && <span>·</span>}
                              <span>{formatDate(signal.first_seen)}</span>
                            </>
                          )}
                        </div>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{
                              fontSize: 12, color: colors.text.primary.light,
                              textDecoration: 'none', fontWeight: typography.weight.medium,
                              borderBottom: '1px solid transparent',
                              transition: transition.fast,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderBottomColor = '#111'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
                          >
                            Read source ↗
                          </a>
                        ) : (
                          <span style={{ fontSize: 12, color: '#bbb' }}>No source link</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {signals.length > 3 && !showAllSignals && (
                <button
                  onClick={() => setShowAllSignals(true)}
                  onMouseEnter={() => setHoveredExpand(true)}
                  onMouseLeave={() => setHoveredExpand(false)}
                  style={{
                    marginTop: 12, padding: '10px 16px', borderRadius: 8,
                    border: `1px solid ${colors.border.light}`,
                    background: hoveredExpand ? colors.bg.surface : 'transparent',
                    fontSize: typography.size.base, cursor: 'pointer',
                    color: colors.text.secondary.light, width: '100%',
                    transition: transition.base,
                  }}
                >
                  + {signals.length - 3} more signals
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom ASK AUO chat bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center',
        padding: `${spacing["3"]} ${spacing["4"]}`,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: `1px solid ${colors.border.light}`,
      }}>
        <div style={{
          width: '100%',
          maxWidth: 640,
          display: 'flex',
          gap: spacing["2"],
          alignItems: 'center',
        }}>
          <input
            placeholder="Ask AUO anything about this insight..."
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: radius.md,
              border: `1px solid ${colors.border.medium}`,
              fontSize: typography.size.md,
              background: colors.bg.surface,
              outline: 'none',
              color: colors.text.primary.light,
              fontFamily: typography.fontFamily,
            }}
            disabled
          />
          <button style={{
            padding: '10px 16px',
            borderRadius: radius.md,
            background: colors.text.primary.light,
            color: colors.text.primary.dark,
            border: 'none',
            fontSize: typography.size.base,
            fontWeight: typography.weight.semibold,
            fontFamily: typography.fontFamily,
            cursor: 'not-allowed',
            opacity: 0.4,
          }}>
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
