import { useRef, useEffect, useState } from 'react';
import { Share2, ChevronRight, ChevronDown, Loader2, Copy, Link, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePosition } from '@/hooks/usePositionRealtime';

export type PositionState = 'empty' | 'generating' | 'active';

// New sections shape
interface KeyNumber {
  value: string;
  label: string;
}

interface RawSource {
  domain?: string;
  url?: string;
  title?: string;
  source_date?: string | null;
}

interface SignalSource {
  name: string;
  url: string;
  date?: string | null;
}

interface SignalEvidence {
  title: string;
  credibility: number;
  one_liner: string;
  sources?: SignalSource[];
}

interface PositionSections {
  key_numbers?: KeyNumber[];
  memo?: string;
  signal_evidence?: SignalEvidence[];
}

// Legacy section shape (backward compat)
interface LegacySection {
  title: string;
  content: string;
  signal_refs?: string[];
}

interface PositionPanelProps {
  state: PositionState;
  position: RealtimePosition | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeLens?: string;
  onBack?: () => void;
}

function parseSections(raw: unknown): { parsed: PositionSections | null; legacy: LegacySection[] | null } {
  if (!raw) return { parsed: null, legacy: null };

  let obj: unknown = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return { parsed: null, legacy: null }; }
  }

  // Legacy: array of {title, content}
  if (Array.isArray(obj)) {
    return { parsed: null, legacy: obj as LegacySection[] };
  }

  // New format: object with key_numbers, memo, signal_evidence
  if (typeof obj === 'object' && obj !== null) {
    return { parsed: obj as PositionSections, legacy: null };
  }

  return { parsed: null, legacy: null };
}

export function PositionPanel({ state, position, collapsed, onToggleCollapse, onBack }: PositionPanelProps) {
  const { toast } = useToast();
  const animatedPositionRef = useRef<string | null>(null);
  const shouldAnimate = position?.id !== animatedPositionRef.current;


  useEffect(() => {
    if (position?.id) {
      animatedPositionRef.current = position.id;
    }
  }, [position?.id]);

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="w-10 h-full flex-shrink-0 border-l border-border bg-card hover:bg-accent/50 transition-colors flex items-center justify-center cursor-pointer"
      >
        <span
          className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          Position
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {state === 'empty' && <EmptyState />}
        {state === 'generating' && <GeneratingState onRetry={onBack} />}
        {state === 'active' && position && (
          <ActiveState position={position} shouldAnimate={shouldAnimate} toast={toast} />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <h2
        className="text-3xl italic text-muted-foreground/30 mb-3"
        style={{ fontFamily: "'Fraunces', serif" }}
      >
        position
      </h2>
      <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
        When you're ready, ask AUO to build a position from your conversation.
      </p>
    </div>
  );
}

function GeneratingState({ onRetry }: { onRetry?: () => void }) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 30_000);
    return () => clearTimeout(timer);
  }, []);

  if (timedOut) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-3">
        <p className="text-sm text-muted-foreground">Couldn't generate position.</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-4">
      <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      <p className="text-sm text-muted-foreground">Building position...</p>
      <div className="w-full max-w-sm mt-4 animate-pulse space-y-4">
        {/* Title */}
        <div className="h-5 bg-muted rounded w-3/4" />
        {/* Tone + date */}
        <div className="h-2 bg-muted rounded w-1/3" />
        {/* Owner quote */}
        <div className="border-l-2 border-amber-500/20 pl-3 py-1 space-y-1.5">
          <div className="h-2 bg-muted rounded w-full" />
          <div className="h-2 bg-muted rounded w-2/3" />
        </div>
        {/* Key numbers 2x2 */}
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border border-border rounded-lg px-3 py-3 space-y-1.5">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-2 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
        {/* Memo paragraphs */}
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded w-full" />
          <div className="h-2 bg-muted rounded w-11/12" />
          <div className="h-2 bg-muted rounded w-4/5" />
        </div>
      </div>
    </div>
  );
}

const TONE_CONFIG: Record<string, { dot: string; label: string }> = {
  decisive:    { dot: 'bg-tier-breaking',   label: 'LOCKING' },
  conditional: { dot: 'bg-tier-developing', label: 'EVALUATING' },
  exploratory: { dot: 'bg-blue-400',        label: 'EXPLORING' },
};

function ActiveState({
  position,
  shouldAnimate,
  toast,
}: {
  position: RealtimePosition;
  shouldAnimate: boolean;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [signalSources, setSignalSources] = useState<Record<string, RawSource[]>>({});

  const tone = (position.tone as string) ?? 'decisive';
  const toneConf = TONE_CONFIG[tone] ?? TONE_CONFIG.decisive;

  const timestamp = position.created_at
    ? new Date(position.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const { parsed: sections, legacy } = parseSections(position.sections);

  // Parse signal_refs from position
  const signalRefs = (() => {
    if (!position.signal_refs) return [] as SignalEvidence[];
    const raw = typeof position.signal_refs === 'string'
      ? JSON.parse(position.signal_refs)
      : position.signal_refs;
    return Array.isArray(raw) ? (raw as SignalEvidence[]) : [];
  })();

  // Use signal_refs as evidence (they contain title, credibility, one_liner, sources)
  const evidence = sections?.signal_evidence?.length
    ? sections.signal_evidence
    : signalRefs;

  // Fetch raw_sources from signals table for evidence titles
  useEffect(() => {
    if (evidence.length === 0) return;
    const titles = evidence.map(e => e.title);

    supabase
      .from('signals')
      .select('title, raw_sources')
      .in('title', titles)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, RawSource[]> = {};
        for (const sig of data) {
          if (sig.raw_sources && Array.isArray(sig.raw_sources) && sig.raw_sources.length > 0) {
            map[sig.title] = (sig.raw_sources as unknown as RawSource[]).slice(0, 3);
          }
        }
        setSignalSources(map);
      });
  }, [position.id]);

  const animDelay = (index: number) =>
    shouldAnimate ? { animation: `fade-in 0.4s ease-out ${index * 80}ms both` } : {};

  const handleShare = () => {
    navigator.clipboard.writeText(`Position: ${position.title}`);
    toast({ title: 'Copied', description: 'Position link copied to clipboard' });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Link copied' });
  };

  const avgCredibility = evidence.length > 0
    ? Math.round(evidence.reduce((sum, s) => sum + (s.credibility ?? 0), 0) / evidence.length * 100)
    : null;

  // Memo paragraphs — split on double newline
  const memoParagraphs = sections?.memo
    ? sections.memo.split(/\n\n+/).filter(Boolean)
    : [];

  return (
    <div className="px-5 py-6">
      {/* 1. Title */}
      <div style={animDelay(0)}>
        <h1
          className="text-2xl font-bold text-foreground leading-snug"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {position.title}
        </h1>
      </div>

      {/* 2. Tone + Date + Share */}
      <div className="flex items-center gap-3 mt-2" style={animDelay(1)}>
        <span className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full flex-shrink-0', toneConf.dot)} />
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">{toneConf.label}</span>
        </span>
        <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
          {timestamp}
        </span>
      </div>

      {/* Owner Quote — hidden from UI, data retained for sharing */}

      {/* 4. Key Numbers */}
      {sections?.key_numbers && sections.key_numbers.length > 0 && (
        <div style={animDelay(3)} className="mt-5">
          <div className="grid grid-cols-2 gap-2">
            {sections.key_numbers.map((kn, i) => (
              <div
                key={i}
                className="border border-border rounded-lg px-3 py-2.5 flex flex-col relative"
              >
                <span className="absolute top-1.5 right-2.5 text-[10px] text-muted-foreground/30 font-mono leading-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-lg font-bold text-foreground leading-none">{kn.value}</span>
                <span className="text-[11px] text-muted-foreground mt-1 leading-tight">{kn.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Memo */}
      {memoParagraphs.length > 0 && (
        <div style={animDelay(4)} className="mt-6 space-y-3">
          {memoParagraphs.map((para, i) => (
            <p key={i} className="text-[15px] text-foreground/80 leading-[1.75]">
              {para}
            </p>
          ))}
        </div>
      )}

      {/* Legacy fallback */}
      {legacy && legacy.length > 0 && (
        <div style={animDelay(4)} className="mt-6 space-y-3">
          {legacy.map((sec, i) => (
            <p key={i} className="text-sm text-foreground/80 leading-[1.7]">{sec.content}</p>
          ))}
        </div>
      )}

      {/* 6. Signal Evidence (collapsible) */}
      {evidence.length > 0 && (
        <div style={animDelay(5)} className="mt-6 pt-5 border-t border-border/30">
          <button
            onClick={() => setEvidenceOpen(v => !v)}
            className="flex items-center justify-between w-full text-left group"
          >
            <span className="text-[11px] text-muted-foreground">
              Based on {evidence.length} signal{evidence.length !== 1 ? 's' : ''}
              {avgCredibility !== null && ` · ${avgCredibility >= 75 ? 'High confidence' : avgCredibility >= 50 ? 'Moderate confidence' : 'Developing'}`}
            </span>
            {evidenceOpen
              ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
              : <ChevronRight className="h-3 w-3 text-muted-foreground" />
            }
          </button>

          {evidenceOpen && (
            <div className="mt-3 space-y-3">
              {evidence.map((sig, i) => (
                <div key={i} className="border-t border-border/40 pt-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-foreground/80 leading-snug">{sig.title}</span>
                    <span
                      className="flex-shrink-0 w-14 h-1.5 rounded-full bg-muted overflow-hidden mt-1 cursor-help"
                      title={`${Math.round((sig.credibility ?? 0) * 100)}%`}
                    >
                      <span
                        className={cn(
                          'block h-full rounded-full',
                          (sig.credibility ?? 0) >= 0.75 ? 'bg-emerald-500' :
                          (sig.credibility ?? 0) >= 0.50 ? 'bg-amber-400' : 'bg-muted-foreground/40'
                        )}
                        style={{ width: `${Math.max(Math.round((sig.credibility ?? 0) * 100), 5)}%` }}
                      />
                    </span>
                  </div>
                  {sig.one_liner && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{sig.one_liner}</p>
                  )}
                  {/* Sources: prefer sig.sources, fallback to fetched raw_sources */}
                  {(() => {
                    const inlineSources = sig.sources?.length ? sig.sources : null;
                    const fetchedSources = signalSources[sig.title];
                    if (inlineSources) {
                      return (
                        <div className="mt-1.5 pl-2 space-y-0.5">
                          {inlineSources.map((src, j) => (
                            <div key={j} className="flex items-center gap-1 text-[11px]">
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                              >
                                {src.name} ↗
                              </a>
                              {src.date && (
                                <span className="text-muted-foreground/60">· {src.date}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }
                    if (fetchedSources) {
                      return (
                        <div className="mt-1.5 pl-2 space-y-0.5">
                          {fetchedSources.map((src, j) => (
                            <div key={j} className="flex items-center gap-1 text-[11px]">
                              <a
                                href={src.url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                              >
                                {src.domain ?? new URL(src.url!).hostname} ↗
                              </a>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. Action buttons */}
      <div style={animDelay(6)} className="flex items-center gap-2 mt-5 pt-2 border-t border-border/40">
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 transition-colors"
        >
          <Share2 className="h-3 w-3" />
          Share ↗
        </button>
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 transition-colors"
        >
          <Link className="h-3 w-3" />
          Copy link
        </button>
      </div>
    </div>
  );
}
