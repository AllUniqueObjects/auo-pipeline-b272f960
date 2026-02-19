import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';

function RootRoute() {
  const [isComplete] = useState(
    () => localStorage.getItem('onboardingComplete') === 'true'
  );
  if (isComplete) return <Dashboard />;
  return <Navigate to="/onboarding" replace />;
}

const App = () => {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<RootRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  );
};

export default App;
