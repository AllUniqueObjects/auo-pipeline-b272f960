import { useState } from 'react';
import { MessageSquare, BarChart3, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatView } from '@/components/views/ChatView';
import { InsightsView } from '@/components/views/InsightsView';
import { SignalDetailView } from '@/components/views/SignalDetailView';

export type AppView = 'chat' | 'insights' | 'signal-detail';

export interface NavigationState {
  view: AppView;
  insightId?: string;
  signalId?: string;
}

export default function Dashboard() {
  const [nav, setNav] = useState<NavigationState>({ view: 'chat' });

  const goToInsights = () => setNav({ view: 'insights' });
  const goToChat = () => setNav({ view: 'chat' });
  const goToSignalDetail = (insightId: string) =>
    setNav({ view: 'signal-detail', insightId });
  const goBack = () => {
    if (nav.view === 'signal-detail') {
      setNav({ view: 'insights' });
    } else {
      setNav({ view: 'chat' });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          {nav.view !== 'chat' && (
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
              nav.view === 'chat'
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
              nav.view === 'insights' || nav.view === 'signal-detail'
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
      <main className="flex-1 overflow-hidden">
        {nav.view === 'chat' && <ChatView />}
        {nav.view === 'insights' && (
          <InsightsView onSelectInsight={goToSignalDetail} />
        )}
        {nav.view === 'signal-detail' && nav.insightId && (
          <SignalDetailView insightId={nav.insightId} onBack={goBack} />
        )}
      </main>
    </div>
  );
}
