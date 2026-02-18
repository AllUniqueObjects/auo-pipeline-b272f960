import { useState, useEffect } from 'react';
import { ChevronDown, Zap, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChatView } from '@/components/views/ChatView';
import { InsightsView } from '@/components/views/InsightsView';
import { PositionPanel, type PositionState } from '@/components/views/PositionPanel';
import { MOCK_PROJECTS, MOCK_POSITIONS } from '@/data/mock';
import { mockPosition } from '@/data/mock-position';

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const isMobile = useIsMobile();
  const [activeProject, setActiveProject] = useState('p1');
  const [showPositions, setShowPositions] = useState(false);
  const [signalsOpen, setSignalsOpen] = useState(false);

  // Position panel state
  const [positionState, setPositionState] = useState<PositionState>('active');
  const [positionCollapsed, setPositionCollapsed] = useState(false);

  // Dev button: cycle position states
  const cyclePositionState = () => {
    setPositionState(prev => {
      if (prev === 'empty') return 'generating';
      if (prev === 'generating') return 'active';
      return 'empty';
    });
  };

  // Auto-transition generating -> active after 2s
  useEffect(() => {
    if (positionState === 'generating') {
      const timer = setTimeout(() => setPositionState('active'), 2000);
      return () => clearTimeout(timer);
    }
  }, [positionState]);

  // Mobile tabs
  const [mobileTab, setMobileTab] = useState<'chat' | 'position'>('chat');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5 border-b border-border">
        <span className="text-base font-semibold tracking-[0.2em] text-foreground">AUO</span>
        <div className="flex items-center gap-1.5 ml-4">
          {MOCK_PROJECTS.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveProject(p.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150',
                activeProject === p.id
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Positions dropdown */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowPositions(!showPositions)}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            Positions ({MOCK_POSITIONS.length})
            <ChevronDown className={cn('h-3 w-3 transition-transform', showPositions && 'rotate-180')} />
          </button>
          {showPositions && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
              {MOCK_POSITIONS.map(pos => (
                <button
                  key={pos.id}
                  onClick={() => setShowPositions(false)}
                  className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors"
                >
                  <div className="text-sm text-card-foreground">{pos.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                      'text-[10px] font-medium uppercase',
                      pos.status === 'shared' ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {pos.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dev button */}
        <button
          onClick={cyclePositionState}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors border border-dashed border-border"
          title={`Position: ${positionState} → click to cycle`}
        >
          <Zap className="h-3 w-3" />
          {positionState}
        </button>

        {isMobile && (
          <div className="flex gap-1">
            <button
              onClick={() => setMobileTab('chat')}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium',
                mobileTab === 'chat' ? 'bg-foreground text-background' : 'text-muted-foreground'
              )}
            >
              Chat
            </button>
            <button
              onClick={() => setMobileTab('position')}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium',
                mobileTab === 'position' ? 'bg-foreground text-background' : 'text-muted-foreground'
              )}
            >
              Position
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left panel: Chat */}
        {(!isMobile || mobileTab === 'chat') && (
          <div
            className={cn(
              'flex flex-col overflow-hidden transition-all duration-200',
              isMobile ? 'w-full' : positionCollapsed ? 'flex-1' : 'w-[55%] flex-shrink-0'
            )}
          >
            <ChatView onOpenSignals={() => setSignalsOpen(true)} />
          </div>
        )}

        {/* Signals overlay */}
        {signalsOpen && (
          <div className="absolute inset-0 z-40 bg-background flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Signals</span>
              <button
                onClick={() => setSignalsOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <InsightsView
                onSelectInsight={() => {}}
                activeProject={activeProject}
              />
            </div>
          </div>
        )}

        {/* Right panel: Position */}
        {(!isMobile || mobileTab === 'position') && (
          <PositionPanel
            state={positionState}
            position={positionState === 'active' ? mockPosition : null}
            collapsed={!isMobile && positionCollapsed}
            onToggleCollapse={() => setPositionCollapsed(!positionCollapsed)}
          />
        )}
      </div>
    </div>
  );
}
