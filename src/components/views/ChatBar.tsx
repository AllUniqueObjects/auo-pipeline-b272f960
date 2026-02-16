import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_CHAT_MESSAGES, type MockChatMessage } from '@/data/mock';
import { MarkdownLite } from '@/components/views/ChatView';

export function ChatBar() {
  const [expanded, setExpanded] = useState(false);
  const [messages] = useState<MockChatMessage[]>(MOCK_CHAT_MESSAGES.slice(-3));
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [expanded]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    console.log('ChatBar send:', text);
    setInput('');
  };

  return (
    <>
      {/* Backdrop */}
      {expanded && (
        <div
          className="absolute inset-0 bg-background/60 z-40"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 z-50 transition-all duration-300 border-t border-border bg-card',
          expanded ? 'h-[40%] md:h-[40%]' : 'h-12'
        )}
        style={expanded ? { minHeight: '200px' } : {}}
      >
        {expanded ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Chat</span>
              <button onClick={() => setExpanded(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed break-words',
                    msg.role === 'user'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted/50 text-card-foreground'
                  )}>
                    <MarkdownLite text={msg.content.split('\n').slice(0, 4).join('\n') + (msg.content.split('\n').length > 4 ? '...' : '')} />
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-4 py-2 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask AUO anything..."
                  className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button onClick={handleSend} disabled={!input.trim()} className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setExpanded(true)}
            className="w-full h-full flex items-center gap-3 px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Ask AUO anything...
          </button>
        )}
      </div>
    </>
  );
}
