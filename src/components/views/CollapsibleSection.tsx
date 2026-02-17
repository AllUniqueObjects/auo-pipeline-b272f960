import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function CollapsibleSection({ label, open, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="mb-4">
      <button onClick={onToggle} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRight className={cn('h-3 w-3 transition-transform', open && 'rotate-90')} />
        {label}
      </button>
      {open && <div className="mt-2 pl-4">{children}</div>}
    </div>
  );
}
