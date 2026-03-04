import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { parseSections } from '@/lib/position-utils';
import { colors, typography, spacing, radius, transition, shadow } from '../design-tokens';
import AppHeader from '../components/AppHeader';

// ─── useMediaQuery ───────────────────────────────────────────────────────────

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
};

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
  is_monitored?: boolean | null;
  monitor_set_at?: string | null;
  monitor_alert_threshold?: string | null;
  monitor_last_signal_count?: number | null;
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
  source_date: string | null;
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

const stripMd = (text: string) =>
  text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^[-*]\s/gm, '')
    .trim();

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

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatDateUTC = (dateStr: string): string => {
  const d = dateStr.slice(0, 10); // "2026-03-02"
  const [, m, day] = d.split('-');
  return `${MONTHS[parseInt(m) - 1]} ${parseInt(day)}`;
};

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

// ─── Signal dedup + URL filter ────────────────────────────────────────────────

const dedupSignals = (sigs: Signal[]): Signal[] => {
  const result: Signal[] = [];
  for (const sig of sigs) {
    const words = new Set(sig.title.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const isDupe = result.some(existing => {
      const existWords = new Set(existing.title.toLowerCase().split(/\s+/).filter(w => w.length > 2));
      const smaller = Math.min(words.size, existWords.size);
      if (smaller === 0) return false;
      const overlap = [...words].filter(w => existWords.has(w)).length;
      return overlap / smaller >= 0.8;
    });
    if (!isDupe) result.push(sig);
  }
  return result;
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
          {(signal.source_date || signal.first_seen) && (
            <>
              {domain && <span>·</span>}
              <span>{signal.source_date ? formatDateUTC(signal.source_date) : formatDate(signal.first_seen!)}</span>
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

// ─── NoteItem ─────────────────────────────────────────────────────────────────

function NoteItem({
  note,
  onEdit,
  onDelete,
}: {
  note: any;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(note.content);

  const handleSave = () => {
    if (editText.trim() && editText.trim() !== note.content) {
      onEdit(note.id, editText.trim());
    }
    setEditing(false);
  };

  return (
    <div
      className="note-row"
      style={{
        marginBottom: 10,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
      }}
    >
      <span style={{ fontSize: 13, color: '#999', marginTop: 1, flexShrink: 0 }}>●</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: '#bbb', marginBottom: 3 }}>
          {new Date(note.created_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </div>
        {editing ? (
          <div>
            <textarea
              autoFocus
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
              rows={2}
              style={{
                width: '100%', padding: '6px 10px',
                border: '1px solid #ddd', borderRadius: 6,
                fontSize: 13, fontFamily: FONT,
                resize: 'none', outline: 'none',
                boxSizing: 'border-box' as const,
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button onClick={handleSave} style={{
                fontSize: 11, padding: '3px 10px',
                background: '#111', color: '#fff',
                border: 'none', borderRadius: 5, cursor: 'pointer', fontFamily: FONT,
              }}>Save</button>
              <button onClick={() => { setEditText(note.content); setEditing(false); }} style={{
                fontSize: 11, padding: '3px 10px',
                background: 'none', color: '#999',
                border: '1px solid #e5e5e5', borderRadius: 5, cursor: 'pointer', fontFamily: FONT,
              }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setEditing(true)}
            style={{ fontSize: 13, color: '#333', lineHeight: 1.5, cursor: 'pointer' }}
          >
            {note.content}
          </div>
        )}
      </div>
      {!editing && (
        <button
          className="note-delete-btn"
          onClick={() => onDelete(note.id)}
          style={{
            background: 'none', border: 'none',
            fontSize: 14, color: '#ccc', cursor: 'pointer',
            opacity: 0, transition: 'opacity 0.15s',
            padding: '0 4px', flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
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
  const [hoveredCrossChecked, setHoveredCrossChecked] = useState(false);
  const [isMonitored, setIsMonitored] = useState(false);
  const [monitorThreshold, setMonitorThreshold] = useState('normal');
  const [showUrgencyPicker, setShowUrgencyPicker] = useState(false);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 900px)');

  // Notes & chat state
  const [userNotes, setUserNotes] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
  const [pendingAction, setPendingAction] = useState<{ type: string; content: string; key_question?: string; lens?: string; thread_id?: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [addingNote, setAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [convOpen, setConvOpen] = useState(true);
  const [showAllConv, setShowAllConv] = useState(false);
  const convEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        // Fetch position by ID
        const { data: posData } = await (supabase as any)
          .from('positions')
          .select('id, title, tone, why_now, reasoning, position_essence, cover_image_url, signal_refs, fact_confidence, signal_basis, sections, validated_at, validation_issues, created_at, decision_thread_id, is_monitored, monitor_set_at, monitor_alert_threshold, monitor_last_signal_count')
          .eq('id', id)
          .single();

        const pos = posData;
        if (pos) {
          setPosition(pos);
          setIsMonitored(pos.is_monitored || false);
          setMonitorThreshold(pos.monitor_alert_threshold || 'normal');
        }

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
            .select('id, title, credibility, summary, role_in_insight, urgency, scan_source, first_seen, source_date, raw_sources, created_at')
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

  // Fetch userId
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Fetch position_notes — dedup + split into userNotes vs conversation
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('position_notes')
        .select('*')
        .eq('position_id', id)
        .order('created_at', { ascending: true });
      // Dedup by content+time to fix existing doubles
      const seen = new Set<string>();
      const deduped = (data || []).filter((n: any) => {
        const key = `${n.type}-${(n.content || '').slice(0, 40)}-${(n.created_at || '').slice(0, 16)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setUserNotes(deduped.filter((n: any) => n.type === 'note' && !n.metadata?.is_chat));
      setConversation(deduped.filter((n: any) => n.type === 'auo_response' || n.metadata?.is_chat));
    })();
  }, [id]);

  // Auto-scroll conversation
  useEffect(() => {
    convEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // ─── Notes handlers ─────────────────────────────────────────────────────

  const saveDirectNote = async () => {
    if (!newNoteText.trim() || !id) return;
    const { data } = await (supabase as any)
      .from('position_notes')
      .insert({ position_id: id, user_id: userId, type: 'note', content: newNoteText.trim() })
      .select().single();
    if (data) setUserNotes(prev => [...prev, data]);
    setNewNoteText('');
    setAddingNote(false);
  };

  const updateNote = async (noteId: string, text: string) => {
    await (supabase as any).from('position_notes').update({ content: text }).eq('id', noteId).catch(() => {});
    setUserNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: text } : n));
  };

  const deleteNote = async (noteId: string) => {
    setUserNotes(prev => prev.filter(n => n.id !== noteId));
    await (supabase as any).from('position_notes').delete().eq('id', noteId).catch(() => {});
  };

  const deleteConversationMsg = async (msgId: string) => {
    if (!window.confirm('Delete this message permanently?')) return;
    setConversation(prev => prev.filter(m => m.id !== msgId));
    await (supabase as any).from('position_notes').delete().eq('id', msgId).catch(() => {});
  };

  // ─── Chat handler ───────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!inputValue.trim() || sendingRef.current || !id) return;
    sendingRef.current = true;
    setSending(true);
    const message = inputValue.trim();
    setInputValue('');

    // Save user message as 'note' with is_chat metadata (DB constraint only allows 'note'|'auo_response')
    const { data: userMsg } = await (supabase as any)
      .from('position_notes')
      .insert({ position_id: id, user_id: userId, type: 'note', content: message, metadata: { is_chat: true } })
      .select().single();
    if (userMsg) setConversation(prev => [...prev, userMsg]);

    // Call AUO
    try {
      const res = await fetch(
        'https://dkk222--auo-scanner-insight-chat.modal.run',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            position_id: id,
            message,
            history: conversationHistory,
          }),
        }
      );
      const data = await res.json();

      const { data: auoMsg } = await (supabase as any)
        .from('position_notes')
        .insert({
          position_id: id,
          user_id: userId,
          type: 'auo_response',
          content: data.response,
          metadata: { intent: data.intent, action: data.action },
        })
        .select().single();
      if (auoMsg) setConversation(prev => [...prev, auoMsg]);

      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: data.response },
      ]);

      if (data.action && data.action.type !== 'none') {
        setPendingAction(data.action);
      }
    } catch (e) {
      console.error('[InsightDetail] AUO chat failed:', e);
      setConversation(prev => [...prev, {
        id: 'err-' + Date.now(),
        type: 'auo_response',
        content: 'Sorry, I could not respond right now.',
        created_at: new Date().toISOString(),
      }]);
    }

    sendingRef.current = false;
    setSending(false);
  };

  // ─── Action confirm handler ─────────────────────────────────────────────

  const handleConfirmAction = async (action: { type: string; content: string; key_question?: string; lens?: string; thread_id?: string }) => {
    if (action.type === 'note') {
      const { data } = await (supabase as any)
        .from('position_notes')
        .insert({ position_id: id, user_id: userId, type: 'note', content: action.content, metadata: { source: 'auo_generated' } })
        .select().single();
      if (data) setUserNotes(prev => [...prev, data]);
    } else if (action.type === 'create_topic') {
      await (supabase as any).from('decision_threads').insert({
        user_id: userId,
        title: action.content,
        key_question: action.key_question || action.content,
        lens: action.lens || 'market',
        status: 'active',
      }).catch((e: any) => console.error('[InsightDetail] Create topic failed:', e));
    } else if (action.type === 'scan' && action.thread_id) {
      await fetch('https://dkk222--auo-scanner-scan-priority-endpoint.modal.run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, thread_id: action.thread_id }),
      }).catch(() => {});
    }
    setPendingAction(null);
  };

  // ─── Monitor handlers ────────────────────────────────────────────────────

  const monitorDropdownRef = useRef<HTMLDivElement>(null);
  const [pendingThreshold, setPendingThreshold] = useState<'normal' | 'high' | 'breaking' | null>(null);

  const handleMonitorToggle = () => {
    setShowUrgencyPicker(prev => {
      if (!prev) {
        // Opening: pre-select current saved threshold
        setPendingThreshold(isMonitored ? (monitorThreshold as 'normal' | 'high' | 'breaking') : null);
      }
      return !prev;
    });
  };

  const handleSaveMonitor = async () => {
    if (!position || !pendingThreshold) return;
    setMonitorLoading(true);
    setShowUrgencyPicker(false);

    const { error } = await (supabase as any)
      .from('positions')
      .update({
        is_monitored: true,
        monitor_set_at: new Date().toISOString(),
        monitor_alert_threshold: pendingThreshold,
        monitor_last_signal_count: position.signal_refs?.length || 0,
      })
      .eq('id', position.id);

    if (!error) {
      setIsMonitored(true);
      setMonitorThreshold(pendingThreshold);
    }
    setMonitorLoading(false);
  };

  const handleStopMonitoring = async () => {
    if (!position) return;
    setShowUrgencyPicker(false);
    setIsMonitored(false);
    await (supabase as any)
      .from('positions')
      .update({ is_monitored: false, monitor_set_at: null, monitor_alert_threshold: null })
      .eq('id', position.id);
  };

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!showUrgencyPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (monitorDropdownRef.current && !monitorDropdownRef.current.contains(e.target as Node)) {
        setShowUrgencyPicker(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowUrgencyPicker(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showUrgencyPicker]);

  // ─── "Ready to share" logic ─────────────────────────────────────────────

  const showReadyToShare = (
    isMonitored &&
    (position?.monitor_last_signal_count || 0) >= 3 &&
    position?.monitor_set_at &&
    Date.now() - new Date(position.monitor_set_at).getTime() > 86400000
  );

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

  // Fix 2: exclude signals without a source URL; Fix 4: dedup by title overlap
  const filteredSignals = dedupSignals(signals.filter(s => getBestUrl(s.raw_sources) !== null));
  const visibleSignals = showAllSignals ? filteredSignals : filteredSignals.slice(0, 3);

  // ─── Parse sections ──────────────────────────────────────────────────────

  const { parsed: sectionsParsed } = parseSections(position.sections);
  const keyNumbers = sectionsParsed?.key_numbers;

  const memoContent = getMemoContent(position.sections, position.reasoning, position.position_essence);
  const memoBullets = parseMemoBullets(memoContent);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT }}>

      <AppHeader />

      {/* Sub-nav — back link */}
      <div style={{
        padding: '12px 24px',
        borderBottom: 'none',
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

      {/* Two-column grid on desktop, single column on mobile */}
      <div style={{
        display: isDesktop ? 'grid' : 'block',
        gridTemplateColumns: isDesktop ? '1fr 1fr' : undefined,
        maxWidth: isDesktop ? 1200 : 680,
        margin: '0 auto',
        height: isDesktop ? 'calc(100vh - 120px)' : undefined,
      }}>

        {/* ─── LEFT COLUMN: Hero + Signal Basis ─────────────────────────── */}
        <div style={{
          padding: isDesktop ? '40px 40px 120px' : '32px 24px 24px',
          borderRight: 'none',
          overflowY: isDesktop ? 'auto' : undefined,
          height: isDesktop ? '100%' : undefined,
        }}>
          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <ToneBadge tone={position.tone || 'WATCH'} />
            {thread?.lens && (
              <span style={{ fontSize: 13, color: '#666' }}>{formatLens(thread.lens)}</span>
            )}
            <span style={{ fontSize: 13, color: '#aaa' }}>·</span>
            <span style={{ fontSize: 13, color: '#aaa' }}>{filteredSignals.length} signal{filteredSignals.length !== 1 ? 's' : ''}</span>
            <span style={{ fontSize: 13, color: '#aaa' }}>·</span>
            <span style={{ fontSize: 13, color: '#aaa' }}>{timeAgo(position.created_at)}</span>

            <div ref={monitorDropdownRef} style={{ marginLeft: 'auto', position: 'relative' }}>
              <button
                onClick={handleMonitorToggle}
                disabled={monitorLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 20,
                  border: isMonitored ? '1.5px solid #111' : '1.5px solid rgba(0,0,0,0.15)',
                  background: isMonitored ? '#111' : 'transparent',
                  color: isMonitored ? '#fff' : '#555',
                  fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  fontFamily: FONT,
                }}
              >
                {monitorLoading ? '...' : !isMonitored ? '◎ Monitor'
                  : monitorThreshold === 'breaking' ? '⚡ Breaking'
                  : monitorThreshold === 'high' ? '● Priority'
                  : '◎ Standard'}
                <span style={{ fontSize: 10, marginLeft: 2 }}>▾</span>
              </button>

              {/* Inline monitor dropdown */}
              {showUrgencyPicker && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 280,
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  zIndex: 200,
                  fontFamily: FONT,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 12 }}>
                    How closely should AUO watch this?
                  </div>

                  {([
                    { id: 'normal' as const, label: 'Standard', description: 'Updates with regular scans', icon: '◎' },
                    { id: 'high' as const, label: 'Priority', description: 'Frequent scans — email on new signals', icon: '●' },
                    { id: 'breaking' as const, label: 'Breaking', description: 'Every 20 min — immediate email alert', icon: '⚡' },
                  ]).map(option => {
                    const selected = pendingThreshold === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setPendingThreshold(option.id)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          width: '100%', padding: '10px 12px', marginBottom: 4,
                          background: selected ? '#f5f5f5' : 'transparent',
                          border: 'none', borderRadius: 8,
                          cursor: 'pointer', textAlign: 'left' as const,
                          fontFamily: FONT, transition: transition.fast,
                        }}
                        onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f5f5f5'; }}
                        onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{
                          width: 14, height: 14, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                          border: selected ? 'none' : '1.5px solid #ccc',
                          background: selected ? '#111' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {selected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                        </span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: selected ? 600 : 500, color: '#111' }}>
                            {option.icon} {option.label}
                          </div>
                          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                            {option.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Save button — shown when selection differs from saved state */}
                  {pendingThreshold && !(isMonitored && monitorThreshold === pendingThreshold) && (
                    <button
                      onClick={handleSaveMonitor}
                      style={{
                        width: '100%', padding: '10px 0', marginTop: 8,
                        background: '#111', color: '#fff', border: 'none', borderRadius: 8,
                        fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', fontFamily: FONT, transition: transition.fast,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#333'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#111'; }}
                    >
                      Save
                    </button>
                  )}

                  {isMonitored && (
                    <>
                      <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '8px 0' }} />
                      <button
                        onClick={handleStopMonitoring}
                        style={{
                          width: '100%', padding: '8px 12px',
                          background: 'transparent', border: 'none', borderRadius: 8,
                          fontSize: 12, fontWeight: 500, color: '#999',
                          cursor: 'pointer', textAlign: 'left' as const,
                          fontFamily: FONT, transition: transition.fast,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#999'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        Stop monitoring
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: isDesktop ? 32 : 28, fontWeight: 700, lineHeight: 1.2,
            marginBottom: 20, color: '#111', letterSpacing: '-0.02em',
          }}>
            {position.title}
          </h1>

          {/* why_now */}
          {position.why_now && (
            <p style={{
              fontSize: 16, lineHeight: 1.6, color: '#444',
              margin: '0 0 24px', borderLeft: '3px solid #111', paddingLeft: 16,
            }}>
              {position.why_now}
            </p>
          )}

          {/* SIGNAL BASIS */}
          {position.signal_basis && (
            <div style={{
              paddingTop: 20,
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
                  {(() => {
                    const sourceCount = position.signal_basis!.source_names?.length || 0;
                    const signalCount = position.signal_basis!.signal_count;
                    const sourceLabel = sourceCount >= 3
                      ? `${sourceCount} sources`
                      : sourceCount >= 2
                      ? `${sourceCount} sources`
                      : sourceCount === 1
                      ? '1 source'
                      : '';
                    return sourceLabel
                      ? `${sourceLabel} · ${signalCount} signal${signalCount !== 1 ? 's' : ''}`
                      : `${signalCount} signal${signalCount !== 1 ? 's' : ''}`;
                  })()}
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
                    { label: 'Source quality', key: 'source_quality', value: position.signal_basis.source_quality },
                    { label: 'Recency', key: 'recency', value: position.signal_basis.recency_score },
                    { label: 'Cross-checked', key: 'cross_checked', value: position.signal_basis.convergence_score },
                  ] as const).map(({ label, key, value }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          fontSize: 12, color: '#888', width: 110, flexShrink: 0,
                          position: 'relative' as const,
                          cursor: key === 'cross_checked' ? 'help' : 'default',
                          borderBottom: key === 'cross_checked' ? '1px dotted #ccc' : 'none',
                        }}
                        onMouseEnter={() => key === 'cross_checked' && setHoveredCrossChecked(true)}
                        onMouseLeave={() => key === 'cross_checked' && setHoveredCrossChecked(false)}
                      >
                        {label}
                        {key === 'cross_checked' && hoveredCrossChecked && (
                          <span style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 6px)',
                            left: 0,
                            width: 220,
                            padding: '8px 10px',
                            borderRadius: radius.sm,
                            background: colors.text.primary.light,
                            color: '#fff',
                            fontSize: 11,
                            lineHeight: 1.4,
                            fontWeight: typography.weight.regular,
                            boxShadow: shadow.md,
                            zIndex: 10,
                            pointerEvents: 'none' as const,
                          }}>
                            {filteredSignals.length} source{filteredSignals.length !== 1 ? 's' : ''} confirm this insight.
                          </span>
                        )}
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

          {/* Ready to share CTA */}
          {showReadyToShare && position.monitor_set_at && (
            <div style={{
              margin: '24px 0 0',
              padding: 16,
              background: 'rgba(0,0,0,0.03)',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                You've been monitoring this for{' '}
                {Math.floor(
                  (Date.now() - new Date(position.monitor_set_at).getTime()) / 86400000
                )}{' '}
                days · {position.monitor_last_signal_count} signals tracked
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 4 }}>
                Opinion formed?
              </div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 14, lineHeight: 1.5 }}>
                When you're ready, share this insight with your team.
                AUO will continue tracking evidence.
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `${window.location.origin}/insights/${position.id}`
                  );
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
                style={{
                  width: '100%', padding: 12,
                  background: '#111', color: '#fff', border: 'none',
                  borderRadius: 10, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: FONT,
                }}
              >
                {linkCopied ? 'Link copied!' : 'Share with team \u2192'}
              </button>
            </div>
          )}

          {/* Key numbers grid */}
          {keyNumbers && keyNumbers.length > 0 && (
            <div style={{ paddingTop: 24, background: colors.bg.surface, marginTop: 24, borderRadius: radius.md, padding: 20 }}>
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
        </div>

        {/* ─── RIGHT COLUMN: Why This Matters + Signals ─────────────────── */}
        <div style={{
          padding: isDesktop ? '40px 40px 120px' : '0 24px 120px',
          borderTop: isDesktop ? 'none' : `1px solid ${colors.border.light}`,
          overflowY: isDesktop ? 'auto' : undefined,
          height: isDesktop ? '100%' : undefined,
        }}>

          {/* WHY THIS MATTERS — amber highlight section */}
          {memoBullets.length > 0 && (
            <div style={{
              padding: spacing["6"],
              borderLeft: `3px solid ${colors.accent.amber}`,
              background: colors.accent.amberLight,
              borderRadius: `0 ${radius.md} ${radius.md} 0`,
              marginBottom: 24,
              marginTop: isDesktop ? 0 : 24,
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

          {/* SIGNALS */}
          {filteredSignals.length > 0 && (
            <div>
              <h3 style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                color: '#999', marginBottom: 16, textTransform: 'uppercase' as const,
              }}>
                Signals ({filteredSignals.length})
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
                          {(signal.source_date || signal.first_seen) && (
                            <>
                              {domain && <span>·</span>}
                              <span>{signal.source_date ? formatDateUTC(signal.source_date) : formatDate(signal.first_seen!)}</span>
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

              {filteredSignals.length > 3 && !showAllSignals && (
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
                  + {filteredSignals.length - 3} more signals
                </button>
              )}
            </div>
          )}

        </div>

      </div>

      {/* ─── NOTES — full width, permanent items ──────────────────────── */}
      <div style={{
        maxWidth: isDesktop ? 1200 : 680,
        margin: '0 auto',
        padding: '24px 24px 0',
        borderTop: '1px solid #f0f0f0',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 12,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#999',
            letterSpacing: '0.6px', textTransform: 'uppercase' as const,
          }}>
            Notes
          </span>
          <button
            onClick={() => setAddingNote(true)}
            style={{
              fontSize: 12, color: '#111', background: 'none',
              border: '1px solid #e5e5e5', borderRadius: 6,
              padding: '4px 10px', cursor: 'pointer', fontFamily: FONT,
            }}
          >
            + Add note
          </button>
        </div>

        {addingNote && (
          <div style={{ marginBottom: 12 }}>
            <textarea
              autoFocus
              value={newNoteText}
              onChange={e => setNewNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveDirectNote(); } }}
              placeholder="Write a note..."
              rows={2}
              style={{
                width: '100%', padding: '8px 12px',
                border: '1px solid #ddd', borderRadius: 6,
                fontSize: 13, fontFamily: FONT,
                resize: 'none', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={saveDirectNote} style={{
                fontSize: 12, padding: '5px 12px',
                background: '#111', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: FONT,
              }}>Save</button>
              <button onClick={() => { setAddingNote(false); setNewNoteText(''); }} style={{
                fontSize: 12, padding: '5px 12px',
                background: 'none', color: '#999',
                border: '1px solid #e5e5e5', borderRadius: 6, cursor: 'pointer', fontFamily: FONT,
              }}>Cancel</button>
            </div>
          </div>
        )}

        {userNotes.length === 0 && !addingNote && (
          <div style={{ fontSize: 13, color: '#ccc', marginBottom: 16 }}>No notes yet.</div>
        )}

        {userNotes.map(note => (
          <NoteItem key={note.id} note={note} onEdit={updateNote} onDelete={deleteNote} />
        ))}
      </div>

      {/* ─── CONVERSATION — collapsible, bubble UI ─────────────────── */}
      <div style={{
        maxWidth: isDesktop ? 1200 : 680,
        margin: '0 auto',
        padding: '16px 24px 80px',
        borderTop: '1px solid #f0f0f0',
      }}>
        <button
          onClick={() => setConvOpen(p => !p)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 700, color: '#999',
            letterSpacing: '0.6px', textTransform: 'uppercase' as const,
            marginBottom: convOpen ? 12 : 0,
            padding: 0, fontFamily: FONT,
          }}
        >
          <span>Ask AUO</span>
          <span style={{ fontSize: 10 }}>{convOpen ? '▲' : '▼'}</span>
          {conversation.length > 0 && (
            <span style={{ fontSize: 10, color: '#bbb', fontWeight: 500 }}>({conversation.length})</span>
          )}
        </button>

        {convOpen && (
          <div>
            {/* Show earlier messages button */}
            {!showAllConv && conversation.length > 6 && (
              <button
                onClick={() => setShowAllConv(true)}
                style={{
                  fontSize: 11, color: '#999', background: 'none',
                  border: 'none', cursor: 'pointer', padding: '4px 0 12px',
                  fontFamily: FONT,
                }}
              >
                ↑ {conversation.length - 6} earlier messages
              </button>
            )}

            {(showAllConv ? conversation : conversation.slice(-6)).map(msg => {
              const isUser = msg.type !== 'auo_response';

              if (isUser) {
                return (
                  <div key={msg.id} className="note-row" style={{
                    display: 'flex', justifyContent: 'flex-end', marginBottom: 10,
                  }}>
                    <div style={{
                      maxWidth: '70%', background: '#f0f0ee',
                      borderRadius: '12px 12px 2px 12px',
                      padding: '9px 13px', fontSize: 13,
                      color: '#111', lineHeight: 1.5,
                    }}>
                      {msg.content}
                    </div>
                    <button
                      className="note-delete-btn"
                      onClick={() => deleteConversationMsg(msg.id)}
                      style={{
                        background: 'none', border: 'none',
                        fontSize: 14, color: '#ccc', cursor: 'pointer',
                        opacity: 0, transition: 'opacity 0.15s',
                        padding: '0 4px', flexShrink: 0, marginLeft: 4,
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="note-row" style={{
                  display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#111', color: '#fff', fontSize: 9, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    A
                  </div>
                  <div style={{
                    maxWidth: '70%', fontSize: 13, color: '#333', lineHeight: 1.6,
                  }}>
                    {stripMd(msg.content)}
                  </div>
                  <button
                    className="note-delete-btn"
                    onClick={() => deleteConversationMsg(msg.id)}
                    style={{
                      background: 'none', border: 'none',
                      fontSize: 14, color: '#ccc', cursor: 'pointer',
                      opacity: 0, transition: 'opacity 0.15s',
                      padding: '0 4px', flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}

            {/* Loading dots while AUO responds */}
            {sending && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#111', color: '#fff', fontSize: 9, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1,
                }}>
                  A
                </div>
                <div style={{ display: 'flex', gap: 4, paddingTop: 6 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 5, height: 5, borderRadius: '50%', background: '#ccc',
                      animation: `auo-bounce 1s ${i * 0.15}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Action confirm card */}
            {pendingAction && pendingAction.type !== 'none' && (
              <div style={{
                margin: '8px 0 12px', padding: '12px 14px',
                background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: 8,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111', marginBottom: 4 }}>
                  {pendingAction.type === 'create_topic' ? '+ Create topic' : pendingAction.type === 'scan' ? 'Scan for more' : 'Save as note'}
                </div>
                {pendingAction.content && (
                  <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>
                    "{pendingAction.content}"
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleConfirmAction(pendingAction)} style={{
                    fontSize: 12, padding: '5px 12px',
                    background: '#111', color: '#fff',
                    border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: FONT,
                  }}>Confirm</button>
                  <button onClick={() => setPendingAction(null)} style={{
                    fontSize: 12, padding: '5px 12px',
                    background: 'none', color: '#999',
                    border: '1px solid #e5e5e5', borderRadius: 6, cursor: 'pointer', fontFamily: FONT,
                  }}>Skip</button>
                </div>
              </div>
            )}

            <div ref={convEndRef} />
          </div>
        )}
      </div>

      {/* ─── Sticky bottom input ──────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 100,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid #f0f0f0',
        padding: '12px 16px',
      }}>
        <div style={{
          maxWidth: isDesktop ? 1200 : 640,
          margin: '0 auto',
          display: 'flex', gap: 8,
        }}>
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
            placeholder="Ask AUO about this insight..."
            style={{
              flex: 1, padding: '10px 14px',
              border: '1px solid #e5e5e5', borderRadius: 8,
              fontSize: 13, fontFamily: FONT,
              outline: 'none', color: '#111',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            style={{
              padding: '10px 16px',
              background: inputValue.trim() && !sending ? '#111' : '#f5f5f5',
              color: inputValue.trim() && !sending ? '#fff' : '#ccc',
              border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 600,
              fontFamily: FONT,
              cursor: inputValue.trim() && !sending ? 'pointer' : 'default',
            }}
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </div>

      <style>{`
        .note-row:hover .note-delete-btn { opacity: 1 !important; }
        .note-delete-btn:hover { color: #999 !important; }
        @keyframes auo-bounce {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
