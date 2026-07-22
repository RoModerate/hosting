import { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Loader2, AlertTriangle, ArrowLeft, KeyRound, ChevronRight } from 'lucide-react';
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
    no_ticket:      { text: 'Your Discord account isn\'t linked to any hosting plan. Ask the admin to issue you a key.', admin: true },
    discord_denied: { text: 'Discord authorization was cancelled.' },
    oauth_failed:   { text: 'Discord sign-in failed. Please try again.' },
    no_access:      { text: 'Your Discord account isn\'t linked to any hosting plan. Contact staff.' },
    key_expired:    { text: 'Your hosting access has expired. Contact staff to renew.' },
  };
  return map[code] ?? { text: 'Something went wrong. Please try again.' };
}

// Discord SVG icon
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.01.043.027.057a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  );
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
    <div className="min-h-screen flex" style={{ background: '#f6f6f7', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-[420px] shrink-0 flex-col bg-white border-r border-gray-200 px-12 py-14">
        {/* Logo */}
        <button onClick={() => setLocation('/')} className="flex items-center gap-3 group mb-16">
          <div className="h-9 w-9 rounded-[10px] overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform" style={{ background: '#0c0c14' }}>
            <img src="/lumora-brand.png" alt="Lumora" className="h-8 w-8 object-contain" />
          </div>
          <span className="font-bold text-[18px] text-gray-900 tracking-tight">Lumora</span>
        </button>

        <div className="flex-1">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-3 leading-tight">
            Host your bot.<br />Stay online 24/7.
          </h2>
          <p className="text-[15px] text-gray-500 leading-relaxed mb-10">
            Deploy any Discord bot in under 60 seconds. Automatic restarts, live logs, and AI crash repair — all included.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {[
              { icon: '⚡', label: 'Deploy in 60 seconds', sub: 'ZIP upload or GitHub import' },
              { icon: '🔁', label: 'Always-on restarts', sub: 'Auto-restart with backoff' },
              { icon: '🤖', label: 'AI crash repair', sub: 'Automatic code patching' },
              { icon: '📡', label: 'Live console logs', sub: 'Real-time stdout in browser' },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="text-lg leading-none mt-0.5">{icon}</span>
                <div>
                  <p className="text-[13.5px] font-semibold text-gray-700">{label}</p>
                  <p className="text-[12px] text-gray-400">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[12px] text-gray-300 mt-12">© 2025 Lumora Hosting</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-5 h-14 flex items-center justify-between">
          <button onClick={() => setLocation('/')} className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-[7px] overflow-hidden flex items-center justify-center shrink-0" style={{ background: '#0c0c14' }}>
              <img src="/lumora-brand.png" alt="Lumora" className="h-5 w-5 object-contain" />
            </div>
            <span className="font-bold text-[15px] text-gray-900">Lumora</span>
          </button>
          <button onClick={() => setLocation('/')} className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[400px]">

            {/* Mobile logo (only visible on mobile) */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: '#0c0c14' }}>
                <img src="/lumora-brand.png" alt="Lumora" className="h-10 w-10 object-contain" />
              </div>
            </div>

            <div className="mb-8">
              <h1 className="text-[26px] font-black text-gray-900 tracking-tight mb-1.5">
                {mode === 'discord' ? 'Sign in' : 'Access key'}
              </h1>
              <p className="text-[14px] text-gray-500">
                {mode === 'discord' ? 'Connect your Discord account to access your dashboard.' : 'Enter the key issued by your hosting admin.'}
              </p>
            </div>

            {/* URL error banner */}
            {errorInfo && (
              <div className="mb-5 flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] text-red-700 leading-relaxed">{errorInfo.text}</p>
                  {errorInfo.admin && (
                    <a href="/admin" className="inline-block mt-1.5 text-[12px] text-violet-600 hover:text-violet-800 underline underline-offset-2">
                      Go to Admin Panel →
                    </a>
                  )}
                </div>
              </div>
            )}

            {mode === 'discord' ? (
              <div className="space-y-3">
                {/* Big Discord CTA */}
                <button onClick={handleDiscordLogin} disabled={discordLoading}
                  className="group w-full h-[52px] flex items-center justify-between gap-3 rounded-2xl text-[15px] font-semibold text-white transition-all hover:opacity-95 hover:-translate-y-px hover:shadow-lg disabled:opacity-60 disabled:translate-y-0 disabled:cursor-not-allowed px-5"
                  style={{ background: '#5865F2', boxShadow: '0 2px 16px rgba(88,101,242,0.35)' }}>
                  <span className="flex items-center gap-3">
                    {discordLoading
                      ? <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                      : <DiscordIcon className="h-5 w-5 shrink-0" />
                    }
                    {discordLoading ? 'Redirecting to Discord…' : 'Continue with Discord'}
                  </span>
                  {!discordLoading && <ChevronRight className="h-4 w-4 opacity-60 group-hover:translate-x-0.5 transition-transform" />}
                </button>

                {discordError && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-red-200 bg-red-50">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[12.5px] text-red-700 leading-relaxed">{discordError}</p>
                  </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[11px] text-gray-400 font-medium">OR</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Access key option */}
                <button onClick={() => setMode('key')}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-[13.5px] font-medium text-gray-600 border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition-all">
                  <KeyRound className="h-3.5 w-3.5 text-gray-400" />
                  Use an access key
                </button>

                {/* Info note */}
                <p className="text-[11px] text-gray-400 text-center leading-relaxed pt-1">
                  Discord OAuth must be configured by your admin.<br />
                  No account? Contact staff to get an access key.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <button onClick={() => { setMode('discord'); setKeyError(null); }}
                  className="flex items-center gap-1.5 text-[12.5px] text-gray-500 hover:text-gray-800 transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Discord sign-in
                </button>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onKeySubmit)} className="space-y-3">
                    <FormField control={form.control} name="key" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input {...field}
                              placeholder="XXXX-XXXX-XXXX-XXXX"
                              className="w-full pl-11 pr-4 h-[52px] rounded-2xl border border-gray-200 bg-white font-mono text-[14px] tracking-widest text-center text-gray-800 uppercase placeholder:text-gray-300 placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all shadow-sm"
                              autoComplete="off" spellCheck={false} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {keyError && (
                      <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-red-200 bg-red-50">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <p className="text-[12.5px] text-red-700">{keyError}</p>
                      </div>
                    )}
                    <button type="submit" disabled={redeemMutation.isPending}
                      className="w-full h-[52px] rounded-2xl text-[14px] font-semibold text-white transition-all disabled:opacity-60 hover:opacity-90 hover:-translate-y-px hover:shadow-md"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 2px 14px rgba(124,58,237,0.3)' }}>
                      {redeemMutation.isPending
                        ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</span>
                        : 'Activate key'}
                    </button>
                  </form>
                </Form>
              </div>
            )}

            {/* Footer links */}
            <div className="mt-8 flex items-center justify-center gap-5 pt-5 border-t border-gray-200">
              <a href="/admin" className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors">Admin panel</a>
              <span className="h-3 w-px bg-gray-200" />
              <a href="https://discord.gg/4wEKPrgZmD" target="_blank" rel="noreferrer"
                className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors">Get support</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
