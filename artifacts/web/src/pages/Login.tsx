import { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { MessageSquare, KeyRound, ArrowLeft, Loader2, AlertTriangle, ExternalLink, Shield } from 'lucide-react';
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

function getErrorMessage(code: string | null): { text: string; isAdmin?: boolean } | null {
  if (!code) return null;
  const map: Record<string, { text: string; isAdmin?: boolean }> = {
    no_ticket: { text: 'Your Discord account isn\'t linked to any hosting plan. If you\'re the platform admin, issue yourself a key from the admin panel first.', isAdmin: true },
    discord_denied: { text: 'Discord authorization was cancelled.' },
    oauth_failed: { text: 'Discord authentication failed. Please try again.' },
    no_access: { text: 'Your Discord account isn\'t linked to any hosting plan. Contact staff to get a key.' },
    key_expired: { text: 'Your hosting access has expired. Contact staff to renew.' },
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
      const origin = window.location.origin.replace(/^http:\/\//, 'https://');
      const redirectUri = origin + (import.meta.env.BASE_URL?.replace(/\/$/, '') || '') + '/auth/discord/callback';
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
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage: `linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)`,
            backgroundSize: '56px 56px',
          }}
        />
        {/* Central glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)' }}
        />
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-64 h-64 opacity-[0.03]"
          style={{ background: 'radial-gradient(ellipse at top left, #6366f1, transparent 60%)' }}
        />
        <div className="absolute bottom-0 right-0 w-64 h-64 opacity-[0.03]"
          style={{ background: 'radial-gradient(ellipse at bottom right, #a78bfa, transparent 60%)' }}
        />
      </div>

      {/* Back to home */}
      <button
        onClick={() => setLocation('/')}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-[11px] font-mono text-white/25 hover:text-white/55 transition-colors duration-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to home
      </button>

      <div className="relative w-full max-w-sm space-y-6">
        {/* Logo block */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <img
                src="/lumora-brand.png"
                alt="Lumora"
                className="h-20 w-20 object-contain"
                style={{ filter: 'drop-shadow(0 0 24px rgba(99,102,241,0.35))' }}
              />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-[0.18em] text-white font-mono">
            LUMORA
          </h1>
          <p className="text-[10px] font-mono tracking-[0.3em] text-white/28">HOSTING PORTAL</p>
        </div>

        {/* Error from OAuth redirect */}
        {urlError && getErrorMessage(urlError) && (() => {
          const err = getErrorMessage(urlError)!;
          return (
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-red-500/20 bg-red-500/[0.07]">
              <AlertTriangle className="h-4 w-4 text-red-400/70 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-xs text-red-300/70 font-mono leading-relaxed">{err.text}</p>
                {err.isAdmin && (
                  <a
                    href="/admin"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6366f1]/70 hover:text-[#6366f1] transition-colors underline underline-offset-2"
                  >
                    Go to Admin Panel →
                  </a>
                )}
              </div>
            </div>
          );
        })()}

        {/* Main card */}
        <div
          className="rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-xl p-6 space-y-4 relative overflow-hidden"
          style={{ boxShadow: '0 0 0 1px rgba(99,102,241,0.06) inset, 0 32px 64px rgba(0,0,0,0.6)' }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)' }}
          />

          {mode === 'discord' ? (
            <div className="space-y-5">
              <div className="text-center space-y-1 pb-1">
                <h2 className="text-sm font-bold text-white/85 tracking-wide">Sign in to your portal</h2>
                <p className="text-[12px] text-white/35">Use your Discord account to access your hosted bot.</p>
              </div>

              <button
                onClick={handleDiscordLogin}
                disabled={discordLoading}
                className="w-full flex items-center justify-center gap-3 h-14 rounded-xl text-base font-bold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                style={{
                  background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
                  boxShadow: '0 4px 20px rgba(88,101,242,0.35)',
                }}
              >
                {discordLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <MessageSquare className="h-5 w-5" />
                )}
                {discordLoading ? 'Redirecting to Discord…' : 'Continue with Discord'}
              </button>

              {discordError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.06]">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400/70 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-mono text-red-300/70 leading-relaxed">{discordError}</p>
                </div>
              )}

              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-white/22 font-mono tracking-widest">OR</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              <button
                onClick={() => setMode('key')}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-mono text-white/35 border border-white/[0.07] hover:border-white/[0.14] hover:text-white/60 hover:bg-white/[0.02] transition-all duration-200"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Enter access key manually
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-1">
                <button
                  onClick={() => { setMode('discord'); setKeyError(null); }}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-sm font-bold text-white/85">Enter access key</h2>
                  <p className="text-[11px] text-white/30 font-mono">Staff-issued keys only.</p>
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
                              className="w-full pl-10 pr-4 h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] font-mono text-sm tracking-widest text-center text-white/80 uppercase placeholder:text-white/18 placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:border-[#6366f1]/40 focus:ring-1 focus:ring-[#6366f1]/15 transition-all duration-200"
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
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.06]">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400/70 shrink-0" />
                      <p className="text-[11px] font-mono text-red-300/70">{keyError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={redeemMutation.isPending}
                    className="w-full h-12 rounded-xl text-sm font-bold font-mono tracking-[0.12em] text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                      boxShadow: redeemMutation.isPending ? 'none' : '0 4px 16px rgba(99,102,241,0.30)',
                    }}
                    data-testid="button-activate-key"
                  >
                    {redeemMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> VERIFYING…
                      </span>
                    ) : 'ACTIVATE KEY'}
                  </button>
                </form>
              </Form>
            </div>
          )}
        </div>

        {/* Security note */}
        <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-white/18">
          <Shield className="h-3 w-3" />
          <span>Secured with Discord OAuth 2.0</span>
        </div>

        {/* Footer links */}
        <div className="flex flex-col items-center gap-2.5">
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-white/25 hover:text-[#5865F2] transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Join our Discord for support
          </a>
          <a
            href="/admin"
            className="inline-flex items-center gap-1.5 text-[10px] font-mono text-white/15 hover:text-white/40 transition-colors"
          >
            <KeyRound className="h-3 w-3" />
            Admin Panel
          </a>
        </div>
      </div>
    </div>
  );
}
