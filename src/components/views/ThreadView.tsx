import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, AlertTriangle, ChevronDown, ChevronRight, Link2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_THREAD, MOCK_QUICK_QUESTIONS } from '@/data/mock-threads';
import { MOCK_INSIGHTS, MOCK_SIGNALS, MOCK_EVIDENCE_REFS } from '@/data/mock';
import { MarkdownLite } from '@/components/views/ChatView';

interface ThreadViewProps {
  insightIds: string[];
  onBack: () => void;
  userNotes?: string;
  assumptions?: { text: string; checked: boolean }[];
  recommendedAction?: string;
}

export function ThreadView({ insightIds, onBack, userNotes, assumptions, recommendedAction }: ThreadViewProps) {
  const insightId = insightIds[0];
  const thread = MOCK_THREAD;
  const insight = MOCK_INSIGHTS.find(i => i.id === insightId);
  const signals = useMemo(() => {
    if (!insight?.signal_ids) return MOCK_SIGNALS;
    return MOCK_SIGNALS.filter(s => insight.signal_ids!.includes(s.id));
  }, [insight]);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(thread.messages);
  const [showQuickQ, setShowQuickQ] = useState(true);
  const [showUpdate, setShowUpdate] = useState(true);
  const [showEvidence, setShowEvidence] = useState(false);
  const [expandedSignalIdx, setExpandedSignalIdx] = useState<number | null>(null);
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
        <div className="flex-shrink-0 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-primary text-lg">✦</span>
            <div>
              <p className="text-sm font-semibold text-foreground">Discussion</p>
              <p className="text-xs text-muted-foreground">Chat with participants</p>
            </div>
          </div>
        </div>

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

        {showQuickQ && (
          <div className="flex-shrink-0 px-4 py-2 border-t border-border">
            <button onClick={() => setShowQuickQ(false)} className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              Quick questions <ChevronDown className="h-3 w-3" />
            </button>
            <div className="flex flex-wrap gap-1.5">
              {MOCK_QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => handleSend(q)} className="px-2.5 py-1.5 rounded-md border border-border text-xs text-foreground hover:bg-accent transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

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

      {/* Right: Full signal detail panel */}
      <div className="hidden md:flex flex-1 flex-col overflow-y-auto px-6 py-6">
        {/* Participants */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Participants</span>
          <div className="flex items-center gap-2 ml-3">
            {thread.participants.map(p => (
              <ParticipantBadge key={p.id} participant={p} />
            ))}
          </div>
        </div>

        {/* Update banner */}
        {showUpdate && thread.updates.length > 0 && (
          <div className="mb-6 rounded-lg border border-tier-developing/40 bg-tier-developing/5 p-4">
            <button onClick={() => setShowUpdate(false)} className="w-full flex items-center gap-3 text-left">
              <AlertTriangle className="h-5 w-5 text-tier-developing flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{thread.updates.length} UPDATE DETECTED</p>
                <p className="text-xs text-muted-foreground">Changes have occurred since you shared this position</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Shared Position card */}
        {(userNotes?.trim() || recommendedAction?.trim() || assumptions?.some(a => a.checked)) && (
          <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-primary mb-3">David's Position</p>
            {userNotes?.trim() && (
              <p className="text-sm text-foreground leading-relaxed mb-3">{userNotes}</p>
            )}
            {assumptions?.some(a => a.checked) && (
              <div className="mb-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Key Assumptions</p>
                <ul className="space-y-1">
                  {assumptions.filter(a => a.checked).map((a, i) => (
                    <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">✓</span>
                      {a.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {recommendedAction?.trim() && (
              <div className="rounded bg-primary/10 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Recommended Action</p>
                <p className="text-sm font-medium text-foreground">{recommendedAction}</p>
              </div>
            )}
          </div>
        )}

        {/* Decision position */}
        <h2 className="text-xl font-bold text-foreground leading-tight mb-4">
          "{insight?.title || thread.decision_title}"
        </h2>

        {/* Confidence badge + description */}
        <div className="flex items-start gap-3 mb-6">
          <span className="px-3 py-1.5 rounded text-xs font-bold bg-tier-developing/15 text-tier-developing uppercase whitespace-nowrap">
            Medium Confidence
          </span>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Based on {signals.length} validated signals with supporting quantitative data.
            {signals.length >= 3 ? ' Two signals showed strong evidence; one has timeline uncertainty that requires monitoring.' : ''}
          </p>
        </div>

        {/* Decision question callout */}
        {insight?.decision_question && (
          <div className="p-4 rounded-lg border-l-[3px] border-tier-breaking bg-tier-breaking/5 mb-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Decision Question</p>
            <p className="text-sm text-foreground/80 leading-relaxed italic">{insight.decision_question}</p>
          </div>
        )}

        {/* User relevance */}
        {insight?.user_relevance && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border mb-6">
            <p className="text-xs font-medium text-muted-foreground mb-1">Why this matters to you</p>
            <p className="text-sm text-foreground">{insight.user_relevance}</p>
          </div>
        )}

        {/* How signals combined */}
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
            How Signals Combined
          </p>
          <div className="border-l-2 border-primary/30 pl-4 space-y-4">
            {/* Signal convergence rows */}
            {signals.slice(0, 3).map((signal, i) => {
              const labels = ['Competitive', 'Supply Chain', 'Macro Risk'];
              const relations = ['SUPPORTING', 'AMPLIFYING', 'QUALIFYING'];
              const relationColors = [
                'bg-green-100 text-green-700',
                'bg-primary/10 text-primary',
                'bg-tier-developing/15 text-tier-developing',
              ];
              return (
                <div key={signal.id} className="flex items-center gap-3 flex-wrap">
                  <span className="text-primary text-sm">↗</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {labels[i % labels.length]}
                  </span>
                  <span className="text-sm text-foreground flex-1 min-w-0 truncate">{signal.title.slice(0, 50)}...</span>
                  <span className={cn('ml-auto px-2 py-0.5 rounded text-[10px] font-medium uppercase whitespace-nowrap', relationColors[i % relationColors.length])}>
                    {relations[i % relations.length]}
                  </span>
                </div>
              );
            })}

            {/* What held / What almost broke */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-xs font-semibold text-green-700 flex items-center gap-1 mb-1">
                  <CheckIcon className="h-3 w-3" /> WHAT HELD
                </p>
                <p className="text-sm text-foreground">Strong demand signals across {signals.length} sources</p>
              </div>
              <div className="rounded-lg border border-tier-developing/40 bg-tier-developing/5 p-3">
                <p className="text-xs font-semibold text-tier-developing flex items-center gap-1 mb-1">
                  <AlertTriangle className="h-3 w-3" /> WHAT ALMOST BROKE
                </p>
                <p className="text-sm text-foreground">Regional variance unclear, timeline compressed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Individual signal cards */}
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Underlying Signals ({signals.length})
          </p>
          <div className="space-y-2">
            {signals.map((signal, idx) => {
              const credPct = Math.round(signal.credibility * 100);
              const expanded = expandedSignalIdx === idx;
              return (
                <button
                  key={signal.id}
                  onClick={() => setExpandedSignalIdx(expanded ? null : idx)}
                  className={cn(
                    'w-full text-left rounded-lg border p-3 transition-all',
                    expanded ? 'border-primary/30 bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <ChevronRight className={cn('h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
                      <h4 className={cn('text-sm font-medium text-foreground leading-snug', !expanded && 'line-clamp-1')}>
                        {signal.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-xs text-muted-foreground">
                      <span>{signal.sources} src</span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-8 h-1.5 rounded-full bg-muted overflow-hidden">
                          <span
                            className={cn('block h-full rounded-full', credPct > 50 ? 'bg-ring' : 'bg-tier-developing')}
                            style={{ width: `${Math.max(credPct, 5)}%` }}
                          />
                        </span>
                        <span className="text-[10px]">{credPct}%</span>
                      </span>
                    </div>
                  </div>
                  {expanded && (
                    <div className="ml-5 mt-2 space-y-2">
                      <p className="text-xs text-foreground/70 leading-relaxed">{signal.analysis_context}</p>
                      <p className="text-xs text-muted-foreground italic">{signal.nb_relevance}</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Convergence reasoning */}
        {insight?.convergence_reasoning && (
          <CollapsibleBlock label="How these signals connect" defaultOpen={false}>
            <p className="text-sm text-foreground/70 leading-relaxed">{insight.convergence_reasoning}</p>
          </CollapsibleBlock>
        )}

        {/* Tier reasoning */}
        {insight?.tier_reasoning && (
          <CollapsibleBlock label="Why this tier" defaultOpen={false}>
            <p className="text-sm text-foreground/70 leading-relaxed">{insight.tier_reasoning}</p>
          </CollapsibleBlock>
        )}

        {/* Evidence citations */}
        <CollapsibleBlock label={`Evidence (${MOCK_EVIDENCE_REFS.length} sources)`} defaultOpen={false}>
          <div className="space-y-1">
            {MOCK_EVIDENCE_REFS.map((ref, i) => (
              <div key={i} className="flex gap-3 text-sm py-2 px-3 rounded bg-muted/30">
                <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0 mt-0.5 bg-muted px-1 rounded">
                  R
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground flex items-center gap-1">
                    Source: [{ref.number}]
                    <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    "{ref.signal_excerpt}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleBlock>
      </div>
    </div>
  );
}

function ParticipantBadge({ participant: p }: { participant: { id: string; name: string; role: string; initials: string } }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border',
      p.role === 'owner' && 'border-tier-developing/40 bg-tier-developing/5 text-tier-developing',
      p.role === 'invited' && 'border-border bg-muted text-foreground',
      p.role === 'monitoring' && 'border-primary/30 bg-primary/5 text-primary',
    )}>
      <span className={cn(
        'h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-medium',
        p.role === 'owner' && 'bg-tier-developing text-tier-developing-foreground',
        p.role === 'invited' && 'bg-muted-foreground/20 text-foreground',
        p.role === 'monitoring' && 'bg-primary text-primary-foreground',
      )}>
        {p.initials}
      </span>
      {p.name}
      <span className="text-[10px] opacity-60">{p.role}</span>
    </span>
  );
}

function CollapsibleBlock({ label, defaultOpen, children }: { label: string; defaultOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRight className={cn('h-3 w-3 transition-transform', open && 'rotate-90')} />
        {label}
      </button>
      {open && <div className="mt-2 pl-4">{children}</div>}
    </div>
  );
}

function CheckIcon(props: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
