import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Loader2, AlertTriangle } from 'lucide-react';

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
        style={{ background: '#f6f6f7', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="h-12 w-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <p className="text-[14px] text-gray-600 font-medium">{errorMsg}</p>
        <button onClick={() => setLocation('/login')}
          className="mt-2 px-5 py-2 rounded-xl text-[13px] text-gray-600 border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition-all">
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5"
      style={{ background: '#f6f6f7', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Animated logo */}
      <div className="relative">
        <div className="h-16 w-16 rounded-3xl flex items-center justify-center" style={{ background: '#0c0c14' }}>
          <img src="/lumora-brand.png" alt="Lumora" className="h-12 w-12 object-contain" />
        </div>
        {/* Spinner ring */}
        <div className="absolute -inset-1.5 rounded-[28px] border-2 border-transparent border-t-violet-400 animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-gray-800 mb-1">Signing you in…</p>
        <p className="text-[12.5px] text-gray-400">Verifying your Discord account</p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
