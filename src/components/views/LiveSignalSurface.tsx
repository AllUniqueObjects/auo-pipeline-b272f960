import { useState, useEffect, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveSignalSurfaceProps {
  onAdd?: () => void;
  onDismiss?: () => void;
}

export function LiveSignalSurface({ onAdd, onDismiss }: LiveSignalSurfaceProps) {
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
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'hsl(var(--live-blue))' }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'hsl(var(--live-blue))' }} />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--live-blue))' }}>LIVE</span>
        </span>
        <span className="text-xs text-foreground truncate flex-1">
          Adidas Vietnam Factory Allocation Update
        </span>
        <button
          onClick={() => { onAdd?.(); setVisible(false); }}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors flex-shrink-0"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
        <button
          onClick={() => { setVisible(false); onDismiss?.(); }}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="h-0.5 bg-muted">
        <div
          className="h-full transition-all duration-50 ease-linear"
          style={{ width: `${progress}%`, backgroundColor: 'hsl(var(--live-blue))' }}
        />
      </div>
    </div>
  );
}
