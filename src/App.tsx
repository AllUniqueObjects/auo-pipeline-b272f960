import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import AuthPage from './pages/AuthPage';
import Feed from './pages/Feed';
import Workspace from './pages/Workspace';
import AlertSources from './pages/AlertSources';
import InsightDetail from './pages/InsightDetail';
import Onboarding from './pages/Onboarding';

function AppWithAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
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

  // Check onboarding status once session is available
  useEffect(() => {
    if (!session || onboardingChecked) return;

    // Fast path: localStorage
    if (localStorage.getItem('onboardingComplete') === 'true') {
      setOnboardingChecked(true);
      setNeedsOnboarding(false);
      return;
    }

    // Check if user has any decision threads — if so, onboarding is done
    (supabase as any)
      .from('decision_threads')
      .select('id')
      .eq('user_id', session.user.id)
      .limit(1)
      .then(({ data }: any) => {
        const completed = data && data.length > 0;
        if (completed) localStorage.setItem('onboardingComplete', 'true');
        setNeedsOnboarding(!completed);
        setOnboardingChecked(true);
      })
      .catch(() => {
        // If query fails, skip onboarding to avoid blocking the user
        setNeedsOnboarding(false);
        setOnboardingChecked(true);
      });
  }, [session, onboardingChecked]);

  if (loading || (session && !onboardingChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
  };

  return (
    <Routes>
      <Route
        path="/onboarding"
        element={
          needsOnboarding
            ? <Onboarding onComplete={handleOnboardingComplete} />
            : <Navigate to="/" replace />
        }
      />
      <Route
        path="/"
        element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <Feed />}
      />
      <Route path="/insights/:id" element={<InsightDetail />} />
      <Route path="/workspace/:threadId" element={<Workspace />} />
      <Route path="/alert-sources" element={<AlertSources />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <Toaster />
      <AppWithAuth />
    </TooltipProvider>
  </BrowserRouter>
);

export default App;
