import { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Loader2, AlertTriangle, ArrowLeft, KeyRound, MessageSquare } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRedeemAccessKey } from '@workspace/api-client-react';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

const redeemSchema = z.object({ key: z.string().min(1, 'Access key is required') });
type RedeemFormValues = z.infer<typeof redeemSchema>;

function getErrorMsg(code: string | null): { text: string; admin?: boolean } | null {
  if (!code) return null;
  const map: Record<string, { text: string; admin?: boolean }> = {
    no_ticket:      { text: 'Your Discord account isn\'t linked to any hosting plan. Ask the admin to issue you a key first.', admin: true },
    discord_denied: { text: 'Discord authorization was cancelled.' },
    oauth_failed:   { text: 'Discord sign-in failed. Please try again.' },
    no_access:      { text: 'Your Discord account isn\'t linked to any hosting plan. Contact staff.' },
    key_expired:    { text: 'Your hosting access has expired. Contact staff to renew.' },
  };
  return map[code] ?? { text: 'Something went wrong. Please try again.' };
}

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const urlError = new URLSearchParams(search).get('error');

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
      const redirectUri = origin + BASE + '/auth/discord/callback';
      const res = await fetch(`${BASE}/api/auth/discord/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error || 'Discord OAuth not configured');
      }
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch (err: any) {
      setDiscordLoading(false);
      setDiscordError(err?.message || 'Discord login failed. Try again or use an access key.');
    }
  };

  const onKeySubmit = (data: RedeemFormValues) => {
    setKeyError(null);
    redeemMutation.mutate(
      { data: { key: data.key } },
      {
        onSuccess: () => setLocation('/dashboard'),
        onError: (err: any) => setKeyError(err?.data?.error || err?.error || 'Invalid or expired access key.'),
      }
    );
  };

  const errorInfo = getErrorMsg(urlError);

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#09090f' }}>
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.15]"
          style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.5) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, #7c3aed 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Back link */}
      <button onClick={() => setLocation('/')}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      <div className="relative w-full max-w-[380px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 8px 32px rgba(124,58,237,0.35)' }}>
            <img src="/lumora-brand.png" alt="" className="h-7 w-7 object-contain brightness-200" />
          </div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Sign in to Lumora</h1>
          <p className="text-[13px] text-white/38 mt-1">
            {mode === 'discord' ? 'Use your Discord account to access your bot dashboard.' : 'Enter your staff-issued access key.'}
          </p>
        </div>

        {/* OAuth error banner */}
        {errorInfo && (
          <div className="mb-4 flex items-start gap-3 p-3.5 rounded-xl border border-red-500/20 bg-red-500/[0.06]">
            <AlertTriangle className="h-4 w-4 text-red-400/70 shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] text-red-300/75 leading-relaxed">{errorInfo.text}</p>
              {errorInfo.admin && (
                <a href="/admin" className="inline-block mt-1.5 text-[11px] text-violet-400/70 hover:text-violet-400 underline underline-offset-2 transition-colors">
                  Go to Admin Panel →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] p-6 relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.025)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)' }} />

          {mode === 'discord' ? (
            <div className="space-y-4">
              {/* Discord button */}
              <button onClick={handleDiscordLogin} disabled={discordLoading}
                className="w-full h-12 flex items-center justify-center gap-3 rounded-xl text-[14px] font-semibold text-white transition-all hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                style={{ background: 'linear-gradient(135deg, #5865F2, #4752C4)', boxShadow: '0 4px 16px rgba(88,101,242,0.35)' }}>
                {discordLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.01.043.027.057a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                )}
                {discordLoading ? 'Redirecting…' : 'Continue with Discord'}
              </button>

              {discordError && (
                <div className="flex items-start gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.06]">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400/70 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-300/70 leading-relaxed">{discordError}</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[11px] text-white/22">or</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              <button onClick={() => setMode('key')}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-xl text-[13px] text-white/38 border border-white/[0.07] hover:border-white/[0.14] hover:text-white/60 hover:bg-white/[0.02] transition-all">
                <KeyRound className="h-3.5 w-3.5" />
                Use an access key
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button onClick={() => { setMode('discord'); setKeyError(null); }}
                className="flex items-center gap-1.5 text-[12px] text-white/32 hover:text-white/60 transition-colors mb-2">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Discord sign-in
              </button>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onKeySubmit)} className="space-y-3">
                  <FormField control={form.control} name="key" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                          <input {...field}
                            placeholder="XXXX-XXXX-XXXX-XXXX"
                            className="w-full pl-10 pr-4 h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] font-mono text-[13px] tracking-widest text-center text-white/80 uppercase placeholder:text-white/18 placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/15 transition-all"
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {keyError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.06]">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400/70 shrink-0" />
                      <p className="text-[11px] text-red-300/70">{keyError}</p>
                    </div>
                  )}

                  <button type="submit" disabled={redeemMutation.isPending}
                    className="w-full h-12 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
                    {redeemMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                      </span>
                    ) : 'Activate key'}
                  </button>
                </form>
              </Form>
            </div>
          )}
        </div>

        {/* Footer links */}
        <div className="mt-5 flex items-center justify-center gap-4">
          <a href="/admin" className="text-[11px] text-white/20 hover:text-white/45 transition-colors">Admin panel</a>
          <span className="text-white/12">·</span>
          <a href="https://discord.gg/4wEKPrgZmD" target="_blank" rel="noreferrer"
            className="text-[11px] text-white/20 hover:text-white/45 transition-colors">
            Get support
          </a>
        </div>
      </div>
    </div>
  );
}
