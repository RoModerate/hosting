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

    // Always read directly from window.location — never rely on Wouter's
    // useSearch() here because at this route it can return an empty string
    // before the router fully mounts.
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const discordError = params.get('error');

    if (discordError || !code) {
      // Discord denied or no code — go back to login
      setLocation('/login?error=discord_denied');
      return;
    }

    const redirectUri =
      window.location.origin + BASE + '/auth/discord/callback';

    fetch(`${BASE}/api/auth/discord/exchange`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri }),
    })
      .then(async (res) => {
        if (res.ok) {
          setLocation('/dashboard');
          return;
        }
        const data = await res.json().catch(() => ({})) as { error?: string };
        const errCode =
          data.error === 'no_ticket'
            ? 'no_ticket'
            : data.error === 'key_expired'
            ? 'key_expired'
            : 'oauth_failed';
        setLocation(`/login?error=${errCode}`);
      })
      .catch((err) => {
        console.error('[DiscordCallback] exchange fetch failed:', err);
        setErrorMsg('Could not reach the server. Please try again.');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (errorMsg) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#080810',
          flexDirection: 'column',
          gap: 16,
          fontFamily: 'monospace',
        }}
      >
        <AlertTriangle style={{ width: 32, height: 32, color: '#f87171' }} />
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{errorMsg}</p>
        <button
          onClick={() => setLocation('/login')}
          style={{
            marginTop: 8,
            padding: '8px 20px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'monospace',
          }}
        >
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#080810',
        flexDirection: 'column',
        gap: 16,
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: 'rgba(88,101,242,0.12)',
          border: '1px solid rgba(88,101,242,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader2
          style={{ width: 24, height: 24, color: '#5865F2', animation: 'spin 1s linear infinite' }}
        />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>
          Signing you in…
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: '4px 0 0' }}>
          Verifying your Discord account
        </p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
