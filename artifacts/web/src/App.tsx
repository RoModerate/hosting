import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import NotFound from '@/pages/not-found';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Admin from '@/pages/Admin';
import Pricing from '@/pages/Pricing';
import DiscordCallback from '@/pages/DiscordCallback';
import Banner from '@/pages/Banner';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { useEffect, useState } from 'react';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
const queryClient = new QueryClient();

// Only the site owner (ownerUsername set in session) can access admin
function AdminGuard() {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch(`${BASE}/api/session/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => {
        if (d?.ownerUsername) setStatus('allowed');
        else { setStatus('denied'); setLocation('/'); }
      })
      .catch(() => { setStatus('denied'); setLocation('/'); });
  }, []);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#13131f' }}>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', fontSize: 13 }}>Checking access…</span>
      </div>
    );
  }
  if (status === 'denied') return null;
  return <Admin />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/home" component={Landing} />
      <Route path="/banner" component={Banner} />
      <Route path="/login" component={Login} />
      <Route path="/auth/discord/callback" component={DiscordCallback} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/admin" component={AdminGuard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
