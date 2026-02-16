import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export type AppAuth = { loggedIn: boolean };

const App = () => {
  const [auth, setAuth] = useState<AppAuth>({ loggedIn: false });

  return (
    <TooltipProvider>
      <Toaster />
      {auth.loggedIn ? (
        <Dashboard onLogout={() => setAuth({ loggedIn: false })} />
      ) : (
        <Login onLogin={() => setAuth({ loggedIn: true })} />
      )}
    </TooltipProvider>
  );
};

export default App;
