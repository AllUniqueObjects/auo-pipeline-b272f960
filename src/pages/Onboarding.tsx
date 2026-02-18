import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { type LensType } from '@/data/mock';

// ─── Types ─────────────────────────────────────────────────────────────────

type Beat = 'beat1' | 'beat2' | 'beat3' | 'beat4_confirm' | 'beat4_missing' | 'beat5';

type ScanCategory = 'INNOVATION' | 'MACROECONOMICS' | 'MARKET DYNAMICS' | 'CONSUMER';

type ScanState = 'idle' | 'scanning' | 'done';

interface ScanItem {
  category: ScanCategory;
  urgent: boolean;
  bullets: string[];
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

interface OnboardingProps {
  onComplete: (lens: LensType) => void;
}

// ─── Mock scan data ─────────────────────────────────────────────────────────

const SCAN_ITEMS: ScanItem[] = [
  {
    category: 'INNOVATION',
    urgent: false,
    bullets: [
      'Performance foam tech accelerating',
      'Made-in-USA narrative strengthening',
    ],
  },
  {
    category: 'MACROECONOMICS',
    urgent: true,
    bullets: [
      'Vietnam FOB inflation 7-8% annually',
      'Supreme Court tariff ruling Q2 2026',
    ],
  },
  {
    category: 'MARKET DYNAMICS',
    urgent: true,
    bullets: [
      'Foot Locker–Dick\'s: 2,200+ door consolidation forming',
      'Nike wholesale re-entry extended',
    ],
  },
  {
    category: 'CONSUMER',
    urgent: false,
    bullets: [
      'Gen Z heritage brand affinity growing',
      'Premium casual demand stabilizing',
    ],
  },
];

const PRIORITY_CATEGORIES: ScanCategory[] = ['MACROECONOMICS', 'MARKET DYNAMICS'];

const ONBOARDING_SIGNALS = [
  {
    id: 'ob-1',
    tier: 'breaking' as const,
    category: 'MACROECONOMICS',
    title: 'Supreme Court Sets April Hearing — Vietnam FOB Window Opens',
    refs: 203,
    credibility: 92,
    detail: '↑ Breaking since yesterday',
  },
  {
    id: 'ob-2',
    tier: 'breaking' as const,
    category: 'MARKET DYNAMICS',
    title: 'Foot Locker Leadership Vacuum Opens 60-Day 880 v15 Shelf Lock Window',
    refs: 5,
    credibility: 100,
    detail: '',
  },
  {
    id: 'ob-3',
    tier: 'developing' as const,
    category: 'MARKET DYNAMICS',
    title: 'Nike Wholesale Re-entry Accelerates — 880 v15 Shelf Competition Rising',
    refs: 3,
    credibility: 78,
    detail: '',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function useTypewriter(text: string, active: boolean, speed = 18) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active) return;
    setDisplayed('');
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(iv);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, active, speed]);
  return { displayed, done };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function AuoBubble({
  content,
  animate = false,
  onDone,
}: {
  content: string;
  animate?: boolean;
  onDone?: () => void;
}) {
  const { displayed, done } = useTypewriter(content, animate);
  const text = animate ? displayed : content;

  useEffect(() => {
    if (done && onDone) onDone();
  }, [done, onDone]);

  return (
    <div className="flex flex-col items-start gap-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70 px-0.5">
        AUO
      </span>
      <div className="max-w-[88%] rounded-2xl bg-card border border-border/60 px-5 py-4 text-[15px] leading-[1.7] text-foreground">
        {text.split('\n').map((line, i) =>
          line.trim() ? <p key={i} className="mb-1.5 last:mb-0">{line}</p> : <div key={i} className="h-2" />
        )}
      </div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex flex-col items-end gap-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70 px-0.5">
        You
      </span>
      <div className="max-w-[88%] rounded-2xl bg-primary/8 border border-primary/10 px-5 py-4 text-[15px] leading-[1.7] text-foreground">
        {content}
      </div>
    </div>
  );
}


function ScanningPanel({ revealedCount, company }: { revealedCount: number; company: string }) {
  return (
    <div className="flex-1 flex flex-col px-8 py-10 overflow-y-auto">
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
          Scanning
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {company.toUpperCase()}
        </h2>
      </div>
      <div className="space-y-5">
        {SCAN_ITEMS.map((item, idx) => {
          const revealed = idx < revealedCount;
          return (
            <div
              key={item.category}
              className={cn(
                'transition-all duration-500',
                revealed ? 'opacity-100' : 'opacity-30'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
                  {item.category}
                </span>
                {item.urgent && revealed && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-tier-breaking/10 text-tier-breaking">
                    ↑ URGENT
                  </span>
                )}
                {!revealed && (
                  <span className="flex gap-1 ml-1">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                    <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                    <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                  </span>
                )}
              </div>
              {revealed && (
                <div className="space-y-1 pl-0">
                  {item.bullets.map((b) => (
                    <p key={b} className="text-sm text-muted-foreground leading-snug">
                      • {b}
                    </p>
                  ))}
                </div>
              )}
              {!revealed && (
                <div className="h-4 w-32 rounded bg-border/50 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SignalsPanel() {
  return (
    <div className="flex-1 flex flex-col px-8 py-10 overflow-y-auto">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
          Signals for Your Context
        </p>
      </div>
      <div className="space-y-3">
        {ONBOARDING_SIGNALS.map((sig) => (
          <div
            key={sig.id}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="px-4 pt-3 pb-1 flex items-center gap-2">
              <span
                className={cn(
                  'text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full',
                  sig.tier === 'breaking'
                    ? 'bg-tier-breaking/10 text-tier-breaking'
                    : 'bg-tier-developing/10 text-tier-developing'
                )}
              >
                {sig.tier}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {sig.category}
              </span>
              {sig.detail && (
                <span className="ml-auto text-[10px] font-medium text-tier-breaking">
                  {sig.detail}
                </span>
              )}
            </div>
            <p className="px-4 pb-2 text-sm font-medium text-foreground leading-snug">
              {sig.title}
            </p>
            <div className="px-4 pb-3 flex items-center gap-2 text-[10px] text-muted-foreground border-t border-border/40 pt-2">
              <span>{sig.refs} signals</span>
              <span>·</span>
              <span>{sig.credibility}% credibility</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyRightPanel() {
  return (
    <div className="flex-1 flex flex-col px-8 py-10">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-6">
        What AUO will scan
      </p>
      <div className="space-y-4">
        {SCAN_ITEMS.map(item => (
          <div key={item.category} className="flex items-start gap-3 opacity-30">
            <div className="w-1 h-4 rounded-full bg-border mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-foreground mb-1">
                {item.category}
              </p>
              <div className="space-y-1">
                {item.bullets.map(b => (
                  <div key={b} className="h-2 w-40 rounded bg-border/60" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground/30 mt-8">
        Enter your company to start the scan
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [beat, setBeat] = useState<Beat>('beat1');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [introTypingDone, setIntroTypingDone] = useState(false);

  // Input
  const [inputValue, setInputValue] = useState('');
  const [inputVisible, setInputVisible] = useState(false);
  const [inputPlaceholder, setInputPlaceholder] = useState('');

  // Company name
  const [company, setCompany] = useState('');

  // Scan state
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanRevealedCount, setScanRevealedCount] = useState(0);

  // Priority selection (beat 3)
  const [selectedPriorities, setSelectedPriorities] = useState<ScanCategory[]>([...PRIORITY_CATEGORIES]);
  const [priorityConfirmed, setPriorityConfirmed] = useState(false);

  // Right panel
  type RightPanel = 'empty' | 'scanning' | 'signals';
  const [rightPanel, setRightPanel] = useState<RightPanel>('empty');

  // Completion banner
  const [showBanner, setShowBanner] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Scroll to bottom on new messages
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 60);
  }, [messages, animatingId, inputVisible, beat]);

  // ── Focus input when it appears
  useEffect(() => {
    if (inputVisible) inputRef.current?.focus();
  }, [inputVisible]);

  // ── Beat 1: AUO intro appears on mount
  useEffect(() => {
    const introId = 'auo-intro';
    setAnimatingId(introId);
    setMessages([{
      id: introId,
      role: 'assistant',
      content: "Hey — I'm AUO.\n\nI track signals across industries and help people cut through the noise to make better decisions, faster.\n\nI'm going to ask you a couple of things to calibrate to you — takes about two minutes. After that, everything I surface will actually be relevant to what you're working on.\n\nReady to start?",
    }]);
  }, []);

  const addMessage = useCallback((msg: ChatMessage, animateIt = false) => {
    setMessages(prev => [...prev, msg]);
    if (animateIt) setAnimatingId(msg.id);
    else setAnimatingId(null);
  }, []);

  const addAuo = useCallback((id: string, content: string, delay = 0) => {
    return new Promise<void>(resolve => {
      setTimeout(() => {
        addMessage({ id, role: 'assistant', content }, true);
        // Brief pause before next action (not tied to typewriter length)
        const readMs = Math.max(500, Math.min(content.length * 4, 1200));
        setTimeout(resolve, readMs);
      }, delay);
    });
  }, [addMessage]);

  // ── Beat 1 → 2: Let's go
  const handleLetsGo = async () => {
    setBeat('beat2');
    await addAuo('auo-b2', "First — what company are you at?", 200);
    setInputPlaceholder('e.g. New Balance');
    setInputVisible(true);
  };

  // ── Beat 2: company submitted
  const handleCompanySubmit = async (text: string) => {
    setCompany(text);
    setInputVisible(false);
    addMessage({ id: 'user-company', role: 'user', content: text });

    // AUO response + kick off scan
    await addAuo('auo-b2-resp', `On it — let me see what's happening in ${text}'s world right now.`, 400);

    // Start right panel scan
    setRightPanel('scanning');
    setScanState('scanning');
    setScanRevealedCount(0);

    // Reveal scan items one by one
    const revealDelay = 900;
    for (let i = 1; i <= SCAN_ITEMS.length; i++) {
      await new Promise<void>(r => setTimeout(r, revealDelay));
      setScanRevealedCount(i);
    }
    setScanState('done');

    // Beat 3 question fires while scan is loading (no wait)
    setBeat('beat3');
    await addAuo('auo-b3', "While that's loading —\n\nWhat are you actually working on right now?\n\nCould be a product, a decision, a deadline — whatever's top of mind.", 300);
    setInputPlaceholder("Tell AUO what's on your plate...");
    setInputVisible(true);
  };

  // ── Beat 3: tactical input submitted
  const handleTacticalSubmit = async (text: string) => {
    setInputVisible(false);
    addMessage({ id: 'user-tactical', role: 'user', content: text });

    await addAuo(
      'auo-b3-resp',
      "Vietnam sourcing, 880 v15 shelf, February window — got it.\n\nOne more thing: which of these feels most urgent to you right now?",
      400
    );

    setBeat('beat3'); // keep beat3 to show priority selector
    // Priority selector shows inline below
  };

  // ── Beat 3: priority toggle
  const togglePriority = (cat: ScanCategory) => {
    if (priorityConfirmed) return;
    setSelectedPriorities(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // ── Beat 3: priority confirmed
  const handlePriorityConfirm = async () => {
    if (priorityConfirmed) return;
    setPriorityConfirmed(true);

    const priorityLabel = selectedPriorities.join(' & ');
    addMessage({ id: 'user-priority', role: 'user', content: priorityLabel });

    await addAuo('auo-b3-confirm', "Makes sense given where things are right now.\n\nLet me pull the most relevant signals for you.", 400);

    // Right panel: signals
    await new Promise<void>(r => setTimeout(r, 600));
    setRightPanel('signals');

    await addAuo(
      'auo-b4',
      "Three breaking signals converge on your February window.\n\nDoes this feel right — or is something missing?",
      300
    );

    setBeat('beat4_confirm');
  };

  // ── Beat 4: confirm
  const handleConfirm = async () => {
    setBeat('beat5');
    addMessage({ id: 'user-confirm', role: 'user', content: 'This looks right →' });

    await addAuo(
      'auo-b5',
      "You're all set.\n\nI scan for new signals 3× daily. The panel on your right will always show what's most relevant to you.\n\nYou can shift focus anytime from the top right.",
      400
    );

    setShowBanner(true);
    setTimeout(() => {
      onComplete('balanced');
    }, 2200);
  };

  // ── Beat 4: something missing
  const handleMissing = async () => {
    setBeat('beat4_missing');
    await addAuo('auo-b4-missing', "What's missing?", 200);
    setInputPlaceholder("Tell AUO...");
    setInputVisible(true);
  };

  // ── Beat 4 missing: user feedback
  const handleMissingSubmit = async (text: string) => {
    setInputVisible(false);
    addMessage({ id: 'user-missing', role: 'user', content: text });
    await addAuo('auo-b4-reweight', "Got it — I've adjusted the signal weighting.\n\nDoes this look better?", 500);
    setBeat('beat4_confirm');
  };

  // ── Input handler
  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');

    if (beat === 'beat2') handleCompanySubmit(text);
    else if (beat === 'beat3') handleTacticalSubmit(text);
    else if (beat === 'beat4_missing') handleMissingSubmit(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Determine whether to show priority selector
  // Show after auo-b3-resp appears and beat is still beat3 and not yet confirmed
  const showPrioritySelector =
    beat === 'beat3' &&
    !priorityConfirmed &&
    messages.some(m => m.id === 'auo-b3-resp') &&
    !inputVisible;

  // ── Determine whether to show confirm buttons
  const showConfirmButtons = beat === 'beat4_confirm' && animatingId !== 'auo-b4';

  return (
    <div className="h-screen flex flex-col bg-muted overflow-hidden">
      {/* Completion banner */}
      {showBanner && (
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 bg-emerging/10 border-b border-emerging/20 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerging font-semibold">✓</span>
            <span className="text-xs text-foreground">
              AUO is set up for {company}. Scanning 3× daily.
            </span>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 flex items-center px-5 py-3 border-b border-border bg-background">
        <span className="text-base font-semibold tracking-[0.2em] text-foreground">AUO</span>
      </header>

      {/* Layout: full-width chat until right panel activates */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left: Chat — white card background ── */}
        <div
          className={cn(
            'flex flex-col flex-shrink-0 overflow-hidden transition-all duration-500 bg-background',
            rightPanel === 'empty' ? 'w-full border-r-0' : 'w-[52%] border-r border-border'
          )}
        >
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto py-10">
            <div className={cn('mx-auto space-y-6', rightPanel === 'empty' ? 'max-w-xl px-8' : 'max-w-none px-6')}>
              {messages.map(msg =>
                msg.role === 'assistant' ? (
                  <AuoBubble
                    key={msg.id}
                    content={msg.content}
                    animate={animatingId === msg.id}
                    onDone={msg.id === 'auo-intro' ? () => setIntroTypingDone(true) : undefined}
                  />
                ) : (
                  <UserBubble key={msg.id} content={msg.content} />
                )
              )}

              {/* Beat 1: Let's go — appears after AUO intro finishes typing */}
              {beat === 'beat1' && introTypingDone && (
                <button
                  onClick={handleLetsGo}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-[15px] font-semibold hover:bg-primary/85 transition-colors tracking-wide animate-in fade-in duration-300"
                >
                  Let's go →
                </button>
              )}

              {/* Priority selector — inline, after AUO asks */}
              {showPrioritySelector && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {SCAN_ITEMS.map(item => (
                      <button
                        key={item.category}
                        onClick={() => togglePriority(item.category)}
                        className={cn(
                          'text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-all duration-150',
                          selectedPriorities.includes(item.category)
                            ? 'border-emerging bg-emerging/10 text-foreground'
                            : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/30'
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full flex-shrink-0',
                              selectedPriorities.includes(item.category)
                                ? 'bg-emerging'
                                : 'bg-muted-foreground/30'
                            )}
                          />
                          {item.category}
                          {item.urgent && (
                            <span className="ml-auto text-[8px] font-bold text-tier-breaking">↑</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handlePriorityConfirm}
                    disabled={selectedPriorities.length === 0}
                    className="w-full py-2 rounded-lg bg-emerging text-background text-xs font-semibold hover:bg-emerging/90 transition-colors disabled:opacity-40"
                  >
                    Confirm →
                  </button>
                </div>
              )}

              {/* Beat 4: confirm / missing buttons */}
              {showConfirmButtons && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-2.5 rounded-lg bg-emerging text-background text-xs font-semibold hover:bg-emerging/90 transition-colors"
                  >
                    This looks right →
                  </button>
                  <button
                    onClick={handleMissing}
                    className="flex-1 py-2.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-accent/40 transition-colors"
                  >
                    Something's off
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom area — chat input only */}
          <div className={cn('flex-shrink-0 pb-5 pt-3 border-t border-border', rightPanel === 'empty' ? 'max-w-xl mx-auto w-full px-8' : 'px-6')}>
            {/* Chat input */}
            {inputVisible && (
              <div className="animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={inputPlaceholder}
                    rows={1}
                    className="flex-1 bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    style={{ maxHeight: '120px' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className="p-2.5 rounded-lg bg-accent text-foreground hover:bg-accent/80 transition-colors disabled:opacity-40"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Right panel — only shown when content is available ── */}
        {rightPanel !== 'empty' && (
          <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'hsl(var(--panel-warm))' }}>
            {rightPanel === 'scanning' && (
              <ScanningPanel
                revealedCount={scanRevealedCount}
                company={company || 'your company'}
              />
            )}
            {rightPanel === 'signals' && <SignalsPanel />}
          </div>
        )}
      </div>
    </div>
  );
}
