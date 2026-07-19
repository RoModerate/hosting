import { useLocation } from 'wouter';
import {
  Github, Shield, Activity, RotateCw, Bot,
  MessageSquare, Terminal, ArrowRight, Zap, Server, Globe,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const DISCORD_INVITE = 'https://discord.gg/4wEKPrgZmD';

const RUNTIMES = [
  { label: 'Node.js', note: 'discord.js · Eris · Sapphire', icon: '/icon-nodejs.png' },
  { label: 'Python', note: 'discord.py · py-cord · hikari', icon: '/icon-python.png' },
  { label: 'Java', note: 'JDA · Javacord · D4J', icon: '/icon-java.png' },
];

const FEATURES = [
  { icon: Bot, title: 'AI Crash Repair', desc: 'When your bot crashes, our AI diagnoses the issue and attempts up to 3 automatic repairs before alerting you.', accent: '#a78bfa' },
  { icon: Github, title: 'GitHub Import', desc: 'Deploy directly from any public repository — we clone, install deps, and launch it automatically.', accent: '#6ee7b7' },
  { icon: RotateCw, title: 'Auto-Restart', desc: 'Crash detection keeps your bot online 24/7. Instant restart on exit with configurable retry logic.', accent: '#93c5fd' },
  { icon: Shield, title: 'Process Isolation', desc: 'Every bot runs in its own sandbox with scoped filesystem access and no cross-tenant leakage.', accent: '#fca5a5' },
  { icon: Activity, title: 'Live Console', desc: 'Real-time output stream with timestamps and log levels visible in your portal at all times.', accent: '#fcd34d' },
  { icon: Terminal, title: 'Zero-Config Deps', desc: 'npm, pip, and Maven dependencies are detected and installed automatically from your project files.', accent: '#f9a8d4' },
];

const STATS = [
  { value: '99.9%', label: 'Uptime SLA', icon: Activity },
  { value: '<2s', label: 'Deploy time', icon: Zap },
  { value: '3×', label: 'Auto-repair attempts', icon: RotateCw },
  { value: '100 MB', label: 'Max bot size', icon: Server },
];

const TERMINAL_LINES = [
  { text: '$ lumora deploy --source github', color: 'text-white/70' },
  { text: '  Cloning repository…', color: 'text-white/40' },
  { text: '  ✓ Repository cloned (0.4s)', color: 'text-emerald-400/80' },
  { text: '  Installing dependencies…', color: 'text-white/40' },
  { text: '  ✓ npm install complete (1.2s)', color: 'text-emerald-400/80' },
  { text: '  Starting bot process…', color: 'text-white/40' },
  { text: '  ✓ Connected to Discord gateway', color: 'text-emerald-400/80' },
  { text: '  ✓ Bot online as MyBot#0001', color: 'text-[#6366f1]' },
  { text: '  Monitoring enabled · Auto-restart active', color: 'text-white/35' },
];

function TerminalBlock() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= TERMINAL_LINES.length) return;
    const delay = visibleLines === 0 ? 400 : 350;
    const timer = setTimeout(() => setVisibleLines(v => v + 1), delay);
    return () => clearTimeout(timer);
  }, [visibleLines]);

  return (
    <div className="relative w-full max-w-[480px] rounded-2xl border border-white/[0.08] bg-[#0a0a14] overflow-hidden shadow-2xl shadow-black/60">
      {/* Terminal chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500/50" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
          <div className="h-3 w-3 rounded-full bg-emerald-500/50" />
        </div>
        <span className="ml-2 text-[11px] font-mono text-white/25 tracking-wider">lumora — deploy</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono text-emerald-400/60">LIVE</span>
        </div>
      </div>

      {/* Terminal content */}
      <div className="p-5 space-y-1.5 min-h-[240px]">
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className={`font-mono text-[12px] leading-relaxed ${line.color} transition-all duration-300`}>
            {line.text}
          </div>
        ))}
        {visibleLines < TERMINAL_LINES.length && (
          <div className="flex items-center gap-0">
            <span className="font-mono text-[12px] text-white/30"> </span>
            <span className="inline-block w-2 h-4 bg-[#6366f1]/70 animate-pulse rounded-sm" />
          </div>
        )}
        {visibleLines >= TERMINAL_LINES.length && (
          <div className="flex items-center gap-1 mt-1">
            <span className="font-mono text-[12px] text-white/25">$</span>
            <span className="inline-block w-2 h-4 bg-white/30 animate-pulse rounded-sm" />
          </div>
        )}
      </div>

      {/* Subtle scanline overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)',
        }}
      />
    </div>
  );
}

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full bg-[#080810] text-[#c8cde8] overflow-x-hidden animate-page-in">

      {/* ─── Background effects ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage: `linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />
        {/* Radial glows */}
        <div
          className="absolute -top-40 left-1/2 w-[900px] h-[600px] rounded-full opacity-[0.08]"
          style={{
            background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)',
            transform: 'translate(-50%, 0) translateZ(0)',
          }}
        />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, #a78bfa 0%, transparent 70%)' }}
        />
      </div>

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-30 flex items-center justify-between h-14 px-6 md:px-14 border-b border-white/[0.06] bg-[#080810]/90 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <img src="/lumora-brand.png" alt="Lumora" className="h-7 w-7 object-contain" />
          <span className="font-mono font-bold text-sm tracking-[0.18em] text-white">LUMORA</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-[13px] text-white/35">
          <a href="#features" className="hover:text-white/70 transition-colors duration-200 font-mono">Features</a>
          <a href="#runtimes" className="hover:text-white/70 transition-colors duration-200 font-mono">Runtimes</a>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#5865F2] transition-colors duration-200 font-mono"
          >
            Discord
          </a>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation('/login')}
            className="relative px-4 py-1.5 text-sm font-mono font-medium text-white/80 rounded-lg transition-all duration-200 hover:text-white"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.06) 100%)',
              border: '1px solid rgba(99,102,241,0.35)',
              boxShadow: '0 0 12px rgba(99,102,241,0.15)',
            }}
          >
            Launch App →
          </button>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="max-w-7xl mx-auto px-6 md:px-14 pt-24 pb-20 flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
        {/* Copy */}
        <div className="flex-1 lg:max-w-[560px]">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] mb-8">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono text-emerald-400/80 tracking-wider">ALL SYSTEMS OPERATIONAL</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-[68px] font-black text-white leading-[1.04] tracking-tight mb-6">
            Your Discord bot,
            <br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)' }}>
              always online.
            </span>
          </h1>

          <p className="text-base text-white/45 leading-relaxed mb-10 max-w-[440px]">
            Upload a ZIP or link a GitHub repo. Lumora installs your dependencies,
            starts your bot, and automatically repairs crashes — 24/7.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-14">
            <button
              onClick={() => setLocation('/login')}
              className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                boxShadow: '0 4px 24px rgba(99,102,241,0.35), 0 0 0 1px rgba(99,102,241,0.2)',
              }}
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold border border-white/[0.08] bg-white/[0.02] text-white/50 hover:text-white/80 hover:border-white/[0.14] hover:bg-white/[0.04] transition-all duration-200"
            >
              <MessageSquare className="h-4 w-4 text-[#5865F2]" />
              Join Discord
            </a>
          </div>

          {/* Trust line */}
          <p className="text-[11px] font-mono text-white/22 tracking-wider">NO CREDIT CARD · DEPLOY IN 60 SECONDS · FULL CONTROL</p>
        </div>

        {/* Terminal demo */}
        <div className="flex-1 flex justify-center lg:justify-end w-full">
          <TerminalBlock />
        </div>
      </section>

      {/* ─── Stats band ─── */}
      <section className="border-y border-white/[0.06] bg-[#0b0b17]">
        <div className="max-w-7xl mx-auto px-6 md:px-14 py-0">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.05]">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="px-8 py-8 flex flex-col items-center text-center gap-2 group">
                <div className="h-9 w-9 rounded-xl border border-[#6366f1]/20 bg-[#6366f1]/[0.07] flex items-center justify-center mb-1 group-hover:border-[#6366f1]/40 transition-colors duration-200">
                  <Icon className="h-4 w-4 text-[#6366f1]/60" />
                </div>
                <div className="text-3xl font-black text-white font-mono tracking-tight">{value}</div>
                <div className="text-[11px] text-white/30 font-mono tracking-wider">{label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Runtimes ─── */}
      <section id="runtimes" className="max-w-7xl mx-auto px-6 md:px-14 py-14">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
          <p className="text-[10px] text-white/25 font-mono tracking-[0.25em] shrink-0">SUPPORTED RUNTIMES</p>
          <div className="flex flex-col sm:flex-row gap-6 md:gap-12">
            {RUNTIMES.map(({ label, note, icon }) => (
              <div key={label} className="flex items-center gap-3 group">
                <div className="h-10 w-10 rounded-xl border border-white/[0.07] bg-white/[0.02] flex items-center justify-center group-hover:border-white/[0.12] transition-colors duration-200">
                  <img src={icon} alt={label} className="h-5 w-5 object-contain" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white/75">{label}</div>
                  <div className="text-[11px] text-white/30 mt-0.5 font-mono">{note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="max-w-7xl mx-auto px-6 md:px-14 py-20">
        <div className="mb-16 text-center">
          <p className="text-[10px] font-mono tracking-[0.3em] text-[#6366f1]/60 mb-4">PLATFORM CAPABILITIES</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Everything your bot needs</h2>
          <p className="text-white/35 text-base max-w-md mx-auto">No infrastructure knowledge required. Deploy in under 60 seconds.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, accent }) => (
            <div
              key={title}
              className="group relative rounded-2xl border border-white/[0.06] bg-[#0d0d18] p-6 hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-default"
              style={{ '--accent': accent } as any}
            >
              {/* Gradient hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                style={{ background: `radial-gradient(circle at 30% 20%, ${accent}10 0%, transparent 65%)` }}
              />
              {/* Top border highlight on hover */}
              <div
                className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, transparent, ${accent}40, transparent)` }}
              />

              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center mb-5 border transition-all duration-300"
                style={{ backgroundColor: `${accent}10`, borderColor: `${accent}22` }}
              >
                <Icon className="h-5 w-5" style={{ color: accent, opacity: 0.8 }} />
              </div>
              <h3 className="text-sm font-bold text-white/85 mb-2.5 tracking-wide">{title}</h3>
              <p className="text-[12px] text-white/38 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Discord CTA ─── */}
      <section className="max-w-7xl mx-auto px-6 md:px-14 pb-16">
        <div className="rounded-2xl border border-[#5865F2]/18 bg-[#5865F2]/[0.04] px-8 py-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(88,101,242,0.08) 0%, transparent 60%)' }}
          />
          <div className="flex items-center gap-5 relative">
            <div className="h-14 w-14 rounded-2xl bg-[#5865F2]/12 border border-[#5865F2]/22 flex items-center justify-center shrink-0">
              <MessageSquare className="h-7 w-7 text-[#5865F2]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Join our community</h2>
              <p className="text-white/40 text-sm">Get help, share feedback, and connect with other Lumora users.</p>
            </div>
          </div>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            className="relative shrink-0 flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm bg-[#5865F2] hover:bg-[#6672f5] text-white transition-all duration-200 hover:-translate-y-0.5"
            style={{ boxShadow: '0 4px 16px rgba(88,101,242,0.30)' }}
          >
            <MessageSquare className="h-4 w-4" />
            Join Discord Server
          </a>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="max-w-7xl mx-auto px-6 md:px-14 pb-28">
        <div className="rounded-2xl border border-[#6366f1]/18 bg-[#6366f1]/[0.04] px-10 py-16 flex flex-col items-center text-center gap-7 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.1) 0%, transparent 60%)' }}
          />
          <div className="relative">
            <p className="text-[10px] font-mono tracking-[0.3em] text-[#6366f1]/60 mb-4">GET STARTED TODAY</p>
            <h2 className="text-4xl font-black text-white mb-3 tracking-tight">Ready to deploy?</h2>
            <p className="text-white/35 text-base max-w-md mx-auto">Log in with Discord and have your bot live in minutes.</p>
          </div>
          <button
            onClick={() => setLocation('/login')}
            className="relative flex items-center gap-2.5 px-9 py-4 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
              boxShadow: '0 4px 24px rgba(99,102,241,0.40), 0 0 0 1px rgba(99,102,241,0.2)',
            }}
          >
            Launch Your Bot <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.05] px-6 md:px-14 py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-[#6366f1]/12 border border-[#6366f1]/20 flex items-center justify-center">
              <img src="/lumora-brand.png" alt="" className="h-3.5 w-3.5 object-contain opacity-60" />
            </div>
            <span className="font-mono text-xs text-white/22 tracking-[0.2em]">LUMORA</span>
          </div>
          <p className="text-[11px] text-white/18 font-mono">© 2025 Lumora · Secure Discord Bot Hosting</p>
          <div className="flex items-center gap-6 text-[11px] text-white/28 font-mono">
            <a href="#" className="hover:text-white/55 transition-colors">Status</a>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="hover:text-[#5865F2] transition-colors">Discord</a>
            <button onClick={() => setLocation('/login')} className="hover:text-white/55 transition-colors">Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
