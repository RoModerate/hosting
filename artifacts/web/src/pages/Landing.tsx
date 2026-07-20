import { useLocation } from 'wouter';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Check, X, Zap, Shield, RotateCw, Bot, Server,
  Globe, Code2, Activity, ChevronRight, Terminal, Cpu,
} from 'lucide-react';

// ─── Floating particles ───────────────────────────────────────────────────────
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[#6366f1] opacity-[0.15]"
          style={{
            width: i % 3 === 0 ? 2 : 1,
            height: i % 3 === 0 ? 2 : 1,
            left: `${(i * 37 + 11) % 100}%`,
            top: `${(i * 53 + 7) % 100}%`,
            animation: `floatDot ${8 + (i % 7)}s ease-in-out infinite`,
            animationDelay: `${(i * 0.4) % 5}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Animated hero preview ────────────────────────────────────────────────────
const BOOT_LINES = [
  { d: 0,    t: '$ npm install',                       c: 'text-white/35' },
  { d: 500,  t: '✓ 127 packages in 1.8s',              c: 'text-emerald-400/60' },
  { d: 900,  t: '$ node index.js',                     c: 'text-white/35' },
  { d: 1400, t: '[Bot] Connecting to gateway…',        c: 'text-blue-400/55' },
  { d: 2000, t: '✓ Gateway connected (shard 0/1)',     c: 'text-emerald-400/60' },
  { d: 2500, t: '✓ 8 slash commands registered',      c: 'text-emerald-400/60' },
  { d: 3000, t: '✓ MyBot#1234 is online',             c: 'text-emerald-300/80' },
  { d: 3800, t: '» /help — cooluser — 38ms',          c: 'text-white/25' },
  { d: 4900, t: '» /play — another_user — 22ms',      c: 'text-white/25' },
  { d: 6100, t: '» memberAdd — Guild: 12,482 members', c: 'text-white/25' },
];

function HeroPreview() {
  const [visible, setVisible] = useState(0);
  const [status, setStatus] = useState<'offline' | 'starting' | 'online'>('offline');

  useEffect(() => {
    const t = setTimeout(() => setStatus('starting'), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (status !== 'starting') return;
    const timers = BOOT_LINES.map(({ d }, i) =>
      setTimeout(() => { setVisible(i + 1); if (i === 6) setStatus('online'); }, d + 500)
    );
    return () => timers.forEach(clearTimeout);
  }, [status]);

  const dot  = status === 'online' ? 'bg-emerald-400' : status === 'starting' ? 'bg-blue-400 animate-pulse' : 'bg-white/20';
  const pill = status === 'online' ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.07]'
             : status === 'starting' ? 'text-blue-400 border-blue-500/25 bg-blue-500/[0.07]'
             : 'text-white/25 border-white/[0.07] bg-white/[0.02]';
  const label = status === 'online' ? 'ONLINE' : status === 'starting' ? 'DEPLOYING' : 'OFFLINE';

  return (
    <div className="relative select-none">
      {/* Glow behind card */}
      <div className="absolute -inset-10 rounded-[40px] opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.4) 0%, rgba(124,58,237,0.2) 40%, transparent 70%)' }} />

      {/* Floating metric chips */}
      <div className="absolute -top-4 -left-8 px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-[#0d0d1a]/90 backdrop-blur-sm shadow-lg z-10"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.08)' }}>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[10px] text-emerald-400/80 font-bold">99.9% UPTIME</span>
        </div>
      </div>

      <div className="absolute -bottom-5 -right-6 px-3 py-2 rounded-xl border border-[#6366f1]/20 bg-[#0d0d1a]/90 backdrop-blur-sm shadow-lg z-10"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-[#6366f1]/15 border border-[#6366f1]/25 flex items-center justify-center">
            <Zap className="h-3 w-3 text-[#6366f1]/70" />
          </div>
          <div>
            <p className="font-mono text-[8px] text-white/25 tracking-widest">AI REPAIR</p>
            <p className="font-mono text-[10px] text-white/65 font-bold">3 crashes fixed</p>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="w-full max-w-[520px] rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0c0c1c 0%, #090912 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>

        {/* Window chrome */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05]"
          style={{ background: 'rgba(255,255,255,0.012)' }}>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
            </div>
            <span className="font-mono text-[10px] text-white/25">MyBot · Lumora Dashboard</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[8px] font-mono font-black tracking-widest ${pill}`}>
            <div className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {label}
          </div>
        </div>

        {/* Sidebar + console */}
        <div className="flex min-h-[200px]">
          <div className="w-[108px] border-r border-white/[0.04] py-1.5 shrink-0"
            style={{ background: 'rgba(0,0,0,0.15)' }}>
            {['Overview', 'Console', 'Files', 'Env Vars', 'Backups', 'Settings'].map((l, i) => (
              <div key={l} className={`px-3 py-1.5 text-[9.5px] font-mono flex items-center gap-1.5 ${
                i === 1
                  ? 'text-white/65 bg-white/[0.04] border-r-2 border-[#6366f1]/70'
                  : 'text-white/18'
              }`}>
                {i === 1 && <div className="h-1 w-1 rounded-full bg-[#6366f1]/60 shrink-0" />}
                {l}
              </div>
            ))}
          </div>

          <div className="flex-1 p-3 font-mono overflow-hidden">
            <div className="text-[8.5px] text-white/18 tracking-[0.3em] mb-1.5">CONSOLE OUTPUT</div>
            <div className="space-y-0.5">
              {BOOT_LINES.slice(0, visible).map((line, i) => (
                <div key={i} className={`text-[9.5px] leading-relaxed ${line.c} transition-opacity duration-200`}>
                  {line.t}
                </div>
              ))}
              {visible < BOOT_LINES.length && (
                <div className="h-3 flex items-center">
                  <span className="text-[9px] text-white/25 animate-pulse">▊</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-white/[0.04]"
          style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#6366f1]/50" />
            <span className="font-mono text-[8px] text-white/18">US East</span>
          </div>
          <div className="h-2.5 w-px bg-white/[0.05]" />
          <span className="font-mono text-[8px] text-white/18">Node.js 20</span>
          <div className="h-2.5 w-px bg-white/[0.05]" />
          <span className="font-mono text-[8px] text-white/18">256 MB RAM</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="font-mono text-[8px] text-white/18">Restart count:</span>
            <span className="font-mono text-[8px] text-emerald-400/50">0</span>
          </div>
        </div>
      </div>
    </div>
  );
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

// ─── Runtime cards ────────────────────────────────────────────────────────────
const RUNTIMES = [
  { id: 'nodejs',  name: 'Node.js',     tag: 'JS', color: '#84cc16', libs: 'discord.js · Sapphire · Eris',   desc: 'Full npm ecosystem. Auto-detects package.json and installs dependencies.' },
  { id: 'express', name: 'Express.js',  tag: 'EX', color: '#10b981', libs: 'REST APIs · Webhooks · HTTP',    desc: 'Run an Express server alongside your bot for web endpoints or dashboards.' },
  { id: 'fastapi', name: 'FastAPI',     tag: 'FA', color: '#14b8a6', libs: 'uvicorn · pydantic · asyncio',   desc: 'Async Python API server — ideal for bots with heavy data processing needs.' },
  { id: 'flask',   name: 'Flask',       tag: 'FL', color: '#a78bfa', libs: 'Python · Jinja2 · gunicorn',     desc: 'Lightweight Python server. Auto-installs from requirements.txt.' },
  { id: 'python',  name: 'Python',      tag: 'PY', color: '#3b82f6', libs: 'discord.py · hikari · py-cord', desc: 'Pure Python bots with pip auto-install. Zero configuration required.' },
  { id: 'static',  name: 'Static Site', tag: 'ST', color: '#f97316', libs: 'HTML · CSS · JavaScript',       desc: 'Deploy a static frontend for your bot\'s dashboard or landing page.' },
];

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
  const [hoveredRuntime, setHoveredRuntime] = useState<string | null>(null);

  return (
    <div className="min-h-screen w-full bg-[#07070f] text-[#c8cde8] overflow-x-hidden">
      <style>{`
        @keyframes floatDot {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.12; }
          33% { transform: translateY(-12px) translateX(4px); opacity: 0.2; }
          66% { transform: translateY(6px) translateX(-4px); opacity: 0.08; }
        }
        @keyframes orb1 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-46%, -54%) scale(1.05); }
        }
        @keyframes orb2 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-54%, -46%) scale(0.95); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #818cf8 0%, #c4b5fd 25%, #818cf8 50%, #a78bfa 75%, #818cf8 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
      `}</style>

      {/* ─── Multi-orb background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Primary orb */}
        <div className="absolute w-[900px] h-[700px] rounded-full opacity-[0.10]"
          style={{
            background: 'radial-gradient(ellipse, #6366f1 0%, #4338ca 40%, transparent 70%)',
            top: '10%', left: '55%',
            transform: 'translate(-50%, -50%)',
            animation: 'orb1 12s ease-in-out infinite',
            filter: 'blur(60px)',
          }} />
        {/* Secondary orb */}
        <div className="absolute w-[600px] h-[500px] rounded-full opacity-[0.07]"
          style={{
            background: 'radial-gradient(ellipse, #7c3aed 0%, #a78bfa 50%, transparent 70%)',
            top: '60%', left: '20%',
            transform: 'translate(-50%, -50%)',
            animation: 'orb2 15s ease-in-out infinite',
            filter: 'blur(80px)',
          }} />
        {/* Accent orb */}
        <div className="absolute w-[400px] h-[300px] rounded-full opacity-[0.05]"
          style={{
            background: 'radial-gradient(ellipse, #06b6d4 0%, transparent 70%)',
            top: '80%', left: '75%',
            filter: 'blur(60px)',
          }} />

        {/* Fine dot grid */}
        <div className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: 'radial-gradient(rgba(99,102,241,0.35) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />
      </div>

      {/* ─── Nav ── */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.05]"
        style={{ background: 'rgba(7,7,15,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <img src="/lumora-brand.png" alt="Lumora" className="h-6 w-6 object-contain"
                style={{ filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.5))' }} />
              <span className="font-mono font-black text-[13px] tracking-[0.2em] text-white">LUMORA</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              {[
                { label: 'Features', href: '#features' },
                { label: 'Runtimes', href: '#runtimes' },
                { label: 'Pricing', href: '#pricing', action: () => setLocation('/pricing') },
              ].map(({ label, href, action }) => (
                <a key={label} href={action ? undefined : href}
                  onClick={action}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-mono text-white/30 hover:text-white/65 hover:bg-white/[0.04] transition-all cursor-pointer">
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLocation('/login')}
              className="px-4 py-1.5 text-[12px] font-mono text-white/40 hover:text-white/65 transition-colors">
              Sign in
            </button>
            <button onClick={() => setLocation('/login')}
              className="px-4 py-1.5 rounded-lg text-[12px] font-bold text-white transition-all hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', boxShadow: '0 2px 16px rgba(99,102,241,0.35)' }}>
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ── */}
      <section className="relative max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-28 flex flex-col lg:flex-row items-center gap-20">
        <Particles />

        <div className="flex-1 max-w-[560px] relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#6366f1]/20 bg-[#6366f1]/[0.06] mb-7 cursor-default">
            <div className="flex gap-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="font-mono text-[10px] text-[#818cf8]/80 tracking-wide">Now with AI-powered crash repair</span>
            <ChevronRight className="h-3 w-3 text-[#818cf8]/40" />
          </div>

          {/* Headline */}
          <h1 className="text-[56px] md:text-[68px] font-black leading-[1.0] tracking-[-0.03em] text-white mb-6">
            Discord Bot<br />
            Hosting,{' '}
            <span className="shimmer-text">Done Right.</span>
          </h1>

          <p className="text-[16px] text-white/38 leading-[1.75] mb-9 max-w-[440px]">
            Stop fighting servers. Deploy your Discord bot in under 60 seconds.
            We handle installs, restarts, and AI-powered crash recovery — automatically.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-14">
            <button onClick={() => setLocation('/login')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-bold text-white transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', boxShadow: '0 6px 24px rgba(99,102,241,0.40)' }}>
              Deploy Your First Bot <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => setLocation('/pricing')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-white/45 border border-white/[0.08] hover:border-white/[0.18] hover:text-white/75 transition-all">
              View Pricing
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-0">
            {[
              { val: 2847, suf: '+', label: 'Bots Deployed' },
              { val: 99.9, suf: '%', label: 'Uptime SLA', isFloat: true },
              { val: 60, suf: 's', prefix: '<', label: 'Deploy Time' },
            ].map(({ val, suf, prefix, label, isFloat }, i) => (
              <div key={label} className="flex items-stretch">
                {i > 0 && <div className="mx-7 w-px bg-white/[0.06]" />}
                <div>
                  <p className="font-mono text-[9px] text-white/20 tracking-[0.25em] mb-1.5">{label.toUpperCase()}</p>
                  <p className="font-mono text-[22px] font-black text-white/70 leading-none tabular-nums">
                    {isFloat ? `${val}${suf}` : <StatCounter target={val as number} suffix={suf} prefix={prefix} />}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview card */}
        <div className="flex-1 flex justify-center lg:justify-end relative z-10 w-full max-w-[540px]">
          <HeroPreview />
        </div>
      </section>

      {/* ─── Social proof bar ── */}
      <div className="relative border-y border-white/[0.05] py-5"
        style={{ background: 'rgba(255,255,255,0.008)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-wrap items-center justify-center gap-x-12 gap-y-3">
          {[
            { icon: Shield, text: 'SOC 2-ready infrastructure' },
            { icon: Zap,    text: 'Sub-60s cold start time' },
            { icon: RotateCw, text: 'Auto-restart on every crash' },
            { icon: Bot,    text: 'AI repair — no manual intervention' },
            { icon: Activity, text: 'Live logs in the browser' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon className="h-3 w-3 text-[#6366f1]/40 shrink-0" />
              <span className="font-mono text-[11px] text-white/25">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Platform features ── */}
      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.025) 50%, transparent 100%)' }} />

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          <div className="text-center mb-16">
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#6366f1]/45 mb-4">PLATFORM FEATURES</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
              Everything included.<br />
              <span className="text-white/35">No surprises.</span>
            </h2>
            <p className="text-white/35 text-[15px] max-w-md mx-auto leading-relaxed">
              From zero-config deploys to AI crash recovery — Lumora handles the ops so you can focus on building.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {FEATURES.map(({ icon: Icon, title, desc, accent, tag }, idx) => (
              <div key={title}
                className="group relative rounded-2xl p-5 border border-white/[0.06] transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-default"
                style={{ background: 'linear-gradient(145deg, #0e0e1c 0%, #0a0a14 100%)' }}>
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 30% 20%, ${accent}12 0%, transparent 60%)` }} />
                {/* Top accent */}
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
      <section className="border-y border-white/[0.04] py-24" style={{ background: 'rgba(0,0,0,0.15)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#6366f1]/45 mb-4">DEPLOYMENT FLOW</p>
            <h2 className="text-4xl font-black text-white tracking-tight mb-4">Live in under 60 seconds.</h2>
            <p className="text-white/35 text-[14px] max-w-md mx-auto">Three steps. No YAML. No Docker. No infrastructure knowledge needed.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto relative">
            {/* Connector lines */}
            <div className="hidden md:block absolute top-8 left-[33%] right-[33%] h-px"
              style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.3), rgba(99,102,241,0.1), rgba(99,102,241,0.3))' }} />

            {[
              {
                step: '01', title: 'Upload Your Code', color: '#6366f1',
                desc: 'Drag and drop a ZIP or paste a GitHub URL. We detect your runtime automatically — Node.js, Python, or any of our 6 supported environments.',
                icon: '⬆',
              },
              {
                step: '02', title: 'We Install & Start', color: '#7c3aed',
                desc: 'Dependencies install in the background. Your process starts immediately. Live console output streams to your browser from second one.',
                icon: '⚡',
              },
              {
                step: '03', title: 'Stay Online Forever', color: '#a78bfa',
                desc: 'Crash? We auto-restart. Repeated crash? Our AI reads the logs and ships a fix. You get notified. Your bot stays online.',
                icon: '✓',
              },
            ].map(({ step, title, desc, color, icon }) => (
              <div key={step} className="relative rounded-2xl p-6 border border-white/[0.07] group hover:border-white/[0.14] transition-all duration-300"
                style={{ background: 'linear-gradient(145deg, #0e0e1c 0%, #0a0a14 100%)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold border group-hover:scale-105 transition-transform duration-300"
                    style={{ background: `${color}10`, borderColor: `${color}20`, color }}>
                    {icon}
                  </div>
                  <div className="font-mono text-[9px] text-white/18 tracking-[0.3em]">STEP {step}</div>
                </div>
                <h3 className="font-bold text-[14px] text-white/80 mb-2">{title}</h3>
                <p className="text-[11px] text-white/30 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Runtimes ── */}
      <section id="runtimes" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#6366f1]/45 mb-4">SUPPORTED RUNTIMES</p>
            <h2 className="text-4xl font-black text-white tracking-tight mb-4">Any language. Instant deploy.</h2>
            <p className="text-white/35 text-[14px] max-w-sm mx-auto">
              Drop your code. We auto-detect the runtime and install every dependency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {RUNTIMES.map(({ id, name, tag, color, libs, desc }) => (
              <div key={id}
                onMouseEnter={() => setHoveredRuntime(id)}
                onMouseLeave={() => setHoveredRuntime(null)}
                className="group relative rounded-2xl p-5 border border-white/[0.06] hover:border-white/[0.14] transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-default"
                style={{ background: 'linear-gradient(145deg, #0e0e1c 0%, #0a0a14 100%)' }}>

                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 30% 30%, ${color}10 0%, transparent 55%)` }} />
                <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(90deg, transparent, ${color}35, transparent)` }} />

                <div className="flex items-start gap-3.5 mb-3.5">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center font-mono text-[12px] font-black shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg"
                    style={{
                      background: `${color}14`,
                      border: `1px solid ${color}22`,
                      color,
                      boxShadow: hoveredRuntime === id ? `0 4px 16px ${color}20` : 'none',
                    }}>
                    {tag}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[13px] text-white/80 mb-0.5">{name}</h3>
                    <p className="font-mono text-[9px] text-white/25 truncate">{libs}</p>
                  </div>
                </div>
                <p className="text-[11px] text-white/30 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ── */}
      <section id="pricing" className="border-t border-white/[0.04] py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <p className="font-mono text-[9px] tracking-[0.4em] text-[#6366f1]/45 mb-4">PRICING</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Simple, honest pricing.</h2>
            <p className="text-white/35 text-[15px] max-w-md mx-auto leading-relaxed">
              Start free and deploy your first bot without a credit card. Upgrade when you need it.
            </p>
          </div>

          {/* Free tier sleep callout */}
          <div className="max-w-4xl mx-auto mb-8 px-5 py-3.5 rounded-xl border border-amber-500/12 bg-amber-500/[0.04] flex items-center gap-3">
            <div className="h-5 w-5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <span className="text-[10px]">⚠</span>
            </div>
            <p className="text-[11px] font-mono text-amber-300/55 leading-relaxed">
              <strong className="text-amber-300/70">Free tier bots sleep</strong> after 30 minutes of inactivity to conserve resources. They wake on the next Discord event with a ~30s delay. Upgrade to Pro for always-on hosting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {PLANS.map((plan) => (
              <div key={plan.name} className="relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: plan.featured ? 'linear-gradient(145deg, #101022 0%, #0c0c1a 100%)' : 'linear-gradient(145deg, #0d0d1a 0%, #0a0a14 100%)',
                  border: `1px solid ${plan.border}`,
                  boxShadow: plan.featured ? '0 0 0 1px rgba(99,102,241,0.08), 0 40px 80px rgba(0,0,0,0.5)' : 'none',
                }}>

                {plan.featured && (
                  <>
                    <div className="absolute inset-x-0 top-0 h-px"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.7), transparent)' }} />
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.07) 0%, transparent 55%)' }} />
                  </>
                )}

                {plan.featured && (
                  <div className="flex justify-center pt-4">
                    <div className="px-3 py-1 rounded-full text-[9px] font-bold font-mono tracking-widest"
                      style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                      ★ MOST POPULAR
                    </div>
                  </div>
                )}

                <div className={`p-6 flex-1 relative ${plan.featured ? 'pt-4' : ''}`}>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-[32px] font-black text-white leading-none">{plan.price}</span>
                    <span className="text-[12px] text-white/28 font-mono">{plan.period}</span>
                  </div>
                  <p className="font-bold text-[14px] text-white/75 mb-1">{plan.name}</p>
                  <p className="text-[11px] text-white/30 mb-1">{plan.desc}</p>
                  <p className={`font-mono text-[9px] mb-5 tracking-wide ${plan.name === 'Free' ? 'text-amber-400/50' : 'text-emerald-400/55'}`}>
                    {plan.sleepNote}
                  </p>

                  <div className="space-y-2.5">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        {f.ok
                          ? <Check className="h-3.5 w-3.5 shrink-0" style={{ color: plan.accent }} />
                          : <X className="h-3.5 w-3.5 shrink-0 text-white/15" />
                        }
                        <span className={`font-mono text-[10.5px] ${f.ok ? 'text-white/48' : 'text-white/18'}`}>{f.t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <button onClick={() => setLocation('/login')}
                    className="w-full py-3 rounded-xl text-[13px] font-bold transition-all hover:-translate-y-px hover:opacity-90"
                    style={plan.featured ? {
                      background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                      color: '#fff',
                      boxShadow: '0 6px 20px rgba(99,102,241,0.40)',
                    } : {
                      background: `${plan.accent}0e`,
                      border: `1px solid ${plan.accent}1e`,
                      color: plan.accent,
                    }}>
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ── */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-24">
        <div className="relative rounded-3xl overflow-hidden px-10 py-20 text-center"
          style={{
            background: 'linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(124,58,237,0.05) 100%)',
            border: '1px solid rgba(99,102,241,0.14)',
          }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 55%)' }} />
          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)' }} />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] mb-6">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px] text-emerald-400/70 tracking-wide">Free to start · No credit card required</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
              Your first deploy is free.
            </h2>
            <p className="text-white/35 text-[15px] mb-10 max-w-sm mx-auto leading-relaxed">
              Sign in with Discord and have your bot live in under a minute.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => setLocation('/login')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-[14px] font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', boxShadow: '0 8px 32px rgba(99,102,241,0.40)' }}>
                Get Started Free <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => setLocation('/pricing')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-[14px] font-semibold text-white/40 border border-white/[0.08] hover:border-white/[0.18] hover:text-white/70 transition-all">
                Compare Plans
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ── */}
      <footer className="border-t border-white/[0.04] py-10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/lumora-brand.png" alt="" className="h-4 w-4 object-contain opacity-25" />
            <span className="font-mono text-[10px] text-white/18 tracking-[0.3em]">LUMORA</span>
          </div>
          <p className="text-[10px] text-white/14 font-mono">© 2025 Lumora · Secure Discord Bot Hosting</p>
          <div className="flex items-center gap-5 font-mono text-[10px] text-white/20">
            <a href="#features" className="hover:text-white/45 transition-colors">Features</a>
            <button onClick={() => setLocation('/pricing')} className="hover:text-white/45 transition-colors">Pricing</button>
            <button onClick={() => setLocation('/login')} className="hover:text-white/45 transition-colors">Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
