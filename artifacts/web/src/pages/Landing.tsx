import { useLocation } from 'wouter';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Zap, RotateCw, Shield, Activity, Code2, Bot,
  LayoutDashboard, LogOut, ChevronDown, Upload, Play, Settings2, Terminal,
} from 'lucide-react';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

interface SessionData {
  ticketId?: number;
  discord?: { id: string; username: string; globalName?: string | null; avatar?: string | null } | null;
  ownerUsername?: string;
}

/* ─── static data ──────────────────────────────────────────────────────── */

const FEATURES = [
  { icon: Zap,      title: 'Deploy in 60 seconds',   desc: 'Upload a ZIP or link a repo. Runtime auto-detected. Bot live in under a minute.' },
  { icon: RotateCw, title: 'Always-on restarts',     desc: 'Exponential-backoff auto-restart keeps your bot online through any unexpected crash.' },
  { icon: Bot,      title: 'AI crash repair',        desc: 'Repeated crashes trigger our AI — it reads the stack trace and patches your code. Up to 3 attempts free.' },
  { icon: Shield,   title: 'Isolated sandboxes',     desc: 'Every bot runs in its own process. Env vars encrypted at rest, zero cross-user access.' },
  { icon: Activity, title: 'Live console logs',      desc: 'Stream and filter stdout in the browser in real time. No SSH, no VPS, no DevOps.' },
  { icon: Code2,    title: 'In-browser editor',      desc: 'Full CodeMirror editor for every bot. Edit, save, and redeploy without leaving the portal.' },
];

const STEPS = [
  { icon: Upload,    num: '01', title: 'Upload your bot',       desc: 'Drop a ZIP or paste a GitHub URL. Lumora detects Node.js or Python automatically.' },
  { icon: Settings2, num: '02', title: 'Add your secrets',      desc: 'Enter your bot token and any env vars in the secure built-in manager.' },
  { icon: Play,      num: '03', title: 'Hit Run',               desc: 'One click to launch. Your bot starts, logs stream live, and uptime monitoring begins.' },
  { icon: Terminal,  num: '04', title: 'Watch it stay alive',   desc: 'Auto-restarts, AI repair, and live console — all running in the background.' },
];

/* ─── sub-components ───────────────────────────────────────────────────── */

function UserMenu({ session, avatarUrl, displayName, onNavigate }: {
  session: SessionData;
  avatarUrl: string | null;
  displayName: string | undefined;
  onNavigate: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const logout = async () => {
    await fetch(`${BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    window.location.href = '/';
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all"
        style={{ background: open ? 'rgba(255,255,255,0.06)' : 'transparent', border: '1px solid transparent' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <div className="h-7 w-7 rounded-full overflow-hidden flex items-center justify-center shrink-0"
          style={{ background: 'rgba(124,58,237,0.25)', border: '1.5px solid rgba(167,139,250,0.3)' }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            : <span className="text-[11px] font-bold" style={{ color: '#c4b5fd' }}>{(displayName || '?')[0].toUpperCase()}</span>}
        </div>
        <span className="hidden sm:block text-[13px] max-w-[120px] truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>{displayName}</span>
        <ChevronDown className="h-3.5 w-3.5 transition-transform" style={{ color: 'rgba(255,255,255,0.3)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl py-1.5 z-50"
          style={{ background: '#16151f', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
          {/* user header */}
          <div className="px-3 pt-1.5 pb-3 mb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full overflow-hidden shrink-0"
                style={{ background: 'rgba(124,58,237,0.25)', border: '1.5px solid rgba(167,139,250,0.25)' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  : <span className="h-full w-full flex items-center justify-center text-[12px] font-bold" style={{ color: '#c4b5fd' }}>{(displayName || '?')[0].toUpperCase()}</span>}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{displayName}</p>
                <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>Free plan</p>
              </div>
            </div>
          </div>
          {/* actions */}
          {[
            { icon: LayoutDashboard, label: 'Dashboard', action: () => { onNavigate('/dashboard'); setOpen(false); } },
            { icon: Code2,           label: 'Pricing',   action: () => { onNavigate('/pricing');   setOpen(false); } },
          ].map(({ icon: Icon, label, action }) => (
            <button key={label} onClick={action}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors text-left"
              style={{ color: 'rgba(255,255,255,0.6)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}>
              <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
              {label}
            </button>
          ))}
          <div className="my-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
          <button onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors text-left"
            style={{ color: 'rgba(239,68,68,0.7)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = 'rgba(239,68,68,0.95)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(239,68,68,0.7)'; }}>
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── main ─────────────────────────────────────────────────────────────── */

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
    <div className="min-h-screen relative overflow-x-hidden"
      style={{ background: '#0b0b12', fontFamily: "'Inter', system-ui, sans-serif", color: 'rgba(255,255,255,0.88)' }}>

      {/* Background: dot grid */}
      <div className="absolute inset-0 pointer-events-none select-none" style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* Hero ambient glow */}
      <div className="absolute pointer-events-none select-none" style={{
        top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '900px', height: '500px',
        background: 'radial-gradient(ellipse at 50% -10%, rgba(109,40,217,0.18) 0%, rgba(79,70,229,0.06) 50%, transparent 75%)',
      }} />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="relative z-20 flex items-center h-[60px] px-6 md:px-12"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <button onClick={() => setLocation('/')} className="flex items-center gap-2.5 shrink-0 mr-8">
          <img src="/lumora-brand.png" alt="Lumora" className="h-[22px] w-[22px] object-contain"
            style={{ filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.5))' }}
            onError={e => (e.currentTarget.style.display = 'none')} />
          <span className="font-semibold text-[15px] tracking-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>Lumora</span>
        </button>

        {/* Links */}
        <div className="hidden sm:flex items-center gap-0.5">
          {[{ label: 'Pricing', path: '/pricing' }].map(({ label, path }) => (
            <button key={label} onClick={() => setLocation(path)}
              className="px-3 py-1.5 rounded-lg text-[13px] transition-colors"
              style={{ color: 'rgba(255,255,255,0.38)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; e.currentTarget.style.background = 'transparent'; }}>
              {label}
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="ml-auto flex items-center gap-3">
          {!loading && (
            session ? (
              <>
                <button onClick={() => setLocation('/dashboard')}
                  className="hidden sm:flex items-center gap-1.5 h-8 px-4 rounded-lg text-[13px] font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}>
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </button>
                <UserMenu session={session} avatarUrl={avatarUrl} displayName={displayName} onNavigate={setLocation} />
              </>
            ) : (
              <button onClick={() => setLocation('/login')}
                className="h-8 px-4 rounded-lg text-[13px] font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.11)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}>
                Log in
              </button>
            )
          )}
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-28 pb-24">

        {/* Status pill */}
        <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-10 text-[12px] font-medium"
          style={{ background: 'rgba(109,40,217,0.12)', border: '1px solid rgba(109,40,217,0.25)', color: '#a78bfa' }}>
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#a78bfa' }} />
          Discord bot hosting, simplified
        </div>

        {/* Logo mark */}
        <div className="mb-8">
          <img src="/lumora-brand.png" alt="Lumora" className="h-[56px] w-[56px] object-contain mx-auto"
            style={{ filter: 'drop-shadow(0 0 28px rgba(124,58,237,0.5)) drop-shadow(0 0 6px rgba(124,58,237,0.25))' }}
            onError={e => (e.currentTarget.style.display = 'none')} />
        </div>

        {/* Headline */}
        <h1 className="font-black tracking-tighter leading-[1.04] mb-6 max-w-[820px]"
          style={{ fontSize: 'clamp(2.8rem, 7vw, 4.8rem)', letterSpacing: '-0.04em' }}>
          <span style={{ color: '#f4f3ff' }}>Keep your Discord bot</span><br />
          <span style={{
            background: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 40%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>online 24/7.</span>
        </h1>

        <p className="max-w-[440px] mx-auto mb-12 leading-relaxed"
          style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.38)' }}>
          Upload your code, paste your token, go live in under a minute.
          Auto-restarts, live logs, and AI crash repair included.
        </p>

        {/* CTA buttons */}
        {session ? (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button onClick={() => setLocation('/dashboard')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold transition-all hover:-translate-y-px active:translate-y-0"
              style={{
                background: '#5b21b6',
                border: '1px solid rgba(167,139,250,0.2)',
                boxShadow: '0 0 0 1px rgba(109,40,217,0.3), 0 8px 24px rgba(91,33,182,0.35)',
                color: '#ede9fe',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#6d28d9'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#5b21b6'; }}>
              <LayoutDashboard className="h-4 w-4" />
              Open Dashboard
            </button>
            <button onClick={() => setLocation('/pricing')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium transition-all hover:-translate-y-px"
              style={{ color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}>
              View Plans <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button onClick={() => setLocation('/login')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold transition-all hover:-translate-y-px active:translate-y-0"
              style={{
                background: '#5b21b6',
                border: '1px solid rgba(167,139,250,0.2)',
                boxShadow: '0 0 0 1px rgba(109,40,217,0.3), 0 8px 24px rgba(91,33,182,0.35)',
                color: '#ede9fe',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#6d28d9'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#5b21b6'; }}>
              Get started free <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => setLocation('/pricing')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium transition-all hover:-translate-y-px"
              style={{ color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}>
              View Plans
            </button>
          </div>
        )}

        {/* Fake terminal preview card */}
        <div className="mt-16 w-full max-w-xl mx-auto rounded-2xl overflow-hidden text-left"
          style={{ background: '#0f0e1a', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
          {/* title bar */}
          <div className="flex items-center gap-1.5 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#13121e' }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ff5f57' }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ffbd2e' }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#28c840' }} />
            <span className="ml-3 text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>my-discord-bot — live console</span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
              <span className="text-[11px] font-mono" style={{ color: '#4ade80' }}>RUNNING</span>
            </span>
          </div>
          {/* log lines */}
          <div className="px-4 py-4 space-y-1.5 font-mono text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {[
              { t: '08:14:02', c: 'rgba(255,255,255,0.22)', msg: 'Starting bot process…' },
              { t: '08:14:03', c: '#4ade80',                msg: '✓ Logged in as LumoraBot#4201' },
              { t: '08:14:03', c: 'rgba(255,255,255,0.22)', msg: 'Listening on 3 guilds' },
              { t: '08:14:11', c: 'rgba(167,139,250,0.8)',  msg: '/ ping  →  Pong! (12ms)' },
              { t: '08:14:29', c: 'rgba(167,139,250,0.8)',  msg: '/ help  →  Sent embed to #general' },
              { t: '08:15:44', c: '#fb923c',                msg: 'WARN  rate-limited, retrying in 1 s…' },
              { t: '08:15:45', c: 'rgba(255,255,255,0.22)', msg: 'Reconnected successfully' },
            ].map(({ t, c, msg }) => (
              <div key={t + msg} className="flex items-baseline gap-3">
                <span style={{ color: 'rgba(255,255,255,0.18)', minWidth: 54 }}>{t}</span>
                <span style={{ color: c }}>{msg}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-16 pb-28 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11.5px] font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'rgba(167,139,250,0.6)', letterSpacing: '0.12em' }}>
            What's included
          </p>
          <h2 className="font-bold tracking-tight" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.03em' }}>
            Everything your bot needs to thrive
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title}
              className="p-6 transition-all duration-200 group cursor-default"
              style={{ background: '#0b0b12' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(109,40,217,0.07)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '#0b0b12'; }}>
              <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(109,40,217,0.14)', border: '1px solid rgba(109,40,217,0.22)' }}>
                <Icon className="h-4 w-4" style={{ color: '#c4b5fd' }} />
              </div>
              <h3 className="font-semibold text-[14px] mb-2" style={{ color: 'rgba(255,255,255,0.85)' }}>{title}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-16 pb-28 max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11.5px] font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'rgba(167,139,250,0.6)', letterSpacing: '0.12em' }}>
            Getting started
          </p>
          <h2 className="font-bold tracking-tight" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.03em' }}>
            Live in four steps
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map(({ icon: Icon, num, title, desc }) => (
            <div key={num} className="relative rounded-2xl p-5 transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(109,40,217,0.3)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(109,40,217,0.06)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}>
              <div className="flex items-center justify-between mb-4">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(109,40,217,0.14)', border: '1px solid rgba(109,40,217,0.2)' }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: '#c4b5fd' }} />
                </div>
                <span className="font-mono text-[11px] font-bold" style={{ color: 'rgba(109,40,217,0.4)' }}>{num}</span>
              </div>
              <h3 className="font-semibold text-[13.5px] mb-2" style={{ color: 'rgba(255,255,255,0.82)' }}>{title}</h3>
              <p className="text-[12.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.28)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-32 max-w-2xl mx-auto text-center">
        <div className="relative rounded-2xl px-8 py-12 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* inner glow */}
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.4), transparent)' }} />
          <div className="absolute pointer-events-none" style={{
            top: '-60px', left: '50%', transform: 'translateX(-50%)',
            width: '400px', height: '200px',
            background: 'radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.15) 0%, transparent 70%)',
          }} />
          <p className="text-[11.5px] font-semibold uppercase tracking-widest mb-5"
            style={{ color: 'rgba(167,139,250,0.55)', letterSpacing: '0.12em' }}>
            Start for free · No credit card required
          </p>
          <h3 className="font-bold mb-4 tracking-tight" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.03em' }}>
            Start hosting today
          </h3>
          <p className="mb-8 leading-relaxed" style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.32)' }}>
            One bot, 256 MB RAM, live console, AI crash repair — all on the free plan.
          </p>
          <button onClick={() => setLocation(session ? '/dashboard' : '/login')}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-[14px] font-semibold transition-all hover:-translate-y-px active:translate-y-0"
            style={{
              background: '#5b21b6',
              border: '1px solid rgba(167,139,250,0.2)',
              boxShadow: '0 0 0 1px rgba(109,40,217,0.3), 0 8px 24px rgba(91,33,182,0.4)',
              color: '#ede9fe',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#6d28d9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#5b21b6'; }}>
            {session ? 'Go to Dashboard' : 'Get started free'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 px-6 md:px-12 pb-10"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/lumora-brand.png" alt="" className="h-4 w-4 object-contain"
              style={{ opacity: 0.2 }}
              onError={e => (e.currentTarget.style.display = 'none')} />
            <span className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.15)' }}>Lumora Hosting</span>
          </div>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.1)' }}>© 2025 Lumora. All rights reserved.</p>
          <button onClick={() => setLocation('/pricing')}
            className="text-[12px] transition-colors"
            style={{ color: 'rgba(255,255,255,0.18)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}>
            Pricing
          </button>
        </div>
      </footer>
    </div>
  );
}
