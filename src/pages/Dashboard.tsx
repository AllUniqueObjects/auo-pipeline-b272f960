import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChatView } from '@/components/views/ChatView';
import { PositionPanel, type PositionState } from '@/components/views/PositionPanel';
import { BriefingPanel } from '@/components/views/BriefingPanel';
import { TopicDetailPanel } from '@/components/views/TopicDetailPanel';
import { InsightDetailPanel } from '@/components/views/InsightDetailPanel';
import { MOCK_PROJECTS, MOCK_POSITIONS, MOCK_CHAT_MESSAGES, SESSION_OPENER_MESSAGE, MOCK_TOPIC_INSIGHTS, type MockChatMessage } from '@/data/mock';
import { mockPosition } from '@/data/mock-position';

type LensType = 'executive' | 'leader' | 'ic';
type RightPanelView = 'briefing' | 'topic_detail' | 'insight_detail' | 'generating' | 'position_active';

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

// Find a topic insight by id across all topics
function findTopicInsight(id: string) {
  for (const topic of MOCK_TOPIC_INSIGHTS) {
    const insight = topic.insights.find(i => i.id === id);
    if (insight) return { insight, topic };
  }
  return null;
}

interface DashboardProps {
  initialLens?: LensType;
  justCompletedOnboarding?: boolean;
}

export default function Dashboard({ initialLens = 'executive', justCompletedOnboarding = false }: DashboardProps) {
  const isMobile = useIsMobile();
  const [activeProject, setActiveProject] = useState('p1');
  const [showPositions, setShowPositions] = useState(false);

  // Role lens
  const [activeLens, setActiveLens] = useState<LensType>(initialLens);
  const [lensDropdownOpen, setLensDropdownOpen] = useState(false);
  const lensDropdownRef = useRef<HTMLDivElement>(null);

  // Onboarding banner
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(justCompletedOnboarding);

  // Left panel collapse
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  // Right panel view state machine
  const [rightView, setRightView] = useState<RightPanelView>('briefing');
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const [insightSourceName, setInsightSourceName] = useState("Today's Briefing");

  // Position panel state (used when rightView = generating | position_active)
  const [positionState, setPositionState] = useState<PositionState>('empty');

  // Chat messages — lifted to Dashboard, prepend session opener
  const [messages, setMessages] = useState<MockChatMessage[]>([SESSION_OPENER_MESSAGE, ...MOCK_CHAT_MESSAGES]);

  // Live signal
  const [showLiveSignal, setShowLiveSignal] = useState(false);

  // Dev state machine
  const [devStateIndex, setDevStateIndex] = useState(0);

  // Auto-transition generating -> position_active after 2s
  useEffect(() => {
    if (rightView === 'generating') {
      const timer = setTimeout(() => setRightView('position_active'), 2000);
      return () => clearTimeout(timer);
    }
  }, [rightView]);

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
    setTimeout(() => {
      appendMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: LENS_MESSAGE[lens],
      });
    }, 350);
  };

  // Right panel navigation
  const handleExplore = (topicId: string) => {
    setSelectedTopicId(topicId);
    setRightView('topic_detail');
  };

  const handleOpenInsight = (insightId: string, source?: string) => {
    setSelectedInsightId(insightId);
    if (source) {
      setInsightSourceName(source);
    } else if (selectedTopicId) {
      const topic = MOCK_TOPIC_INSIGHTS.find(t => t.id === selectedTopicId);
      setInsightSourceName(topic ? topic.name.replace(/\b\w/g, l => l.toUpperCase()) : "Today's Briefing");
    } else {
      setInsightSourceName("Today's Briefing");
    }
    setRightView('insight_detail');
  };

  const handleBuildPosition = () => {
    setRightView('generating');
    setPositionState('generating');
  };

  const handleBackToBriefing = () => {
    setRightView('briefing');
    setSelectedTopicId(null);
    setSelectedInsightId(null);
  };

  const handleBackFromInsight = () => {
    if (selectedTopicId) {
      setRightView('topic_detail');
    } else {
      setRightView('briefing');
    }
  };

  const handleDevNext = () => {
    const next = (devStateIndex + 1) % DEV_STATES.length;
    setDevStateIndex(next);
    applyDevState(DEV_STATES[next]);
  };

  const applyDevState = (state: DevState) => {
    setShowLiveSignal(false);
    setRightCollapsed(false);

    if (state === 'live_signal') setShowLiveSignal(true);
    if (state === 'building') { setRightView('generating'); setPositionState('generating'); }
    if (state === 'position_active') { setRightView('position_active'); setPositionState('active'); }
    if (state === 'panel_collapsed') setRightCollapsed(true);
    if (state === 'session_open' || state === 'signals_overlay' || state === 'decision_reflected') {
      setRightView('briefing');
    }
  };

  const handleDevReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  // Mobile tabs
  const [mobileTab, setMobileTab] = useState<'chat' | 'briefing'>('chat');

  // Resolve selected objects
  const selectedTopic = MOCK_TOPIC_INSIGHTS.find(t => t.id === selectedTopicId) ?? null;
  const selectedInsightResult = selectedInsightId ? findTopicInsight(selectedInsightId) : null;

  // Panel width classes
  const leftWidth = leftCollapsed ? 'w-10 flex-shrink-0' : rightCollapsed ? 'flex-1' : 'w-[35%] flex-shrink-0';
  const rightWidth = rightCollapsed ? 'w-10 flex-shrink-0' : leftCollapsed ? 'flex-1' : 'flex-1';

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
              onClick={() => setMobileTab('briefing')}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium',
                mobileTab === 'briefing' ? 'bg-foreground text-background' : 'text-muted-foreground'
              )}
            >
              Briefing
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Chat */}
        {(!isMobile || mobileTab === 'chat') && (
          leftCollapsed ? (
            // Collapsed CHAT tab
            <button
              onClick={() => setLeftCollapsed(false)}
              className="w-10 flex-shrink-0 border-r border-border bg-card hover:bg-accent/50 transition-colors flex items-center justify-center cursor-pointer"
            >
              <span
                className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
              >
                Chat
              </span>
            </button>
          ) : (
            <div
              className={cn(
                'flex flex-col overflow-hidden transition-all duration-300',
                isMobile ? 'w-full' : leftWidth
              )}
            >
              <ChatView
                onOpenSignals={() => {}}
                onBuildPosition={handleBuildPosition}
                messages={messages}
                onAppendMessage={appendMessage}
                showLiveSignal={showLiveSignal}
                onCollapse={() => setLeftCollapsed(true)}
                onOpenInsight={(insightId) => handleOpenInsight(insightId, "Today's Briefing")}
              />
            </div>
          )
        )}

        {/* Right panel: Dynamic content */}
        {(!isMobile || mobileTab === 'briefing') && (
          rightCollapsed ? (
            // Collapsed POSITION tab (keep existing behavior)
            <button
              onClick={() => setRightCollapsed(false)}
              className="w-10 flex-shrink-0 border-l border-border bg-card hover:bg-accent/50 transition-colors flex items-center justify-center cursor-pointer"
            >
              <span
                className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                {rightView === 'position_active' ? 'Position' : 'Briefing'}
              </span>
            </button>
          ) : (
            <div
              className={cn(
                'flex flex-col overflow-hidden transition-all duration-300 border-l border-border',
                isMobile ? 'w-full' : rightWidth
              )}
            >
              {/* Right panel header with collapse */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-border bg-background">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {rightView === 'briefing' && "Briefing"}
                  {rightView === 'topic_detail' && "Topic"}
                  {rightView === 'insight_detail' && "Insight"}
                  {rightView === 'generating' && "Building"}
                  {rightView === 'position_active' && "Position"}
                </span>
                <button
                  onClick={() => setRightCollapsed(true)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  aria-label="Collapse panel"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9 2.5L4.5 7 9 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Right panel content */}
              <div className="flex-1 overflow-hidden">
                {rightView === 'briefing' && (
                  <BriefingPanel
                    topics={MOCK_TOPIC_INSIGHTS}
                    activeLens={activeLens}
                    onExplore={handleExplore}
                    onOpenInsight={(id) => handleOpenInsight(id)}
                    onBuildPosition={handleBuildPosition}
                  />
                )}

                {rightView === 'topic_detail' && selectedTopic && (
                  <TopicDetailPanel
                    topic={selectedTopic}
                    onBack={handleBackToBriefing}
                    onOpenInsight={(id) => handleOpenInsight(id, selectedTopic.name)}
                    onBuildPosition={handleBuildPosition}
                  />
                )}

                {rightView === 'insight_detail' && selectedInsightResult && (
                  <InsightDetailPanel
                    insight={selectedInsightResult.insight}
                    sourceName={insightSourceName}
                    onBack={handleBackFromInsight}
                    onBuildPosition={handleBuildPosition}
                  />
                )}

                {(rightView === 'generating' || rightView === 'position_active') && (
                  <PositionPanel
                    state={rightView === 'generating' ? 'generating' : 'active'}
                    position={rightView === 'position_active' ? mockPosition : null}
                    collapsed={false}
                    onToggleCollapse={() => {}}
                    activeLens={activeLens}
                    onBack={handleBackToBriefing}
                  />
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
