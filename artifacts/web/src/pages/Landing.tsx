import { useLocation } from 'wouter';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Check, X, Zap, Shield, RotateCw, Bot, Server,
  Globe, Code2, Activity, ChevronRight, BookOpen, LayoutDashboard,
} from 'lucide-react';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

// ─── Diamond / gem icon (matches RoModerate aesthetic) ───────────────────────
function DiamondIcon() {
  return (
    <svg width="88" height="96" viewBox="0 0 88 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_32px_rgba(139,92,246,0.55)]">
      <defs>
        <linearGradient id="dia-face-top" x1="44" y1="0" x2="44" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="dia-face-left" x1="0" y1="48" x2="44" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6d28d9" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="dia-face-right" x1="88" y1="48" x2="44" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#5b21b6" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="dia-shine" x1="20" y1="8" x2="50" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Top face */}
      <polygon points="44,2 86,44 44,44 2,44" fill="url(#dia-face-top)" />
      {/* Left bottom face */}
      <polygon points="2,44 44,44 44,94" fill="url(#dia-face-left)" />
      {/* Right bottom face */}
      <polygon points="86,44 44,44 44,94" fill="url(#dia-face-right)" />
      {/* Inner highlight line */}
      <line x1="44" y1="2" x2="44" y2="44" stroke="rgba(255,255,255,0.18)" strokeWidth="0.75" />
      <line x1="2" y1="44" x2="86" y2="44" stroke="rgba(255,255,255,0.12)" strokeWidth="0.75" />
      {/* Shine */}
      <polygon points="44,2 86,44 44,44 2,44" fill="url(#dia-shine)" />
      {/* Edge highlights */}
      <polyline points="2,44 44,2 86,44" stroke="rgba(196,181,253,0.5)" strokeWidth="1" fill="none" />
      <polyline points="2,44 44,94 86,44" stroke="rgba(109,40,217,0.4)" strokeWidth="1" fill="none" />
      <line x1="44" y1="44" x2="44" y2="94" stroke="rgba(139,92,246,0.25)" strokeWidth="0.75" />
    </svg>
  );
}

// ─── Session type ─────────────────────────────────────────────────────────────
interface SessionUser {
  discord?: { username: string; globalName?: string | null; avatar?: string | null; id: string } | null;
  ownerUsername?: string;
}

// ─── Stat counter ─────────────────────────────────────────────────────────────
function StatCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const step = target / 50;
      const id = setInterval(() => {
        start = Math.min(start + step, target);
        setVal(Math.floor(start));
        if (start >= target) clearInterval(id);
      }, 30);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

// ─── Platform features ────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Bot, title: 'AI Crash Repair', accent: '#a78bfa',
    desc: 'When your bot crashes, Lumora AI reads the logs, writes a targeted fix, and redeploys — automatically. Up to 3 attempts before alerting you.',
    tag: 'POWERED BY AI',
  },
  {
    icon: Zap, title: 'Deploy in 60 Seconds', accent: '#fcd34d',
    desc: 'ZIP upload or GitHub import. Dependencies install in the background. Your bot is live before you finish your coffee.',
    tag: 'FAST',
  },
  {
    icon: RotateCw, title: 'Auto-Restart on Crash', accent: '#6ee7b7',
    desc: 'Process monitor catches every exit signal and restarts within milliseconds. Exponential backoff prevents crash loops.',
    tag: 'RELIABLE',
  },
  {
    icon: Shield, title: 'Isolated Sandbox', accent: '#93c5fd',
    desc: 'Every bot runs in a fully isolated environment. No shared memory, no cross-tenant access — your secrets stay yours.',
    tag: 'SECURE',
  },
  {
    icon: Activity, title: 'Live Console Streaming', accent: '#f9a8d4',
    desc: 'Browser-native log streaming. Search, filter, pause, copy, and download. Color-coded by severity.',
    tag: 'REAL-TIME',
  },
  {
    icon: Code2, title: 'In-Browser File Editor', accent: '#86efac',
    desc: 'Browse and edit files directly in the dashboard with full syntax highlighting. No SSH, no FTP.',
    tag: 'EDITOR',
  },
  {
    icon: Server, title: 'Persistent Storage', accent: '#fca5a5',
    desc: 'Your SQLite databases, JSON files, and logs survive every restart. Persistent volumes are included on all plans.',
    tag: 'DURABLE',
  },
  {
    icon: Globe, title: 'Low-Latency Gateway', accent: '#d9f99d',
    desc: 'Hosted in US East for the lowest Discord gateway latency. P99 response times under 50ms.',
    tag: 'FAST',
  },
];

// ─── Pricing ──────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Free', price: '$0', period: '/month',
    desc: 'Perfect for side projects and testing.',
    sleepNote: 'Sleeps after 30 min of inactivity',
    accent: '#6b7280', featured: false, border: 'rgba(107,114,128,0.12)',
    cta: 'Start Free',
    features: [
      { t: '1 project', ok: true },
      { t: '256 MB memory', ok: true },
      { t: 'Node.js, Python runtimes', ok: true },
      { t: 'AI crash repair (3x)', ok: true },
      { t: 'Live console logs', ok: true },
      { t: 'Always-on hosting', ok: false },
      { t: 'Priority support', ok: false },
    ],
  },
  {
    name: 'Pro', price: '$5', period: '/month',
    desc: 'Always online. Never misses an event.',
    sleepNote: 'Never sleeps · Always online',
    accent: '#6366f1', featured: true, border: 'rgba(99,102,241,0.25)',
    cta: 'Get Pro',
    features: [
      { t: '3 projects', ok: true },
      { t: '512 MB memory', ok: true },
      { t: 'All 6 runtimes', ok: true },
      { t: 'AI crash repair (unlimited)', ok: true },
      { t: 'Live console + file editor', ok: true },
      { t: 'Always-on hosting', ok: true },
      { t: 'Email support', ok: true },
    ],
  },
  {
    name: 'Business', price: '$15', period: '/month',
    desc: 'Scale a fleet of bots with priority resources.',
    sleepNote: 'Dedicated resources · SLA',
    accent: '#a78bfa', featured: false, border: 'rgba(167,139,250,0.15)',
    cta: 'Get Business',
    features: [
      { t: 'Unlimited projects', ok: true },
      { t: '2 GB memory per bot', ok: true },
      { t: 'All 6 runtimes', ok: true },
      { t: 'AI crash repair (unlimited)', ok: true },
      { t: 'Full dashboard + GitHub CI', ok: true },
      { t: 'Always-on + priority CPU', ok: true },
      { t: 'Priority support + SLA', ok: true },
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<SessionUser | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    fetch(`${BASE}/api/session/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((data: any) => {
        if (data?.ticketId) setSession(data);
      })
      .catch(() => {})
      .finally(() => setSessionLoaded(true));
  }, []);

  const avatarUrl = session?.discord?.avatar && session.discord.id
    ? `https://cdn.discordapp.com/avatars/${session.discord.id}/${session.discord.avatar}.webp?size=64`
    : null;

  const displayName = session?.discord?.globalName || session?.discord?.username || session?.ownerUsername || 'User';

  return (
    <div className="min-h-screen w-full text-white overflow-x-hidden" style={{ background: '#12121f' }}>
      <style>{`
        @keyframes float-gem {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .gem-float { animation: float-gem 5s ease-in-out infinite; }
        .shimmer-text {
          background: linear-gradient(90deg, #818cf8 0%, #c4b5fd 25%, #818cf8 50%, #a78bfa 75%, #818cf8 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
      `}</style>

      {/* ─── Background: grid + glow ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Line grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.07) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />
        {/* Upper-left purple glow */}
        <div className="absolute -top-40 -left-40 w-[700px] h-[600px] rounded-full" style={{
          background: 'radial-gradient(ellipse, rgba(109,40,217,0.35) 0%, rgba(76,29,149,0.15) 45%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        {/* Subtle center top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full" style={{
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)',
          filter: 'blur(30px)',
        }} />
      </div>

      {/* ─── Nav ── */}
      <nav className="relative z-40 border-b border-white/[0.06]" style={{ background: 'rgba(18,18,31,0.88)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-[52px] flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/lumora-brand.png" alt="Lumora" className="h-5 w-5 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.6))' }} />
            <span className="font-bold text-[13px] tracking-wide text-white">Lumora</span>
          </div>

          {/* Center links */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'Pricing', action: () => setLocation('/pricing') },
              { label: 'Features', action: () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) },
            ].map(({ label, action }) => (
              <button key={label} onClick={action}
                className="px-3.5 py-1.5 rounded-lg text-[13px] text-white/45 hover:text-white/75 hover:bg-white/[0.05] transition-all">
                {label}
              </button>
            ))}
          </div>

          {/* Right: auth */}
          {!sessionLoaded ? (
            <div className="w-20 h-7 rounded-lg bg-white/[0.04] animate-pulse" />
          ) : session ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setLocation('/dashboard')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white/70 hover:text-white hover:bg-white/[0.06] transition-all border border-white/[0.08]">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Dashboard
              </button>
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-7 w-7 rounded-full border border-white/[0.15] object-cover" />
              ) : (
                <div className="h-7 w-7 rounded-full border border-white/[0.15] bg-[#6366f1]/30 flex items-center justify-center text-[10px] font-bold text-white/70">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setLocation('/login')}
              className="px-4 py-1.5 text-[13px] text-white/55 hover:text-white/80 transition-colors">
              Log In
            </button>
          )}
        </div>
      </nav>

      {/* ─── Hero ── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-16">
        {/* Live badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] mb-10 text-[12px] text-white/55">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          Discord Bot Hosting — Live
        </div>

        {/* Diamond icon */}
        <div className="gem-float mb-8">
          <DiamondIcon />
        </div>

        {/* Headline */}
        <h1 className="text-[48px] md:text-[64px] font-black leading-[1.05] tracking-tight text-white mb-5 max-w-2xl">
          Welcome to Lumora Hosting
        </h1>

        {/* Subtitle */}
        <p className="text-[16px] text-white/45 leading-relaxed mb-10 max-w-md">
          Get your Discord bots online and running smoothly!
          Professional hosting with AI-powered crash repair.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button onClick={() => setLocation(session ? '/dashboard' : '/login')}
            className="flex items-center gap-2 px-7 py-3 rounded-xl text-[14px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
            Open the Dashboard
          </button>
          <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 px-7 py-3 rounded-xl text-[14px] font-medium text-white/50 border border-white/[0.1] hover:border-white/[0.22] hover:text-white/75 transition-all">
            <BookOpen className="h-4 w-4" />
            Explore Features
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-0 mt-14">
          {[
            { val: 1309, suf: '+', label: 'BOTS DEPLOYED' },
            { val: 99.9, suf: '%', label: 'UPTIME SLA', isFloat: true },
            { val: 27, suf: 's', prefix: '<', label: 'DEPLOY TIME' },
          ].map(({ val, suf, prefix, label, isFloat }, i) => (
            <div key={label} className="flex items-stretch">
              {i > 0 && <div className="mx-8 w-px bg-white/[0.08]" />}
              <div className="text-center">
                <p className="font-mono text-[9px] text-white/25 tracking-[0.25em] mb-1">{label}</p>
                <p className="font-mono text-[20px] font-black text-white/65 leading-none tabular-nums">
                  {isFloat ? `${val}${suf}` : <StatCounter target={val as number} suffix={suf} prefix={prefix} />}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Quick access (logged in only) ── */}
      {session && (
        <section className="relative z-10 max-w-3xl mx-auto px-6 pb-10">
          <div className="rounded-2xl border border-white/[0.08] p-5" style={{ background: 'rgba(99,102,241,0.04)' }}>
            <div className="flex items-center gap-2 mb-1">
              <LayoutDashboard className="h-4 w-4 text-[#818cf8]" />
              <span className="text-[13px] font-semibold text-white/80">Quick Access</span>
            </div>
            <p className="text-[12px] text-white/35 mb-4">Manage your hosted bot directly from here</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
                { label: 'Console', icon: Activity, path: '/dashboard' },
                { label: 'File Manager', icon: Code2, path: '/dashboard' },
              ].map(({ label, icon: Icon, path }) => (
                <button key={label} onClick={() => setLocation(path)}
                  className="flex flex-col items-center gap-2 py-4 rounded-xl border border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.04] transition-all">
                  <Icon className="h-5 w-5 text-white/35" />
                  <span className="text-[11px] text-white/45 font-mono">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Platform features ── */}
      <section id="features" className="relative z-10 py-24">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.02) 50%, transparent 100%)' }} />
        <div className="max-w-6xl mx-auto px-6 relative">
          <div className="text-center mb-14">
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#6366f1]/45 mb-4">PLATFORM FEATURES</p>
            <h2 className="text-4xl font-black text-white tracking-tight mb-3">
              Powerful Features
            </h2>
            <p className="text-white/35 text-[15px] max-w-md mx-auto leading-relaxed">
              Everything you need to run your Discord bots reliably — no ops experience required.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {FEATURES.map(({ icon: Icon, title, desc, accent, tag }) => (
              <div key={title}
                className="group relative rounded-2xl p-5 border border-white/[0.06] transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-default"
                style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 30% 20%, ${accent}12 0%, transparent 60%)` }} />
                <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(90deg, transparent, ${accent}50, transparent)` }} />
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-300"
                    style={{ background: `${accent}12`, border: `1px solid ${accent}20` }}>
                    <Icon className="h-4 w-4" style={{ color: accent, opacity: 0.8 }} />
                  </div>
                  <div className="mt-0.5">
                    <div className="font-mono text-[8px] tracking-widest mb-0.5" style={{ color: `${accent}60` }}>{tag}</div>
                    <h3 className="font-bold text-[12px] text-white/80">{title}</h3>
                  </div>
                </div>
                <p className="text-[10.5px] text-white/28 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ── */}
      <section className="relative z-10 border-y border-white/[0.04] py-24" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#6366f1]/45 mb-4">DEPLOYMENT FLOW</p>
            <h2 className="text-4xl font-black text-white tracking-tight mb-3">Live in under 60 seconds.</h2>
            <p className="text-white/35 text-[14px] max-w-md mx-auto">Three steps. No YAML. No Docker. No infrastructure knowledge needed.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Upload Your Code', color: '#6366f1', desc: 'Drag and drop a ZIP or paste a GitHub URL. We detect your runtime automatically.', icon: '⬆' },
              { step: '02', title: 'We Install & Start', color: '#7c3aed', desc: 'Dependencies install in the background. Your process starts immediately with live console output.', icon: '⚡' },
              { step: '03', title: 'Stay Online Forever', color: '#a78bfa', desc: 'Crash? We auto-restart. Repeated crash? Our AI reads the logs and ships a fix automatically.', icon: '✓' },
            ].map(({ step, title, desc, color, icon }) => (
              <div key={step} className="relative rounded-2xl p-6 border border-white/[0.07] group hover:border-white/[0.14] transition-all duration-300"
                style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold border group-hover:scale-105 transition-transform duration-300"
                    style={{ background: `${color}10`, borderColor: `${color}20`, color }}>
                    {icon}
                  </div>
                  <span className="font-mono text-[9px] tracking-widest" style={{ color: `${color}60` }}>STEP {step}</span>
                </div>
                <h3 className="font-bold text-white/85 mb-2 text-[15px]">{title}</h3>
                <p className="text-[12px] text-white/32 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ── */}
      <section id="pricing" className="relative z-10 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#6366f1]/45 mb-4">PRICING</p>
            <h2 className="text-4xl font-black text-white tracking-tight mb-3">Simple, transparent pricing.</h2>
            <p className="text-white/35 text-[14px] max-w-sm mx-auto">No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {PLANS.map((plan) => (
              <div key={plan.name} className="relative rounded-2xl p-6 border flex flex-col transition-all duration-300 hover:-translate-y-1"
                style={{
                  borderColor: plan.border,
                  background: plan.featured
                    ? `linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(124,58,237,0.04) 100%)`
                    : `linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`,
                  boxShadow: plan.featured ? '0 0 0 1px rgba(99,102,241,0.2)' : 'none',
                }}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-widest text-white"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
                    POPULAR
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="font-bold text-white/85 text-[15px] mb-1">{plan.name}</h3>
                  <p className="text-[11px] text-white/32 mb-3">{plan.desc}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[32px] font-black text-white">{plan.price}</span>
                    <span className="text-[12px] text-white/30">{plan.period}</span>
                  </div>
                  <p className="text-[10px] font-mono text-white/25 mt-1" style={{ color: plan.accent }}>{plan.sleepNote}</p>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(({ t, ok }) => (
                    <li key={t} className="flex items-center gap-2 text-[12px]">
                      {ok ? <Check className="h-3.5 w-3.5 shrink-0" style={{ color: plan.accent }} />
                           : <X className="h-3.5 w-3.5 shrink-0 text-white/15" />}
                      <span className={ok ? 'text-white/60' : 'text-white/22'}>{t}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => setLocation('/login')}
                  className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:-translate-y-0.5"
                  style={plan.featured
                    ? { background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: 'white', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }
                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer CTA ── */}
      <section className="relative z-10 border-t border-white/[0.05] py-16 text-center">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-black text-white mb-4">Ready to host your bot?</h2>
          <p className="text-white/35 text-[14px] mb-8 max-w-sm mx-auto">Join thousands of Discord developers who trust Lumora for 24/7 bot hosting.</p>
          <button onClick={() => setLocation('/login')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-[14px] font-bold text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)', boxShadow: '0 6px 24px rgba(124,58,237,0.4)' }}>
            Get Started Free <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ─── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.05] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/lumora-brand.png" alt="Lumora" className="h-4 w-4 object-contain opacity-50" />
            <span className="text-[12px] text-white/25 font-mono">LUMORA HOSTING</span>
          </div>
          <p className="text-[11px] text-white/18 font-mono">© 2025 Lumora. All rights reserved.</p>
          <a href="/admin" className="text-[11px] text-white/15 hover:text-white/35 font-mono transition-colors">Admin Panel</a>
        </div>
      </footer>
    </div>
  );
}
