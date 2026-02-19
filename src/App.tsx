import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';

const App = () => {
  const onboardingComplete = localStorage.getItem('onboardingComplete') === 'true';

  return (
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            path="/"
            element={
              onboardingComplete
                ? <Dashboard />
                : <Navigate to="/onboarding" replace />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  );
};

export default App;
