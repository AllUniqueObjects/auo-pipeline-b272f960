import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePositionRealtime } from '@/hooks/usePositionRealtime';
import { ChatView } from '@/components/views/ChatView';
import { PositionPanel, type PositionState } from '@/components/views/PositionPanel';
import { BriefingPanel } from '@/components/views/BriefingPanel';
import { PrimarySurface } from '@/components/views/PrimarySurface';
import { TopicDetailPanel } from '@/components/views/TopicDetailPanel';
import { InsightDetailPanel } from '@/components/views/InsightDetailPanel';
import { PositionStarter } from '@/components/views/PositionStarter';
import { SingleSignalPanel } from '@/components/views/SingleSignalPanel';
import { WorkspaceView } from '@/components/views/WorkspaceView';
import {
  LENS_LABELS, LENS_DESCRIPTIONS, LENS_MESSAGE,
  type MockChatMessage, type LensType, type MockTopic, type TopicInsight,
} from '@/data/mock';


type RightPanelView = 'briefing' | 'topic_detail' | 'insight_detail' | 'signal_detail' | 'generating' | 'position_active' | 'position_starter' | 'workspace_view';

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


interface DashboardProps {
  initialLens?: LensType;
  justCompletedOnboarding?: boolean;
}

export default function Dashboard({ initialLens, justCompletedOnboarding }: DashboardProps) {
  const isMobile = useIsMobile();
  const userId = localStorage.getItem('userId');
  const [lastConversationId, setLastConversationId] = useState<string | null>(null);
  const { position: realtimePosition, isGenerating, setIsGenerating } = usePositionRealtime(userId, lastConversationId);

  // Role lens — read from prop or localStorage
  const resolvedLens = (() => {
    const lens = initialLens ?? (localStorage.getItem('activeLens') as LensType);
    const valid: LensType[] = ['strategic', 'balanced', 'operational'];
    return valid.includes(lens) ? lens : 'balanced';
  })();
  const [activeLens, setActiveLens] = useState<LensType>(resolvedLens);

  // Onboarding banner — prop takes priority, fallback to sessionStorage flag
  const didJustOnboard = justCompletedOnboarding ?? sessionStorage.getItem('justOnboarded') === 'true';
  if (didJustOnboard) sessionStorage.removeItem('justOnboarded');
  const [lensDropdownOpen, setLensDropdownOpen] = useState(false);
  const lensDropdownRef = useRef<HTMLDivElement>(null);

  // Onboarding banner
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(didJustOnboard);

  // Left panel collapse
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  // Right panel view state machine
  const [rightView, setRightView] = useState<RightPanelView>('briefing');
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [insightSourceName, setInsightSourceName] = useState("Today's Briefing");

  // Position panel state (used when rightView = generating | position_active)
  const [positionState, setPositionState] = useState<PositionState>('empty');
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  // lastConversationId declared above (before usePositionRealtime)
  const positionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Position starter state (guided Build Position flow)
  const [positionStarter, setPositionStarter] = useState<{
    sourceType: 'topic' | 'insight';
    sourceName: string;
    insightCount: number;
    insightTitles: string[];
  } | null>(null);

  // Chat messages — start empty, populated by real conversation
  const [messages, setMessages] = useState<MockChatMessage[]>([]);

  // Live signal
  const [showLiveSignal, setShowLiveSignal] = useState(false);

  // Dev state machine
  const [devStateIndex, setDevStateIndex] = useState(0);

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
    setInsightSourceName(source ?? "Today's Briefing");
    setRightView('insight_detail');
  };

  const handleOpenSignal = (signalId: string) => {
    setSelectedSignalId(signalId);
    setRightView('signal_detail');
  };

  const handleOpenWorkspace = (threadId: string) => {
    setSelectedThreadId(threadId);
    setRightView('workspace_view');
  };

  // Build position — open PositionStarter with context
  const handleBuildPositionFromTopic = (topic: MockTopic) => {
    setPositionStarter({
      sourceType: 'topic',
      sourceName: topic.name,
      insightCount: topic.insights.length,
      insightTitles: topic.insights.map(i => i.title),
    });
    setRightView('position_starter' as RightPanelView);
  };

  const handleBuildPositionFromInsight = (insight: TopicInsight) => {
    setPositionStarter({
      sourceType: 'insight',
      sourceName: insight.title,
      insightCount: 1,
      insightTitles: [insight.title],
    });
    setRightView('position_starter' as RightPanelView);
  };

  // Cleanup position timeout on unmount
  useEffect(() => {
    return () => {
      if (positionTimeoutRef.current) {
        clearTimeout(positionTimeoutRef.current);
        positionTimeoutRef.current = null;
      }
    };
  }, []);

  // Transition to position_active when realtime hook receives a new INSERT
  useEffect(() => {
    if (realtimePosition && isGenerating === false && rightView === 'generating') {
      setPositionState('active');
      setRightView('position_active');
      if (positionTimeoutRef.current) {
        clearTimeout(positionTimeoutRef.current);
        positionTimeoutRef.current = null;
      }
    }
  }, [realtimePosition, isGenerating, rightView]);

  const handlePositionGenerate = (_insightId?: string) => {
    setPositionStarter(null);
    setRightView('generating');
    setPositionState('generating');
    setIsGenerating(true);

    // 3-minute fallback — realtime hook handles the INSERT transition
    if (positionTimeoutRef.current) clearTimeout(positionTimeoutRef.current);
    positionTimeoutRef.current = setTimeout(() => {
      setRightView('briefing');
      setIsGenerating(false);
      positionTimeoutRef.current = null;
    }, 3 * 60 * 1000);
  };

  const handlePositionStarterCancel = () => {
    setPositionStarter(null);
    setRightView('briefing');
  };

  // "Ask AUO" — inject discuss message into chat (no mock response)
  const handleDiscuss = (insight: any) => {
    appendMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: `Tell me about: ${insight.title}`,
    });
  };

  const handleBackToBriefing = () => {
    setRightView('briefing');
    setSelectedTopicId(null);
    setSelectedInsightId(null);
    setPositionStarter(null);
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

        {/* Right side controls */}
        <div className="ml-auto flex items-center gap-2">
          {/* Sign out */}
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>

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
              <div className="absolute right-0 top-full mt-1 w-60 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                {(Object.entries(LENS_LABELS) as [LensType, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handleLensSelect(key)}
                    className="w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors flex items-start gap-2"
                  >
                    <span className={cn(
                      'h-1.5 w-1.5 rounded-full flex-shrink-0 mt-1.5',
                      activeLens === key ? 'bg-emerging' : 'bg-transparent border border-muted-foreground/40'
                    )} />
                    <div>
                      <div className={cn('text-sm', activeLens === key ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                        {label}
                      </div>
                      <div className="text-[10px] text-muted-foreground/70 mt-0.5 leading-snug">
                        {LENS_DESCRIPTIONS[key as LensType]}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
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
                onBuildPosition={() => {
                  setIsGenerating(true);
                  handlePositionGenerate();
                }}
                onConversationId={(id) => setLastConversationId(id)}
                messages={messages}
                onAppendMessage={appendMessage}
                showLiveSignal={showLiveSignal}
                onCollapse={() => setLeftCollapsed(true)}
                onOpenInsight={(insightId) => handleOpenInsight(insightId, "Today's Briefing")}
                onOpenSignal={handleOpenSignal}
                isBuildingPosition={isGenerating}
                positionReady={rightView === 'position_active'}
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
                  {rightView === 'signal_detail' && "Signal"}
                  {rightView === 'generating' && "Building"}
                  {rightView === 'position_active' && "Position"}
                  {rightView === 'workspace_view' && "Workspace"}
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
                  <PrimarySurface
                    onOpenInsight={(id) => handleOpenInsight(id)}
                    onDiscuss={handleDiscuss}
                    onOpenWorkspace={handleOpenWorkspace}
                  />
                )}

                {rightView === 'signal_detail' && selectedSignalId && (
                  <SingleSignalPanel
                    signalId={selectedSignalId}
                    onBack={handleBackToBriefing}
                  />
                )}

                {rightView === 'workspace_view' && selectedThreadId && (
                  <WorkspaceView
                    threadId={selectedThreadId}
                    onClose={handleBackToBriefing}
                  />
                )}

                {rightView === 'insight_detail' && selectedInsightId && (
                  <InsightDetailPanel
                    insightId={selectedInsightId}
                    sourceName={insightSourceName}
                    onBack={handleBackFromInsight}
                    onBuildPosition={() => setRightView('position_starter' as RightPanelView)}
                  />
                )}

                {rightView === 'position_starter' && positionStarter && (
                  <PositionStarter
                    sourceType={positionStarter.sourceType}
                    sourceName={positionStarter.sourceName}
                    insightCount={positionStarter.insightCount}
                    insightTitles={positionStarter.insightTitles}
                    onGenerate={handlePositionGenerate}
                    onCancel={handlePositionStarterCancel}
                  />
                )}

                {(rightView === 'generating' || rightView === 'position_active') && (
                  <PositionPanel
                    state={rightView === 'generating' ? 'generating' : 'active'}
                    position={rightView === 'position_active' ? realtimePosition : null}
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
