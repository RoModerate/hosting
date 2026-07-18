import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { MessageSquare, KeyRound, ArrowLeft, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRedeemAccessKey } from '@workspace/api-client-react';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

const redeemSchema = z.object({
  key: z.string().min(1, 'Access key is required'),
});
type RedeemFormValues = z.infer<typeof redeemSchema>;

const DISCORD_INVITE = 'https://discord.gg/4wEKPrgZmD';

function getErrorMessage(code: string | null): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    no_ticket: 'No hosting access found for your Discord account. Contact staff to get a key.',
    discord_denied: 'Discord authorization was cancelled.',
    oauth_failed: 'Discord authentication failed. Please try again.',
    no_access: 'No hosting access found for your Discord account. Contact staff to get a key.',
    key_expired: 'Your hosting access has expired. Contact staff to renew.',
  };
  return map[code] ?? null;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const urlError = params.get('error');

  const [mode, setMode] = useState<'discord' | 'key'>('discord');
  const [discordLoading, setDiscordLoading] = useState(false);
  const [discordError, setDiscordError] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  const form = useForm<RedeemFormValues>({
    resolver: zodResolver(redeemSchema),
    defaultValues: { key: '' },
  });

  const redeemMutation = useRedeemAccessKey();

  const handleDiscordLogin = async () => {
    setDiscordLoading(true);
    setDiscordError(null);
    try {
      const redirectUri = window.location.origin + (import.meta.env.BASE_URL?.replace(/\/$/, '') || '') + '/auth/discord/callback';
      const res = await fetch(`${BASE}/api/auth/discord/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || 'Discord OAuth not configured');
      }
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch (err: any) {
      setDiscordLoading(false);
      setDiscordError(err?.message || 'Discord login failed. Please try again or use an access key.');
    }
  };

  const onKeySubmit = (data: RedeemFormValues) => {
    setKeyError(null);
    redeemMutation.mutate(
      { data: { key: data.key } },
      {
        onSuccess: () => setLocation('/dashboard'),
        onError: (err: any) => {
          setKeyError(err?.data?.error || err?.error || 'Invalid or expired access key.');
        },
      }
    );
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center p-4 overflow-hidden bg-[#080810] animate-page-in">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)' }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Back to home */}
      <button
        onClick={() => setLocation('/')}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-xs font-mono text-white/30 hover:text-white/60 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <div className="relative w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-5">
            <img src="/lumora-brand.png" alt="Lumora" className="h-24 w-24 object-contain drop-shadow-[0_0_20px_rgba(99,102,241,0.25)]" />
          </div>
          <h1 className="text-3xl font-mono font-bold tracking-[0.15em] text-white" style={{ textShadow: '0 0 30px rgba(99,102,241,0.3)' }}>
            LUMORA
          </h1>
          <p className="text-xs font-mono tracking-[0.25em] text-white/30">HOSTING PORTAL</p>
        </div>

        {/* Error from OAuth redirect */}
        {urlError && getErrorMessage(urlError) && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/[0.07]">
            <AlertTriangle className="h-4 w-4 text-red-400/70 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300/70 font-mono">{getErrorMessage(urlError)}</p>
          </div>
        )}

        {/* Card */}
        <div
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-6 space-y-4"
          style={{ boxShadow: '0 0 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset' }}
        >
          {mode === 'discord' ? (
            <div className="space-y-5">
              <div className="text-center space-y-1.5 pb-1">
                <h2 className="text-sm font-semibold text-white/80">Sign in to your portal</h2>
                <p className="text-xs text-white/35">Use your Discord account to access your hosted bot.</p>
              </div>

              <button
                onClick={handleDiscordLogin}
                disabled={discordLoading}
                className="w-full flex items-center justify-center gap-3 h-14 rounded-xl text-base font-semibold bg-[#5865F2] hover:bg-[#6672f5] text-white transition-all duration-200 shadow-lg shadow-[#5865F2]/20 hover:shadow-[#5865F2]/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                {discordLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4.5 w-4.5" />
                )}
                {discordLoading ? 'Redirecting to Discord…' : 'Continue with Discord'}
              </button>

              {discordError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-red-500/20 bg-red-500/[0.06]">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400/70 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-mono text-red-300/70 leading-relaxed">{discordError}</p>
                </div>
              )}

              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-white/25 font-mono">OR</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              <button
                onClick={() => setMode('key')}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-mono text-white/35 border border-white/[0.07] hover:border-white/[0.12] hover:text-white/60 transition-all duration-200"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Enter access key manually
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1">
                <button
                  onClick={() => { setMode('discord'); setKeyError(null); }}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-sm font-semibold text-white/80">Enter access key</h2>
                  <p className="text-xs text-white/30">Staff-issued keys only.</p>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onKeySubmit)} className="space-y-3">
                  <FormField
                    control={form.control}
                    name="key"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                            <input
                              {...field}
                              placeholder="XXXX-XXXX-XXXX-XXXX"
                              className="w-full pl-10 pr-4 h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] font-mono text-sm tracking-widest text-center text-white/80 uppercase placeholder:text-white/18 placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:border-[#6366f1]/40 focus:ring-1 focus:ring-[#6366f1]/20 transition-all duration-200"
                              autoComplete="off"
                              spellCheck={false}
                              data-testid="input-access-key"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {keyError && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-red-500/20 bg-red-500/[0.06]">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400/70 shrink-0" />
                      <p className="text-[11px] font-mono text-red-300/70">{keyError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={redeemMutation.isPending}
                    className="w-full h-12 rounded-xl text-sm font-semibold font-mono tracking-[0.15em] bg-[#6366f1] hover:bg-[#7577f3] text-white transition-all duration-200 shadow-lg shadow-[#6366f1]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={!redeemMutation.isPending ? { boxShadow: '0 0 20px rgba(99,102,241,0.25)' } : {}}
                    data-testid="button-activate-key"
                  >
                    {redeemMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> VERIFYING…</span>
                    ) : 'ACTIVATE KEY'}
                  </button>
                </form>
              </Form>
            </div>
          )}
        </div>

        {/* Footer link */}
        <div className="text-center">
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-white/25 hover:text-[#5865F2] transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Join our Discord for support
          </a>
        </div>
      </div>
    </div>
  );
}
