import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { AlertTriangle } from 'lucide-react';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

export default function DiscordCallback() {
  const [, setLocation] = useLocation();
  const calledRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const discordError = params.get('error');

    if (discordError || !code) {
      setLocation('/login?error=discord_denied');
      return;
    }

    const redirectUri =
      window.location.origin.replace(/^http:\/\//, 'https://') + BASE + '/auth/discord/callback';

    fetch(`${BASE}/api/auth/discord/exchange`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri }),
    })
      .then(async (res) => {
        if (res.ok) { setLocation('/dashboard'); return; }
        const data = await res.json().catch(() => ({})) as { error?: string };
        const errCode = data.error === 'no_ticket' ? 'no_ticket' : data.error === 'key_expired' ? 'key_expired' : 'oauth_failed';
        setLocation(`/login?error=${errCode}`);
      })
      .catch((err) => {
        console.error('[DiscordCallback] exchange fetch failed:', err);
        setErrorMsg('Could not reach the server. Please try again.');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6"
        style={{ background: '#13131f', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle className="h-5 w-5" style={{ color: '#f87171' }} />
        </div>
        <p className="text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{errorMsg}</p>
        <button onClick={() => setLocation('/login')}
          className="mt-2 px-5 py-2 rounded-xl text-[13px] transition-all hover:-translate-y-px"
          style={{ color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5"
      style={{ background: '#13131f', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />
      {/* Glow */}
      <div className="fixed pointer-events-none" style={{
        top: '-100px', left: '-100px', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />

      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* Spinning logo */}
        <div className="relative">
          <img src="/lumora-brand.png" alt="Lumora" className="h-16 w-16 object-contain"
            style={{ filter: 'drop-shadow(0 0 24px rgba(124,58,237,0.5))' }} />
          {/* Spinner ring */}
          <div className="absolute -inset-2 rounded-full border-2 border-transparent border-t-violet-500"
            style={{ animation: 'spin 1s linear infinite' }} />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>Signing you in…</p>
          <p className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Verifying your Discord account</p>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
