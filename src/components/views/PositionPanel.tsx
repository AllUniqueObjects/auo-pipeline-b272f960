import { useRef, useEffect } from 'react';
import { Share2, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { RealtimePosition } from '@/hooks/usePositionRealtime';

export type PositionState = 'empty' | 'generating' | 'active';

const TONE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  decisive:    { bg: 'bg-tier-breaking/10',    text: 'text-tier-breaking',    label: 'Decisive' },
  conditional: { bg: 'bg-tier-developing/10',  text: 'text-tier-developing',  label: 'Conditional' },
  exploratory: { bg: 'bg-blue-500/10',          text: 'text-blue-400',          label: 'Exploratory' },
};

// Section shape from the positions.sections JSONB
interface PositionSection {
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
        Start a conversation to build your position.
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

function ActiveState({
  position,
  shouldAnimate,
  toast,
}: {
  position: RealtimePosition;
  shouldAnimate: boolean;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const toneInfo = TONE_BADGE[(position.tone as string) ?? 'decisive'] ?? TONE_BADGE.decisive;

  const timestamp = position.created_at
    ? new Date(position.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const sections: PositionSection[] = (() => {
    if (!position.sections) return [];
    if (Array.isArray(position.sections)) return position.sections as PositionSection[];
    if (typeof position.sections === 'string') {
      try { return JSON.parse(position.sections) as PositionSection[]; } catch { return []; }
    }
    return [];
  })();

  const handleShare = () => {
    navigator.clipboard.writeText(`Position: ${position.title}`);
    toast({ title: 'Copied', description: 'Position link copied to clipboard' });
  };

  const animDelay = (index: number) =>
    shouldAnimate ? { animation: `fade-in 0.4s ease-out ${index * 80}ms both` } : {};

  return (
    <div className="px-5 py-6 space-y-6">
      {/* Header */}
      <div style={animDelay(0)}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1
            className="text-2xl font-semibold text-foreground leading-tight"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {position.title}
          </h1>
          <button
            onClick={handleShare}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Tone badge */}
          <span className={cn(
            'text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full',
            toneInfo.bg, toneInfo.text
          )}>
            {toneInfo.label}
          </span>

          {/* Timestamp */}
          <span className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
            {timestamp}
          </span>
        </div>

        {/* Position essence — subtitle */}
        {position.position_essence && (
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {position.position_essence}
          </p>
        )}
      </div>

      {/* David's Take — always first, always blockquote */}
      {position.davids_take && (
        <div style={animDelay(1)}>
          <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-3">
            David's Take
          </h2>
          <blockquote className="rounded-lg px-4 py-3 border-l-[3px] border-l-emerging bg-emerging/5">
            <p className="text-sm text-foreground/80 leading-relaxed italic">
              {position.davids_take}
            </p>
          </blockquote>
        </div>
      )}

      {/* Dynamic sections */}
      {sections.map((section, i) => (
        <div key={i} style={animDelay(2 + i)}>
          <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
            {section.title}
          </h2>
          <p className="text-sm text-foreground/70" style={{ lineHeight: 1.7 }}>
            {section.content}
          </p>
        </div>
      ))}
    </div>
  );
}
