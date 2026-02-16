import { useState, useRef, useEffect } from 'react';
import { Send, AlertTriangle, ChevronDown, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_THREAD, MOCK_QUICK_QUESTIONS } from '@/data/mock-threads';
import { MOCK_INSIGHTS } from '@/data/mock';
import { MarkdownLite } from '@/components/views/ChatView';

interface ThreadViewProps {
  insightId: string;
  onBack: () => void;
}

export function ThreadView({ insightId, onBack }: ThreadViewProps) {
  const thread = MOCK_THREAD;
  const insight = MOCK_INSIGHTS.find(i => i.id === insightId);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(thread.messages);
  const [showQuickQ, setShowQuickQ] = useState(true);
  const [showUpdate, setShowUpdate] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    setMessages(prev => [
      ...prev,
      { id: crypto.randomUUID(), participant_id: 'user-1', content: msg, timestamp: 'now' },
    ]);
    setInput('');

    // Simulate AUO response
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          participant_id: 'auo',
          content: "I'll pull the relevant data on that. Let me cross-reference the latest signals.",
          timestamp: 'now',
        },
      ]);
    }, 1200);
  };

  const participantMap = Object.fromEntries(thread.participants.map(p => [p.id, p]));

  return (
    <div className="flex h-full">
      {/* Left: Discussion */}
      <div className="w-full md:w-[400px] flex flex-col border-r border-border">
        {/* Discussion header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-primary text-lg">✦</span>
            <div>
              <p className="text-sm font-semibold text-foreground">Discussion</p>
              <p className="text-xs text-muted-foreground">Chat with participants</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 pb-40">
          {messages.map(msg => {
            const p = participantMap[msg.participant_id];
            const isAuo = msg.participant_id === 'auo';
            return (
              <div key={msg.id}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium',
                    isAuo ? 'bg-primary text-primary-foreground' : p?.color || 'bg-muted',
                    !isAuo && 'text-foreground'
                  )}>
                    {p?.initials || '?'}
                  </span>
                  <span className="text-xs font-medium text-foreground">{isAuo ? 'AUO' : p?.name}</span>
                  <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                </div>
                <div className="ml-8 bg-muted/50 rounded-lg px-3 py-2 text-sm text-foreground leading-relaxed">
                  <MarkdownLite text={msg.content} />
                  {msg.signal_ref && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-primary">
                      <Link2 className="h-3 w-3" />
                      <span className="underline underline-offset-2">{msg.signal_ref.title}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick questions */}
        {showQuickQ && (
          <div className="flex-shrink-0 px-4 py-2 border-t border-border">
            <button
              onClick={() => setShowQuickQ(!showQuickQ)}
              className="flex items-center gap-1 text-xs text-muted-foreground mb-2"
            >
              Quick questions <ChevronDown className="h-3 w-3" />
            </button>
            <div className="flex flex-wrap gap-1.5">
              {MOCK_QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="px-2.5 py-1.5 rounded-md border border-border text-xs text-foreground hover:bg-accent transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Thread content (hidden on mobile) */}
      <div className="hidden md:flex flex-1 flex-col overflow-y-auto px-6 py-6">
        {/* Participants */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Participants</span>
          <div className="flex items-center gap-2 ml-3">
            {thread.participants.map(p => (
              <span
                key={p.id}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border',
                  p.role === 'owner' && 'border-orange-300 bg-orange-50 text-orange-700',
                  p.role === 'invited' && 'border-border bg-muted text-foreground',
                  p.role === 'monitoring' && 'border-primary/30 bg-primary/5 text-primary',
                )}
              >
                <span className={cn(
                  'h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-medium',
                  p.role === 'owner' && 'bg-orange-500 text-white',
                  p.role === 'invited' && 'bg-muted-foreground/20 text-foreground',
                  p.role === 'monitoring' && 'bg-primary text-primary-foreground',
                )}>
                  {p.initials}
                </span>
                {p.name}
                <span className="text-[10px] opacity-60">{p.role}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Update banner */}
        {showUpdate && thread.updates.length > 0 && (
          <button
            onClick={() => setShowUpdate(false)}
            className="w-full mb-6 p-4 rounded-lg border border-orange-300 bg-orange-50 flex items-center gap-3 text-left hover:bg-orange-100 transition-colors"
          >
            <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{thread.updates.length} UPDATE DETECTED</p>
              <p className="text-xs text-muted-foreground">Changes have occurred since you shared this position</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        {/* Decision position */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground leading-tight mb-4">
            "{thread.decision_title}"
          </h2>

          {/* Confidence */}
          <div className="flex items-center gap-3 mb-6">
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-700 uppercase">
              Medium Confidence
            </span>
            <p className="text-sm text-muted-foreground">
              Based on {insight?.signal_count || 3} validated signals with supporting quantitative data.
            </p>
          </div>

          {/* How signals combined */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
              How Signals Combined
            </p>
            <div className="border-l-2 border-primary/30 pl-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-primary">↗</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">Competitive</span>
                <span className="text-sm text-foreground">Market window is favorable</span>
                <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 uppercase">Supporting</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-xs font-semibold text-green-700 flex items-center gap-1 mb-1">
                    <Check className="h-3 w-3" /> WHAT HELD
                  </p>
                  <p className="text-sm text-foreground">Strong demand signals</p>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <p className="text-xs font-semibold text-orange-600 flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-3 w-3" /> WHAT ALMOST BROKE
                  </p>
                  <p className="text-sm text-foreground">Regional variance unclear</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Check(props: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
