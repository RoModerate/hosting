import { useLocation } from 'wouter';
import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Check, X, Zap, Shield, RotateCw, Bot, Server, Globe, Code2, Cpu, Activity, Package } from 'lucide-react';

// ─── Animated console hero preview ───────────────────────────────────────────
const BOOT_SEQUENCE = [
  { delay: 0,    text: '$ npm install', color: 'text-white/40' },
  { delay: 600,  text: '✓ 127 packages installed in 1.8s', color: 'text-emerald-400/70' },
  { delay: 1100, text: '$ node index.js', color: 'text-white/40' },
  { delay: 1700, text: '[Bot] Connecting to Discord gateway…', color: 'text-blue-400/70' },
  { delay: 2400, text: '✓ Gateway connected (shard 0/1)', color: 'text-emerald-400/70' },
  { delay: 2900, text: '✓ 8 slash commands registered', color: 'text-emerald-400/70' },
  { delay: 3400, text: '✓ Bot is online as MyBot#1234', color: 'text-emerald-300' },
  { delay: 4100, text: '» /help used by cooluser — 38ms', color: 'text-white/35' },
  { delay: 5200, text: '» /play used by another_user — 22ms', color: 'text-white/35' },
  { delay: 6300, text: '» memberAdd event fired', color: 'text-white/35' },
];

function HeroPreview() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [status, setStatus] = useState<'offline' | 'starting' | 'online'>('offline');

  useEffect(() => {
    const timer = setTimeout(() => setStatus('starting'), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status !== 'starting') return;
    BOOT_SEQUENCE.forEach(({ delay }, i) => {
      const t = setTimeout(() => {
        setVisibleLines(i + 1);
        if (i === 6) setStatus('online');
      }, delay + 400);
      return () => clearTimeout(t);
    });
  }, [status]);

  const statusColor = status === 'online' ? 'text-emerald-400' : status === 'starting' ? 'text-blue-400' : 'text-white/25';
  const statusDot   = status === 'online' ? 'bg-emerald-400' : status === 'starting' ? 'bg-blue-400 animate-pulse' : 'bg-white/20';
  const statusLabel = status === 'online' ? 'ONLINE' : status === 'starting' ? 'DEPLOYING' : 'OFFLINE';

  return (
    <div
      className="w-full max-w-[520px] rounded-2xl overflow-hidden select-none"
      style={{
        background: 'linear-gradient(145deg, #0c0c1a 0%, #0a0a14 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(99,102,241,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Window chrome */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
          </div>
          <span className="font-mono text-[11px] text-white/30">MyBot · Console</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${
          status === 'online' ? 'border-emerald-500/25 bg-emerald-500/[0.07]' :
          status === 'starting' ? 'border-blue-500/25 bg-blue-500/[0.07]' :
          'border-white/[0.07] bg-white/[0.02]'
        }`}>
          <div className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
          <span className={`font-mono text-[9px] font-bold tracking-widest ${statusColor}`}>{statusLabel}</span>
        </div>
      </div>

      {/* Sidebar + console */}
      <div className="flex">
        <div className="w-[110px] border-r border-white/[0.04] py-2 shrink-0">
          {['Overview', 'Console', 'Files', 'Env Vars', 'Settings'].map((l, i) => (
            <div key={l} className={`px-3 py-1.5 text-[10px] font-mono flex items-center gap-2 ${
              i === 1 ? 'text-white/70 bg-white/[0.04] border-r-2 border-[#6366f1]' : 'text-white/20'
            }`}>
              {i === 1 && <div className="h-1 w-1 rounded-full bg-[#6366f1] shrink-0" />}
              {l}
            </div>
          ))}
        </div>

        <div className="flex-1 p-3 font-mono overflow-hidden" style={{ minHeight: 180 }}>
          <div className="text-[9px] text-white/20 tracking-[0.25em] mb-2">CONSOLE OUTPUT</div>
          <div className="space-y-0.5">
            {BOOT_SEQUENCE.slice(0, visibleLines).map((line, i) => (
              <div key={i} className={`text-[10px] leading-relaxed ${line.color} transition-opacity duration-300`}>
                {line.text}
              </div>
            ))}
            {visibleLines < BOOT_SEQUENCE.length && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-[10px] ${visibleLines === 0 ? 'text-white/25' : 'text-white/40'}`}>▊</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-white/[0.04]" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[#6366f1]/60" />
          <span className="font-mono text-[9px] text-white/20">US East</span>
        </div>
        <div className="h-3 w-px bg-white/[0.06]" />
        <span className="font-mono text-[9px] text-white/20">Node.js 20</span>
        <div className="h-3 w-px bg-white/[0.06]" />
        <span className="font-mono text-[9px] text-white/20">256 MB RAM</span>
      </div>
    </div>
  );
}

// ─── Runtime feature cards ────────────────────────────────────────────────────
const RUNTIMES = [
  { name: 'Node.js',     tag: 'JS',  color: '#84cc16', libs: 'discord.js · Sapphire · Eris',   desc: 'The most popular choice. Full npm ecosystem support with automatic dependency installation.' },
  { name: 'Express.js',  tag: 'EX',  color: '#10b981', libs: 'REST APIs · Webhooks · HTTP',    desc: 'Run an Express server alongside your bot for web dashboards, APIs, or Discord interactions.' },
  { name: 'FastAPI',     tag: 'FA',  color: '#14b8a6', libs: 'Python · uvicorn · pydantic',     desc: 'High-performance async Python API server. Perfect for bots with heavy data processing.' },
  { name: 'Flask',       tag: 'FL',  color: '#a78bfa', libs: 'Python · Jinja2 · gunicorn',     desc: 'Lightweight and flexible Python web framework. Great for simple bot companion servers.' },
  { name: 'Python',      tag: 'PY',  color: '#3b82f6', libs: 'discord.py · hikari · py-cord', desc: 'Pure Python bots with automatic pip install from requirements.txt. Zero configuration needed.' },
  { name: 'Static Site', tag: 'ST',  color: '#f97316', libs: 'HTML · CSS · JavaScript',       desc: 'Deploy static frontends for your bot\'s dashboard or landing page with instant CDN delivery.' },
];

// ─── Pricing ──────────────────────────────────────────────────────────────────
const PRICING = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    desc: 'Perfect for side projects and testing.',
    note: '⚠ Sleeps after 30 min of inactivity',
    featured: false,
    accent: '#6b7280',
    borderColor: 'rgba(107,114,128,0.12)',
    features: [
      { t: '1 project',                 ok: true },
      { t: 'Shared CPU & RAM',          ok: true },
      { t: '256 MB memory',             ok: true },
      { t: 'Node.js, Python, Java',     ok: true },
      { t: 'AI crash repair',           ok: true },
      { t: 'Always-online hosting',     ok: false },
      { t: 'Email support',             ok: false },
    ],
    cta: 'Start Free',
  },
  {
    name: 'Starter',
    price: '$5',
    period: '/month',
    desc: 'For bots that need to stay online 24/7.',
    note: '✓ Never sleeps',
    featured: false,
    accent: '#6366f1',
    borderColor: 'rgba(99,102,241,0.2)',
    features: [
      { t: '3 projects',               ok: true },
      { t: 'Dedicated CPU & RAM',      ok: true },
      { t: '512 MB memory',            ok: true },
      { t: 'All 6 runtimes',           ok: true },
      { t: 'AI crash repair',          ok: true },
      { t: 'Always-online hosting',    ok: true },
      { t: 'Email support',            ok: true },
    ],
    cta: 'Get Starter',
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/month',
    desc: 'Unlimited scale for serious Discord bots.',
    note: '★ Recommended',
    featured: true,
    accent: '#a78bfa',
    borderColor: 'rgba(167,139,250,0.25)',
    features: [
      { t: 'Unlimited projects',        ok: true },
      { t: 'Priority CPU resources',    ok: true },
      { t: '2 GB memory',              ok: true },
      { t: 'All 6 runtimes',           ok: true },
      { t: 'Unlimited AI crash repair', ok: true },
      { t: 'Always-online, no sleeps',  ok: true },
      { t: 'Priority support + SLA',   ok: true },
    ],
    cta: 'Go Pro',
  },
];

// ─── Main landing ─────────────────────────────────────────────────────────────
export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full bg-[#080810] text-[#c8cde8] overflow-x-hidden">

      {/* Dot grid background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(rgba(99,102,241,0.15) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        opacity: 0.4,
      }} />

      {/* Background orb */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 20%, rgba(99,102,241,0.12) 0%, rgba(124,58,237,0.06) 40%, transparent 70%)',
      }} />

      {/* ─── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#080810]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <img src="/lumora-brand.png" alt="Lumora" className="h-6 w-6 object-contain" />
              <span className="font-mono font-black text-sm tracking-[0.18em] text-white">LUMORA</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-[12px] font-mono text-white/30">
              <a href="#features" className="hover:text-white/60 transition-colors">Features</a>
              <button onClick={() => setLocation('/pricing')} className="hover:text-white/60 transition-colors">Pricing</button>
              <a href="https://discord.gg" target="_blank" rel="noreferrer" className="hover:text-white/60 transition-colors">Discord</a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLocation('/login')} className="px-4 py-1.5 text-[12px] font-mono text-white/45 hover:text-white/70 transition-colors">
              Sign in
            </button>
            <button onClick={() => setLocation('/login')}
              className="px-4 py-1.5 rounded-lg text-[12px] font-bold text-white transition-all hover:opacity-90 hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', boxShadow: '0 2px 12px rgba(99,102,241,0.3)' }}>
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-24 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 max-w-[540px]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#6366f1]/20 bg-[#6366f1]/[0.07] mb-6">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[10px] text-[#6366f1]/80 tracking-wide">Now with AI crash repair</span>
          </div>

          <h1 className="text-[58px] md:text-[68px] font-black leading-[1.01] tracking-[-0.03em] text-white mb-5">
            Discord Bot<br />
            Hosting, <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Done Right.</span>
          </h1>

          <p className="text-[16px] text-white/40 leading-relaxed mb-8 max-w-[420px]">
            Stop fighting servers. Deploy your Discord bot in under 60 seconds — we handle installs, restarts, and AI-powered crash recovery automatically.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-12">
            <button onClick={() => setLocation('/login')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-xl"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}>
              Deploy Your First Bot <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => setLocation('/pricing')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-white/55 border border-white/[0.10] hover:border-white/[0.2] hover:text-white/80 transition-all">
              View Pricing
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8">
            {[
              { val: '99.9%', label: 'Uptime SLA' },
              { val: '< 60s', label: 'Deploy time' },
              { val: 'Auto', label: 'Crash repair' },
            ].map(({ val, label }, i) => (
              <div key={label} className="flex items-center gap-8">
                {i > 0 && <div className="h-8 w-px bg-white/[0.07]" />}
                <div>
                  <p className="font-mono text-[9px] text-white/20 tracking-[0.2em] mb-0.5">{label.toUpperCase()}</p>
                  <p className="font-mono text-lg font-black text-white/75">{val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex justify-center lg:justify-end">
          <HeroPreview />
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="border-y border-white/[0.04] py-20 relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.02) 50%, transparent 100%)' }} />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          <div className="text-center mb-14">
            <p className="font-mono text-[9px] tracking-[0.35em] text-[#6366f1]/50 mb-3">SUPPORTED RUNTIMES</p>
            <h2 className="text-4xl font-black text-white tracking-tight mb-3">Any language. Instant deploy.</h2>
            <p className="text-white/35 text-[14px] max-w-md mx-auto">Drop your code, we auto-detect the runtime and handle every dependency.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {RUNTIMES.map(({ name, tag, color, libs, desc }) => (
              <div key={name}
                className="group relative rounded-2xl p-5 border border-white/[0.06] bg-[#0d0d18] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-default"
                style={{ boxShadow: '0 2px 0 rgba(255,255,255,0.02) inset' }}>
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                  style={{ background: `radial-gradient(circle at 30% 20%, ${color}0a 0%, transparent 55%)` }} />

                <div className="flex items-start gap-3 mb-3">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center font-mono text-[11px] font-black shrink-0 group-hover:scale-105 transition-transform"
                    style={{ background: `${color}15`, border: `1px solid ${color}25`, color }}>
                    {tag}
                  </div>
                  <div>
                    <h3 className="font-bold text-white/80 text-[13px] mb-0.5">{name}</h3>
                    <p className="font-mono text-[9px] text-white/25">{libs}</p>
                  </div>
                </div>
                <p className="text-[11px] text-white/35 leading-relaxed">{desc}</p>

                {/* Bottom shine on hover */}
                <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why Lumora ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-20">
        <div className="text-center mb-14">
          <p className="font-mono text-[9px] tracking-[0.35em] text-[#6366f1]/50 mb-3">PLATFORM FEATURES</p>
          <h2 className="text-4xl font-black text-white tracking-tight mb-3">Everything included. No surprises.</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Bot, title: 'AI Crash Repair', desc: 'When your bot crashes, our AI reads the logs, writes a fix, and redeploys automatically.', accent: '#a78bfa' },
            { icon: Zap, title: 'Instant Deploys', desc: 'ZIP upload or GitHub import. Dependencies install in the background while you get coffee.', accent: '#fcd34d' },
            { icon: RotateCw, title: 'Auto Restart', desc: 'Process monitor catches every crash and restarts immediately with configurable retry logic.', accent: '#6ee7b7' },
            { icon: Shield, title: 'Sandboxed', desc: 'Every bot runs in a fully isolated environment. No cross-tenant data access, ever.', accent: '#93c5fd' },
            { icon: Activity, title: 'Live Console', desc: 'Stream real-time logs directly in your browser. Search, filter, copy, and download.', accent: '#f9a8d4' },
            { icon: Code2, title: 'File Manager', desc: 'Browse, view, and edit your bot\'s files directly from the dashboard — no SSH needed.', accent: '#86efac' },
            { icon: Server, title: 'Persistent Storage', desc: 'Files and data survive restarts. Your SQLite database stays exactly where you left it.', accent: '#fca5a5' },
            { icon: Globe, title: 'Multi-region', desc: 'Deploy to US East for lowest Discord gateway latency. More regions coming soon.', accent: '#d9f99d' },
          ].map(({ icon: Icon, title, desc, accent }) => (
            <div key={title} className="group rounded-xl p-5 border border-white/[0.06] bg-[#0d0d18] hover:border-white/[0.11] transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: `radial-gradient(circle at 30% 10%, ${accent}08, transparent 55%)` }} />
              <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-4" style={{ background: `${accent}10`, border: `1px solid ${accent}18` }}>
                <Icon className="h-3.5 w-3.5" style={{ color: accent, opacity: 0.8 }} />
              </div>
              <h3 className="font-bold text-[12px] text-white/75 mb-1.5">{title}</h3>
              <p className="text-[10px] text-white/30 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-white/[0.04] py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-14">
            <p className="font-mono text-[9px] tracking-[0.35em] text-[#6366f1]/50 mb-3">PRICING</p>
            <h2 className="text-4xl font-black text-white tracking-tight mb-3">Simple, transparent pricing.</h2>
            <p className="text-white/35 text-[14px] max-w-sm mx-auto">Start free. Upgrade when your bot needs to stay online around the clock.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {PRICING.map((plan) => (
              <div key={plan.name} className="relative flex flex-col rounded-2xl overflow-hidden" style={{
                background: plan.featured ? 'linear-gradient(145deg, #0f0f22 0%, #0b0b18 100%)' : 'rgba(255,255,255,0.015)',
                border: `1px solid ${plan.borderColor}`,
                boxShadow: plan.featured ? `0 0 0 1px rgba(167,139,250,0.12), 0 32px 64px rgba(0,0,0,0.5)` : 'none',
              }}>
                {plan.featured && (
                  <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.6), transparent)' }} />
                )}

                <div className="p-6 flex-1">
                  {plan.featured && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold font-mono tracking-widest mb-4" style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)', color: '#c4b5fd' }}>
                      ★ RECOMMENDED
                    </div>
                  )}

                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-black text-white">{plan.price}</span>
                    <span className="text-[12px] text-white/30 font-mono">{plan.period}</span>
                  </div>
                  <p className="font-bold text-[14px] text-white/75 mb-1">{plan.name}</p>
                  <p className="text-[11px] text-white/35 mb-1">{plan.desc}</p>
                  <p className={`text-[10px] font-mono mb-5 ${plan.featured ? 'text-[#c4b5fd]/70' : plan.name === 'Free' ? 'text-amber-400/60' : 'text-emerald-400/60'}`}>{plan.note}</p>

                  {/* Sleep warning for free */}
                  {plan.name === 'Free' && (
                    <div className="mb-5 p-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04]">
                      <p className="text-[10px] font-mono text-amber-300/55 leading-relaxed">
                        Free deployments sleep after 30 minutes of inactivity to conserve resources. Your bot wakes up on the next Discord event with a ~30s delay.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        {f.ok
                          ? <Check className="h-3.5 w-3.5 shrink-0" style={{ color: plan.accent }} />
                          : <X className="h-3.5 w-3.5 shrink-0 text-white/15" />
                        }
                        <span className={`text-[11px] font-mono ${f.ok ? 'text-white/50' : 'text-white/20'}`}>{f.t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <button onClick={() => setLocation('/login')}
                    className="w-full py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-90 hover:-translate-y-px"
                    style={plan.featured ? {
                      background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                      color: '#fff',
                      boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
                    } : {
                      background: `${plan.accent}10`,
                      border: `1px solid ${plan.accent}20`,
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

      {/* ─── Final CTA ───────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 pb-24">
        <div className="relative rounded-3xl overflow-hidden px-10 py-16 text-center" style={{
          background: 'linear-gradient(145deg, rgba(99,102,241,0.06) 0%, rgba(124,58,237,0.04) 100%)',
          border: '1px solid rgba(99,102,241,0.12)',
        }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.10) 0%, transparent 55%)',
          }} />
          <div className="relative">
            <h2 className="text-4xl font-black text-white mb-3 tracking-tight">Your first deploy is free.</h2>
            <p className="text-white/35 text-[14px] mb-8 max-w-sm mx-auto">Sign in with Discord and have your bot live in under a minute. No credit card required.</p>
            <button onClick={() => setLocation('/login')}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-[14px] font-bold text-white transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', boxShadow: '0 6px 24px rgba(99,102,241,0.35)' }}>
              Get Started Free <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/lumora-brand.png" alt="" className="h-4 w-4 object-contain opacity-30" />
            <span className="font-mono text-[10px] text-white/18 tracking-[0.25em]">LUMORA</span>
          </div>
          <p className="text-[10px] text-white/15 font-mono">© 2025 Lumora · Secure Discord Bot Hosting</p>
          <div className="flex items-center gap-6 font-mono text-[10px] text-white/22">
            <a href="#features" className="hover:text-white/50 transition-colors">Features</a>
            <button onClick={() => setLocation('/pricing')} className="hover:text-white/50 transition-colors">Pricing</button>
            <button onClick={() => setLocation('/login')} className="hover:text-white/50 transition-colors">Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
