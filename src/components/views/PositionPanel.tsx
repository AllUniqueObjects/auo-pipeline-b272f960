import { useRef, useEffect, useState } from 'react';
import { Share2, ChevronRight, ChevronDown, Loader2, Copy, Link } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { RealtimePosition } from '@/hooks/usePositionRealtime';

export type PositionState = 'empty' | 'generating' | 'active';

// New sections shape
interface KeyNumber {
  value: string;
  label: string;
}

interface SignalEvidence {
  title: string;
  credibility: number;
  one_liner: string;
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

export function PositionPanel({ state, position, collapsed, onToggleCollapse }: PositionPanelProps) {
  const { toast } = useToast();
  const animatedPositionRef = useRef<string | null>(null);
  const shouldAnimate = position?.id !== animatedPositionRef.current;

  console.log('[PositionPanel] realtimePosition:', position);
  console.log('[PositionPanel] isGenerating:', state === 'generating');

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
    <div className="flex flex-col h-full border-l border-border bg-background">
      {/* Panel header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-border">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Position</span>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {state === 'empty' && <EmptyState />}
        {state === 'generating' && <GeneratingState />}
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
        Start a conversation and ask AUO to build a position.
      </p>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-4">
      <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      <p className="text-sm text-muted-foreground">Building position...</p>
      <div className="w-full max-w-sm space-y-3 mt-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-2 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
            <div className="h-3 bg-muted rounded w-1/3" />
            <div className="h-2 bg-muted rounded w-full" />
            <div className="h-2 bg-muted rounded w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

const TONE_CONFIG: Record<string, { dot: string; label: string }> = {
  decisive:    { dot: 'bg-tier-breaking',   label: 'DECISIVE' },
  conditional: { dot: 'bg-tier-developing', label: 'CONDITIONAL' },
  exploratory: { dot: 'bg-blue-400',        label: 'EXPLORATORY' },
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

  // Signal evidence summary
  const evidence = sections?.signal_evidence ?? [];
  const avgCredibility = evidence.length > 0
    ? Math.round(evidence.reduce((sum, s) => sum + (s.credibility ?? 0), 0) / evidence.length * 100)
    : null;

  // Memo paragraphs — split on double newline
  const memoParagraphs = sections?.memo
    ? sections.memo.split(/\n\n+/).filter(Boolean)
    : [];

  return (
    <div className="px-5 py-6 space-y-5">
      {/* 1. Title */}
      <div style={animDelay(0)}>
        <h1
          className="text-xl font-bold text-foreground leading-tight"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {position.title}
        </h1>
      </div>

      {/* 2. Tone + Date + Share */}
      <div className="flex items-center gap-3" style={animDelay(1)}>
        <span className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full flex-shrink-0', toneConf.dot)} />
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">{toneConf.label}</span>
        </span>
        <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
          {timestamp}
        </span>
        <div className="ml-auto">
          <button
            onClick={handleShare}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Owner Quote */}
      {position.owner_quote && (
        <div style={animDelay(2)} className="border-l border-border/60 pl-3 py-0.5">
          <p className="text-sm text-foreground/70 italic leading-relaxed">
            {position.owner_quote}
          </p>
          <p className="text-xs text-muted-foreground mt-1 text-right">— David</p>
        </div>
      )}

      {/* 4. Key Numbers */}
      {sections?.key_numbers && sections.key_numbers.length > 0 && (
        <div style={animDelay(3)}>
          <div className="grid grid-cols-2 gap-2">
            {sections.key_numbers.map((kn, i) => (
              <div
                key={i}
                className="border border-border rounded-lg px-3 py-2.5 flex flex-col"
              >
                <span className="text-lg font-bold text-foreground leading-none">{kn.value}</span>
                <span className="text-[11px] text-muted-foreground mt-1 leading-tight">{kn.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Memo */}
      {memoParagraphs.length > 0 && (
        <div style={animDelay(4)} className="space-y-3">
          {memoParagraphs.map((para, i) => (
            <p key={i} className="text-sm text-foreground/80 leading-[1.7]">
              {para}
            </p>
          ))}
        </div>
      )}

      {/* Legacy fallback */}
      {legacy && legacy.length > 0 && (
        <div style={animDelay(4)} className="space-y-3">
          {legacy.map((sec, i) => (
            <p key={i} className="text-sm text-foreground/80 leading-[1.7]">{sec.content}</p>
          ))}
        </div>
      )}

      {/* 6. Signal Evidence (collapsible) */}
      {evidence.length > 0 && (
        <div style={animDelay(5)}>
          <button
            onClick={() => setEvidenceOpen(v => !v)}
            className="flex items-center justify-between w-full text-left group"
          >
            <span className="text-[11px] text-muted-foreground">
              Based on {evidence.length} signal{evidence.length !== 1 ? 's' : ''}
              {avgCredibility !== null && ` · avg credibility ${avgCredibility}%`}
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
                      className="text-[10px] text-muted-foreground flex-shrink-0 font-mono"
                    >
                      {Math.round((sig.credibility ?? 0) * 100)}%
                    </span>
                  </div>
                  {sig.one_liner && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{sig.one_liner}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. Action buttons */}
      <div style={animDelay(6)} className="flex items-center gap-2 pt-2 border-t border-border/40">
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
