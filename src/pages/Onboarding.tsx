import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { typography, transition } from '../design-tokens';

// ─── Types ──────────────────────────────────────────────────────────────────

type Screen = 'welcome' | 'company' | 'researching' | 'brand_review' | 'topics';

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

// ─── BrandFactRow ───────────────────────────────────────────────────────────

function BrandFactRow({ text, onEdit, onDelete }: {
  text: string;
  onEdit: (newVal: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);

  // Auto-focus new empty rows into edit mode
  useEffect(() => {
    if (text === '') setEditing(true);
  }, [text]);

  if (editing) {
    return (
      <div style={{ padding: '6px 0' }}>
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={() => {
            if (value.trim()) onEdit(value.trim());
            else onDelete();
            setEditing(false);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (value.trim()) onEdit(value.trim());
              else onDelete();
              setEditing(false);
            }
          }}
          autoFocus
          rows={2}
          style={{
            width: '100%', fontSize: 13,
            border: '1px solid rgba(0,0,0,0.15)',
            borderRadius: 3, padding: '6px 8px',
            resize: 'none', fontFamily: FONT,
            outline: 'none', boxSizing: 'border-box',
            lineHeight: 1.5,
          }}
        />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      gap: 10, padding: '8px 0',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
    }}>
      <span style={{ fontSize: 13, color: '#111', lineHeight: 1.5, flex: 1 }}>
        {value}
      </span>
      <button
        onClick={() => { setValue(text); setEditing(true); }}
        style={{
          fontSize: 11, color: 'rgba(0,0,0,0.25)',
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: FONT, flexShrink: 0,
        }}
      >
        Edit
      </button>
      <button
        onClick={onDelete}
        style={{
          fontSize: 11, color: 'rgba(0,0,0,0.25)',
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: FONT, flexShrink: 0,
        }}
      >
        ×
      </button>
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
  const [showAll, setShowAll] = useState(false);

  // Screen 3.5: Brand review
  const [brandProfile, setBrandProfile] = useState<{
    strategic_bets: string[];
    active_commitments: string[];
    brand_constraints: string[];
  } | null>(null);
  const [brandCorrections, setBrandCorrections] = useState<Record<string, string>>({});

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
    'Identifying topics with near-term deadlines...',
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
          selected: false,
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
      // Check for brand profile before going to topics
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: bp } = await (supabase as any)
            .from('brand_profiles')
            .select('strategic_bets, active_commitments, brand_constraints')
            .eq('user_id', user.id)
            .maybeSingle();
          if (bp && (bp.strategic_bets?.length || bp.active_commitments?.length || bp.brand_constraints?.length)) {
            setBrandProfile({
              strategic_bets: bp.strategic_bets || [],
              active_commitments: bp.active_commitments || [],
              brand_constraints: bp.brand_constraints || [],
            });
            console.log('[Onboarding] Brand profile found, showing review');
            setScreen('brand_review');
            return;
          }
        }
      } catch (e) {
        console.warn('[Onboarding] Brand profile fetch failed:', e);
      }
      console.log('[Onboarding] Moving to topics screen');
      setScreen('topics');
    }
  };

  const toggleTopic = (index: number) => {
    setTopics(topics.map((t, i) => i === index ? { ...t, selected: !t.selected } : t));
  };

  const selectedTopics = topics.filter(t => t.selected);

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

      // 1. Create user record FIRST (decision_threads.user_id FK requires it)
      const { error: userUpsertError } = await (supabase as any)
        .from('users')
        .upsert({
          id: user.id,
          company: company.trim(),
          role: role.trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (userUpsertError) {
        console.error('[Onboarding] User upsert failed:', userUpsertError);
        // Don't proceed — threads will fail without user row
        return;
      }
      console.log('[Onboarding] User profile saved');

      // 2. NOW insert decision_threads (user row exists) — return IDs
      let insertedThreads: { id: string }[] = [];
      if (selected.length > 0) {
        const rows = selected.map(t => ({
          user_id: user.id,
          title: t.title,
          lens: categoryToLens[t.category] || 'supply_chain_resilience',
          level: 'listening',
          status: 'active',
        }));

        console.log('[Onboarding] Inserting threads:', rows.length);

        const { data: threadData, error: threadError } = await (supabase as any)
          .from('decision_threads')
          .insert(rows)
          .select('id');

        if (threadError) {
          console.error('[Onboarding] Thread insert failed:', threadError);
        } else {
          insertedThreads = threadData || [];
          console.log('[Onboarding] Threads inserted successfully:', insertedThreads.length);
        }
      }

      // 3. Trigger scan pipeline per thread (fire-and-forget, all in parallel)
      const scanUrl = import.meta.env.VITE_MODAL_SCAN_PRIORITY_URL;
      if (scanUrl && insertedThreads.length > 0) {
        for (const thread of insertedThreads) {
          fetch(scanUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thread_id: thread.id, user_id: user.id }),
          }).catch(err =>
            console.warn(`[Onboarding] Pipeline trigger failed for ${thread.id}:`, err)
          );
        }
        console.log(`[Onboarding] Triggered pipeline for ${insertedThreads.length} threads`);
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
        @keyframes auoPulse {
          0% { transform: scale(0.85); opacity: 0.5; box-shadow: 0 0 0 0 rgba(0,0,0,0.15); }
          50% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 0 20px rgba(0,0,0,0); }
          100% { transform: scale(0.85); opacity: 0.5; box-shadow: 0 0 0 0 rgba(0,0,0,0); }
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
                matters to you — before you'd normally find it.
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
            minHeight: '100vh',
            gap: 32,
            textAlign: 'center',
            padding: '0 24px',
          }}>
            {/* Pulsing circle with ripple */}
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#111',
              animation: 'auoPulse 2s ease-in-out infinite',
              position: 'relative',
            }} />

            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 14 }}>
                Researching {company.replace(/\b\w/g, c => c.toUpperCase())}
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

            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)', marginTop: 24 }}>
              Usually under 2 minutes
            </p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            SCREEN 3.5: BRAND CONTEXT REVIEW
        ════════════════════════════════════════════════════════════════ */}
        {screen === 'brand_review' && brandProfile && (() => {
          const sections: { key: 'strategic_bets' | 'active_commitments' | 'brand_constraints'; label: string }[] = [
            { key: 'strategic_bets', label: 'STRATEGIC PRIORITIES' },
            { key: 'active_commitments', label: 'ACTIVE COMMITMENTS' },
            { key: 'brand_constraints', label: 'BRAND CONSTRAINTS' },
          ];

          const handleBrandEdit = async (sectionKey: string, index: number, newValue: string) => {
            setBrandProfile(prev => {
              if (!prev) return prev;
              const arr = [...(prev[sectionKey as keyof typeof prev] || [])];
              const original = arr[index];
              arr[index] = newValue;
              // Track correction
              setBrandCorrections(c => ({ ...c, [original]: newValue }));
              return { ...prev, [sectionKey]: arr };
            });
          };

          const handleBrandDelete = async (sectionKey: string, index: number) => {
            setBrandProfile(prev => {
              if (!prev) return prev;
              const arr = [...(prev[sectionKey as keyof typeof prev] || [])];
              const removed = arr[index];
              arr.splice(index, 1);
              setBrandCorrections(c => ({ ...c, [removed]: '__deleted__' }));
              return { ...prev, [sectionKey]: arr };
            });
          };

          const handleBrandAdd = (sectionKey: string) => {
            setBrandProfile(prev => {
              if (!prev) return prev;
              const arr = [...(prev[sectionKey as keyof typeof prev] || []), ''];
              return { ...prev, [sectionKey]: arr };
            });
          };

          const handleBrandConfirm = async () => {
            // Save corrections to DB
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user && Object.keys(brandCorrections).length > 0) {
                await (supabase as any).from('brand_profiles').update({
                  user_corrections: { ...brandCorrections, corrected_at: new Date().toISOString() },
                }).eq('user_id', user.id).catch(() => {});
              }
            } catch {}
            setScreen('topics');
          };

          const companyUpper = company.replace(/\b\w/g, c => c.toUpperCase());

          return (
            <div style={{
              maxWidth: 560, margin: '0 auto', padding: '60px 40px',
              width: '100%', overflowY: 'auto', flex: 1,
            }}>
              <p style={{
                fontSize: 11, letterSpacing: '0.14em',
                color: 'rgba(0,0,0,0.3)', marginBottom: 8,
                textTransform: 'uppercase' as const,
              }}>
                What AUO knows about {companyUpper}
              </p>
              <h2 style={{ fontSize: 22, fontWeight: 400, marginBottom: 8, color: '#111' }}>
                Does this look right?
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', marginBottom: 40, lineHeight: 1.6 }}>
                AUO researched {companyUpper} to surface relevant intelligence.
                Correct anything that's off — this shapes every insight you'll see.
              </p>

              {sections.map(({ key, label }) => {
                const items = brandProfile[key] || [];
                if (items.length === 0 && key !== 'strategic_bets') return null;
                return (
                  <div key={key} style={{ marginBottom: 28 }}>
                    <p style={{
                      fontSize: 10, letterSpacing: '0.14em',
                      color: 'rgba(0,0,0,0.3)', marginBottom: 12,
                      textTransform: 'uppercase' as const,
                    }}>
                      {label}
                    </p>
                    {items.map((item, i) => (
                      <BrandFactRow
                        key={`${key}-${i}`}
                        text={item}
                        onEdit={(newVal) => handleBrandEdit(key, i, newVal)}
                        onDelete={() => handleBrandDelete(key, i)}
                      />
                    ))}
                    <button
                      onClick={() => handleBrandAdd(key)}
                      style={{
                        fontSize: 12, color: 'rgba(0,0,0,0.3)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '4px 0', marginTop: 4, fontFamily: FONT,
                      }}
                    >
                      + Add
                    </button>
                  </div>
                );
              })}

              <button
                onClick={handleBrandConfirm}
                style={{
                  marginTop: 40, width: '100%',
                  background: '#111', color: 'white',
                  border: 'none', borderRadius: 4,
                  padding: '13px 0', fontSize: 13,
                  letterSpacing: '0.08em', cursor: 'pointer',
                  fontFamily: FONT,
                }}
              >
                Looks right — show me topics →
              </button>

              <p style={{
                textAlign: 'center', marginTop: 12,
                fontSize: 12, color: 'rgba(0,0,0,0.25)',
              }}>
                You can update this anytime in settings
              </p>
            </div>
          );
        })()}

        {/* ════════════════════════════════════════════════════════════════
            SCREEN 4: TOPIC SELECTION (briefing style)
        ════════════════════════════════════════════════════════════════ */}
        {screen === 'topics' && (() => {
          const INITIAL_VISIBLE = 6;
          const visibleTopics = showAll ? topics : topics.slice(0, INITIAL_VISIBLE);
          const hiddenCount = topics.length - INITIAL_VISIBLE;

          return (
          <div style={{
            maxWidth: 860, margin: '0 auto', padding: '60px 32px 80px',
            width: '100%', overflowY: 'auto', flex: 1,
          }}>
            <style>{`
              @media (max-width: 600px) {
                .topics-grid { grid-template-columns: 1fr !important; }
              }
            `}</style>

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
                    {topics.length} topic{topics.length !== 1 ? 's' : ''} found.
                  </h1>
                  <p style={{ fontSize: 14, color: '#aaa', marginBottom: 0, fontWeight: 400 }}>
                    Select the ones you want to track.
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
                    Add the topics you're actively working on.
                  </p>
                </>
              )}
            </div>

            {/* ── Topic cards — 2-column grid ── */}
            <div
              className="topics-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 16,
              }}
            >
              {visibleTopics.map((topic) => {
                const originalIndex = topics.indexOf(topic);
                const isSelected = topic.selected;

                return (
                  <div
                    key={originalIndex}
                    onClick={() => toggleTopic(originalIndex)}
                    style={{
                      position: 'relative',
                      padding: '16px 18px',
                      borderRadius: 10,
                      border: isSelected ? '2px solid #111' : '1px solid #e8e8e8',
                      background: isSelected ? '#fafafa' : '#ffffff',
                      transition: 'all 0.15s ease',
                      minHeight: 100,
                      cursor: 'pointer',
                    }}
                  >
                    {/* Checkmark badge */}
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: 10, right: 10,
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#111',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}

                    {/* Category */}
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: '#bbb',
                      letterSpacing: '0.07em', textTransform: 'uppercase' as const,
                      marginBottom: 6,
                    }}>
                      {categoryLabel[topic.category] || topic.category}
                    </div>

                    {/* Title */}
                    <div style={{
                      fontSize: 14, fontWeight: 650, color: '#111',
                      lineHeight: 1.4,
                      marginBottom: topic.hook ? 6 : 0,
                      paddingRight: isSelected ? 28 : 0,
                    }}>
                      {topic.title}
                    </div>

                    {/* Hook — 2 lines max */}
                    {topic.hook && (
                      <div style={{
                        fontSize: 12, color: '#aaa', lineHeight: 1.5,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                      }}>
                        {topic.hook}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Show more */}
            {!showAll && hiddenCount > 0 && (
              <button
                onClick={() => setShowAll(true)}
                style={{
                  width: '100%', padding: '10px',
                  background: 'none', border: '1px solid #ebebeb',
                  borderRadius: 8, fontSize: 13, color: '#aaa',
                  cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#555')}
                onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}
              >
                + {hiddenCount} more topic{hiddenCount !== 1 ? 's' : ''}
              </button>
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
                : selectedTopics.length === 0
                  ? 'Select topics to track'
                  : `Track ${selectedTopics.length} topic${selectedTopics.length !== 1 ? 's' : ''} →`
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
          );
        })()}
      </div>
    </div>
  );
}
