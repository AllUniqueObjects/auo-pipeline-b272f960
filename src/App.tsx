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

function AppWithAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<Feed />} />
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
