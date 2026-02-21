import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'signin' | 'signup';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Check your email to confirm your account.');
      }
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#0a0a0a' }}
    >
      {/* Logo + tagline */}
      <div className="mb-8 text-center">
        <span
          className="text-2xl font-semibold tracking-[0.3em] block"
          style={{ color: '#fff' }}
        >
          AUO
        </span>
        <span className="text-xs mt-1.5 block" style={{ color: '#888' }}>
          Strategic intelligence platform
        </span>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-[380px] p-8"
        style={{
          background: '#fff',
          border: '1px solid #e8e8e6',
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        {/* Headline */}
        <h1
          className="text-center mb-1"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 26,
            fontWeight: 400,
            letterSpacing: '-0.01em',
            color: '#1a1a1a',
          }}
        >
          {mode === 'signin' ? 'Welcome back' : 'Create account'}
        </h1>
        <p
          className="text-center mb-7"
          style={{ fontSize: 14, color: '#888' }}
        >
          {mode === 'signin'
            ? 'Sign in to continue to your briefing'
            : 'Get started with strategic intelligence'}
        </p>

        {/* Pill switcher */}
        <div
          className="flex mb-7 p-1 rounded-full"
          style={{ background: '#f4f4f3' }}
        >
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
                setSuccess(null);
              }}
              className="flex-1 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
              style={{
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#1a1a1a' : '#888',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              className="block mb-1.5"
              style={{
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#888',
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              className="w-full px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: '#fafaf9',
                border: '1px solid #e5e5e5',
                borderRadius: 8,
                color: '#1a1a1a',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#1a1a1a')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e5e5')}
            />
          </div>

          <div>
            <label
              className="block mb-1.5"
              style={{
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#888',
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: '#fafaf9',
                border: '1px solid #e5e5e5',
                borderRadius: 8,
                color: '#1a1a1a',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#1a1a1a')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e5e5')}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
              style={{ background: '#fef2f2', color: '#b91c1c' }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: '#ef4444' }}
              />
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
              style={{ background: '#f0fdf4', color: '#166534' }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: '#22c55e' }}
              />
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: '#1a1a1a',
              color: '#fff',
              borderRadius: 8,
              border: 'none',
            }}
          >
            {loading
              ? 'Please wait…'
              : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>
      </div>

    </div>
  );
}
