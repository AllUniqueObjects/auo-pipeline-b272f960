import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveSignalData {
  title: string;
  category: string;
}

interface LiveSignalSurfaceProps {
  signal?: LiveSignalData;
  onAdd?: () => void;
  onDismiss?: () => void;
}

const DEFAULT_SIGNAL: LiveSignalData = {
  title: 'Nike Wholesale Strategy Update Q1 2026',
  category: 'Market Dynamics',
};

export function LiveSignalSurface({ signal = DEFAULT_SIGNAL, onAdd, onDismiss }: LiveSignalSurfaceProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const duration = 10000;
    const interval = 50;
    const step = (interval / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev - step;
        if (next <= 0) {
          clearInterval(timerRef.current!);
          setVisible(false);
          onDismiss?.();
          return 0;
        }
        return next;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div className="mx-3 mb-2 rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        {/* LIVE pill */}
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: 'hsl(var(--live-blue))' }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: 'hsl(var(--live-blue))' }}
            />
          </span>
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: 'hsl(var(--live-blue))' }}
          >
            LIVE
          </span>
        </span>

        {/* Category badge */}
        <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent text-muted-foreground flex-shrink-0">
          {signal.category}
        </span>

        {/* Title */}
        <span className="text-xs text-foreground truncate flex-1">{signal.title}</span>

        {/* Add to position button */}
        <button
          onClick={() => { onAdd?.(); setVisible(false); }}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex-shrink-0',
            'bg-emerging/15 text-emerging hover:bg-emerging/25'
          )}
        >
          Add to position
        </button>

        {/* Dismiss */}
        <button
          onClick={() => { setVisible(false); onDismiss?.(); }}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Depleting progress bar */}
      <div className="h-0.5 bg-muted">
        <div
          className="h-full transition-all duration-50 ease-linear"
          style={{ width: `${progress}%`, backgroundColor: 'hsl(var(--live-blue))' }}
        />
      </div>
    </div>
  );
}
