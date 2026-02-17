import { useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChatView } from '@/components/views/ChatView';
import { InsightsView } from '@/components/views/InsightsView';
import { SignalDetailView } from '@/components/views/SignalDetailView';
import { ShareWizardView } from '@/components/views/ShareWizardView';
import { ThreadView } from '@/components/views/ThreadView';
import { MOCK_PROJECTS, MOCK_POSITIONS } from '@/data/mock';

type RightView = 'insights' | 'signal-detail' | 'share' | 'thread';

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const isMobile = useIsMobile();
  const [rightView, setRightView] = useState<RightView>('insights');
  const [selectedInsightIds, setSelectedInsightIds] = useState<string[]>([]);
  const [activeProject, setActiveProject] = useState('p1');
  const [showChat, setShowChat] = useState(true);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [showPositions, setShowPositions] = useState(false);

  const primaryInsightId = selectedInsightIds[0] || null;

  const goToInsights = () => setRightView('insights');
  const goToSignalDetail = (id: string) => {
    setSelectedInsightIds([id]);
    setRightView('signal-detail');
    if (isMobile) setShowChat(false);
  };
  const goToShare = () => setRightView('share');
  const goToThread = () => setRightView('thread');
  const goBack = () => {
    if (rightView === 'thread') setRightView('share');
    else if (rightView === 'share') setRightView('signal-detail');
    else if (rightView === 'signal-detail') setRightView('insights');
  };

  const handleAddInsight = (id: string) => {
    setSelectedInsightIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  const handleRemoveInsight = (id: string) => {
    setSelectedInsightIds(prev => {
      const next = prev.filter(i => i !== id);
      if (next.length === 0) {
        setRightView('insights');
      }
      return next;
    });
  };

  const showBackButton = rightView !== 'insights';

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5 border-b border-border">
        {showBackButton && (
          <button
            onClick={goBack}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
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
                  onClick={() => {
                    setSelectedInsightIds(pos.insightIds || [pos.insightId]);
                    setRightView('signal-detail');
                    setShowPositions(false);
                  }}
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

        {isMobile && (
          <button
            onClick={() => setShowChat(!showChat)}
            className="px-3 py-1 rounded-full text-xs font-medium bg-accent text-foreground"
          >
            {showChat ? 'Content' : 'Chat'}
          </button>
        )}
      </header>

      {/* Split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat */}
        {(!isMobile || showChat) && (
          <div className={cn(
            'flex flex-col border-r border-border transition-all duration-200',
            isMobile ? 'w-full' : chatCollapsed ? 'w-12 flex-shrink-0' : 'w-[340px] flex-shrink-0'
          )}>
            <ChatView
              activeInsightIds={rightView === 'signal-detail' ? selectedInsightIds : []}
              onAddInsight={handleAddInsight}
              onShare={goToShare}
              chatCollapsed={!isMobile && chatCollapsed}
              onToggleCollapse={!isMobile ? () => setChatCollapsed(!chatCollapsed) : undefined}
            />
          </div>
        )}

        {/* Right: Dynamic content */}
        {(!isMobile || !showChat) && (
          <div className="flex-1 overflow-hidden">
            {rightView === 'insights' && (
              <InsightsView
                onSelectInsight={goToSignalDetail}
                selectedInsightId={primaryInsightId || undefined}
                activeProject={activeProject}
              />
            )}
            {rightView === 'signal-detail' && selectedInsightIds.length > 0 && (
              <SignalDetailView
                insightIds={selectedInsightIds}
                onBack={goBack}
                onAddInsight={handleAddInsight}
                onRemoveInsight={handleRemoveInsight}
              />
            )}
            {rightView === 'share' && primaryInsightId && (
              <ShareWizardView
                insightIds={selectedInsightIds}
                onBack={goBack}
                onOpenThread={goToThread}
              />
            )}
            {rightView === 'thread' && primaryInsightId && (
              <ThreadView
                insightIds={selectedInsightIds}
                onBack={goBack}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
