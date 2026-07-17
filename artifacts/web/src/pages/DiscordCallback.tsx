import { useEffect, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Loader2 } from 'lucide-react';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

export default function DiscordCallback() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const params = new URLSearchParams(search);
    const code = params.get('code');
    const error = params.get('error');

    if (error || !code) {
      setLocation('/login?error=discord_denied');
      return;
    }

    const redirectUri = window.location.origin + BASE + '/auth/discord/callback';

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
        const data = await res.json().catch(() => ({})) as {
          error?: string;
          discord?: { id?: string; username?: string };
        };
        const errCode = data.error === 'no_ticket' ? 'no_ticket'
          : data.error === 'key_expired' ? 'key_expired'
          : 'oauth_failed';
        const params = new URLSearchParams({ error: errCode });
        if (data.discord?.id) params.set('discord_id', data.discord.id);
        if (data.discord?.username) params.set('discord_user', data.discord.username);
        setLocation(`/login?${params.toString()}`);
      })
      .catch(() => {
        setLocation('/login?error=oauth_failed');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#080810]">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-12 w-12 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/20 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-[#5865F2] animate-spin" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white/70 font-mono">Signing you in…</p>
          <p className="text-xs text-white/30 font-mono mt-1">Verifying your Discord account</p>
        </div>
      </div>
    </div>
  );
}
