import { useLocation } from 'wouter';
import { Github, Shield, Activity, RotateCw, Bot, Terminal, Zap, Server, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';

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
  { value: '3×', label: 'Auto-repair', icon: RotateCw },
  { value: '100 MB', label: 'Max bot size', icon: Server },
];

function useServerUptime() {
  const [uptime, setUptime] = useState<number | null>(null);

  useEffect(() => {
    const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
    fetch(`${BASE}/api/healthz`)
      .then(r => r.json())
      .then((d: any) => { if (typeof d.uptime === 'number') setUptime(d.uptime); })
      .catch(() => {});
  }, []);

  return uptime;
}

function RuntimeCounter() {
  const serverUptime = useServerUptime();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [serverUptime]);

  const totalSec = (serverUptime ?? 0) + elapsed;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const fmt = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025]">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
      <span className="font-mono text-[10px] text-white/35 tracking-widest">RUNTIME</span>
      <span className="font-mono text-[11px] text-white/60 tabular-nums tracking-wider">
        {fmt(h)}:{fmt(m)}:{fmt(s)}
      </span>
    </div>
  );
}

function MonitorPanel() {
  const serverUptime = useServerUptime();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const totalSec = (serverUptime ?? 0) + tick;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const fmt = (n: number) => String(n).padStart(2, '0');

  const processes = [
    { name: 'gateway-worker', cpu: '0.4%', mem: '48 MB', status: 'running' },
    { name: 'bot-runner-01',  cpu: '1.2%', mem: '112 MB', status: 'online' },
    { name: 'repair-engine',  cpu: '0.1%', mem: '24 MB', status: 'idle' },
  ];

  return (
    <div
      className="relative w-full max-w-[480px] rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #0c0c1a 0%, #0a0a14 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#6366f1]/80" />
          <span className="font-mono text-[10px] text-white/25 tracking-[0.25em]">PROCESS MONITOR</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-white/20 tracking-widest tabular-nums">
            {fmt(h)}:{fmt(m)}:{fmt(s)}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* Metric row */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.05] border-b border-white/[0.05]">
        {[
          { label: 'CPU', value: '1.7%' },
          { label: 'MEMORY', value: '184 MB' },
          { label: 'PROCESSES', value: '3' },
        ].map(({ label, value }) => (
          <div key={label} className="px-4 py-3 flex flex-col gap-0.5">
            <span className="font-mono text-[9px] text-white/20 tracking-[0.2em]">{label}</span>
            <span className="font-mono text-sm text-white/70 font-bold tabular-nums">{value}</span>
          </div>
        ))}
      </div>

      {/* Process list */}
      <div className="p-3 space-y-1">
        <div className="grid grid-cols-[1fr_48px_72px_52px] gap-1 px-2 mb-2">
          {['PROCESS', 'CPU', 'MEM', 'STATE'].map(h => (
            <span key={h} className="font-mono text-[8.5px] text-white/18 tracking-[0.2em]">{h}</span>
          ))}
        </div>
        {processes.map((p) => (
          <div key={p.name}
            className="grid grid-cols-[1fr_48px_72px_52px] gap-1 px-2 py-1.5 rounded-lg hover:bg-white/[0.02] transition-colors"
          >
            <span className="font-mono text-[11px] text-white/55 truncate">{p.name}</span>
            <span className="font-mono text-[11px] text-white/35 tabular-nums">{p.cpu}</span>
            <span className="font-mono text-[11px] text-white/35 tabular-nums">{p.mem}</span>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                p.status === 'online' ? 'bg-emerald-400' :
                p.status === 'running' ? 'bg-blue-400 animate-pulse' :
                'bg-white/20'
              }`} />
              <span className={`font-mono text-[9px] ${
                p.status === 'online' ? 'text-emerald-400/70' :
                p.status === 'running' ? 'text-blue-400/70' :
                'text-white/25'
              }`}>{p.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-2.5 border-t border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[9px] text-emerald-400/60 tracking-wider">ALL PROCESSES NOMINAL</span>
        </div>
        <span className="font-mono text-[9px] text-white/15 tabular-nums">PID:2847 · HOST:lumora</span>
      </div>

      {/* Corner glow */}
      <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 100% 0%, rgba(99,102,241,0.08) 0%, transparent 70%)' }}
      />
    </div>
  );
}

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full bg-[#080810] text-[#c8cde8] overflow-x-hidden animate-page-in">

      {/* ─── Background ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: `linear-gradient(rgba(99,102,241,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.9) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />
        <div className="absolute -top-40 left-1/2 w-[800px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)', transform: 'translate(-50%, 0)' }}
        />
      </div>

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-30 flex items-center justify-between h-14 px-6 md:px-14 border-b border-white/[0.05] bg-[#080810]/95 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <img src="/lumora-brand.png" alt="Lumora" className="h-6 w-6 object-contain opacity-90" />
          <span className="font-mono font-bold text-sm tracking-[0.2em] text-white/90">LUMORA</span>
        </div>

        <div className="hidden md:flex items-center gap-7 text-[12px] text-white/30 font-mono">
          <a href="#features" className="hover:text-white/60 transition-colors">Features</a>
          <a href="#runtimes" className="hover:text-white/60 transition-colors">Runtimes</a>
        </div>

        <div className="flex items-center gap-3">
          <RuntimeCounter />
          <button
            onClick={() => setLocation('/login')}
            className="px-4 py-1.5 text-xs font-mono font-medium text-white/75 rounded-lg border border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.06] hover:text-white hover:border-white/[0.2] transition-all duration-200"
          >
            Login
          </button>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="max-w-7xl mx-auto px-6 md:px-14 pt-24 pb-20 flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
        <div className="flex-1 lg:max-w-[540px]">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-[#6366f1]/20 bg-[#6366f1]/[0.05] mb-8">
            <span className="font-mono text-[9px] text-[#6366f1]/60 tracking-[0.3em]">V2 · PRODUCTION</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-[64px] font-black text-white leading-[1.04] tracking-tight mb-6">
            Your Discord bot,
            <br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)' }}>
              always online.
            </span>
          </h1>

          <p className="text-[15px] text-white/40 leading-relaxed mb-10 max-w-[420px]">
            Upload a ZIP or link a GitHub repo. Lumora installs your
            dependencies, starts your bot, and automatically repairs crashes — 24/7.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <button
              onClick={() => setLocation('/login')}
              className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                boxShadow: '0 4px 24px rgba(99,102,241,0.30), 0 0 0 1px rgba(99,102,241,0.2)',
              }}
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-[10px] font-mono text-white/18 tracking-[0.25em]">NO CREDIT CARD · DEPLOY IN 60 SECONDS · FULL CONTROL</p>
        </div>

        <div className="flex-1 flex justify-center lg:justify-end w-full">
          <MonitorPanel />
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="border-y border-white/[0.05] bg-[#0b0b17]">
        <div className="max-w-7xl mx-auto px-6 md:px-14 py-0">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.04]">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="px-8 py-8 flex flex-col items-center text-center gap-2 group">
                <div className="h-8 w-8 rounded-lg border border-[#6366f1]/15 bg-[#6366f1]/[0.06] flex items-center justify-center mb-1">
                  <Icon className="h-3.5 w-3.5 text-[#6366f1]/50" />
                </div>
                <div className="text-3xl font-black text-white font-mono tracking-tight">{value}</div>
                <div className="text-[10px] text-white/25 font-mono tracking-[0.2em]">{label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Runtimes ─── */}
      <section id="runtimes" className="max-w-7xl mx-auto px-6 md:px-14 py-12">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
          <p className="text-[9px] text-white/20 font-mono tracking-[0.3em] shrink-0">SUPPORTED RUNTIMES</p>
          <div className="flex flex-col sm:flex-row gap-6 md:gap-12">
            {RUNTIMES.map(({ label, note, icon }) => (
              <div key={label} className="flex items-center gap-3 group">
                <div className="h-9 w-9 rounded-lg border border-white/[0.07] bg-white/[0.02] flex items-center justify-center group-hover:border-white/[0.12] transition-colors">
                  <img src={icon} alt={label} className="h-4.5 w-4.5 object-contain" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white/70">{label}</div>
                  <div className="text-[10px] text-white/25 mt-0.5 font-mono">{note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="max-w-7xl mx-auto px-6 md:px-14 py-20">
        <div className="mb-14 text-center">
          <p className="text-[9px] font-mono tracking-[0.3em] text-[#6366f1]/50 mb-3">PLATFORM CAPABILITIES</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">Everything your bot needs</h2>
          <p className="text-white/30 text-sm max-w-md mx-auto">No infrastructure knowledge required. Deploy in under 60 seconds.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map(({ icon: Icon, title, desc, accent }) => (
            <div
              key={title}
              className="group relative rounded-xl border border-white/[0.06] bg-[#0d0d18] p-5 hover:border-white/[0.11] transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
                style={{ background: `radial-gradient(circle at 30% 20%, ${accent}0d 0%, transparent 60%)` }}
              />
              <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-4 border transition-all duration-300"
                style={{ backgroundColor: `${accent}0d`, borderColor: `${accent}1a` }}>
                <Icon className="h-4 w-4" style={{ color: accent, opacity: 0.75 }} />
              </div>
              <h3 className="text-[13px] font-bold text-white/80 mb-2 tracking-wide">{title}</h3>
              <p className="text-[11px] text-white/32 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="max-w-7xl mx-auto px-6 md:px-14 pb-28">
        <div
          className="rounded-2xl px-10 py-14 flex flex-col items-center text-center gap-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(124,58,237,0.04) 100%)', border: '1px solid rgba(99,102,241,0.12)' }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 55%)' }}
          />
          <div className="relative">
            <p className="text-[9px] font-mono tracking-[0.3em] text-[#6366f1]/50 mb-3">GET STARTED</p>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Ready to deploy?</h2>
            <p className="text-white/30 text-sm max-w-sm mx-auto">Log in with Discord and have your bot live in minutes.</p>
          </div>
          <button
            onClick={() => setLocation('/login')}
            className="relative flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}
          >
            Launch Your Bot <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.04] px-6 md:px-14 py-7">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/lumora-brand.png" alt="" className="h-4 w-4 object-contain opacity-30" />
            <span className="font-mono text-[10px] text-white/18 tracking-[0.25em]">LUMORA</span>
          </div>
          <p className="text-[10px] text-white/15 font-mono">© 2025 Lumora · Secure Discord Bot Hosting</p>
          <div className="flex items-center gap-5 text-[10px] text-white/22 font-mono">
            <a href="#features" className="hover:text-white/50 transition-colors">Features</a>
            <button onClick={() => setLocation('/login')} className="hover:text-white/50 transition-colors">Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
