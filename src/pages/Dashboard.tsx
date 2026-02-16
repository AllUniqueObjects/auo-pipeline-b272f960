import { useState } from 'react';
import { MessageSquare, BarChart3, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatView } from '@/components/views/ChatView';
import { InsightsView } from '@/components/views/InsightsView';
import { SignalDetailView } from '@/components/views/SignalDetailView';
import { ChatBar } from '@/components/views/ChatBar';

export type AppView = 'chat' | 'insights' | 'signal-detail';

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
  const goBack = () => {
    if (view === 'signal-detail') setView('insights');
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
          <button
            onClick={goToChat}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === 'chat'
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
          </button>
          <button
            onClick={goToInsights}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === 'insights' || view === 'signal-detail'
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Insights</span>
          </button>
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

        {/* Persistent chat bar on non-chat views */}
        {view !== 'chat' && <ChatBar />}
      </main>
    </div>
  );
}
