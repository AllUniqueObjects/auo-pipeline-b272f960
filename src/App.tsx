import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import AuthPage from './pages/AuthPage';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen first, then get current session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    );
  }

  // Not authenticated → show auth page
  if (!session) {
    return (
      <TooltipProvider>
        <Toaster />
        <AuthPage />
      </TooltipProvider>
    );
  }

  // Authenticated → check onboarding, then show dashboard
  const onboardingComplete = localStorage.getItem('onboardingComplete') === 'true';

  return (
    <TooltipProvider>
      <Toaster />
      {onboardingComplete ? <Dashboard /> : <Onboarding />}
    </TooltipProvider>
  );
};

export default App;
