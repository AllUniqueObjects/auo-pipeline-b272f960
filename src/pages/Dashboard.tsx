import { useState } from 'react';
import { MessageSquare, BarChart3, ArrowLeft, Share2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatView } from '@/components/views/ChatView';
import { InsightsView } from '@/components/views/InsightsView';
import { SignalDetailView } from '@/components/views/SignalDetailView';
import { ShareWizardView } from '@/components/views/ShareWizardView';
import { ThreadView } from '@/components/views/ThreadView';
import { ChatBar } from '@/components/views/ChatBar';

export type AppView = 'chat' | 'insights' | 'signal-detail' | 'share' | 'thread';

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [view, setView] = useState<AppView>('chat');
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);

  const goToInsights = () => setView('insights');
  const goToChat = () => setView('chat');
  const goToSignalDetail = (id: string) => {
    setSelectedInsightId(id);
    setView('signal-detail');
  };
  const goToShare = () => setView('share');
  const goToThread = () => setView('thread');
  const goBack = () => {
    if (view === 'thread') setView('share');
    else if (view === 'share') setView('signal-detail');
    else if (view === 'signal-detail') setView('insights');
    else setView('chat');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          {view !== 'chat' && (
            <button
              onClick={goBack}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <span className="text-base font-semibold tracking-[0.2em] text-foreground">
            AUO
          </span>
        </div>
        <nav className="flex items-center gap-1">
          <NavButton icon={<MessageSquare className="h-4 w-4" />} label="Chat" active={view === 'chat'} onClick={goToChat} />
          <NavButton icon={<BarChart3 className="h-4 w-4" />} label="Insights" active={view === 'insights' || view === 'signal-detail'} onClick={goToInsights} />
          {selectedInsightId && (
            <>
              <NavButton icon={<Share2 className="h-4 w-4" />} label="Share" active={view === 'share'} onClick={goToShare} />
              <NavButton icon={<MessageCircle className="h-4 w-4" />} label="Thread" active={view === 'thread'} onClick={goToThread} />
            </>
          )}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden relative">
        {view === 'chat' && <ChatView />}
        {view === 'insights' && (
          <InsightsView onSelectInsight={goToSignalDetail} />
        )}
        {view === 'signal-detail' && selectedInsightId && (
          <SignalDetailView insightId={selectedInsightId} onBack={goBack} />
        )}
        {view === 'share' && selectedInsightId && (
          <ShareWizardView insightId={selectedInsightId} onBack={goBack} onOpenThread={goToThread} />
        )}
        {view === 'thread' && selectedInsightId && (
          <ThreadView insightId={selectedInsightId} onBack={goBack} />
        )}

        {/* Persistent chat bar on non-chat views */}
        {view !== 'chat' && view !== 'thread' && <ChatBar />}
      </main>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
