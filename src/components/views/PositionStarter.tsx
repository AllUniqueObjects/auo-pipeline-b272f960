import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type PositionType = 'call' | 'thesis' | 'risk';

interface PositionStarterProps {
  sourceType: 'topic' | 'insight';
  sourceName: string;
  insightCount: number;
  insightTitles: string[];
  onGenerate: (type: PositionType, context: string) => void;
  onCancel: () => void;
}

const POSITION_TYPES: { key: PositionType; label: string; description: string }[] = [
  {
    key: 'call',
    label: 'The Call',
    description: 'Lock a decision with rationale — for when you need to commit and communicate.',
  },
  {
    key: 'thesis',
    label: 'Thesis',
    description: 'Explore the strategic question — for when the answer isn\'t clear yet.',
  },
  {
    key: 'risk',
    label: 'Risk Memo',
    description: 'Map the downside scenarios — for when you need to stress-test the call.',
  },
];

export function PositionStarter({
  sourceType,
  sourceName,
  insightCount,
  insightTitles,
  onGenerate,
  onCancel,
}: PositionStarterProps) {
  const [selectedType, setSelectedType] = useState<PositionType>('call');
  const [context, setContext] = useState('');

  const previewTitles = insightTitles.slice(0, 3);
  const remaining = insightTitles.length - previewTitles.length;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 pt-6 pb-8 space-y-6 max-w-xl mx-auto w-full">
        {/* Cancel button */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
              Building Position From
            </p>
            <h1
              className="text-lg font-semibold text-foreground leading-snug"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {sourceName}
            </h1>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex-shrink-0"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Signal preview */}
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Based on {insightCount} Signal{insightCount !== 1 ? 's' : ''}
          </p>
          <ul className="space-y-1">
            {previewTitles.map((title, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground/40 text-[10px] mt-0.5 flex-shrink-0">·</span>
                <span className="text-xs text-foreground/70 leading-snug line-clamp-1">{title}</span>
              </li>
            ))}
            {remaining > 0 && (
              <li className="text-[10px] text-muted-foreground">
                + {remaining} more signal{remaining !== 1 ? 's' : ''}
              </li>
            )}
          </ul>
        </div>

        {/* Position type selector */}
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            What kind of position?
          </p>
          <div className="space-y-2">
            {POSITION_TYPES.map(pt => (
              <button
                key={pt.key}
                onClick={() => setSelectedType(pt.key)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg border transition-all duration-150',
                  selectedType === pt.key
                    ? 'border-emerging bg-emerging/8 text-foreground'
                    : 'border-border bg-card text-card-foreground hover:border-muted-foreground/30 hover:bg-accent/30'
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn(
                    'h-3 w-3 rounded-full border-2 flex-shrink-0 transition-colors',
                    selectedType === pt.key
                      ? 'border-emerging bg-emerging'
                      : 'border-muted-foreground/40 bg-transparent'
                  )} />
                  <span className="text-sm font-semibold">{pt.label}</span>
                </div>
                <p className="text-xs text-muted-foreground ml-5 leading-snug">
                  {pt.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Context textarea */}
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Add context (optional)
          </p>
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="Add constraints, framing, or who this is for..."
            rows={3}
            className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>

        {/* Generate button */}
        <div className="space-y-2">
          <button
            onClick={() => onGenerate(selectedType, context)}
            className="w-full py-3 rounded-lg bg-emerging text-background text-sm font-semibold hover:bg-emerging/90 transition-colors"
          >
            Generate Position →
          </button>
          <button
            onClick={onCancel}
            className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
