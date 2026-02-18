import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChatView } from '@/components/views/ChatView';
import { InsightsView } from '@/components/views/InsightsView';
import { PositionPanel, type PositionState } from '@/components/views/PositionPanel';
import { MOCK_PROJECTS, MOCK_POSITIONS, MOCK_CHAT_MESSAGES, type MockChatMessage } from '@/data/mock';
import { mockPosition } from '@/data/mock-position';

type LensType = 'executive' | 'leader' | 'ic';

type DevState =
  | 'session_open'
  | 'signals_overlay'
  | 'live_signal'
  | 'decision_reflected'
  | 'building'
  | 'position_active'
  | 'panel_collapsed';

const DEV_STATES: DevState[] = [
  'session_open',
  'signals_overlay',
  'live_signal',
  'decision_reflected',
  'building',
  'position_active',
  'panel_collapsed',
];

const LENS_LABELS: Record<LensType, string> = {
  executive: 'Executive',
  leader: 'Leader',
  ic: 'Individual Contributor',
};

const LENS_MESSAGE: Record<LensType, string> = {
  executive: 'Switched to Executive lens. Market Dynamics and Macroeconomics signals are weighted first.',
  leader: "Switched to Leader lens. Signals are reweighted — you'll see more balance across categories now.",
  ic: 'Switched to Individual Contributor lens. Innovation and operational signals are weighted first.',
};

interface DashboardProps {
  initialLens?: LensType;
  justCompletedOnboarding?: boolean;
}

export default function Dashboard({ initialLens = 'executive', justCompletedOnboarding = false }: DashboardProps) {
  const isMobile = useIsMobile();
  const [activeProject, setActiveProject] = useState('p1');
  const [showPositions, setShowPositions] = useState(false);
  const [signalsOpen, setSignalsOpen] = useState(false);

  // Role lens
  const [activeLens, setActiveLens] = useState<LensType>(initialLens);
  const [lensDropdownOpen, setLensDropdownOpen] = useState(false);
  const lensDropdownRef = useRef<HTMLDivElement>(null);

  // Onboarding banner
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(justCompletedOnboarding);

  // Position panel state
  const [positionState, setPositionState] = useState<PositionState>('active');
  const [positionCollapsed, setPositionCollapsed] = useState(false);

  // Chat messages — lifted to Dashboard
  const [messages, setMessages] = useState<MockChatMessage[]>(MOCK_CHAT_MESSAGES);

  // Live signal
  const [showLiveSignal, setShowLiveSignal] = useState(false);

  // Dev state machine
  const [devStateIndex, setDevStateIndex] = useState(0);

  // Auto-transition generating -> active after 2s
  useEffect(() => {
    if (positionState === 'generating') {
      const timer = setTimeout(() => setPositionState('active'), 2000);
      return () => clearTimeout(timer);
    }
  }, [positionState]);

  // Close lens dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (lensDropdownRef.current && !lensDropdownRef.current.contains(e.target as Node)) {
        setLensDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const appendMessage = (msg: MockChatMessage) => {
    setMessages(prev => [...prev, msg]);
  };

  const handleLensSelect = (lens: LensType) => {
    setActiveLens(lens);
    setLensDropdownOpen(false);
    localStorage.setItem('activeLens', lens);
    // 300-400ms delay before AUO message appears
    setTimeout(() => {
      appendMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: LENS_MESSAGE[lens],
      });
    }, 350);
  };

  const handleDevNext = () => {
    const next = (devStateIndex + 1) % DEV_STATES.length;
    setDevStateIndex(next);
    applyDevState(DEV_STATES[next]);
  };

  const applyDevState = (state: DevState) => {
    // Reset all
    setSignalsOpen(false);
    setShowLiveSignal(false);
    setPositionCollapsed(false);

    if (state === 'signals_overlay') setSignalsOpen(true);
    if (state === 'live_signal') setShowLiveSignal(true);
    if (state === 'building') setPositionState('generating');
    if (state === 'position_active') setPositionState('active');
    if (state === 'panel_collapsed') setPositionCollapsed(true);
  };

  const handleDevReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  // Mobile tabs
  const [mobileTab, setMobileTab] = useState<'chat' | 'position'>('chat');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Onboarding banner */}
      {showOnboardingBanner && (
        <div className="w-full bg-card border-b border-border px-5 py-2 flex items-center justify-between text-sm text-foreground flex-shrink-0">
          <span>✓ You're set up. AUO scans for new signals 3× daily. Switch your lens anytime from the top right.</span>
          <button
            onClick={() => setShowOnboardingBanner(false)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors ml-4"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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

        {/* Right side controls */}
        <div className="ml-auto flex items-center gap-2">
          {/* Positions dropdown */}
          <div className="relative">
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

          {/* Role Lens Switcher */}
          <div className="relative" ref={lensDropdownRef}>
            <button
              onClick={() => setLensDropdownOpen(!lensDropdownOpen)}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-border text-foreground hover:bg-accent/50 transition-colors"
            >
              {LENS_LABELS[activeLens]}
              <ChevronDown className={cn('h-3 w-3 transition-transform', lensDropdownOpen && 'rotate-180')} />
            </button>
            {lensDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                {(Object.entries(LENS_LABELS) as [LensType, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handleLensSelect(key)}
                    className="w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors flex items-center gap-2"
                  >
                    <span className={cn(
                      'h-1.5 w-1.5 rounded-full flex-shrink-0',
                      activeLens === key ? 'bg-emerging' : 'bg-transparent border border-muted-foreground/40'
                    )} />
                    <span className={cn('text-sm', activeLens === key ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dev state machine buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleDevNext}
              className="px-2 py-1 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors border border-dashed border-border"
              title={`Dev: ${DEV_STATES[devStateIndex]} → next`}
            >
              → {DEV_STATES[devStateIndex]}
            </button>
            <button
              onClick={handleDevReset}
              className="px-2 py-1 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors border border-dashed border-border"
            >
              reset
            </button>
          </div>
        </div>

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
              'flex flex-col overflow-hidden transition-all duration-300',
              isMobile ? 'w-full' : positionCollapsed ? 'flex-1' : 'w-[55%] flex-shrink-0'
            )}
          >
            <ChatView
              onOpenSignals={() => setSignalsOpen(true)}
              onBuildPosition={() => setPositionState('generating')}
              messages={messages}
              onAppendMessage={appendMessage}
              showLiveSignal={showLiveSignal}
            />
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
                onSelectInsight={() => { setSignalsOpen(false); }}
                activeProject={activeProject}
                activeLens={activeLens}
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
            activeLens={activeLens}
          />
        )}
      </div>
    </div>
  );
}
