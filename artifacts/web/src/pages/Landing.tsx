import { useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import { ArrowRight, CreditCard, Zap, RotateCw, Shield, Activity, Code2, Bot, Terminal, Lock } from 'lucide-react';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

interface SessionData {
  ticketId?: number;
  discord?: { id: string; username: string; globalName?: string | null; avatar?: string | null } | null;
  ownerUsername?: string;
}

const FEATURES = [
  { icon: Zap,      title: 'Deploy in 60 Seconds',   desc: 'Upload a ZIP, pick a runtime, and your bot is live. No server config, no SSH, no guesswork.' },
  { icon: RotateCw, title: 'Always-On Restarts',      desc: 'Automatic restarts with exponential backoff keep your bot online even after unexpected crashes.' },
  { icon: Bot,      title: 'AI Crash Repair',         desc: 'When your bot crashes, our AI diagnoses and patches the code automatically — up to 3 attempts per restart.' },
  { icon: Shield,   title: 'Secure Sandboxing',       desc: 'Every bot runs in an isolated process. Environment variables are encrypted at rest.' },
  { icon: Activity, title: 'Live Console Logs',       desc: "Stream and filter your bot's stdout in the browser in real time. No SSH required." },
  { icon: Code2,    title: 'In-Browser File Editor',  desc: 'Edit your bot\'s source files directly in the portal with syntax highlighting via CodeMirror.' },
];

const STEPS = [
  { num: '01', title: 'Sign in with Discord', desc: 'Authenticate with your Discord account to access your hosting portal.' },
  { num: '02', title: 'Upload your bot', desc: 'Drag and drop a ZIP file of your bot code. Node.js and Python are detected automatically.' },
  { num: '03', title: 'Configure secrets', desc: 'Add your bot token and any environment variables securely via the built-in env manager.' },
  { num: '04', title: 'Go live', desc: 'Hit Run. Your bot starts, stays online, and auto-recovers from crashes — no babysitting required.' },
];

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

  // Token-style colors
  const BG     = '#0d0d16';
  const BORDER = 'rgba(255,255,255,0.07)';
  const TEXT1  = 'rgba(255,255,255,0.92)';
  const TEXT2  = 'rgba(255,255,255,0.42)';
  const PURPLE = '#7c3aed';

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{
      background: BG,
      fontFamily: "'Inter', system-ui, sans-serif",
      color: TEXT1,
    }}>
      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none select-none" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />
      {/* Top-center glow — static, no animation */}
      <div className="absolute pointer-events-none" style={{
        top: '-80px', left: '50%', transform: 'translateX(-50%)',
        width: '700px', height: '400px',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.14) 0%, rgba(99,102,241,0.05) 45%, transparent 70%)',
      }} />

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center h-14 px-6 md:px-12"
        style={{ borderBottom: `1px solid ${BORDER}` }}>
        <button onClick={() => setLocation('/')} className="flex items-center gap-2.5 shrink-0 mr-10">
          <img src="/lumora-brand.png" alt="Lumora" className="h-6 w-6 object-contain"
            style={{ filter: 'drop-shadow(0 0 6px rgba(124,58,237,0.35))' }} />
          <span className="font-semibold text-[15px] tracking-tight" style={{ color: TEXT1 }}>Lumora</span>
        </button>

        <div className="hidden sm:flex items-center gap-0.5">
          <button onClick={() => setLocation('/pricing')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] transition-all"
            style={{ color: TEXT2 }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = TEXT2; e.currentTarget.style.background = 'transparent'; }}>
            <CreditCard className="h-3.5 w-3.5" /> Pricing
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {!loading && (
            session ? (
              <>
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                    style={{ border: `1px solid rgba(255,255,255,0.1)`, background: 'rgba(124,58,237,0.2)' }}>
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      : <span className="text-[11px] font-bold" style={{ color: '#a78bfa' }}>{(displayName || '?')[0].toUpperCase()}</span>}
                  </div>
                  <span className="hidden sm:block text-[13px]" style={{ color: TEXT2 }}>{displayName}</span>
                </div>
                <button onClick={() => setLocation('/dashboard')}
                  className="h-8 px-4 rounded-lg text-[13px] font-medium transition-all"
                  style={{ background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.32)', color: '#c4b5fd' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.26)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.18)'; }}>
                  Dashboard
                </button>
              </>
            ) : (
              <button onClick={() => setLocation('/login')}
                className="h-8 px-4 rounded-lg text-[13px] font-medium transition-all"
                style={{ color: TEXT2 }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = TEXT2; }}>
                Log In
              </button>
            )
          )}
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-24 pb-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 mb-8 px-3 py-1 rounded-full text-[11.5px] font-medium"
          style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.22)', color: 'rgba(167,139,250,0.85)' }}>
          <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: '#a78bfa' }} />
          Discord bot hosting, simplified
        </div>

        {/* Headline */}
        <h1 className="font-black tracking-tight leading-[1.05] mb-5 max-w-3xl"
          style={{ fontSize: 'clamp(2.6rem, 6.5vw, 4.2rem)', color: '#f0efff', letterSpacing: '-0.035em' }}>
          Keep your Discord bot<br />
          <span style={{ color: '#a78bfa' }}>online 24/7.</span>
        </h1>

        <p className="max-w-md mx-auto mb-10 leading-relaxed"
          style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.4)' }}>
          Upload your code, paste your token, and you're live in under a minute.
          Auto-restarts, live logs, and AI crash repair — all included.
        </p>

        {/* CTAs */}
        {session ? (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button onClick={() => setLocation('/dashboard')}
              className="flex items-center gap-2 px-7 py-3 rounded-xl text-[14px] font-semibold transition-all hover:-translate-y-px active:translate-y-0"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
                color: '#fff',
              }}>
              Open Dashboard <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => setLocation('/pricing')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium transition-all hover:-translate-y-px"
              style={{ color: 'rgba(255,255,255,0.55)', border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = BORDER; }}>
              View Plans
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button onClick={() => setLocation('/login')}
              className="flex items-center gap-2 px-7 py-3 rounded-xl text-[14px] font-semibold transition-all hover:-translate-y-px active:translate-y-0"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
                color: '#fff',
              }}>
              Sign in with Discord <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => setLocation('/pricing')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium transition-all hover:-translate-y-px"
              style={{ color: 'rgba(255,255,255,0.55)', border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = BORDER; }}>
              View Plans
            </button>
          </div>
        )}
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-12 pb-24 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'rgba(124,58,237,0.7)' }}>
            <span className="h-px w-5 inline-block" style={{ background: 'rgba(124,58,237,0.5)' }} />
            What's included
            <span className="h-px w-5 inline-block" style={{ background: 'rgba(124,58,237,0.5)' }} />
          </p>
          <h2 className="text-[1.65rem] font-bold tracking-tight" style={{ color: TEXT1, letterSpacing: '-0.025em' }}>
            Everything your bot needs to thrive
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title}
              className="rounded-xl p-5 transition-all duration-200 group cursor-default"
              style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${BORDER}` }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(124,58,237,0.05)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.18)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.025)';
                (e.currentTarget as HTMLDivElement).style.borderColor = BORDER;
              }}>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-4"
                style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.16)' }}>
                <Icon className="h-4 w-4" style={{ color: '#a78bfa' }} />
              </div>
              <h3 className="font-semibold text-[13.5px] mb-1.5" style={{ color: 'rgba(255,255,255,0.82)' }}>{title}</h3>
              <p className="text-[12.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.32)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-12 pb-28 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'rgba(124,58,237,0.7)' }}>
            <span className="h-px w-5 inline-block" style={{ background: 'rgba(124,58,237,0.5)' }} />
            Getting started
            <span className="h-px w-5 inline-block" style={{ background: 'rgba(124,58,237,0.5)' }} />
          </p>
          <h2 className="text-[1.65rem] font-bold tracking-tight" style={{ color: TEXT1, letterSpacing: '-0.025em' }}>
            Live in four steps
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map(({ num, title, desc }) => (
            <div key={num} className="relative rounded-xl p-5"
              style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${BORDER}` }}>
              <span className="block text-[10.5px] font-mono font-semibold mb-3"
                style={{ color: 'rgba(124,58,237,0.55)' }}>{num}</span>
              <h3 className="font-semibold text-[13px] mb-2" style={{ color: 'rgba(255,255,255,0.82)' }}>{title}</h3>
              <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA strip ────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-12 pb-28 max-w-2xl mx-auto text-center">
        <div className="rounded-2xl p-10"
          style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.16)' }}>
          <div className="flex items-center justify-center mb-1">
            <Lock className="h-4 w-4 mr-2" style={{ color: 'rgba(124,58,237,0.6)' }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(124,58,237,0.65)' }}>
              Invite-only access
            </span>
          </div>
          <h3 className="font-bold mt-3 mb-3" style={{ fontSize: '1.5rem', color: TEXT1, letterSpacing: '-0.02em' }}>
            Start hosting today
          </h3>
          <p className="mb-8 leading-relaxed" style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.38)' }}>
            One bot, 256 MB RAM, live console, AI crash repair — no credit card needed.
          </p>
          <button onClick={() => setLocation(session ? '/dashboard' : '/login')}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-[14px] font-semibold transition-all hover:-translate-y-px active:translate-y-0"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
              boxShadow: '0 4px 20px rgba(124,58,237,0.28)',
              color: '#fff',
            }}>
            {session ? 'Go to Dashboard' : 'Get started free'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 px-6 md:px-12 pb-10"
        style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/lumora-brand.png" alt="" className="h-4 w-4 object-contain"
              style={{ opacity: 0.25, filter: `drop-shadow(0 0 4px ${PURPLE})` }} />
            <span className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.18)' }}>Lumora Hosting</span>
          </div>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.12)' }}>© 2025 Lumora. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <button onClick={() => setLocation('/pricing')}
              className="text-[12px] transition-colors"
              style={{ color: 'rgba(255,255,255,0.2)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>
              Pricing
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
