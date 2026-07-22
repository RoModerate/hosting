import { useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import { ArrowRight, BookOpen, CreditCard, Zap, RotateCw, Shield, Activity, Code2, Bot, ExternalLink } from 'lucide-react';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

interface SessionData {
  ticketId?: number;
  discord?: { id: string; username: string; globalName?: string | null; avatar?: string | null } | null;
  ownerUsername?: string;
}

const FEATURES = [
  {
    icon: Zap,
    title: 'Deploy in 60 Seconds',
    desc: 'Upload a ZIP, pick a runtime, and your bot is live. No server config, no SSH, no guesswork.',
  },
  {
    icon: RotateCw,
    title: 'Always-On Restarts',
    desc: 'Automatic restarts with exponential backoff keep your bot online even after unexpected crashes.',
  },
  {
    icon: Bot,
    title: 'AI Crash Repair',
    desc: 'When your bot crashes, our AI diagnoses and patches the code automatically — up to 3 attempts.',
  },
  {
    icon: Shield,
    title: 'Secure Sandboxing',
    desc: 'Every bot runs in an isolated process. Environment variables are encrypted at rest.',
  },
  {
    icon: Activity,
    title: 'Live Console Logs',
    desc: 'Stream and filter your bot\'s stdout in the browser in real time. No SSH required.',
  },
  {
    icon: Code2,
    title: 'In-Browser File Editor',
    desc: 'Edit your bot\'s source files directly in the portal with syntax highlighting via CodeMirror.',
  },
];

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.01.043.027.057a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  );
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/session/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => { if (d?.ticketId) setSession(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const avatarUrl = session?.discord?.avatar && session.discord.id
    ? `https://cdn.discordapp.com/avatars/${session.discord.id}/${session.discord.avatar}.webp?size=64`
    : null;

  const displayName = session?.discord?.globalName || session?.discord?.username || session?.ownerUsername;

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{
      background: '#13131f',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#e8e8f0',
    }}>
      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Purple glow — top left */}
      <div className="absolute pointer-events-none" style={{
        top: '-120px',
        left: '-120px',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, rgba(99,102,241,0.08) 40%, transparent 70%)',
        borderRadius: '50%',
      }} />

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center h-14 px-6 md:px-10"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Logo */}
        <button onClick={() => setLocation('/')} className="flex items-center gap-2.5 shrink-0 mr-8">
          <img src="/lumora-brand.png" alt="Lumora" className="h-6 w-6 object-contain"
            style={{ filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.5))' }} />
          <span className="font-bold text-[15px]" style={{ color: '#f0f0fa' }}>Lumora</span>
        </button>

        {/* Links */}
        <div className="hidden sm:flex items-center gap-1">
          <button onClick={() => setLocation('/pricing')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent'; }}>
            <CreditCard className="h-3.5 w-3.5" /> Pricing
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent'; }}>
            <BookOpen className="h-3.5 w-3.5" /> Docs
          </button>
        </div>

        {/* Right side auth */}
        <div className="ml-auto flex items-center gap-2.5">
          {!loading && (
            session ? (
              <>
                {/* Avatar */}
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                    style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(124,58,237,0.3)' }}>
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      : <span className="text-[11px] font-bold" style={{ color: '#a78bfa' }}>{(displayName || '?')[0].toUpperCase()}</span>}
                  </div>
                  <span className="hidden sm:block text-[13px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {displayName}
                  </span>
                </div>
                <button onClick={() => setLocation('/dashboard')}
                  className="h-8 px-4 rounded-lg text-[13px] font-medium text-white transition-all hover:opacity-90"
                  style={{ background: '#7c3aed', boxShadow: '0 2px 12px rgba(124,58,237,0.3)' }}>
                  Dashboard
                </button>
              </>
            ) : (
              <button onClick={() => setLocation('/login')}
                className="h-8 px-4 rounded-lg text-[13px] font-medium transition-all"
                style={{ color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}>
                Log In
              </button>
            )
          )}
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-24 pb-20">

        {/* Live badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-10 text-[12.5px] font-medium"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.65)',
          }}>
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{
            background: '#22c55e',
            boxShadow: '0 0 6px #22c55e',
          }} />
          Always-on Discord bot hosting — Live
        </div>

        {/* Icon */}
        <div className="mb-8">
          <img
            src="/lumora-brand.png"
            alt="Lumora"
            className="h-[90px] w-[90px] object-contain mx-auto"
            style={{ filter: 'drop-shadow(0 0 32px rgba(124,58,237,0.5)) drop-shadow(0 0 12px rgba(124,58,237,0.3))' }}
          />
        </div>

        {/* Headline */}
        <h1 className="font-black tracking-tight leading-[1.06] mb-5"
          style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', color: '#f4f4ff', letterSpacing: '-0.03em' }}>
          Welcome to Lumora
        </h1>

        {/* Sub */}
        <p className="max-w-lg mx-auto mb-10 leading-relaxed"
          style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.5)' }}>
          Keep your Discord bot online 24/7. Upload your code, paste your token, and you're live in under a minute.
        </p>

        {/* CTAs */}
        {session ? (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button onClick={() => setLocation('/dashboard')}
              className="flex items-center gap-2 px-7 py-3 rounded-xl text-[14.5px] font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-px"
              style={{ background: '#7c3aed', boxShadow: '0 4px 24px rgba(124,58,237,0.4)' }}>
              Open the Dashboard <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => setLocation('/pricing')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium transition-all hover:-translate-y-px"
              style={{ color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
              View Plans
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button onClick={() => setLocation('/login')}
              className="flex items-center gap-2 px-7 py-3 rounded-xl text-[14.5px] font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-px"
              style={{ background: '#7c3aed', boxShadow: '0 4px 24px rgba(124,58,237,0.4)' }}>
              <DiscordIcon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              Sign in with Discord
            </button>
            <button onClick={() => setLocation('/pricing')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium transition-all hover:-translate-y-px"
              style={{ color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
              View Plans <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Logged-in quick access panel */}
        {session && (
          <div className="mt-12 w-full max-w-xl rounded-2xl p-5 text-left"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-4 w-4" style={{ color: '#a78bfa' }} />
              <span className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Quick Access</span>
            </div>
            <p className="text-[12.5px] mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Jump directly to your hosting portal.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Hosting Portal', icon: Bot, path: '/dashboard' },
                { label: 'Console Logs', icon: Activity, path: '/dashboard' },
                { label: 'File Manager', icon: Code2, path: '/dashboard' },
              ].map(({ label, icon: Icon, path }) => (
                <button key={label} onClick={() => setLocation(path)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] transition-all hover:-translate-y-px"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.35)'; e.currentTarget.style.background = 'rgba(124,58,237,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-10 pb-24 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-[1.75rem] font-bold tracking-tight mb-3" style={{ color: '#a78bfa' }}>
            Powerful Features
          </h2>
          <p className="text-[14.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Everything you need to run Discord bots reliably at scale.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title}
              className="rounded-xl p-5 transition-all duration-200 group"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(124,58,237,0.07)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.25)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
              }}>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <Icon className="h-4 w-4" style={{ color: '#a78bfa' }} />
              </div>
              <h3 className="font-semibold text-[14px] mb-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>{title}</h3>
              <p className="text-[12.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-10 pb-24 max-w-3xl mx-auto">
        <div className="rounded-2xl p-8 text-center"
          style={{
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.2)',
            boxShadow: '0 0 60px rgba(124,58,237,0.06)',
          }}>
          <h3 className="text-[1.4rem] font-bold mb-2" style={{ color: '#f4f4ff' }}>Start hosting today</h3>
          <p className="text-[13.5px] mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
            One bot, 256 MB RAM, live console, AI crash repair — no credit card needed.
          </p>
          <button onClick={() => setLocation(session ? '/dashboard' : '/login')}
            className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-px"
            style={{ background: '#7c3aed', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
            {session ? 'Go to Dashboard' : 'Get started free'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 px-6 md:px-10 pb-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/lumora-brand.png" alt="" className="h-4 w-4 object-contain opacity-40" />
            <span className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Lumora Hosting</span>
          </div>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.18)' }}>© 2025 Lumora. All rights reserved.</p>
          <div className="flex items-center gap-5">
            {[
              { label: 'Pricing', path: '/pricing' },
              { label: 'Admin', path: '/admin' },
            ].map(({ label, path }) => (
              <button key={label} onClick={() => setLocation(path)}
                className="text-[12px] transition-colors"
                style={{ color: 'rgba(255,255,255,0.25)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
