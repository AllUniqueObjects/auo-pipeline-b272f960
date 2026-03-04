import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'signin' | 'signup';

const BLACK = '#080808';
const WHITE = '#ffffff';
const RED = '#b51822';

const DM_SANS = "'DM Sans', sans-serif";
const FRAUNCES = "'Fraunces', serif";
const DM_MONO = "'DM Mono', monospace";

// TODO: fetch from /public-signals endpoint when live
const SIGNALS = [
  { tone: 'act', text: 'Iran escalation compresses vendor lock window across footwear categories' },
  { tone: 'act', text: 'Tariff shock closes wholesale value window before Q2 buyer reviews' },
  { tone: 'watch', text: 'Vietnam capacity destruction outpaces tariff timeline for Asia-Pacific sourcing' },
  { tone: 'watch', text: 'Automation advantage widens as tariff pressure peaks across manufacturing' },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            company: company,
          },
        },
      });
      if (error) {
        setError(error.message);
      } else {
        navigate('/onboarding');
      }
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
    padding: '10px 12px',
    fontFamily: DM_SANS,
    fontWeight: 300,
    fontSize: 13,
    color: WHITE,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: BLACK,
      flexDirection: 'row',
    }}>
      <style>{`
        @media (max-width: 768px) {
          .auth-layout { flex-direction: column !important; }
          .auth-left, .auth-right { width: 100% !important; min-height: auto !important; padding: 36px 28px !important; }
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.18); }
        .auth-input:focus { border-color: rgba(255,255,255,0.3) !important; }
      `}</style>

      {/* ─── Left panel ─── */}
      <div className="auth-layout" style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        minHeight: '100vh',
      }}>
        <div className="auth-left" style={{
          width: '50%',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 56px',
          boxSizing: 'border-box',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* Logo */}
          <div style={{
            fontFamily: DM_SANS,
            fontWeight: 400,
            fontSize: 18,
            letterSpacing: '0.36em',
            color: WHITE,
          }}>
            AUO
          </div>

          {/* Headline + signals */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{
              fontFamily: FRAUNCES,
              fontWeight: 300,
              fontSize: 36,
              lineHeight: 1.3,
              color: WHITE,
              margin: '0 0 48px 0',
            }}>
              Read the signal.<br />
              <span style={{ fontStyle: 'italic', color: RED }}>Own</span> the moment.
            </h1>

            {/* Live signals */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 16,
              }}>
                <span style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: RED,
                  display: 'inline-block',
                }} />
                <span style={{
                  fontFamily: DM_MONO,
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'rgba(255,255,255,0.2)',
                }}>
                  Live signals
                </span>
              </div>

              {SIGNALS.map((s, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr',
                  gap: 12,
                  padding: '10px 0',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  alignItems: 'baseline',
                }}>
                  <span style={{
                    fontFamily: DM_MONO,
                    fontSize: 8,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    color: s.tone === 'act' ? RED : 'rgba(255,255,255,0.22)',
                  }}>
                    {s.tone === 'act' ? 'Act now' : 'Watch'}
                  </span>
                  <span style={{
                    fontFamily: DM_SANS,
                    fontWeight: 300,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: 'rgba(255,255,255,0.36)',
                  }}>
                    {s.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            fontFamily: DM_MONO,
            fontSize: 9,
            color: 'rgba(255,255,255,0.12)',
          }}>
            &copy; 2026 AUO
          </div>
        </div>

        {/* ─── Right panel ─── */}
        <div className="auth-right" style={{
          width: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 56px',
          boxSizing: 'border-box',
        }}>
          <div style={{ width: '100%', maxWidth: 320 }}>
            {/* Title */}
            <h2 style={{
              fontFamily: FRAUNCES,
              fontWeight: 300,
              fontSize: 24,
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
              margin: '0 0 28px 0',
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
                    fontWeight: 400,
                    fontSize: 13,
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
                    <input
                      className="auth-input"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      placeholder="Jane Smith"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Company</label>
                    <input
                      className="auth-input"
                      type="text"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      required
                      placeholder="Acme Corp"
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              <div>
                <label style={labelStyle}>Email</label>
                <input
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Password</label>
                <input
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </div>

              {/* Error */}
              {error && (
                <p style={{
                  fontFamily: DM_SANS,
                  fontSize: 12,
                  color: RED,
                  margin: 0,
                }}>
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
                  background: WHITE,
                  color: BLACK,
                  border: 'none',
                  borderRadius: 6,
                  fontFamily: DM_SANS,
                  fontWeight: 500,
                  fontSize: 10.5,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'opacity 0.15s, background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.85)'; } }}
                onMouseLeave={e => { e.currentTarget.style.background = WHITE; }}
              >
                {loading
                  ? mode === 'signin' ? 'Signing in...' : 'Creating account...'
                  : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>

              {/* Footer links */}
              {mode === 'signin' && (
                <p style={{
                  fontFamily: DM_SANS,
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.25)',
                  textAlign: 'center',
                  margin: 0,
                  cursor: 'pointer',
                }}>
                  Forgot password?
                </p>
              )}
              {mode === 'signup' && (
                <p style={{
                  fontFamily: DM_SANS,
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.2)',
                  textAlign: 'center',
                  margin: 0,
                  lineHeight: 1.5,
                }}>
                  By signing up you agree to our Terms
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
