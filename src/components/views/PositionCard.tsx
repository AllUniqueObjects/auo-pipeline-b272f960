import { Pencil, Share2 } from 'lucide-react';
import { MOCK_INSIGHTS } from '@/data/mock';

export interface PositionBrief {
  title: string;
  call: string;
  why: string;
  assumptions: string[];
  basedOn?: string[];
}

interface PositionCardProps {
  brief: PositionBrief;
  onShare?: () => void;
}

export function PositionCard({ brief, onShare }: PositionCardProps) {
  const basedOnTitles = brief.basedOn
    ?.map(id => MOCK_INSIGHTS.find(i => i.id === id)?.title)
    .filter(Boolean);

  return (
    <div className="rounded-lg border border-ring/40 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Position</span>
      </div>
      <h4 className="text-sm font-semibold text-card-foreground">{brief.title}</h4>
      {basedOnTitles && basedOnTitles.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Based on: {basedOnTitles.map((t, i) => (
            <span key={i}>{i > 0 ? ', ' : ''}<span className="text-foreground/70">{t!.slice(0, 40)}...</span></span>
          ))}
        </p>
      )}
      <div className="space-y-1.5 text-xs text-card-foreground/80">
        <p><span className="font-medium text-card-foreground">Call:</span> {brief.call}</p>
        <p><span className="font-medium text-card-foreground">Why:</span> {brief.why}</p>
      </div>
      {brief.assumptions.length > 0 && (
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Assumptions</span>
          <ul className="mt-1 space-y-0.5">
            {brief.assumptions.map((a, i) => (
              <li key={i} className="text-xs text-card-foreground/80 flex gap-1.5">
                <span className="text-muted-foreground">•</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors border border-border">
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        {onShare && (
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Share2 className="h-3 w-3" />
            Share This
          </button>
        )}
      </div>
    </div>
  );
}
