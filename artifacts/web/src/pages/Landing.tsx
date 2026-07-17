import { useLocation } from 'wouter';
import { Zap, Terminal, Github, Shield, Activity, RotateCw, Bot, ChevronRight, MessageSquare } from 'lucide-react';

const RUNTIMES = [
  { label: 'Python', note: 'discord.py · py-cord · hikari' },
  { label: 'Node.js', note: 'discord.js · Eris · Sapphire' },
  { label: 'Java', note: 'JDA · Javacord · D4J' },
];

const FEATURES = [
  { icon: Bot, title: 'AI Crash Repair', desc: 'When your bot crashes, our system automatically attempts up to 3 repairs before alerting you.' },
  { icon: Github, title: 'GitHub Import', desc: 'Deploy directly from any public repository — we clone, zip, and launch it automatically.' },
  { icon: RotateCw, title: 'Auto-Restart', desc: 'Crash detection keeps your bot online. Instant restart on exit with configurable retry logic.' },
  { icon: Shield, title: 'Process Isolation', desc: 'Every bot runs in its own sandbox with scoped filesystem access and no cross-tenant leakage.' },
  { icon: Activity, title: 'Live Monitoring', desc: 'Real-time status, restart count, and crash logs visible in your portal at all times.' },
  { icon: Terminal, title: 'Zero-Config Deps', desc: 'pip, npm, and Maven dependencies are detected and installed automatically from your project files.' },
];

const STATS = [
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<2s', label: 'Deploy time' },
  { value: '100 MB', label: 'Max bot size' },
  { value: '3×', label: 'Auto-repair attempts' },
];

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full bg-[#0b0b0f] text-[#d4d4e0] overflow-x-hidden">

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-30 flex items-center justify-between h-14 px-6 md:px-12 border-b border-white/[0.06] bg-[#0b0b0f]/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Zap className="h-4 w-4 text-[#5c6cf5]" />
          <span className="font-mono font-bold text-sm tracking-[0.2em] text-white">LUMORA</span>
        </div>

        <div className="hidden md:flex items-center gap-7 text-sm text-white/40">
          <a href="#features" className="hover:text-white/70 transition-colors">Features</a>
          <a href="#runtimes" className="hover:text-white/70 transition-colors">Runtimes</a>
          <a href="https://discord.gg" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
            <MessageSquare className="h-3.5 w-3.5" /> Discord
          </a>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation('/login')}
            className="px-4 py-1.5 text-sm text-white/50 hover:text-white/80 transition-colors font-medium"
          >
            Login
          </button>
          <button
            onClick={() => setLocation('/login')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-semibold bg-[#3d4df0] hover:bg-[#4b5af2] text-white transition-colors"
          >
            Get Access
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 pt-24 pb-20 flex flex-col lg:flex-row items-center gap-16">
        {/* Copy */}
        <div className="flex-1 lg:max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-mono text-white/40 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5c6cf5]" />
            Discord bot hosting platform
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-5">
            Your bot stays online.
            <br />
            <span className="text-[#d4d4e0]/60">We handle the rest.</span>
          </h1>

          <p className="text-base text-white/45 leading-relaxed mb-8 max-w-sm">
            Upload a ZIP or link a GitHub repo. Lumora installs your dependencies,
            starts your bot, and automatically repairs crashes — 24/7.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-12">
            <button
              onClick={() => setLocation('/login')}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-sm font-semibold bg-[#3d4df0] hover:bg-[#4b5af2] text-white transition-colors"
            >
              Get Started <ChevronRight className="h-4 w-4" />
            </button>
            <a
              href="https://discord.gg"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-sm font-semibold border border-white/[0.09] text-white/55 hover:text-white/80 hover:border-white/[0.14] transition-colors"
            >
              <MessageSquare className="h-4 w-4" /> Join Discord
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-white/[0.06]">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <div className="text-xl font-bold text-white font-mono">{value}</div>
                <div className="text-[11px] text-white/35 mt-0.5 leading-snug">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mock dashboard */}
        <div className="flex-1 w-full max-w-lg">
          <div className="rounded-xl border border-white/[0.07] overflow-hidden bg-[#111116]">
            {/* Window bar */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06] bg-[#0e0e13]">
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="ml-3 text-[10px] font-mono text-white/20">lumora.host — portal</span>
            </div>

            <div className="p-5 space-y-3">
              {/* Bot card */}
              <div className="rounded-lg border border-white/[0.08] bg-[#16161c] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-mono text-white/75 font-semibold">my-discord-bot.zip</div>
                    <div className="text-[10px] font-mono text-white/30 mt-0.5">Active deployment</div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/8">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[9px] font-mono text-emerald-400 font-bold">ONLINE</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['RESTARTS', '0'], ['UPTIME', '3d 4h'], ['CMD', 'node index.js']].map(([k, v]) => (
                    <div key={k} className="rounded-md bg-[#0e0e13] border border-white/[0.05] p-2">
                      <div className="text-[8px] font-mono text-white/25">{k}</div>
                      <div className="text-[9px] font-mono text-white/60 truncate mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Console */}
              <div className="rounded-lg border border-white/[0.06] bg-[#0e0e13] overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05]">
                  <Terminal className="h-3 w-3 text-white/25" />
                  <span className="text-[9px] font-mono text-white/25 tracking-wider">CONSOLE</span>
                </div>
                <div className="p-3 space-y-1.5 font-mono text-[9px]">
                  <div className="text-white/40">{'>'} Logged in as MyBot#1234</div>
                  <div className="text-white/40">{'>'} Serving 42 guilds · 8,200 members</div>
                  <div className="text-white/40">{'>'} Commands synced successfully</div>
                  <div className="flex items-center gap-1">
                    <span className="text-white/20">{'>'}</span>
                    <span className="inline-block w-1.5 h-3 bg-white/20 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Runtimes ─── */}
      <section id="runtimes" className="border-y border-white/[0.06] bg-[#0e0e13]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-12 flex flex-col md:flex-row items-center gap-6 md:gap-0">
          <p className="text-sm text-white/35 font-mono tracking-wider md:mr-12 shrink-0">SUPPORTED RUNTIMES</p>
          <div className="flex flex-col sm:flex-row gap-6 md:gap-12 w-full md:w-auto">
            {RUNTIMES.map(({ label, note }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5c6cf5]/60 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-white/80">{label}</div>
                  <div className="text-xs text-white/35 mt-0.5">{note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="max-w-6xl mx-auto px-6 md:px-12 py-24">
        <div className="mb-14">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Everything your bot needs</h2>
          <p className="text-white/40 text-base">No infrastructure knowledge required. Deploy in under 60 seconds.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.05] rounded-xl overflow-hidden border border-white/[0.05]">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[#0b0b0f] p-6 hover:bg-[#0f0f14] transition-colors">
              <Icon className="h-5 w-5 text-white/30 mb-4" />
              <h3 className="text-sm font-semibold text-white/85 mb-2">{title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 py-8 pb-24">
        <div className="rounded-xl border border-white/[0.07] bg-[#111116] px-10 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Ready to deploy?</h2>
            <p className="text-white/40 text-sm">Enter your staff-issued access key and have your bot live in minutes.</p>
          </div>
          <button
            onClick={() => setLocation('/login')}
            className="shrink-0 flex items-center gap-2 px-7 py-3 rounded-md font-semibold text-sm bg-[#3d4df0] hover:bg-[#4b5af2] text-white transition-colors"
          >
            Activate Access Key <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.06] px-6 md:px-12 py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-[#5c6cf5]" />
          <span className="font-mono text-xs text-white/30 tracking-widest">LUMORA</span>
        </div>
        <p className="text-xs text-white/20 font-mono">© 2025 Lumora · Secure Bot Hosting</p>
        <div className="flex items-center gap-5 text-xs text-white/30">
          <a href="#" className="hover:text-white/50 transition-colors">Status</a>
          <a href="https://discord.gg" target="_blank" rel="noreferrer" className="hover:text-white/50 transition-colors">Discord</a>
          <button onClick={() => setLocation('/login')} className="hover:text-white/50 transition-colors">Login</button>
        </div>
      </footer>
    </div>
  );
}
