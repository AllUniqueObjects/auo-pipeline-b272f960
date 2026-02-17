import { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown, ChevronUp, MessageSquare, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_CHAT_MESSAGES, MOCK_INSIGHTS, INSIGHT_RECOMMENDATIONS, MULTI_POSITION_BRIEFS, MOCK_POSITION_BRIEFS, PROACTIVE_BRIEFINGS, type MockChatMessage } from '@/data/mock';
import { PositionCard, type PositionBrief } from '@/components/views/PositionCard';

const TIER_DOT_COLORS: Record<string, string> = {
  breaking: 'bg-tier-breaking',
  developing: 'bg-tier-developing',
  established: 'bg-tier-established',
};

interface ChatViewProps {
  activeInsightIds?: string[];
  onAddInsight?: (id: string) => void;
  onShare?: () => void;
  chatCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ChatView({ activeInsightIds = [], onAddInsight, onShare, chatCollapsed, onToggleCollapse }: ChatViewProps) {
  const [messages, setMessages] = useState<MockChatMessage[]>(MOCK_CHAT_MESSAGES);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(true);
  const [userMsgCount, setUserMsgCount] = useState(0);
  const [lastContextKey, setLastContextKey] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const primaryInsightId = activeInsightIds[0] || null;
  const contextKey = [...activeInsightIds].sort().join(',');

  // When activeInsightIds changes, inject a proactive briefing
  useEffect(() => {
    if (primaryInsightId && contextKey !== lastContextKey) {
      setLastContextKey(contextKey);
      setUserMsgCount(0);

      const briefing = PROACTIVE_BRIEFINGS[contextKey];
      if (briefing) {
        // Use the proactive briefing (may contain __INSIGHT_RECS__ inline)
        const contextMsg: MockChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: briefing,
        };
        setMessages(prev => [...prev, contextMsg]);
      } else if (activeInsightIds.length > 1) {
        // Fallback for combos without a specific briefing
        const titles = activeInsightIds
          .map(id => MOCK_INSIGHTS.find(i => i.id === id)?.title?.slice(0, 30))
          .filter(Boolean);
        const contextMsg: MockChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Interesting combination — ${titles.join(' and ')}. Let me map how these connect...\n\nI see overlapping signals here. What's driving your interest in combining these?`,
        };
        setMessages(prev => [...prev, contextMsg]);
      } else {
        // Fallback for single insights without a briefing
        const insight = MOCK_INSIGHTS.find(i => i.id === primaryInsightId);
        const recs = INSIGHT_RECOMMENDATIONS[primaryInsightId];
        let content = `A few things worth knowing about ${insight?.title?.slice(0, 40)}...`;
        if (recs) {
          content += `\n\n__INSIGHT_RECS__${recs.join(',')}`;
        }
        const contextMsg: MockChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content,
        };
        setMessages(prev => [...prev, contextMsg]);
      }
    }
  }, [contextKey, primaryInsightId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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

  useEffect(() => {
    adjustHeight();
  }, [inputExpanded]);

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

    const newCount = userMsgCount + 1;
    setUserMsgCount(newCount);

    // Position card after 1 user message (since AUO already briefed proactively)
    const sortedIds = [...activeInsightIds].sort().join(',');
    const multiBrief = MULTI_POSITION_BRIEFS[sortedIds];
    const singleBrief = primaryInsightId ? MOCK_POSITION_BRIEFS[primaryInsightId] : null;
    const shouldGeneratePosition = primaryInsightId && newCount >= 1 && (multiBrief || singleBrief);

    setTimeout(() => {
      if (shouldGeneratePosition) {
        const reply: MockChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '__POSITION_CARD__' + sortedIds,
        };
        setMessages(prev => [...prev, reply]);
      } else {
        const reply: MockChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: primaryInsightId
            ? "Got it. What assumptions are you making about this?"
            : "I'll pull the relevant signals on that. Give me a moment to cross-reference the latest data points.",
        };
        setMessages(prev => [...prev, reply]);
      }
      setTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const placeholder = primaryInsightId ? "What's your read on this?" : 'Ask AUO anything...';

  if (chatCollapsed) {
    return (
      <div className="flex flex-col items-center py-4 w-12">
        <button onClick={onToggleCollapse} className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
          <ChevronRightIcon className="h-4 w-4" />
        </button>
        <div className="mt-4 flex flex-col items-center">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  const renderMessageContent = (msg: MockChatMessage) => {
    if (msg.role !== 'assistant') return <MessageBubble key={msg.id} message={msg} />;

    // Position card
    if (msg.content.startsWith('__POSITION_CARD__')) {
      const idsKey = msg.content.replace('__POSITION_CARD__', '');
      const brief = MULTI_POSITION_BRIEFS[idsKey] || MOCK_POSITION_BRIEFS[idsKey];
      if (brief) {
        const briefWithBasedOn: PositionBrief = {
          ...brief,
          basedOn: idsKey.includes(',') ? idsKey.split(',') : [idsKey],
        };
        return (
          <div key={msg.id} className="flex justify-start">
            <div className="max-w-[95%]">
              <p className="text-xs text-muted-foreground mb-2">Clear. Here's your position brief:</p>
              <PositionCard brief={briefWithBasedOn} onShare={onShare} />
            </div>
          </div>
        );
      }
    }

    // Insight recommendations
    if (msg.content.includes('__INSIGHT_RECS__')) {
      const parts = msg.content.split('__INSIGHT_RECS__');
      const beforeText = parts[0];
      const afterParts = parts[1].split('\n\n');
      const recIdsStr = afterParts[0];
      const afterText = afterParts.slice(1).join('\n\n');
      const recIds = recIdsStr.split(',');

      return (
        <div key={msg.id} className="flex justify-start">
          <div className="max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed bg-card border border-border text-card-foreground">
            <MarkdownLite text={beforeText} />
            <div className="flex flex-wrap gap-2 my-3">
              {recIds.map(id => {
                const insight = MOCK_INSIGHTS.find(i => i.id === id);
                if (!insight) return null;
                const alreadyAdded = activeInsightIds.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => !alreadyAdded && onAddInsight?.(id)}
                    disabled={alreadyAdded}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all text-xs',
                      alreadyAdded
                        ? 'border-primary/30 bg-primary/5 opacity-60 cursor-default'
                        : 'border-border hover:border-ring/40 hover:bg-accent/50 cursor-pointer'
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full flex-shrink-0', TIER_DOT_COLORS[insight.tier] || 'bg-muted-foreground')} />
                    <span className="text-card-foreground line-clamp-1">{insight.title.slice(0, 40)}...</span>
                    {alreadyAdded && <span className="text-[10px] text-primary">Added</span>}
                  </button>
                );
              })}
            </div>
            {afterText && <MarkdownLite text={afterText} />}
          </div>
        </div>
      );
    }

    return <MessageBubble key={msg.id} message={msg} />;
  };

  return (
    <div className="flex flex-col h-full">
      {onToggleCollapse && (
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Chat</span>
          <button onClick={onToggleCollapse} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-4">
          {messages.map(msg => renderMessageContent(msg))}
          {typing && <TypingIndicator />}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
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
  );
}

function MessageBubble({ message }: { message: MockChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed break-words',
        isUser ? 'bg-accent text-accent-foreground' : 'bg-card border border-border text-card-foreground'
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
    <div className="flex justify-start">
      <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
