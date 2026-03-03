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

const categoryToLens: Record<string, string> = {
  sourcing: 'supply_chain_resilience',
  compliance: 'textile_innovation',
  regulatory: 'textile_innovation',
  competitor: 'market_positioning',
  competitive: 'market_positioning',
  market: 'market_positioning',
  cost: 'supply_chain_resilience',
  geopolitical: 'supply_chain_resilience',
  technology: 'textile_innovation',
  financial: 'supply_chain_resilience',
};

const categoryLabel: Record<string, string> = {
  compliance: 'Compliance',
  sourcing: 'Sourcing',
  competitor: 'Competitor',
  competitive: 'Competitor',
  market: 'Market',
  cost: 'Cost',
  regulatory: 'Regulatory',
  geopolitical: 'Geopolitical',
  technology: 'Technology',
  financial: 'Financial',
};

const inputStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderRadius: 10,
  border: '1px solid #e5e5e5',
  fontSize: 15,
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
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
  const [previewIndex, setPreviewIndex] = useState(0);

  // Screen 4: Topics
  const [topics, setTopics] = useState<Topic[]>([]);
  const [customTopic, setCustomTopic] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  const SIGNAL_PREVIEWS = [
    `Scanning industry news for ${company}...`,
    'Analyzing competitor moves in footwear & apparel...',
    'Checking regulatory deadlines and compliance windows...',
    'Mapping supply chain signals and sourcing pressure...',
    'Cross-referencing geopolitical risk across sourcing regions...',
    'Identifying decisions with near-term deadlines...',
    'Building your strategic briefing...',
  ];

  useEffect(() => {
    if (screen !== 'researching') return;
    setPreviewIndex(0);
    const interval = setInterval(() => {
      setPreviewIndex(i => (i + 1) % SIGNAL_PREVIEWS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [screen, SIGNAL_PREVIEWS.length]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleLetsGo = () => {
    transitionTo('company');
  };

  const handleStartResearch = async () => {
    // 1. Set researching screen IMMEDIATELY
    setScreen('researching');
    setTopics([]);

    const scanUrl = import.meta.env.VITE_MODAL_ONBOARDING_SCAN_URL;

    console.log('[Onboarding] Starting research:', { company, role, scanUrl: !!scanUrl });

    if (!scanUrl) {
      console.warn('[Onboarding] No scan URL — going to empty topics screen');
      setScreen('topics');
      return;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('[Onboarding] No auth user:', userError);
        setScreen('topics');
        return;
      }

      console.log('[Onboarding] Calling scan endpoint for user:', user.id);

      const response = await fetch(scanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          brand_name: company.trim(),
          role: role.trim(),
        }),
      });

      console.log('[Onboarding] Scan response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Onboarding] Scan failed:', response.status, errorText);
        setTopics([]);
        setScreen('topics');
        return;
      }

      const data = await response.json();
      console.log('[Onboarding] Scan result:', data);

      if (data.topics && Array.isArray(data.topics) && data.topics.length > 0) {
        const topicsWithSelected = data.topics.map((t: Topic) => ({
          ...t,
          selected: true,
        }));
        setTopics(topicsWithSelected);
        console.log(`[Onboarding] Got ${topicsWithSelected.length} topics`);
      } else {
        console.warn('[Onboarding] No topics returned from scan');
        setTopics([]);
      }
    } catch (err) {
      console.error('[Onboarding] Scan error:', err);
      setTopics([]);
    } finally {
      // ALWAYS go to topics screen — never skip
      console.log('[Onboarding] Moving to topics screen');
      setScreen('topics');
    }
  };

  const removeTopic = (index: number) => {
    setTopics(topics.map((t, i) => i === index ? { ...t, selected: false } : t));
  };

  const selectedTopics = topics.filter(t => t.selected);
  const removedTopics = topics.filter(t => !t.selected);

  const handleConfirmTopics = async () => {
    setIsCreating(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('[Onboarding] No user in confirm:', userError);
        navigate('/feed');
        return;
      }

      const selected = topics.filter(t => t.selected);
      console.log(`[Onboarding] Confirming ${selected.length} topics for user:`, user.id);

      // 1. Insert decision_threads
      if (selected.length > 0) {
        const rows = selected.map(t => ({
          user_id: user.id,
          title: t.title,
          lens: categoryToLens[t.category] || 'supply_chain_resilience',
          level: 'listening',
          status: 'active',
        }));

        console.log('[Onboarding] Inserting threads:', rows.length);

        const { error: threadError } = await (supabase as any)
          .from('decision_threads')
          .insert(rows);

        if (threadError) {
          console.error('[Onboarding] Thread insert failed:', threadError);
          // Don't return — continue to save user profile
        } else {
          console.log('[Onboarding] Threads inserted successfully');
        }
      }

      // 2. Save company + role to public.users
      const { error: userUpdateError } = await (supabase as any)
        .from('users')
        .upsert({
          id: user.id,
          company: company.trim(),
          role: role.trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (userUpdateError) {
        console.error('[Onboarding] User upsert failed:', userUpdateError);
      } else {
        console.log('[Onboarding] User profile saved');
      }

      // 3. Fire scan_priority (fire and forget)
      const scanUrl = import.meta.env.VITE_MODAL_SCAN_PRIORITY_URL;
      if (scanUrl && selected.length > 0) {
        fetch(scanUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id }),
        }).catch(e => console.warn('[Onboarding] Scan trigger failed:', e));
      }

      // 4. Set localStorage flag
      localStorage.setItem('onboardingComplete', 'true');
      sessionStorage.setItem('justOnboarded', 'true');

      // 5. Navigate
      onComplete?.();
      navigate('/feed?scanning=true', { replace: true });

    } catch (err) {
      console.error('[Onboarding] Confirm error:', err);
      navigate('/feed');
    } finally {
      setIsCreating(false);
    }
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
          50% { opacity: 0.3; transform: scale(0.78); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
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
            <div style={{ maxWidth: 420, width: '100%' }} className="auo-fade-up">
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', marginBottom: 8 }}>
                Where do you work?
              </h1>
              <p style={{ fontSize: 15, color: '#888', marginBottom: 40, lineHeight: 1.6 }}>
                AUO will research your industry and surface what matters now.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  autoFocus
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Company (e.g. New Balance)"
                  onKeyDown={e => e.key === 'Enter' && role.trim() && company.trim() && handleStartResearch()}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#111')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e5e5')}
                />
                <input
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="Your role (e.g. VP of Product Development)"
                  onKeyDown={e => e.key === 'Enter' && company.trim() && role.trim() && handleStartResearch()}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = '#111')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e5e5')}
                />
              </div>

              <button
                onClick={handleStartResearch}
                disabled={!company.trim() || !role.trim()}
                style={{
                  marginTop: 28,
                  width: '100%',
                  padding: '15px',
                  background: company.trim() && role.trim() ? '#111' : '#e5e5e5',
                  color: company.trim() && role.trim() ? '#fff' : '#aaa',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: company.trim() && role.trim() ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                }}
              >
                Research {company.trim() || 'your company'} →
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
            minHeight: '70vh',
            gap: 28,
            textAlign: 'center',
            maxWidth: 400,
            margin: '0 auto',
            padding: '0 24px',
          }}>
            {/* Pulsing dot */}
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#111',
              animation: 'pulse 1.6s ease-in-out infinite',
            }} />

            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 14 }}>
                Researching {company}
              </div>
              <div
                key={previewIndex}
                style={{
                  fontSize: 14,
                  color: '#888',
                  lineHeight: 1.7,
                  animation: 'fadeIn 0.4s ease',
                  minHeight: 48,
                }}
              >
                {SIGNAL_PREVIEWS[previewIndex]}
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#ccc' }}>
              Usually takes about a minute
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            SCREEN 4: TOPIC SELECTION (briefing style)
        ════════════════════════════════════════════════════════════════ */}
        {screen === 'topics' && (
          <div style={{
            maxWidth: 540, margin: '0 auto', padding: '60px 24px 80px',
            width: '100%', overflowY: 'auto', flex: 1,
          }}>
            {/* ── Page header ── */}
            <div style={{ marginBottom: 40 }}>
              {topics.length > 0 ? (
                <>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: '#999',
                    letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                    marginBottom: 10,
                  }}>
                    AUO researched {company}
                  </div>
                  <h1 style={{
                    fontSize: 32, fontWeight: 700, color: '#111',
                    lineHeight: 1.2, marginBottom: 8, letterSpacing: '-0.02em',
                  }}>
                    {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} ready to track.
                  </h1>
                  <p style={{ fontSize: 14, color: '#aaa', marginBottom: 0, fontWeight: 400 }}>
                    Remove anything that doesn't apply to you.
                  </p>
                </>
              ) : (
                <>
                  <h1 style={{
                    fontSize: 32, fontWeight: 700, color: '#111',
                    lineHeight: 1.2, marginBottom: 8, letterSpacing: '-0.02em',
                  }}>
                    What are you tracking at {company}?
                  </h1>
                  <p style={{ fontSize: 14, color: '#aaa', marginBottom: 0, fontWeight: 400 }}>
                    Add the decisions you're actively working on.
                  </p>
                </>
              )}
            </div>

            {/* ── Topic cards ── */}
            <div style={{ marginBottom: 16 }}>
              {selectedTopics.map((topic, i) => {
                const originalIndex = topics.indexOf(topic);
                const isHovered = hoveredIndex === i;

                return (
                  <div
                    key={originalIndex}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{
                      position: 'relative',
                      padding: '18px 20px',
                      borderRadius: 12,
                      border: `1px solid ${isHovered ? '#d0d0d0' : '#ebebeb'}`,
                      background: isHovered ? '#fafafa' : '#fff',
                      cursor: 'default',
                      transition: 'all 0.15s ease',
                      marginBottom: 8,
                    }}
                  >
                    {/* Category — top left, small */}
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: '#bbb',
                      letterSpacing: '0.05em', textTransform: 'uppercase' as const,
                      marginBottom: 6,
                    }}>
                      {categoryLabel[topic.category] || topic.category}
                    </div>

                    {/* Title — hero */}
                    <div style={{
                      fontSize: 16, fontWeight: 650, color: '#111',
                      lineHeight: 1.35,
                      marginBottom: topic.hook ? 6 : 0,
                      paddingRight: 32,
                    }}>
                      {topic.title}
                    </div>

                    {/* Hook — 1 line, truncated */}
                    {topic.hook && (
                      <div style={{
                        fontSize: 13, color: '#999', lineHeight: 1.5,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical' as const,
                        paddingRight: 32,
                      }}>
                        {topic.hook}
                      </div>
                    )}

                    {/* X button — only on hover */}
                    {isHovered && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTopic(originalIndex);
                        }}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          right: 16,
                          transform: 'translateY(-50%)',
                          width: 24, height: 24, borderRadius: '50%',
                          border: '1px solid #ddd', background: '#fff',
                          color: '#999', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontFamily: 'inherit',
                          transition: 'all 0.1s ease',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#111';
                          e.currentTarget.style.color = '#111';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#ddd';
                          e.currentTarget.style.color = '#999';
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Removed topics — re-add pills ── */}
            {removedTopics.length > 0 && (
              <div style={{ marginTop: 4, marginBottom: 20 }}>
                <div style={{
                  fontSize: 11, color: '#ccc', marginBottom: 8,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em', fontWeight: 600,
                }}>
                  Removed
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {removedTopics.map((topic, i) => {
                    const originalIndex = topics.indexOf(topic);
                    const shortTitle = topic.title.split('—')[0].trim();
                    return (
                      <button
                        key={originalIndex}
                        onClick={() => setTopics(topics.map((t, idx) =>
                          idx === originalIndex ? { ...t, selected: true } : t
                        ))}
                        style={{
                          padding: '5px 10px', borderRadius: 20,
                          border: '1px solid #e8e8e8', background: '#fff',
                          fontSize: 12, color: '#bbb', cursor: 'pointer',
                          fontFamily: 'inherit', transition: 'all 0.1s ease',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = '#555';
                          e.currentTarget.style.borderColor = '#bbb';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = '#bbb';
                          e.currentTarget.style.borderColor = '#e8e8e8';
                        }}
                      >
                        + {shortTitle}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Add custom topic ── */}
            {!showCustomInput ? (
              <button
                onClick={() => setShowCustomInput(true)}
                style={{
                  width: '100%', padding: '13px 16px',
                  borderRadius: 10, border: '1px dashed #e0e0e0',
                  background: 'transparent', color: '#bbb',
                  fontSize: 13, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left' as const,
                  marginBottom: 28, transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#bbb';
                  e.currentTarget.style.color = '#888';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e0e0e0';
                  e.currentTarget.style.color = '#bbb';
                }}
              >
                + Add something AUO missed
              </button>
            ) : (
              <input
                autoFocus
                value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                placeholder="e.g. PFAS-free supplier lock-in for FW27"
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
                  width: '100%', padding: '13px 16px',
                  borderRadius: 10, border: '1px solid #111',
                  fontSize: 14, fontFamily: 'inherit', outline: 'none',
                  marginBottom: 28, boxSizing: 'border-box' as const,
                }}
              />
            )}

            {/* ── CTA ── */}
            <button
              onClick={handleConfirmTopics}
              disabled={selectedTopics.length === 0 || isCreating}
              style={{
                width: '100%', padding: '17px',
                background: selectedTopics.length > 0 ? '#111' : '#f0f0f0',
                color: selectedTopics.length > 0 ? '#fff' : '#bbb',
                borderRadius: 12, border: 'none',
                fontSize: 15, fontWeight: 600,
                cursor: selectedTopics.length > 0 ? 'pointer' : 'default',
                fontFamily: 'inherit',
                letterSpacing: '-0.01em',
                transition: 'all 0.2s ease',
              }}
            >
              {isCreating
                ? 'Setting up your briefing...'
                : 'Start briefing →'
              }
            </button>

            {/* Skip */}
            <button
              onClick={() => {
                localStorage.setItem('onboardingComplete', 'true');
                onComplete();
                navigate('/feed', { replace: true });
              }}
              style={{
                display: 'block', margin: '14px auto 0',
                background: 'none', border: 'none',
                color: '#ccc', fontSize: 13,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
