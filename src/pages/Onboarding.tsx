import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

type OnboardingStep = 'welcome' | 'role_select' | 'tactical_seed' | 'scanning' | 'first_signals';
type LensType = 'executive' | 'leader' | 'ic';

interface OnboardingMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  signalCards?: OnboardingSignalCardData[];
}

interface OnboardingSignalCardData {
  id: string;
  tier: 'breaking' | 'developing';
  category: string;
  title: string;
  signalCount: number;
  credibility: number;
}

interface OnboardingProps {
  onComplete: (lens: LensType) => void;
}

const ONBOARDING_SIGNALS: OnboardingSignalCardData[] = [
  {
    id: 'ob-sig-1',
    tier: 'breaking',
    category: 'MACROECONOMICS',
    title: 'Supreme Court Sets April Hearing — Vietnam FOB Window Opens',
    signalCount: 5,
    credibility: 92,
  },
  {
    id: 'ob-sig-2',
    tier: 'breaking',
    category: 'MARKET DYNAMICS',
    title: 'Foot Locker Leadership Vacuum Opens 60-Day 880 v15 Shelf Lock Window',
    signalCount: 5,
    credibility: 100,
  },
  {
    id: 'ob-sig-3',
    tier: 'developing',
    category: 'MARKET DYNAMICS',
    title: 'Nike Wholesale Re-entry Accelerates — 880 v15 Shelf Competition Rising',
    signalCount: 3,
    credibility: 78,
  },
];

const ROLE_OPTIONS: { key: LensType; label: string; sub: string }[] = [
  { key: 'executive', label: 'Executive', sub: 'VP, C-Suite' },
  { key: 'leader', label: 'Leader', sub: 'Director, Senior Manager' },
  { key: 'ic', label: 'Individual Contributor', sub: '' },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [messages, setMessages] = useState<OnboardingMessage[]>([
    {
      id: 'ob-1',
      role: 'assistant',
      content:
        "Hi David — I'm AUO.\n\nI track signals across the athletic footwear industry and help you and your team make better decisions, faster.\n\nOne quick question before we start.",
    },
  ]);
  const [selectedLens, setSelectedLens] = useState<LensType | null>(null);
  const [roleConfirmed, setRoleConfirmed] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, step, inputVisible]);

  const appendMessage = (msg: OnboardingMessage) => {
    setMessages(prev => [...prev, msg]);
  };

  // Step: welcome → role_select
  const handleLetsGo = () => {
    setStep('role_select');
    appendMessage({
      id: 'ob-2',
      role: 'assistant',
      content: 'How would you describe your level?',
    });
  };

  // Step: role card clicked
  const handleRoleSelect = (lens: LensType) => {
    if (roleConfirmed) return;
    setSelectedLens(lens);
    setRoleConfirmed(true);
    appendMessage({
      id: 'ob-role-user',
      role: 'user',
      content: ROLE_OPTIONS.find(r => r.key === lens)!.label,
    });
    setTimeout(() => {
      appendMessage({
        id: 'ob-3',
        role: 'assistant',
        content:
          "Got it. You can switch this lens anytime from the top right — sometimes you'll want to see what an IC or leader would see too.",
      });
      setTimeout(() => {
        setInputVisible(true);
        setStep('tactical_seed');
        appendMessage({
          id: 'ob-4',
          role: 'assistant',
          content:
            "What's the most pressing thing on your plate right now?\n\nDoesn't have to be complete — just whatever's top of mind.",
        });
      }, 800);
    }, 400);
  };

  // Step: tactical_seed → scanning
  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    appendMessage({ id: crypto.randomUUID(), role: 'user', content: text });
    setInputValue('');
    setScanning(true);
    setStep('scanning');

    // Scanning dot shows for 1.5s, then response, then first_signals
    setTimeout(() => {
      setScanning(false);
      appendMessage({
        id: 'ob-scan-resp',
        role: 'assistant',
        content:
          "Vietnam sourcing, 880 v15 shelf lock, February deadline. I have fresh signals on all three right now.\n\nLet me pull what's most relevant.",
      });
      setTimeout(() => {
        setStep('first_signals');
        appendMessage({
          id: 'ob-signals',
          role: 'assistant',
          content: "Three breaking signals match where you're focused.",
          signalCards: ONBOARDING_SIGNALS,
        });
      }, 700);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Signal card click → go deeper, do NOT complete onboarding
  const handleSignalCardClick = (card: OnboardingSignalCardData) => {
    appendMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Here's a deeper look at the ${card.title} signal.\n\nThis is a ${card.tier === 'breaking' ? 'breaking' : 'developing'} signal in ${card.category} — ${card.credibility}% credibility across ${card.signalCount} sources. Factory allocation calendars, procurement filings, and Tier 1 trade press all converging on the same window.\n\nWant me to connect this to your FOB decision?`,
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header — AUO logo only */}
      <header className="flex-shrink-0 flex items-center px-5 py-2.5 border-b border-border">
        <span className="text-base font-semibold tracking-[0.2em] text-foreground">AUO</span>
      </header>

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat panel */}
        <div className="flex flex-col w-[55%] flex-shrink-0 overflow-hidden">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
            <div className="space-y-5">
              {messages.map(msg => (
                <OnboardingBubble key={msg.id} message={msg} onSignalClick={handleSignalCardClick} />
              ))}

              {/* Role cards — rendered BELOW the last AUO bubble, as a separate block */}
              {step === 'role_select' && !roleConfirmed && (
                <div className="space-y-2 mt-2">
                  {ROLE_OPTIONS.map(role => (
                    <button
                      key={role.key}
                      onClick={() => handleRoleSelect(role.key)}
                      className={cn(
                        'w-full text-left px-5 py-5 rounded-lg border transition-all duration-150',
                        selectedLens === role.key
                          ? 'border-emerging bg-emerging/10 text-foreground'
                          : 'border-border bg-card text-card-foreground hover:border-muted-foreground/40 hover:bg-accent/50'
                      )}
                    >
                      <div className="font-semibold text-sm">{role.label}</div>
                      {role.sub && (
                        <div className="text-xs text-muted-foreground mt-0.5">{role.sub}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Scanning indicator */}
              {scanning && (
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-medium uppercase tracking-wider mb-1 px-1 text-muted-foreground">
                    AUO
                  </span>
                  <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Scanning</span>
                    <span className="flex gap-1">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom area */}
          <div className="flex-shrink-0 px-4 pb-4 space-y-3">
            {/* Welcome CTA */}
            {step === 'welcome' && (
              <button
                onClick={handleLetsGo}
                className="w-full py-3 rounded-lg bg-emerging text-background text-sm font-semibold hover:bg-emerging/90 transition-colors"
              >
                Let's go →
              </button>
            )}

            {/* Complete Setup button — only exit from first_signals */}
            {step === 'first_signals' && (
              <button
                onClick={() => selectedLens && onComplete(selectedLens)}
                className="w-full py-3 rounded-lg bg-emerging text-background text-sm font-semibold hover:bg-emerging/90 transition-colors"
              >
                Complete Setup
              </button>
            )}

            {/* Chat input — appears after role select */}
            {inputVisible && step !== 'first_signals' && step !== 'scanning' && (
              <div
                className={cn(
                  'transition-all duration-500',
                  inputVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                )}
              >
                <div className="flex items-end gap-2">
                  <textarea
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tell AUO what you're working on..."
                    rows={1}
                    className="flex-1 bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    style={{ maxHeight: '120px' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className="p-2.5 rounded-lg bg-accent text-foreground hover:bg-accent/80 transition-colors disabled:opacity-40"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Empty position panel */}
        <div className="flex-1 border-l border-border flex flex-col items-center justify-center px-8 text-center">
          <h2
            className="text-5xl italic mb-3"
            style={{
              fontFamily: "'Fraunces', serif",
              color: 'hsl(var(--muted-foreground) / 0.12)',
            }}
          >
            position
          </h2>
          <p className="text-sm text-muted-foreground/50">Your positions will appear here</p>
        </div>
      </div>
    </div>
  );
}

function OnboardingBubble({
  message,
  onSignalClick,
}: {
  message: OnboardingMessage;
  onSignalClick: (card: OnboardingSignalCardData) => void;
}) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <span className="text-[10px] font-medium uppercase tracking-wider mb-1 px-1 text-muted-foreground">
        {isUser ? 'David' : 'AUO'}
      </span>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed break-words',
          isUser
            ? 'bg-accent text-accent-foreground'
            : 'bg-card border border-border text-card-foreground'
        )}
      >
        {message.content.split('\n').map((line, i) =>
          line.trim() ? <p key={i}>{line}</p> : <div key={i} className="h-2" />
        )}

        {/* Inline signal cards inside the bubble */}
        {message.signalCards && (
          <div className="mt-3 space-y-2">
            {message.signalCards.map(card => (
              <button
                key={card.id}
                onClick={() => onSignalClick(card)}
                className="w-full text-left rounded-lg border border-border bg-background/50 px-3 py-2.5 hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full flex-shrink-0',
                      card.tier === 'breaking' ? 'bg-tier-breaking' : 'bg-tier-developing'
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider',
                      card.tier === 'breaking' ? 'text-tier-breaking' : 'text-tier-developing'
                    )}
                  >
                    {card.tier.toUpperCase()} · {card.category}
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground leading-snug">{card.title}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span>{card.signalCount} signals</span>
                  <span>·</span>
                  <span>{card.credibility}% credibility</span>
                  <span className="ml-auto text-muted-foreground/60">→</span>
                </div>
              </button>
            ))}
            <p className="text-xs text-muted-foreground pt-1">Where do you want to start?</p>
          </div>
        )}
      </div>
    </div>
  );
}
