import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChatView } from '@/components/views/ChatView';
import { InsightsView } from '@/components/views/InsightsView';
import { SignalDetailView } from '@/components/views/SignalDetailView';
import { ShareWizardView } from '@/components/views/ShareWizardView';
import { ThreadView } from '@/components/views/ThreadView';
import { type InvestigationNote, getDefaultAssumptions } from '@/data/mock-positions';
import { MOCK_PROJECTS } from '@/data/mock';

type RightView = 'insights' | 'signal-detail' | 'share' | 'thread';

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const isMobile = useIsMobile();
  const [rightView, setRightView] = useState<RightView>('insights');
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const [investigationNote, setInvestigationNote] = useState<InvestigationNote | null>(null);
  const [activeProject, setActiveProject] = useState('p1');
  const [showChat, setShowChat] = useState(true); // mobile toggle

  const goToInsights = () => setRightView('insights');
  const goToSignalDetail = (id: string) => {
    setSelectedInsightId(id);
    if (!investigationNote || investigationNote.insightId !== id) {
      setInvestigationNote({
        insightId: id,
        userNotes: '',
        assumptions: getDefaultAssumptions(id),
        recommendedAction: '',
      });
    }
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
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                activeProject === p.id
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
        {isMobile && (
          <button
            onClick={() => setShowChat(!showChat)}
            className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-accent text-foreground"
          >
            {showChat ? 'Content' : 'Chat'}
          </button>
        )}
      </header>

      {/* Split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat */}
        {(!isMobile || showChat) && (
          <div className={cn('flex flex-col border-r border-border', isMobile ? 'w-full' : 'w-[340px] flex-shrink-0')}>
            <ChatView />
          </div>
        )}

        {/* Right: Dynamic content */}
        {(!isMobile || !showChat) && (
          <div className="flex-1 overflow-hidden">
            {rightView === 'insights' && (
              <InsightsView
                onSelectInsight={goToSignalDetail}
                selectedInsightId={selectedInsightId || undefined}
              />
            )}
            {rightView === 'signal-detail' && selectedInsightId && (
              <SignalDetailView
                insightId={selectedInsightId}
                onBack={goBack}
                onShare={goToShare}
                note={investigationNote || undefined}
                onUpdateNote={setInvestigationNote}
              />
            )}
            {rightView === 'share' && selectedInsightId && (
              <ShareWizardView
                insightId={selectedInsightId}
                onBack={goBack}
                onOpenThread={goToThread}
                userNotes={investigationNote?.userNotes}
                assumptions={investigationNote?.assumptions}
                recommendedAction={investigationNote?.recommendedAction}
              />
            )}
            {rightView === 'thread' && selectedInsightId && (
              <ThreadView
                insightId={selectedInsightId}
                onBack={goBack}
                userNotes={investigationNote?.userNotes}
                assumptions={investigationNote?.assumptions}
                recommendedAction={investigationNote?.recommendedAction}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
