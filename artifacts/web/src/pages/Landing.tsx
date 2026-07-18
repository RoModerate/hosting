import { useLocation } from 'wouter';
import {
  Github, Shield, Activity, RotateCw, Bot,
  MessageSquare, Terminal, ArrowRight,
} from 'lucide-react';

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
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<2s', label: 'Deploy time' },
  { value: '3×', label: 'Auto-repair' },
  { value: '100 MB', label: 'Max bot size' },
];

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full bg-[#080810] text-[#c8cde8] overflow-x-hidden animate-page-in">

      {/* ─── Background glows (static, GPU-composited — no JS transform) ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ willChange: 'auto' }}>
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-[0.07]"
          style={{
            background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)',
            transform: 'translate(-50%, 0) translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, #a78bfa 0%, transparent 70%)' }}
        />
      </div>

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-30 flex items-center justify-between h-14 px-6 md:px-12 border-b border-white/[0.05] bg-[#080810]/80 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <img src="/lumora-brand.png" alt="Lumora" className="h-7 w-7 object-contain" />
          <span className="font-mono font-bold text-sm tracking-[0.15em] text-white">LUMORA</span>
        </div>

        <div className="hidden md:flex items-center gap-7 text-sm text-white/40">
          <a href="#features" className="hover:text-white/70 transition-colors duration-200">Features</a>
          <a href="#runtimes" className="hover:text-white/70 transition-colors duration-200">Runtimes</a>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#5865F2] transition-colors duration-200"
          >
            Discord
          </a>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation('/login')}
            className="px-4 py-1.5 text-sm text-white/40 hover:text-white/70 transition-colors duration-200"
          >
            Login
          </button>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 pt-28 pb-24 flex flex-col lg:flex-row items-center gap-20">
        {/* Copy */}
        <div className="flex-1 lg:max-w-[520px]">
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-[1.08] tracking-tight mb-6">
            Your bot stays
            <br />
            <span className="text-[#6366f1]">online.</span>
            <span className="text-white/30"> Always.</span>
          </h1>

          <p className="text-base text-white/45 leading-relaxed mb-10 max-w-[420px]">
            Upload a ZIP or link a GitHub repo. Lumora installs your dependencies,
            starts your bot, and automatically repairs crashes — 24/7.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-14">
            <button
              onClick={() => setLocation('/login')}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#6366f1] hover:bg-[#7577f3] text-white transition-all duration-200 shadow-lg shadow-[#6366f1]/25 hover:shadow-[#6366f1]/35 hover:-translate-y-0.5"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-white/[0.08] bg-white/[0.02] text-white/50 hover:text-white/80 hover:border-white/[0.14] hover:bg-white/[0.04] transition-all duration-200"
            >
              <MessageSquare className="h-4 w-4 text-[#5865F2]" />
              Join Discord
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-white/[0.06]">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <div className="text-2xl font-bold text-white font-mono">{value}</div>
                <div className="text-[11px] text-white/30 mt-1 leading-snug">{label}</div>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* ─── Runtimes ─── */}
      <section id="runtimes" className="border-y border-white/[0.05] bg-[#0c0c16]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 flex flex-col md:flex-row items-center gap-8 md:gap-0">
          <p className="text-xs text-white/25 font-mono tracking-widest md:mr-14 shrink-0">SUPPORTED RUNTIMES</p>
          <div className="flex flex-col sm:flex-row gap-8 md:gap-16 w-full md:w-auto">
            {RUNTIMES.map(({ label, note, icon }) => (
              <div key={label} className="flex items-center gap-3">
                <img src={icon} alt={label} className="h-7 w-7 object-contain shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-white/75">{label}</div>
                  <div className="text-xs text-white/28 mt-0.5">{note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="max-w-6xl mx-auto px-6 md:px-12 py-28">
        <div className="mb-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything your bot needs</h2>
          <p className="text-white/35 text-base max-w-md mx-auto">No infrastructure knowledge required. Deploy in under 60 seconds.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, accent }) => (
            <div
              key={title}
              className="group relative rounded-2xl border border-white/[0.06] bg-[#0d0d18] p-6 hover:border-white/[0.10] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 overflow-hidden"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(circle at 30% 20%, ${accent}08 0%, transparent 60%)` }}
              />
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center mb-5 border"
                style={{ backgroundColor: `${accent}10`, borderColor: `${accent}20` }}
              >
                <Icon className="h-4.5 w-4.5" style={{ color: accent, opacity: 0.8 }} />
              </div>
              <h3 className="text-sm font-semibold text-white/85 mb-2.5">{title}</h3>
              <p className="text-xs text-white/35 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Discord Community ─── */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 pb-16">
        <div className="rounded-2xl border border-[#5865F2]/20 bg-[#5865F2]/[0.04] px-8 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-[#5865F2]/15 border border-[#5865F2]/25 flex items-center justify-center shrink-0">
              <MessageSquare className="h-7 w-7 text-[#5865F2]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Join our community</h2>
              <p className="text-white/40 text-sm">Get help, share feedback, and connect with other Lumora users on our Discord server.</p>
            </div>
          </div>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm bg-[#5865F2] hover:bg-[#6672f5] text-white transition-all duration-200 shadow-lg shadow-[#5865F2]/25 hover:-translate-y-0.5"
          >
            <MessageSquare className="h-4 w-4" />
            Join Discord Server
          </a>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 pb-28">
        <div className="rounded-2xl border border-[#6366f1]/20 bg-[#6366f1]/[0.04] px-10 py-14 flex flex-col items-center text-center gap-7">
          <div>
            <h2 className="text-3xl font-bold text-white mb-3">Ready to deploy?</h2>
            <p className="text-white/35 text-base max-w-md mx-auto">Log in with Discord and have your bot live in minutes.</p>
          </div>
          <button
            onClick={() => setLocation('/login')}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold text-sm bg-[#6366f1] hover:bg-[#7577f3] text-white transition-all duration-200 shadow-lg shadow-[#6366f1]/25 hover:shadow-[#6366f1]/35 hover:-translate-y-0.5"
          >
            Login with Discord <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.05] px-6 md:px-12 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-[#6366f1]/15 border border-[#6366f1]/20 flex items-center justify-center">
              <img src="/lumora-brand.png" alt="" className="h-3.5 w-3.5 object-contain opacity-60" />
            </div>
            <span className="font-mono text-xs text-white/22 tracking-widest">LUMORA</span>
          </div>
          <p className="text-xs text-white/18 font-mono">© 2025 Lumora · Secure Bot Hosting</p>
          <div className="flex items-center gap-5 text-xs text-white/28">
            <a href="#" className="hover:text-white/55 transition-colors">Status</a>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="hover:text-[#5865F2] transition-colors">Discord</a>
            <button onClick={() => setLocation('/login')} className="hover:text-white/55 transition-colors">Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
