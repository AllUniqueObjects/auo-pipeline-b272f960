import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, radius, transition } from '../design-tokens';

// ─── Types ──────────────────────────────────────────────────────────────────

type Screen = 'welcome' | 'role' | 'lenses' | 'conversation' | 'scanning';
type RoleType = 'executive' | 'leader' | 'ic';
type LensKey = 'supply_chain' | 'innovation' | 'market' | 'macro';

interface ChatMessage {
  id: string;
  role: 'auo' | 'user';
  content: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FONT = typography.fontFamily;

const ROLES: { key: RoleType; title: string; subtitle: string; description: string }[] = [
  {
    key: 'executive',
    title: 'Executive',
    subtitle: 'VP, C-Suite',
    description: 'Strategic landscape, market dynamics, competitive positioning',
  },
  {
    key: 'leader',
    title: 'Leader',
    subtitle: 'Director, Sr. Manager',
    description: 'Balanced view across strategy + execution',
  },
  {
    key: 'ic',
    title: 'Individual Contributor',
    subtitle: '',
    description: 'Innovation, technology, operational details',
  },
];

const LENSES: { key: LensKey; title: string; description: string }[] = [
  { key: 'supply_chain', title: 'Supply Chain & Sourcing', description: 'Factory capacity, logistics, tariffs, BOM costs, lead times' },
  { key: 'innovation', title: 'Innovation & Product', description: 'Materials, sustainability, DPP, manufacturing tech, design' },
  { key: 'market', title: 'Market & Competition', description: 'Competitor moves, retail landscape, consumer trends, pricing' },
  { key: 'macro', title: 'Macro & Regulation', description: 'Trade policy, geopolitics, ESG mandates, economic indicators' },
];

const QUESTIONS = [
  "What's a pressing decision you're working through right now?",
  "What's your timeline?",
  "Anyone specific I should watch — competitors, factories, brands making moves in this space?",
];

const ACKNOWLEDGMENTS = [
  "Got it — I'll factor that into what I surface for you.",
  "Noted. That helps me prioritize what's time-sensitive.",
];

// ─── Colors (dark theme) ────────────────────────────────────────────────────

const D = {
  bg: '#0A0A0A',
  surface: '#141414',
  card: '#1A1A1A',
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.04)',
  text: 'rgba(255,255,255,0.9)',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.35)',
  textFaint: 'rgba(255,255,255,0.2)',
  amber: colors.accent.amber,
  amberBg: 'rgba(217,119,6,0.08)',
  amberBorder: 'rgba(217,119,6,0.5)',
  green: '#22C55E',
  white: '#FFFFFF',
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function useTypewriter(text: string, active: boolean, speed = 16) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active) { setDisplayed(text); setDone(true); return; }
    setDisplayed('');
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, active, speed]);
  return { displayed, done };
}

function generateScanItems(answers: string[]): string[] {
  const items: string[] = [];

  // From Q3 — competitors/entities
  if (answers[2]) {
    const parts = answers[2]
      .replace(/\band\b/gi, ',')
      .split(/[,.\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 2 && s.length < 60);
    for (const part of parts.slice(0, 2)) {
      const short = part.split(' ').slice(0, 4).join(' ');
      items.push(`${short} moves`);
    }
  }

  // From Q1 — decision context
  if (answers[0]) {
    const clause = answers[0].split(/[.,;!?]/).filter(Boolean)[0]?.trim() || '';
    if (clause && clause.length < 80) {
      const short = clause.split(' ').slice(0, 5).join(' ');
      items.push(`${short} signals`);
    }
  }

  // From Q2 — timeline
  if (answers[1]) {
    items.push('Timeline-sensitive developments');
  }

  while (items.length < 3) items.push('Industry landscape signals');
  return items.slice(0, 4);
}

const API_BASE = (import.meta.env.VITE_RESPONDER_URL || '').replace(/\/chat$/, '');

async function extractContextAPI(userId: string, conversation: string) {
  try {
    await fetch(`${API_BASE}/extract-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, conversation }),
    });
  } catch {
    // Fire and forget
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function AuoLabel() {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.2em',
      color: D.textMuted, textTransform: 'uppercase' as const,
      display: 'block', marginBottom: 10,
    }}>
      AUO
    </span>
  );
}

function AuoMessageAnimated({
  content,
  animate,
  onDone,
}: {
  content: string;
  animate: boolean;
  onDone?: () => void;
}) {
  const { displayed, done } = useTypewriter(content, animate);
  useEffect(() => { if (done && onDone) onDone(); }, [done, onDone]);

  return (
    <div style={{ marginBottom: 24 }}>
      <AuoLabel />
      <p style={{
        fontSize: 17, fontWeight: 400, color: D.text,
        lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap',
      }}>
        {animate ? displayed : content}
        {animate && !done && (
          <span style={{ opacity: 0.5, animation: 'auo-blink 0.8s step-end infinite' }}>|</span>
        )}
      </p>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div style={{
      marginBottom: 24, paddingLeft: 20,
      borderLeft: `2px solid ${D.amberBorder}`,
    }}>
      <p style={{
        fontSize: 15, fontWeight: 400, color: D.textSecondary,
        lineHeight: 1.6, margin: 0,
      }}>
        {content}
      </p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();

  // Core state
  const [screen, setScreen] = useState<Screen>('welcome');
  const [fadeIn, setFadeIn] = useState(true);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');

  // Role state
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [roleConfirmed, setRoleConfirmed] = useState(false);
  const [roleAckVisible, setRoleAckVisible] = useState(false);

  // Lens state
  const [selectedLenses, setSelectedLenses] = useState<LensKey[]>([]);
  const [createdThreadIds, setCreatedThreadIds] = useState<string[]>([]);

  // Conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputVisible, setInputVisible] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  // Scanning state
  const [scanItems, setScanItems] = useState<string[]>([]);
  const [revealedScanCount, setRevealedScanCount] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Get user info on mount ──────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const name =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] || '';
      setUserName(name ? name.split(' ')[0] : '');
    });
  }, []);

  // ── Auto-scroll + auto-focus ────────────────────────────────────────────

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 60);
  }, [messages, animatingId, inputVisible]);

  useEffect(() => {
    if (inputVisible) setTimeout(() => inputRef.current?.focus(), 100);
  }, [inputVisible]);

  // ── Screen transition ───────────────────────────────────────────────────

  const transitionTo = useCallback((nextScreen: Screen) => {
    setFadeIn(false);
    setTimeout(() => {
      setScreen(nextScreen);
      setFadeIn(true);
    }, 300);
  }, []);

  // ── Conversation helpers ────────────────────────────────────────────────

  const addAuoMessage = useCallback((id: string, content: string, animate = true): Promise<void> => {
    return new Promise(resolve => {
      setMessages(prev => [...prev, { id, role: 'auo', content }]);
      if (animate) {
        setAnimatingId(id);
        const handler = () => {
          setAnimatingId(null);
          resolve();
        };
        // Estimate typewriter duration: content.length * speed + buffer
        const duration = content.length * 16 + 300;
        setTimeout(handler, duration);
      } else {
        setAnimatingId(null);
        resolve();
      }
    });
  }, []);

  const addUserMessage = useCallback((id: string, content: string) => {
    setMessages(prev => [...prev, { id, role: 'user', content }]);
  }, []);

  // ── Lens display name helper ──────────────────────────────────────────

  const lensDisplayNames = selectedLenses
    .map(key => LENSES.find(l => l.key === key)?.title)
    .filter(Boolean)
    .join(' + ');

  // ── Fire context extraction (non-blocking) ─────────────────────────────

  const fireExtraction = useCallback((allAnswers: string[]) => {
    if (!userId) return;
    const dynamicQ1 = lensDisplayNames
      ? `You're monitoring ${lensDisplayNames}. What's the most pressing decision in these areas?`
      : QUESTIONS[0];
    const questions = [dynamicQ1, QUESTIONS[1], QUESTIONS[2]];
    const conversation = allAnswers
      .map((a, i) => `Q: ${questions[i]}\nA: ${a}`)
      .join('\n\n');
    extractContextAPI(userId, conversation);
  }, [userId, lensDisplayNames]);

  // ── Screen 1 → 2 ───────────────────────────────────────────────────────

  const handleLetsGo = () => {
    transitionTo('role');
  };

  // ── Screen 2: Role selection ────────────────────────────────────────────

  const handleRoleSelect = async (role: RoleType) => {
    if (roleConfirmed) return;
    setSelectedRole(role);
    setRoleConfirmed(true);

    // Save role to DB
    try {
      await (supabase as any).from('users').upsert({
        id: userId,
        level: role,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (err) {
      console.warn('[Onboarding] save role failed:', err);
    }

    // Show acknowledgment
    setTimeout(() => setRoleAckVisible(true), 400);

    // Auto-advance to lens selection after a beat
    setTimeout(() => transitionTo('lenses'), 2200);
  };

  // ── Screen 2.5: Lens selection ──────────────────────────────────────────

  const toggleLens = (key: LensKey) => {
    setSelectedLenses(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  };

  const handleLensContinue = async () => {
    if (selectedLenses.length === 0) return;

    // Create decision_threads for each selected lens
    const threadIds: string[] = [];
    for (const lensKey of selectedLenses) {
      const lensData = LENSES.find(l => l.key === lensKey)!;
      try {
        const { data } = await (supabase as any)
          .from('decision_threads')
          .insert({
            user_id: userId,
            title: lensData.title,
            lens: lensKey,
            status: 'active',
          })
          .select('id')
          .single();
        if (data) threadIds.push(data.id);
      } catch (err) {
        console.warn('[Onboarding] create thread failed:', err);
      }
    }
    setCreatedThreadIds(threadIds);
    transitionTo('conversation');
  };

  // ── Screen 3: Conversation init ────────────────────────────────────────

  useEffect(() => {
    if (screen !== 'conversation') return;
    if (messages.length > 0) return; // Already initialized

    // Ask Q1 — reference selected lenses
    const q1 = lensDisplayNames
      ? `You're monitoring ${lensDisplayNames}.\nWhat's the most pressing decision in these areas?`
      : QUESTIONS[0];

    (async () => {
      await addAuoMessage('q1', q1);
      setInputVisible(true);
    })();
  }, [screen, messages.length, addAuoMessage, lensDisplayNames]);

  // ── Screen 3: Handle answer submit ─────────────────────────────────────

  const handleAnswerSubmit = async () => {
    const text = inputValue.trim();
    if (!text) return;

    setInputValue('');
    setInputVisible(false);

    const qi = questionIndex;
    const newAnswers = [...answers, text];
    setAnswers(newAnswers);

    // Add user message
    addUserMessage(`user-q${qi}`, text);

    // Fire extraction after each answer
    fireExtraction(newAnswers);

    // Brief pause
    await new Promise(r => setTimeout(r, 500));

    if (qi < 2) {
      // Acknowledge + ask next question
      const ackAndNext = `${ACKNOWLEDGMENTS[qi]}\n\n${QUESTIONS[qi + 1]}`;
      await addAuoMessage(`ack-q${qi}`, ackAndNext);
      setQuestionIndex(qi + 1);
      setInputVisible(true);
    } else {
      // After Q3 — transition to scanning
      await addAuoMessage('ack-final', "Perfect. Give me a moment —\nI'm setting up your signal feeds.");

      // Save tactical context
      try {
        await (supabase as any).from('tactical_contexts').insert({
          user_id: userId,
          focus_items: newAnswers.map((a, i) => ({ question: QUESTIONS[i], answer: a })),
          collected_via: 'onboarding',
        });
      } catch (err) {
        console.warn('[Onboarding] save tactical context failed:', err);
      }

      // Generate scan items
      const items = generateScanItems(newAnswers);
      setScanItems(items);

      setTimeout(() => transitionTo('scanning'), 1200);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnswerSubmit();
    }
  };

  // ── Screen 4: Scanning animation ───────────────────────────────────────

  useEffect(() => {
    if (screen !== 'scanning') return;

    // Reveal scan items one by one
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setRevealedScanCount(i);
      if (i >= scanItems.length) {
        clearInterval(iv);

        // Trigger scan_priority for each created decision_thread
        if (userId && createdThreadIds.length > 0) {
          for (const threadId of createdThreadIds) {
            supabase.functions.invoke('scan_priority', {
              body: { thread_id: threadId, user_id: userId },
            }).catch(err => console.warn('[Onboarding] scan_priority failed:', err));
          }
        } else if (userId) {
          supabase.functions.invoke('scan_priority', {
            body: { user_id: userId },
          }).catch(err => console.warn('[Onboarding] scan_priority failed:', err));
        }

        // Update decision_threads.key_question with context from Q1 answer
        if (createdThreadIds.length > 0 && answers[0]) {
          const keyQ = answers[0].slice(0, 200);
          for (const threadId of createdThreadIds) {
            (supabase as any).from('decision_threads')
              .update({ key_question: keyQ })
              .eq('id', threadId)
              .then(() => {})
              .catch((err: any) => console.warn('[Onboarding] update key_question failed:', err));
          }
        }

        // Mark onboarding complete + navigate
        setTimeout(async () => {
          localStorage.setItem('onboardingComplete', 'true');
          sessionStorage.setItem('justOnboarded', 'true');

          try {
            await (supabase as any).from('users').update({
              onboarding_complete: true,
              updated_at: new Date().toISOString(),
            }).eq('id', userId);
          } catch {
            // Column may not exist yet
          }

          onComplete();
          setTimeout(() => navigate('/', { replace: true }), 100);
        }, 1200);
      }
    }, 800);

    return () => clearInterval(iv);
  }, [screen, scanItems.length, userId, createdThreadIds, answers, onComplete, navigate]);

  // ── Render ─────────────────────────────────────────────────────────────

  const headerStyle: React.CSSProperties = {
    flexShrink: 0,
    padding: '20px 32px',
    borderBottom: `1px solid ${D.borderLight}`,
  };

  const logoStyle: React.CSSProperties = {
    fontSize: 15, fontWeight: 700, letterSpacing: '0.2em', color: D.textMuted,
  };

  return (
    <div style={{ minHeight: '100vh', background: D.bg, fontFamily: FONT, overflow: 'hidden' }}>
      <style>{`
        @keyframes auo-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes auo-scan-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes auo-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .auo-fade-up { animation: auo-fade-up 0.4s ease forwards; }
        .auo-scan-pulse { animation: auo-scan-pulse 1.2s ease-in-out infinite; }
      `}</style>

      {/* ── Shared header ── */}
      <header style={headerStyle}>
        <span style={logoStyle}>AUO</span>
      </header>

      {/* ── Screen content with fade transition ── */}
      <div style={{
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.3s ease',
        height: 'calc(100vh - 57px)',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* ════════════════════════════════════════════════════════════════
            SCREEN 1: WELCOME
        ════════════════════════════════════════════════════════════════ */}
        {screen === 'welcome' && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 24px',
          }}>
            <div style={{ maxWidth: 440 }} className="auo-fade-up">
              <p style={{
                fontSize: 32, fontWeight: 500, lineHeight: 1.35,
                color: D.text, marginBottom: 20, letterSpacing: '-0.01em',
              }}>
                Hi{userName ? ` ${userName}` : ''}.
              </p>

              <p style={{
                fontSize: 18, fontWeight: 400, lineHeight: 1.7,
                color: D.textSecondary, marginBottom: 48,
              }}>
                I monitor signals across the athletic footwear industry and surface what
                matters to your decisions — before you'd normally find it.
              </p>

              <p style={{
                fontSize: 14, color: D.textMuted, marginBottom: 32,
              }}>
                Takes 90 seconds to set up.
              </p>

              <button
                onClick={handleLetsGo}
                style={{
                  background: D.white, color: D.bg, border: 'none',
                  borderRadius: 28, padding: '14px 40px',
                  fontSize: 16, fontWeight: 600, cursor: 'pointer',
                  fontFamily: FONT, transition: transition.fast,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.85)')}
                onMouseLeave={e => (e.currentTarget.style.background = D.white)}
              >
                Let's go →
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            SCREEN 2: ROLE SELECTION
        ════════════════════════════════════════════════════════════════ */}
        {screen === 'role' && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 24px',
          }}>
            <div style={{ maxWidth: 520, width: '100%' }} className="auo-fade-up">
              <AuoLabel />
              <p style={{
                fontSize: 22, fontWeight: 500, color: D.text,
                lineHeight: 1.4, marginBottom: 32,
              }}>
                How would you describe your role?
              </p>

              {/* Role cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ROLES.map(role => {
                  const isSelected = selectedRole === role.key;
                  const isOther = selectedRole && !isSelected;
                  return (
                    <button
                      key={role.key}
                      onClick={() => handleRoleSelect(role.key)}
                      style={{
                        textAlign: 'left' as const, width: '100%',
                        padding: '22px 24px', borderRadius: radius.lg,
                        border: `1px solid ${isSelected ? D.amberBorder : D.border}`,
                        background: isSelected ? D.amberBg : D.surface,
                        cursor: roleConfirmed ? 'default' : 'pointer',
                        opacity: isOther ? 0.35 : 1,
                        transition: transition.base, fontFamily: FONT,
                        transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                        <span style={{
                          fontSize: 18, fontWeight: 600,
                          color: isSelected ? D.amber : D.text,
                        }}>
                          {role.title}
                        </span>
                        {role.subtitle && (
                          <span style={{ fontSize: 13, color: D.textMuted }}>
                            {role.subtitle}
                          </span>
                        )}
                      </div>
                      <p style={{
                        fontSize: 14, color: D.textSecondary,
                        marginTop: 6, lineHeight: 1.5, marginBottom: 0,
                      }}>
                        {role.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* AUO acknowledgment after role selected */}
              {roleAckVisible && (
                <div style={{
                  marginTop: 28, opacity: 0,
                  animation: 'auo-fade-up 0.4s ease 0.1s forwards',
                }}>
                  <AuoLabel />
                  <p style={{
                    fontSize: 16, color: D.textSecondary, lineHeight: 1.6,
                  }}>
                    Got it. You can switch this view anytime from the top right.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            SCREEN 2.5: LENS SELECTION
        ════════════════════════════════════════════════════════════════ */}
        {screen === 'lenses' && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 24px',
          }}>
            <div style={{ maxWidth: 520, width: '100%' }} className="auo-fade-up">
              <AuoLabel />
              <p style={{
                fontSize: 22, fontWeight: 500, color: D.text,
                lineHeight: 1.4, marginBottom: 8,
              }}>
                What do you want to monitor?
              </p>
              <p style={{
                fontSize: 15, color: D.textSecondary, marginBottom: 32,
              }}>
                Pick 1–3 areas to start.
              </p>

              {/* Lens cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {LENSES.map(lens => {
                  const isSelected = selectedLenses.includes(lens.key);
                  const atMax = selectedLenses.length >= 3 && !isSelected;
                  return (
                    <button
                      key={lens.key}
                      onClick={() => toggleLens(lens.key)}
                      disabled={atMax}
                      style={{
                        textAlign: 'left' as const, width: '100%',
                        padding: '20px 24px', borderRadius: radius.lg,
                        border: `1px solid ${isSelected ? D.amberBorder : D.border}`,
                        background: isSelected ? D.amberBg : D.surface,
                        cursor: atMax ? 'default' : 'pointer',
                        opacity: atMax ? 0.35 : 1,
                        transition: transition.base, fontFamily: FONT,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Checkbox indicator */}
                        <span style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          border: `1.5px solid ${isSelected ? D.amber : 'rgba(255,255,255,0.2)'}`,
                          background: isSelected ? D.amber : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, color: D.bg, fontWeight: 700,
                          transition: transition.fast,
                        }}>
                          {isSelected && '✓'}
                        </span>
                        <div>
                          <span style={{
                            fontSize: 17, fontWeight: 600,
                            color: isSelected ? D.amber : D.text,
                          }}>
                            {lens.title}
                          </span>
                          <p style={{
                            fontSize: 13, color: D.textSecondary,
                            marginTop: 3, lineHeight: 1.4, marginBottom: 0,
                          }}>
                            {lens.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Continue button */}
              <button
                onClick={handleLensContinue}
                disabled={selectedLenses.length === 0}
                style={{
                  marginTop: 28, width: '100%',
                  background: selectedLenses.length > 0 ? D.white : 'rgba(255,255,255,0.1)',
                  color: selectedLenses.length > 0 ? D.bg : D.textMuted,
                  border: 'none', borderRadius: 28, padding: '14px 0',
                  fontSize: 16, fontWeight: 600, cursor: selectedLenses.length > 0 ? 'pointer' : 'default',
                  fontFamily: FONT, transition: transition.fast,
                }}
                onMouseEnter={e => {
                  if (selectedLenses.length > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.85)';
                }}
                onMouseLeave={e => {
                  if (selectedLenses.length > 0) e.currentTarget.style.background = D.white;
                }}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            SCREEN 3: CONVERSATION (3 Questions)
        ════════════════════════════════════════════════════════════════ */}
        {screen === 'conversation' && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            maxWidth: 560, margin: '0 auto', width: '100%',
          }}>
            {/* Messages area */}
            <div
              ref={scrollRef}
              style={{
                flex: 1, overflowY: 'auto', padding: '40px 24px 16px',
              }}
            >
              {messages.map(msg =>
                msg.role === 'auo' ? (
                  <AuoMessageAnimated
                    key={msg.id}
                    content={msg.content}
                    animate={animatingId === msg.id}
                  />
                ) : (
                  <UserMessage key={msg.id} content={msg.content} />
                )
              )}
            </div>

            {/* Input area */}
            <div style={{
              flexShrink: 0, padding: '12px 24px 28px',
              borderTop: `1px solid ${D.borderLight}`,
            }}>
              {inputVisible ? (
                <div style={{
                  opacity: 0, animation: 'auo-fade-up 0.3s ease 0.1s forwards',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your answer..."
                      rows={2}
                      style={{
                        flex: 1, background: D.surface,
                        border: `1px solid ${D.border}`, borderRadius: 12,
                        padding: '12px 16px', fontSize: 15, color: D.text,
                        fontFamily: FONT, lineHeight: 1.5,
                        resize: 'none', outline: 'none', maxHeight: 120,
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                      onBlur={e => (e.currentTarget.style.borderColor = D.border)}
                    />
                    <button
                      onClick={handleAnswerSubmit}
                      disabled={!inputValue.trim()}
                      style={{
                        width: 44, height: 44, borderRadius: 10,
                        border: 'none', flexShrink: 0, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: inputValue.trim() ? D.white : 'rgba(255,255,255,0.1)',
                        color: inputValue.trim() ? D.bg : D.textMuted,
                        transition: transition.fast, fontFamily: FONT,
                        fontSize: 18,
                      }}
                    >
                      →
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ height: 44 }} /> // Placeholder to keep layout stable
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            SCREEN 4: SCANNING
        ════════════════════════════════════════════════════════════════ */}
        {screen === 'scanning' && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 24px',
          }}>
            <div style={{ maxWidth: 400, width: '100%' }} className="auo-fade-up">
              <AuoLabel />
              <p style={{
                fontSize: 20, fontWeight: 500, color: D.text,
                lineHeight: 1.5, marginBottom: 36,
              }}>
                Setting up your feeds across<br />246 sources.
              </p>

              {/* Pulse dots */}
              <div style={{
                display: 'flex', gap: 8, marginBottom: 44,
              }}>
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="auo-scan-pulse"
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: D.amber,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>

              {/* Scan items */}
              <p style={{
                fontSize: 12, fontWeight: 600, letterSpacing: '0.06em',
                color: D.textMuted, marginBottom: 18,
              }}>
                Scanning for:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {scanItems.map((item, idx) => {
                  const revealed = idx < revealedScanCount;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        opacity: revealed ? 1 : 0.25,
                        transition: 'opacity 0.5s ease',
                      }}
                    >
                      <span style={{
                        fontSize: 14, flexShrink: 0, width: 18,
                        color: revealed ? D.green : D.textFaint,
                      }}>
                        {revealed ? '✓' : '○'}
                      </span>
                      <span style={{
                        fontSize: 15,
                        color: revealed ? 'rgba(255,255,255,0.8)' : D.textFaint,
                        transition: 'color 0.5s ease',
                      }}>
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
