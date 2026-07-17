import { useLocation } from 'wouter';
import { Zap, Terminal, Github, MessageSquare, Activity, Shield, Clock, ChevronRight, Bot, Server, Cpu } from 'lucide-react';

const OFFERS = [
  {
    icon: '🐍',
    label: 'Python',
    color: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
    accent: 'text-blue-400',
    desc: 'Host your Python Discord bots seamlessly. Supports discord.py, py-cord, and more.',
  },
  {
    icon: '🟩',
    label: 'Node.js',
    color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
    accent: 'text-emerald-400',
    desc: 'Run your discord.js or Eris bots with zero config. npm packages installed automatically.',
  },
  {
    icon: '☕',
    label: 'Java',
    color: 'from-orange-500/20 to-orange-600/5 border-orange-500/20',
    accent: 'text-orange-400',
    desc: 'JDA and Javacord bots supported. Upload your JAR or Maven project zip.',
  },
];

const STATS = [
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<2s', label: 'Deploy time' },
  { value: '100MB', label: 'Max bot size' },
  { value: '3x', label: 'Auto-repair' },
];

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#080810] text-white">
      {/* Background gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-[600px] h-[400px] rounded-full bg-indigo-600/8 blur-[100px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[400px] rounded-full bg-purple-600/8 blur-[100px]" />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(hsl(265 80% 60%) 1px, transparent 1px), linear-gradient(90deg, hsl(265 80% 60%) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center border border-violet-500/40 bg-violet-500/10"
            style={{ boxShadow: '0 0 14px rgba(139,92,246,0.3)' }}
          >
            <Zap className="h-4 w-4 text-violet-400" />
          </div>
          <span className="font-mono font-bold text-sm tracking-[0.18em] text-white">LUMORA</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/50">
          <a href="#features" className="hover:text-white/90 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white/90 transition-colors">Pricing</a>
          <a href="https://discord.gg" target="_blank" rel="noreferrer" className="hover:text-white/90 transition-colors flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Discord
          </a>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation('/login')}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            Login
          </button>
          <button
            onClick={() => setLocation('/login')}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            style={{ boxShadow: '0 0 18px rgba(139,92,246,0.35)' }}
          >
            Get Access →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-16 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Left: copy */}
        <div className="flex-1 space-y-7 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/8 text-xs font-mono text-violet-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-400" />
            </span>
            AI-powered crash repair · always on
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight">
            <span className="text-white">Fast, Reliable &</span>
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #c084fc 100%)' }}
            >
              Affordable.
            </span>
          </h1>

          <p className="text-base md:text-lg text-white/50 leading-relaxed max-w-md mx-auto lg:mx-0">
            Upload your Discord bot and we'll run it 24/7. Python, Node.js, or Java — get online in under 2 seconds with automatic dependency installation and AI-assisted crash repair.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <button
              onClick={() => setLocation('/login')}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all"
              style={{ boxShadow: '0 0 24px rgba(139,92,246,0.4)' }}
            >
              Get Started
              <ChevronRight className="h-4 w-4" />
            </button>
            <a
              href="https://discord.gg"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-white/10 bg-white/5 hover:bg-white/8 text-white/80 transition-all"
            >
              <MessageSquare className="h-4 w-4" />
              Join Discord
            </a>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center lg:text-left">
                <div className="text-xl font-bold text-violet-300 font-mono">{value}</div>
                <div className="text-[11px] text-white/40 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: mock dashboard preview */}
        <div className="flex-1 w-full max-w-xl">
          <div
            className="relative rounded-2xl border border-white/8 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(15,14,28,0.95) 0%, rgba(10,9,20,0.98) 100%)',
              boxShadow: '0 0 0 1px rgba(139,92,246,0.15), 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(139,92,246,0.08)',
              transform: 'perspective(1000px) rotateY(-4deg) rotateX(2deg)',
            }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
              <span className="ml-3 text-[10px] font-mono text-white/20">lumora.host — dashboard</span>
            </div>

            <div className="flex">
              {/* Sidebar */}
              <div className="w-36 border-r border-white/5 p-3 space-y-1 bg-white/1 shrink-0">
                {[
                  { icon: <Activity className="h-3 w-3" />, label: 'Overview', active: true },
                  { icon: <Server className="h-3 w-3" />, label: 'Projects', active: false },
                  { icon: <Terminal className="h-3 w-3" />, label: 'Files', active: false },
                  { icon: <Cpu className="h-3 w-3" />, label: 'Addons', active: false },
                  { icon: <Shield className="h-3 w-3" />, label: 'Secrets', active: false },
                  { icon: <Clock className="h-3 w-3" />, label: 'Settings', active: false },
                ].map(({ icon, label, active }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-mono ${
                      active
                        ? 'bg-violet-500/15 text-violet-300'
                        : 'text-white/25 hover:text-white/40'
                    }`}
                  >
                    {icon}
                    {label}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-4 space-y-3">
                {/* Bot card */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[11px] font-mono text-white/70 font-semibold">my-discord-bot.zip</div>
                      <div className="text-[9px] font-mono text-white/30 mt-0.5">Active Deployment</div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold">ONLINE</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[['RESTARTS', '0'], ['UPTIME', '3d 4h'], ['CMD', 'node index.js']].map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-black/30 border border-white/5 p-2">
                        <div className="text-[8px] font-mono text-white/30">{k}</div>
                        <div className="text-[9px] font-mono text-white/70 truncate mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Console */}
                <div className="rounded-xl border border-white/5 bg-black/40 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="h-3 w-3 text-violet-400" />
                      <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">Console</span>
                    </div>
                  </div>
                  <div className="p-3 space-y-1 font-mono text-[9px]">
                    <div><span className="text-violet-400/70">›</span> <span className="text-white/50">Logged in as MyBot#1234</span></div>
                    <div><span className="text-emerald-400/70">›</span> <span className="text-white/50">Serving 42 guilds · 8,200 members</span></div>
                    <div><span className="text-blue-400/70">›</span> <span className="text-white/50">Commands synced successfully</span></div>
                    <div className="flex items-center gap-1">
                      <span className="text-white/20">›</span>
                      <span className="inline-block w-1.5 h-3 bg-violet-400/60 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Offers ── */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Host Any Bot, Any Language
          </h2>
          <p className="text-white/40 text-base max-w-md mx-auto">
            Hosting so simple, we can't put it in words — but we'll try.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {OFFERS.map(({ icon, label, color, accent, desc }) => (
            <div
              key={label}
              className={`group rounded-2xl border bg-gradient-to-b p-6 transition-all duration-300 hover:scale-[1.02] cursor-default ${color}`}
            >
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className={`text-lg font-bold mb-2 ${accent}`}>{label}</h3>
              <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Extra features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {[
            { icon: <Bot className="h-5 w-5 text-violet-400" />, title: 'AI Crash Repair', desc: 'Automatic 3-attempt repair loop powered by OpenRouter' },
            { icon: <Github className="h-5 w-5 text-white/60" />, title: 'GitHub Import', desc: 'Deploy directly from a public or private repository URL' },
            { icon: <Shield className="h-5 w-5 text-indigo-400" />, title: 'Isolated Sandbox', desc: 'Each bot runs in its own process with scoped file access' },
            { icon: <Activity className="h-5 w-5 text-emerald-400" />, title: 'Live Monitoring', desc: 'Real-time status, logs, and restart controls in your portal' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-white/6 bg-white/2 p-5 space-y-2">
              {icon}
              <div className="text-sm font-semibold text-white/80">{title}</div>
              <div className="text-xs text-white/35 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div
          className="rounded-2xl border border-violet-500/20 p-10 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(99,102,241,0.06) 100%)' }}
        >
          <h2 className="text-3xl font-bold text-white mb-3">Ready to get started?</h2>
          <p className="text-white/40 mb-7 text-base">Enter your staff-issued access key and have your bot online in minutes.</p>
          <button
            onClick={() => setLocation('/login')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500 text-white transition-all"
            style={{ boxShadow: '0 0 30px rgba(139,92,246,0.4)' }}
          >
            Activate Access Key
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 px-6 md:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-violet-400" />
          <span className="font-mono text-xs text-white/30 tracking-widest">LUMORA</span>
        </div>
        <p className="text-xs text-white/20 font-mono">© 2025 Lumora · Secure Bot Hosting</p>
        <div className="flex items-center gap-5 text-xs text-white/30">
          <a href="#" className="hover:text-white/50 transition-colors">Status</a>
          <a href="#" className="hover:text-white/50 transition-colors">Discord</a>
          <button onClick={() => setLocation('/login')} className="hover:text-white/50 transition-colors">Login</button>
        </div>
      </footer>
    </div>
  );
}
