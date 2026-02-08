import type { Signal } from '@/hooks/useSignals';

interface SignalRowProps {
  signal: Signal;
  isSelected: boolean;
  onSelect: () => void;
}

const confidenceLabels: Record<string, string> = {
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
};

export function SignalRow({ signal, isSelected, onSelect }: SignalRowProps) {
  const isUrgent = signal.urgency === 'urgent';
  const sourceCount = signal.source_ids?.length || 0;
  const confidence = signal.confidence as string | null;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left py-2.5 px-3 transition-colors rounded-md group ${
        isSelected 
          ? 'bg-[#111113] border-l-2 border-l-[#4a9eff]' 
          : 'hover:bg-[#111113] border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-center gap-2">
        {isUrgent && (
          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
          </span>
        )}
        <span className="text-[13px] text-foreground flex-1 truncate leading-snug">
          {signal.title}
        </span>
        <span className="text-[11px] text-muted-foreground/70 flex-shrink-0">
          {sourceCount > 0 && `${sourceCount} src`}
          {sourceCount > 0 && confidence && ' · '}
          {confidence && confidenceLabels[confidence]}
        </span>
      </div>
    </button>
  );
}
