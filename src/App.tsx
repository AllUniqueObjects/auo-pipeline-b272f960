import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import { type LensType } from '@/data/mock';

type AppState = 'onboarding' | 'dashboard';

const App = () => {
  const [appState, setAppState] = useState<AppState>(() => {
    return localStorage.getItem('onboardingComplete') === 'true' ? 'dashboard' : 'onboarding';
  });

  const [initialLens, setInitialLens] = useState<LensType>(() => {
    return (localStorage.getItem('activeLens') as LensType) || 'balanced';
  });

  const [justCompletedOnboarding, setJustCompletedOnboarding] = useState(false);

  const handleOnboardingComplete = (lens: LensType) => {
    localStorage.setItem('onboardingComplete', 'true');
    localStorage.setItem('activeLens', lens);
    setInitialLens(lens);
    setJustCompletedOnboarding(true);
    setAppState('dashboard');
  };

  return (
    <TooltipProvider>
      <Toaster />
      {appState === 'onboarding' ? (
        <Onboarding onComplete={handleOnboardingComplete} />
      ) : (
        <Dashboard
          initialLens={initialLens}
          justCompletedOnboarding={justCompletedOnboarding}
        />
      )}
    </TooltipProvider>
  );
};

export default App;
