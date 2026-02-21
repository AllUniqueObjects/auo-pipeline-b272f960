import { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownLite } from '@/components/views/ChatView';

interface ThreadMessage {
  id: string;
  participant_id: string;
  content: string;
  timestamp: string;
}

interface ThreadViewProps {
  insightIds: string[];
  onBack: () => void;
  userNotes?: string;
  assumptions?: { text: string; checked: boolean }[];
  recommendedAction?: string;
}

export function ThreadView({ insightIds, onBack, userNotes, assumptions, recommendedAction }: ThreadViewProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
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
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No thread messages yet.</p>
        </div>
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
            <button onClick={() => handleSend()} disabled={!input.trim()} className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.map(msg => {
          const isUser = msg.participant_id === 'user-1';
          return (
            <div key={msg.id}>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium',
                  isUser ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'
                )}>
                  {isUser ? 'D' : '✦'}
                </span>
                <span className="text-xs font-medium text-foreground">{isUser ? 'You' : 'AUO'}</span>
                <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
              </div>
              <div className="ml-8 bg-muted/50 rounded-lg px-3 py-2 text-sm text-foreground leading-relaxed">
                <MarkdownLite text={msg.content} />
              </div>
            </div>
          );
        })}
      </div>

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
          <button onClick={() => handleSend()} disabled={!input.trim()} className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
