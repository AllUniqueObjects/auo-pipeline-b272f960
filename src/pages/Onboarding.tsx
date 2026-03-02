import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { typography, transition } from '../design-tokens';

// ─── Types ──────────────────────────────────────────────────────────────────

type Screen = 'welcome' | 'company' | 'researching' | 'topics';

interface Topic {
  title: string;
  hook: string;
  category: string;
  selected: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FONT = typography.fontFamily;

// Dark theme (welcome screen only)
const D = {
  bg: '#0A0A0A',
  text: 'rgba(255,255,255,0.9)',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.35)',
  borderLight: 'rgba(255,255,255,0.04)',
  white: '#FFFFFF',
} as const;

const categoryLabel: Record<string, string> = {
  sourcing: 'Sourcing',
  compliance: 'Compliance',
  competitor: 'Competitor',
  market: 'Market',
  cost: 'Cost',
};

const categoryToLens: Record<string, string> = {
  sourcing: 'supply_chain_resilience',
  compliance: 'textile_innovation',
  competitor: 'market_positioning',
  market: 'market_positioning',
  cost: 'supply_chain_resilience',
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();

  // Core state
  const [screen, setScreen] = useState<Screen>('welcome');
  const [fadeIn, setFadeIn] = useState(true);
  const [userName, setUserName] = useState('');

  // Screen 2: Company + Role
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');

  // Screen 3: Researching
  const [progressIndex, setProgressIndex] = useState(0);

  // Screen 4: Topics
  const [topics, setTopics] = useState<Topic[]>([]);
  const [customTopic, setCustomTopic] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // ── Get user info on mount ──────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] || '';
      setUserName(name ? name.split(' ')[0] : '');
    });
  }, []);

  // ── Screen transition ───────────────────────────────────────────────────

  const transitionTo = (nextScreen: Screen) => {
    setFadeIn(false);
    setTimeout(() => {
      setScreen(nextScreen);
      setFadeIn(true);
    }, 300);
  };

  // ── Researching progress messages ───────────────────────────────────────

  const progressMessages = [
    `Scanning ${company} news and announcements...`,
    'Analyzing industry regulations and deadlines...',
    'Identifying competitor moves...',
    'Mapping decision-critical signals...',
    'Generating your topic list...',
  ];

  useEffect(() => {
    if (screen !== 'researching') return;
    setProgressIndex(0);
    const interval = setInterval(() => {
      setProgressIndex(i => Math.min(i + 1, progressMessages.length - 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [screen, progressMessages.length]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleLetsGo = () => {
    transitionTo('company');
  };

  const handleStartResearch = async () => {
    setScreen('researching');

    const scanUrl = import.meta.env.VITE_MODAL_ONBOARDING_SCAN_URL;
    if (!scanUrl) {
      setTopics([]);
      setScreen('topics');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const response = await fetch(scanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          brand_name: company,
          role: role,
        }),
      });

      const data = await response.json();

      if (data.topics && data.topics.length > 0) {
        setTopics(data.topics.map((t: Topic) => ({ ...t, selected: true })));
      } else {
        setTopics([]);
      }
    } catch (e) {
      console.error('Onboarding scan failed:', e);
      setTopics([]);
    } finally {
      setScreen('topics');
    }
  };

  const toggleTopic = (index: number) => {
    setTopics(topics.map((t, i) =>
      i === index ? { ...t, selected: !t.selected } : t
    ));
  };

  const selectedCount = topics.filter(t => t.selected).length;

  const handleConfirmTopics = async () => {
    setIsCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    const selected = topics.filter(t => t.selected);

    const rows = selected.map(t => ({
      user_id: user?.id,
      title: t.title,
      lens: categoryToLens[t.category] || 'supply_chain_resilience',
      level: 'listening',
      status: 'active',
    }));

    try {
      await (supabase as any).from('decision_threads').insert(rows);
    } catch (e) {
      console.error('Thread creation failed:', e);
    }

    // Save company + role
    try {
      await (supabase as any).from('users').upsert({
        id: user?.id,
        company: company,
        role: role,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch {
      // columns may not exist yet
    }

    // Trigger priority scan (fire and forget)
    const scanUrl = import.meta.env.VITE_MODAL_SCAN_PRIORITY_URL;
    if (scanUrl) {
      fetch(scanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id }),
      }).catch(() => {});
    }

    localStorage.setItem('onboardingComplete', 'true');
    sessionStorage.setItem('justOnboarded', 'true');
    onComplete();
    navigate('/feed?scanning=true', { replace: true });
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const isLightScreen = screen !== 'welcome';
  const pageBg = isLightScreen ? '#FFFFFF' : D.bg;
  const logoColor = isLightScreen ? '#111' : D.textMuted;

  return (
    <div style={{
      minHeight: '100vh', background: pageBg, fontFamily: FONT,
      overflow: 'hidden', transition: 'background 0.3s ease',
    }}>
      <style>{`
        @keyframes auo-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.82); }
        }
        .auo-fade-up { animation: auo-fade-up 0.4s ease forwards; }
      `}</style>

      {/* ── Shared header ── */}
      <header style={{
        flexShrink: 0, padding: '20px 32px',
        borderBottom: `1px solid ${isLightScreen ? '#f0f0f0' : D.borderLight}`,
      }}>
        <span style={{
          fontSize: 15, fontWeight: 700, letterSpacing: '0.2em', color: logoColor,
        }}>
          AUO
        </span>
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
            SCREEN 2: COMPANY + ROLE
        ════════════════════════════════════════════════════════════════ */}
        {screen === 'company' && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 24px',
          }}>
            <div style={{ maxWidth: 440, width: '100%' }} className="auo-fade-up">
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', marginBottom: 8 }}>
                Where do you work?
              </h1>
              <p style={{ fontSize: 15, color: '#666', marginBottom: 40 }}>
                AUO will research your industry and surface what matters now.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <input
                  autoFocus
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Company name"
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: '1px solid #e5e5e5',
                    fontSize: 16,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                  onFocus={e => (e.currentTarget.style.border = '1px solid #111')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid #e5e5e5')}
                />

                <input
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="Your role (e.g. VP of Product Development)"
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: '1px solid #e5e5e5',
                    fontSize: 16,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                  onFocus={e => (e.currentTarget.style.border = '1px solid #111')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid #e5e5e5')}
                />
              </div>

              <button
                onClick={handleStartResearch}
                disabled={!company.trim() || !role.trim()}
                style={{
                  marginTop: 32,
                  width: '100%',
                  padding: '16px',
                  background: company.trim() && role.trim() ? '#111' : '#e5e5e5',
                  color: company.trim() && role.trim() ? '#fff' : '#999',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: company.trim() && role.trim() ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}
              >
                Research {company || 'your industry'} →
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            SCREEN 3: RESEARCHING
        ════════════════════════════════════════════════════════════════ */}
        {screen === 'researching' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '70vh',
            gap: 32,
            textAlign: 'center',
            maxWidth: 360,
            margin: '0 auto',
          }}>
            {/* Pulse */}
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#111',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />

            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 12 }}>
                Researching {company}
              </div>
              <div style={{
                fontSize: 14,
                color: '#666',
                lineHeight: 1.6,
                minHeight: 44,
                transition: 'opacity 0.3s ease',
              }}>
                {progressMessages[progressIndex]}
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#bbb' }}>
              Usually takes about a minute
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            SCREEN 4: TOPIC SELECTION
        ════════════════════════════════════════════════════════════════ */}
        {screen === 'topics' && (
          <div style={{
            maxWidth: 560, margin: '0 auto', padding: '48px 24px',
            width: '100%', overflowY: 'auto', flex: 1,
          }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', marginBottom: 8 }}>
                {topics.length > 0
                  ? `AUO found ${topics.length} decisions to track`
                  : 'What are you tracking?'
                }
              </h1>
              <p style={{ fontSize: 15, color: '#666' }}>
                {topics.length > 0
                  ? "Remove anything that's not relevant."
                  : 'Add the decisions you\'re actively working on.'
                }
              </p>
            </div>

            {/* Topic list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {topics.map((topic, i) => (
                <div
                  key={i}
                  onClick={() => toggleTopic(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: `1px solid ${topic.selected ? '#111' : '#e5e5e5'}`,
                    background: topic.selected ? '#fafafa' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    opacity: topic.selected ? 1 : 0.45,
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    border: `2px solid ${topic.selected ? '#111' : '#ccc'}`,
                    background: topic.selected ? '#111' : 'transparent',
                    flexShrink: 0,
                    marginTop: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {topic.selected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>
                        {topic.title}
                      </span>
                      <span style={{
                        fontSize: 11,
                        color: '#999',
                        fontWeight: 500,
                        letterSpacing: '0.03em',
                      }}>
                        {categoryLabel[topic.category] || topic.category}
                      </span>
                    </div>
                    {topic.hook && (
                      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                        {topic.hook}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add your own */}
            {!showCustomInput ? (
              <button
                onClick={() => setShowCustomInput(true)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px dashed #ddd',
                  background: 'transparent',
                  color: '#999',
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left' as const,
                  marginBottom: 32,
                }}
              >
                + Add something AUO missed
              </button>
            ) : (
              <div style={{ marginBottom: 32, display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                  placeholder="e.g. Nike shelf competition in key accounts"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customTopic.trim()) {
                      setTopics([...topics, {
                        title: customTopic.trim(),
                        hook: '',
                        category: 'market',
                        selected: true,
                      }]);
                      setCustomTopic('');
                      setShowCustomInput(false);
                    }
                    if (e.key === 'Escape') {
                      setShowCustomInput(false);
                      setCustomTopic('');
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #111',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleConfirmTopics}
              disabled={selectedCount === 0 || isCreating}
              style={{
                width: '100%',
                padding: '16px',
                background: selectedCount > 0 ? '#111' : '#e5e5e5',
                color: selectedCount > 0 ? '#fff' : '#999',
                borderRadius: 10,
                border: 'none',
                fontSize: 15,
                fontWeight: 600,
                cursor: selectedCount > 0 ? 'pointer' : 'default',
                fontFamily: 'inherit',
              }}
            >
              {selectedCount > 0
                ? `Start tracking ${selectedCount} topic${selectedCount !== 1 ? 's' : ''} →`
                : 'Select at least one topic'
              }
            </button>

            {/* Skip */}
            {topics.length === 0 && (
              <button
                onClick={() => {
                  localStorage.setItem('onboardingComplete', 'true');
                  onComplete();
                  navigate('/feed', { replace: true });
                }}
                style={{
                  display: 'block',
                  margin: '16px auto 0',
                  background: 'none',
                  border: 'none',
                  color: '#999',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Skip for now
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
