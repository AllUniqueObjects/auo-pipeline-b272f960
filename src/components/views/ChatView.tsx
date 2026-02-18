import { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_CHAT_MESSAGES, type MockChatMessage } from '@/data/mock';
import { LiveSignalSurface } from '@/components/views/LiveSignalSurface';

interface ChatViewProps {
  onOpenSignals?: () => void;
}

export function ChatView({ onOpenSignals }: ChatViewProps) {
  const [messages, setMessages] = useState<MockChatMessage[]>(MOCK_CHAT_MESSAGES);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const resetTextareaHeight = () => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const adjustHeight = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    if (inputExpanded) {
      const h = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${h}px`;
    } else {
      textareaRef.current.style.height = '38px';
    }
  };

  useEffect(() => { adjustHeight(); }, [inputExpanded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustHeight();
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: MockChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    resetTextareaHeight();
    setTyping(true);

    setTimeout(() => {
      const reply: MockChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I'll pull the relevant signals on that. Give me a moment to cross-reference the latest data points.",
      };
      setMessages(prev => [...prev, reply]);
      setTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-sm font-semibold tracking-[0.15em] text-foreground">AUO</span>
        <button
          onClick={onOpenSignals}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Signals
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-5">
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {typing && <TypingIndicator />}
        </div>
      </div>

      {/* LiveSignalSurface + Input */}
      <div className="flex-shrink-0">
        <LiveSignalSurface />
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask AUO..."
              rows={1}
              className="flex-1 bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none overflow-y-auto"
              style={{ maxHeight: inputExpanded ? '120px' : '38px' }}
            />
            <button onClick={() => setInputExpanded(!inputExpanded)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
              {inputExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <button onClick={handleSend} disabled={!input.trim()} className="p-2.5 rounded-lg bg-accent text-foreground hover:bg-accent/80 transition-colors disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: MockChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <span className={cn(
        'text-[10px] font-medium uppercase tracking-wider mb-1 px-1',
        isUser ? 'text-muted-foreground' : 'text-muted-foreground'
      )}>
        {isUser ? 'David' : 'AUO'}
      </span>
      <div className={cn(
        'max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed break-words',
        isUser
          ? 'bg-accent text-accent-foreground'
          : 'bg-card border border-border text-card-foreground'
      )}>
        <MarkdownLite text={message.content} />
      </div>
    </div>
  );
}

export function MarkdownLite({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
          }
          return <span key={j}>{part}</span>;
        });
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
          return (<div key={i} className="flex gap-2 pl-1"><span className="text-muted-foreground">•</span><span>{rendered}</span></div>);
        }
        if (!line.trim()) return <div key={i} className="h-2" />;
        return <p key={i}>{rendered}</p>;
      })}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex flex-col items-start">
      <span className="text-[10px] font-medium uppercase tracking-wider mb-1 px-1 text-muted-foreground">AUO</span>
      <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
