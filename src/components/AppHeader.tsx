import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography, transition, shadow } from '../design-tokens';

const FONT = typography.fontFamily;
const ADMIN_EMAILS = ['dkkim2011@gmail.com'];

function AvatarMenu({ userName, isAdmin, hasUnread, onNavigate }: { userName: string; isAdmin: boolean; hasUnread: boolean; onNavigate: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    localStorage.removeItem('onboardingComplete');
    sessionStorage.removeItem('justOnboarded');
    await supabase.auth.signOut();
  };

  const initial = (userName || 'U').charAt(0).toUpperCase();

  const menuBtnStyle: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '10px 16px', border: 'none', background: 'transparent',
    fontSize: 13, fontWeight: 500, color: colors.text.primary.light,
    cursor: 'pointer', fontFamily: FONT, transition: transition.fast,
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: colors.text.primary.light, color: colors.text.primary.dark,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
          position: 'relative',
        }}
      >
        {initial}
        {hasUnread && (
          <span style={{
            position: 'absolute', top: -1, right: -1,
            width: 9, height: 9, borderRadius: '50%',
            background: '#ef4444',
            border: '2px solid #fff',
          }} />
        )}
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6,
          background: colors.bg.light, border: `1px solid ${colors.border.medium}`,
          borderRadius: 12, boxShadow: shadow.md,
          minWidth: 170, zIndex: 100, paddingTop: 4, paddingBottom: 4,
        }}>
          {isAdmin && (
            <>
              <button
                onClick={() => { setOpen(false); onNavigate('/admin/costs'); }}
                style={menuBtnStyle}
                onMouseEnter={e => (e.currentTarget.style.background = colors.bg.surface)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Pipeline Costs
              </button>
              <button
                onClick={() => { setOpen(false); onNavigate('/admin/eval'); }}
                style={menuBtnStyle}
                onMouseEnter={e => (e.currentTarget.style.background = colors.bg.surface)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Pipeline Eval
              </button>
              <div style={{ height: 1, background: colors.border.light, margin: '0 12px' }} />
            </>
          )}
          <button
            onClick={() => { setOpen(false); onNavigate('/alert-sources'); }}
            style={menuBtnStyle}
            onMouseEnter={e => (e.currentTarget.style.background = colors.bg.surface)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Alert Sources
          </button>
          <button
            onClick={() => { setOpen(false); onNavigate('/notifications'); }}
            style={menuBtnStyle}
            onMouseEnter={e => (e.currentTarget.style.background = colors.bg.surface)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Notifications
          </button>
          <div style={{ height: 1, background: colors.border.light, margin: '0 12px' }} />
          <button
            onClick={handleSignOut}
            style={{
              ...menuBtnStyle,
              color: '#dc2626',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppHeader() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || '';
      setUserName(name ? name.split(' ')[0] : 'U');

      (supabase as any)
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }: any) => {
          if (data?.is_admin) setIsAdmin(true);
        })
        .catch(() => {});

      if (user.email && ADMIN_EMAILS.includes(user.email)) setIsAdmin(true);

      // Check for unread notifications
      (async () => {
        const { data: threads } = await (supabase as any)
          .from('decision_threads')
          .select('id')
          .eq('user_id', user.id);
        if (!threads?.length) return;
        const threadIds = threads.map((t: any) => t.id);
        const { count } = await (supabase as any)
          .from('agent_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'direction_changed')
          .eq('read', false)
          .in('thread_id', threadIds);
        if (count && count > 0) setHasUnread(true);
      })().catch(() => {});
    });
  }, []);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: colors.bg.light, borderBottom: `1px solid ${colors.border.light}`,
      padding: '0 32px', height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: FONT,
    }}>
      <span
        onClick={() => navigate('/')}
        style={{
          fontSize: 15, fontWeight: 400,
          letterSpacing: '0.36em',
          color: colors.text.primary.light,
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        AUO
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 13, color: colors.text.muted.light }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <AvatarMenu userName={userName} isAdmin={isAdmin} hasUnread={hasUnread} onNavigate={navigate} />
      </div>
    </header>
  );
}
