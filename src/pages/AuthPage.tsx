import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'signin' | 'signup';

const BLACK = '#080808';
const WHITE = '#ffffff';
const RED = '#b51822';

const DM_SANS = "'DM Sans', sans-serif";
const FRAUNCES = "'Fraunces', serif";
const DM_MONO = "'DM Mono', monospace";

interface PublicSignal {
  title: string;
  source: string;
  source_date: string;
  badge: 'act_now' | 'watch';
}

const cleanSignalTitle = (title: string): string =>
  title
    .replace(/\s*[\|–\-—]\s*(Reuters|Bloomberg|AP|AFP|WSJ|FT|CNN|BBC|SCMP|South China Morning Post|Financial Times|Wall Street Journal|Associated Press|supplychaindive\.com|Supply Chain Dive)[^$]*/gi, '')
    .trim();

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signals, setSignals] = useState<PublicSignal[]>([]);
  const [signalsLive, setSignalsLive] = useState(false);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const res = await fetch(
          'https://dkk222--auo-scanner-public-signals.modal.run',
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        if (data.signals?.length >= 2) {
          setSignals(data.signals.slice(0, 6));
          setSignalsLive(true);
        }
      } catch {
        // Section stays hidden — no fallback
      }
    };
    fetchSignals();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, company } },
      });
      if (error) setError(error.message);
      else navigate('/onboarding');
    }
    setLoading(false);
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: DM_SANS,
    fontWeight: 500,
    fontSize: 9,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 13px',
    fontFamily: DM_SANS,
    fontWeight: 300,
    fontSize: 13,
    color: WHITE,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 3,
    outline: 'none',
    transition: 'border-color 0.15s, background 0.15s',
    boxSizing: 'border-box' as const,
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .auth-layout { flex-direction: column !important; }
          .auth-left { width: 100% !important; min-height: auto !important; padding: 36px 28px !important; }
          .auth-right { width: 100% !important; min-height: auto !important; padding: 40px 28px !important; align-items: flex-start !important; }
          .auth-right-inner { max-width: 100% !important; }
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.18); }
        .auth-input:focus { border-color: rgba(255,255,255,0.3) !important; background: rgba(255,255,255,0.09) !important; }
        @keyframes livepulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div className="auth-layout" style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        minHeight: '100vh',
        background: BLACK,
      }}>
        {/* ─── Left panel ─── */}
        <div className="auth-left" style={{
          width: '50%',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Background image */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: "url('/bg-sole.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          {/* Overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(8,8,8,0.75)',
          }} />
          {/* Content */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: '100vh',
            padding: '48px 56px',
            boxSizing: 'border-box',
          }}>
            {/* Logo */}
            <div style={{
              fontFamily: DM_SANS,
              fontWeight: 400,
              fontSize: 15,
              letterSpacing: '0.36em',
              color: WHITE,
              textTransform: 'uppercase',
            }}>
              AUO
            </div>

            {/* Middle */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 0 40px' }}>
              {/* Eyebrow */}
              <div style={{
                fontFamily: DM_MONO,
                fontSize: 9,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.7)',
                marginBottom: 16,
              }}>
                Built for sporting goods leaders
              </div>

              {/* Headline */}
              <h1 style={{
                fontFamily: FRAUNCES,
                fontWeight: 300,
                fontSize: 36,
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
                color: WHITE,
                margin: '0 0 40px 0',
              }}>
                Read the signal.<br />
                <span style={{ fontStyle: 'italic', color: RED }}>Own</span> the moment.
              </h1>

              {/* Live signals — only when fetch succeeds */}
              {signals.length > 0 && (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 14,
                  }}>
                    <span style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: RED,
                      display: 'inline-block',
                      animation: signalsLive ? 'livepulse 3s ease-in-out infinite' : 'none',
                    }} />
                    <span style={{
                      fontFamily: DM_MONO,
                      fontSize: 9,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.4)',
                    }}>
                      Live signals
                    </span>
                  </div>

                  {signals.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      gap: 16,
                      alignItems: 'flex-start',
                      padding: '10px 0',
                      borderTop: '1px solid rgba(255,255,255,0.12)',
                    }}>
                      <span style={{
                        minWidth: 52,
                        flexShrink: 0,
                        fontFamily: DM_MONO,
                        fontSize: 8,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        color: s.badge === 'act_now' ? RED : 'rgba(255,255,255,0.55)',
                      }}>
                        {s.badge === 'act_now' ? 'Act now' : 'Watch'}
                      </span>
                      <div>
                        <div style={{
                          fontFamily: DM_SANS,
                          fontWeight: 300,
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: 'rgba(255,255,255,0.75)',
                        }}>
                          {cleanSignalTitle(s.title)}
                        </div>
                        {(s.source || s.source_date) && (
                          <div style={{
                            fontFamily: DM_MONO,
                            fontSize: 9,
                            color: 'rgba(255,255,255,0.35)',
                            marginTop: 3,
                            letterSpacing: '0.04em',
                          }}>
                            {[s.source, s.source_date].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              fontFamily: DM_MONO,
              fontSize: 9,
              letterSpacing: '0.05em',
              color: 'rgba(255,255,255,0.14)',
            }}>
              &copy; 2026 AUO
            </div>
          </div>
        </div>

        {/* ─── Right panel ─── */}
        <div className="auth-right" style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 56px',
          boxSizing: 'border-box',
          background: BLACK,
        }}>
          <div className="auth-right-inner" style={{ width: '100%', maxWidth: 320 }}>
            {/* Title */}
            <h2 style={{
              fontFamily: FRAUNCES,
              fontWeight: 300,
              fontSize: 24,
              letterSpacing: '-0.01em',
              color: WHITE,
              margin: '0 0 4px 0',
            }}>
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={{
              fontFamily: DM_SANS,
              fontWeight: 300,
              fontSize: 12,
              color: 'rgba(255,255,255,0.35)',
              margin: '0 0 32px 0',
            }}>
              {mode === 'signin'
                ? 'Sign in to continue to your briefing'
                : 'Get started with strategic intelligence'}
            </p>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              marginBottom: 28,
            }}>
              {(['signin', 'signup'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(null); }}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    background: 'none',
                    border: 'none',
                    borderBottom: mode === m ? '1.5px solid white' : '1.5px solid transparent',
                    fontFamily: DM_SANS,
                    fontWeight: 500,
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: mode === m ? WHITE : 'rgba(255,255,255,0.25)',
                    cursor: 'pointer',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                >
                  {m === 'signin' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {mode === 'signup' && (
                <>
                  <div>
                    <label style={labelStyle}>Full name</label>
                    <input className="auth-input" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Smith" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Company</label>
                    <input className="auth-input" type="text" value={company} onChange={e => setCompany(e.target.value)} required placeholder="Acme Corp" style={inputStyle} />
                  </div>
                </>
              )}

              <div>
                <label style={labelStyle}>Email</label>
                <input className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Password</label>
                <input className="auth-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />
              </div>

              {/* Error */}
              {error && (
                <p style={{ fontFamily: DM_SANS, fontSize: 12, color: RED, margin: '8px 0 0' }}>
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  marginTop: 6,
                  background: WHITE,
                  color: BLACK,
                  border: 'none',
                  borderRadius: 3,
                  fontFamily: DM_SANS,
                  fontWeight: 500,
                  fontSize: 10.5,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'opacity 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.85)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = WHITE; }}
              >
                {loading
                  ? mode === 'signin' ? 'Signing in...' : 'Creating account...'
                  : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>

              {/* Footer links */}
              {mode === 'signin' && (
                <p style={{
                  fontFamily: DM_SANS, fontSize: 11, textAlign: 'center', margin: 0,
                  color: 'rgba(255,255,255,0.25)', cursor: 'pointer',
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.55)', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                    Forgot password?
                  </span>
                </p>
              )}
              {mode === 'signup' && (
                <p style={{
                  fontFamily: DM_SANS, fontSize: 11, textAlign: 'center', margin: 0,
                  color: 'rgba(255,255,255,0.25)', lineHeight: 1.5,
                }}>
                  By signing up you agree to our{' '}
                  <span style={{ color: 'rgba(255,255,255,0.55)', borderBottom: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}>
                    Terms
                  </span>
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
