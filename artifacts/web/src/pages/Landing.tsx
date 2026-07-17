import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Github, Shield, Activity, RotateCw, Bot, ChevronRight,
  MessageSquare, Terminal, Zap, ArrowRight, Sparkles,
} from 'lucide-react';

const DISCORD_INVITE = 'https://discord.gg/4wEKPrgZmD';

const RUNTIMES = [
  { label: 'Node.js', note: 'discord.js · Eris · Sapphire', color: '#6ee7b7' },
  { label: 'Python', note: 'discord.py · py-cord · hikari', color: '#93c5fd' },
  { label: 'Java', note: 'JDA · Javacord · D4J', color: '#fca5a5' },
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
  const heroRef = useRef<HTMLDivElement>(null);

  // Subtle parallax on the hero glow
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      el.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#080810] text-[#c8cde8] overflow-x-hidden animate-page-in">

      {/* ─── Background glows ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          ref={heroRef}
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-[0.07] transition-transform duration-700 ease-out"
          style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)' }}
        />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse, #a78bfa 0%, transparent 70%)' }}
        />
      </div>

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-30 flex items-center justify-between h-14 px-6 md:px-12 border-b border-white/[0.05] bg-[#080810]/80 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-[#6366f1]/20 border border-[#6366f1]/30 flex items-center justify-center">
            <img src="/lumora-icon.png" alt="Lumora" className="h-4 w-4 object-contain" />
          </div>
          <span className="font-mono font-bold text-sm tracking-[0.15em] text-white">LUMORA</span>
        </div>

        <div className="hidden md:flex items-center gap-7 text-sm text-white/40">
          <a href="#features" className="hover:text-white/70 transition-colors duration-200">Features</a>
          <a href="#runtimes" className="hover:text-white/70 transition-colors duration-200">Runtimes</a>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-[#5865F2] transition-colors duration-200"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Discord
          </a>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation('/login')}
            className="px-4 py-1.5 text-sm text-white/40 hover:text-white/70 transition-colors duration-200 font-medium"
          >
            Login
          </button>
          <button
            onClick={() => setLocation('/login')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-[#6366f1] hover:bg-[#7577f3] text-white transition-all duration-200 shadow-lg shadow-[#6366f1]/20"
          >
            Get Access
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 pt-28 pb-24 flex flex-col lg:flex-row items-center gap-20">
        {/* Copy */}
        <div className="flex-1 lg:max-w-[520px]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#6366f1]/20 bg-[#6366f1]/[0.06] text-xs font-mono text-[#a5b4fc] mb-8">
            <Sparkles className="h-3 w-3" />
            Discord bot hosting platform
          </div>

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

        {/* Portal preview card */}
        <div className="flex-1 w-full max-w-[460px]">
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden bg-[#0d0d18] shadow-2xl shadow-black/60">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-[#0f0f1c]">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
              </div>
              <div className="flex-1 flex justify-center">
                <span className="text-[10px] text-white/25 font-mono">lumora.host — portal</span>
              </div>
            </div>

            {/* Bot status row */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-[#6366f1]/70" />
                </div>
                <div>
                  <div className="text-[11px] text-white/70 font-semibold font-mono">my-discord-bot.zip</div>
                  <div className="text-[10px] text-white/25 mt-0.5 font-mono">node index.js</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-semibold font-mono">ONLINE</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 divide-x divide-white/[0.04] border-b border-white/[0.05]">
              {[['RESTARTS', '0'], ['UPTIME', '3d 4h'], ['REPAIRS', '0']].map(([k, v]) => (
                <div key={k} className="px-4 py-3">
                  <div className="text-[9px] text-white/22 mb-1.5 tracking-widest font-mono">{k}</div>
                  <div className="text-[12px] text-white/60 font-mono font-semibold">{v}</div>
                </div>
              ))}
            </div>

            {/* Console output */}
            <div className="px-4 py-3.5 border-b border-white/[0.04]">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Terminal className="h-3 w-3 text-white/20" />
                <span className="text-[9px] text-white/22 tracking-widest font-mono">CONSOLE</span>
              </div>
              <div className="space-y-1.5 text-[10px] text-white/40 font-mono">
                <div className="flex gap-2"><span className="text-white/18">12:04:21</span><span className="text-emerald-400/60">[INFO]</span><span>Logged in as MyBot#1234</span></div>
                <div className="flex gap-2"><span className="text-white/18">12:04:22</span><span className="text-emerald-400/60">[INFO]</span><span>Serving 142 guilds · 8,204 members</span></div>
                <div className="flex gap-2"><span className="text-white/18">12:04:22</span><span className="text-blue-400/60">[SYNC]</span><span>Commands synced (42 global)</span></div>
                <div className="flex items-center gap-1 text-white/18">
                  <span>›</span>
                  <span className="inline-block w-1.5 h-3 bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>

            {/* AI strip */}
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="h-3 w-3 text-[#6366f1]/50" />
                <span className="text-[9px] text-white/25 tracking-widest font-mono">AI AGENT</span>
              </div>
              <div className="text-[10px] text-white/35 leading-relaxed font-mono">
                All systems healthy. Bot has been online for 3 days without issues.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Runtimes ─── */}
      <section id="runtimes" className="border-y border-white/[0.05] bg-[#0c0c16]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 flex flex-col md:flex-row items-center gap-8 md:gap-0">
          <p className="text-xs text-white/25 font-mono tracking-widest md:mr-14 shrink-0">SUPPORTED RUNTIMES</p>
          <div className="flex flex-col sm:flex-row gap-8 md:gap-16 w-full md:w-auto">
            {RUNTIMES.map(({ label, note, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color, opacity: 0.7 }} />
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
              <img src="/lumora-icon.png" alt="" className="h-3.5 w-3.5 object-contain opacity-60" />
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
