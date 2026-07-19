import { useLocation } from 'wouter';
import { ArrowRight, Check, Github, RotateCw, Bot, Zap, Shield, Server } from 'lucide-react';
import { useState, useEffect } from 'react';

// ─── Dashboard preview mockup ─────────────────────────────────────────────────
function DashboardPreview() {
  const [logLines, setLogLines] = useState([
    '> Starting bot process…',
    '> Installing dependencies…',
    '✓ npm install complete',
    '✓ Bot logged in as MyBot#1234',
    '🟢 Listening for events',
  ]);

  useEffect(() => {
    const extras = [
      '> Command /help used by User',
      '> Processing slash command…',
      '✓ Response sent (43ms)',
      '> Event: guildMemberAdd',
    ];
    let i = 0;
    const id = setInterval(() => {
      setLogLines(prev => [...prev.slice(-7), extras[i % extras.length]]);
      i++;
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full max-w-[540px] rounded-xl overflow-hidden select-none"
      style={{
        background: '#0a0a12',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.08)',
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#0c0c18]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#27c93f]/60" />
          </div>
          <span className="font-mono text-[11px] text-white/40">MyBot</span>
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[9px] text-emerald-400/80">ONLINE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono text-emerald-400/80 border border-emerald-500/20 bg-emerald-500/[0.07] flex items-center gap-1.5">
            <span>▷</span> START
          </div>
          <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono text-white/30 border border-white/[0.07] flex items-center gap-1.5">
            ↺ RESTART
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-32 border-r border-white/[0.05] py-2 shrink-0">
          {[
            { label: 'Overview', active: true },
            { label: 'Manage', active: false },
            { label: 'Files', active: false },
            { label: 'Addons', active: false },
            { label: 'Settings', active: false },
          ].map(({ label, active }) => (
            <div key={label} className={`px-3 py-1.5 text-[10px] font-mono ${active ? 'text-white/70 bg-white/[0.04]' : 'text-white/25'}`}>
              {label}
            </div>
          ))}
        </div>

        {/* Console */}
        <div className="flex-1 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-white/[0.04]">
            <span className="font-mono text-[9px] text-white/25 tracking-widest">CONSOLE</span>
          </div>
          <div className="p-3 space-y-0.5 font-mono text-[10px]" style={{ minHeight: 160 }}>
            {logLines.map((line, i) => (
              <div key={i} className={`${
                line.startsWith('✓') ? 'text-emerald-400/70' :
                line.startsWith('🟢') ? 'text-emerald-300/80' :
                line.startsWith('>') ? 'text-white/50' :
                'text-white/30'
              }`}>{line}</div>
            ))}
            <div className="flex items-center gap-1">
              <span className="text-white/40">▊</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Free', price: '$0', period: '/mo',
    note: 'Gets offline every 6h',
    features: ['1 project', '6h uptime per session', '100 MB storage', 'AI crash repair'],
    accent: '#6b7280', border: 'border-white/[0.07]', bg: 'bg-white/[0.02]',
    cta: 'Start Free', featured: false,
  },
  {
    name: 'Pro', price: '$5', period: '/mo',
    note: 'Always online',
    features: ['1 project', '24/7 uptime', '512 MB storage', 'AI crash repair', 'GitHub deploy'],
    accent: '#6366f1', border: 'border-[#6366f1]/25', bg: 'bg-[#6366f1]/[0.05]',
    cta: 'Start Pro', featured: true,
  },
  {
    name: 'Business', price: '$15', period: '/mo',
    note: 'For multiple bots',
    features: ['5 projects', '24/7 uptime', '2 GB storage', 'Unlimited AI repair', 'Priority support'],
    accent: '#a78bfa', border: 'border-[#a78bfa]/15', bg: 'bg-white/[0.02]',
    cta: 'Start Business', featured: false,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full bg-[#080810] text-[#c8cde8] overflow-x-hidden animate-page-in">

      {/* ─── Background glow ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 w-[1000px] h-[600px] rounded-full -translate-x-1/2 opacity-[0.12]"
          style={{ background: 'radial-gradient(ellipse, #7c3aed 0%, #6366f1 40%, transparent 70%)' }} />
      </div>

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-30 flex items-center justify-between h-14 px-6 md:px-16 border-b border-white/[0.05] bg-[#080810]/90 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <img src="/lumora-brand.png" alt="Lumora" className="h-6 w-6 object-contain opacity-90" />
          <span className="font-mono font-bold text-sm tracking-[0.2em] text-white/90">LUMORA</span>
        </div>

        <div className="hidden md:flex items-center gap-7 text-[12px] text-white/30 font-mono">
          <button onClick={() => setLocation('/pricing')} className="hover:text-white/60 transition-colors">Pricing</button>
          <a href="#features" className="hover:text-white/60 transition-colors">Features</a>
          <a href="https://discord.gg" target="_blank" rel="noreferrer" className="hover:text-white/60 transition-colors">Discord</a>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={() => setLocation('/login')} className="px-4 py-1.5 text-xs font-mono text-white/55 rounded-lg border border-white/[0.10] bg-white/[0.02] hover:text-white/80 hover:border-white/[0.18] transition-all">
            LOGIN
          </button>
          <button onClick={() => setLocation('/login')} className="px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-all hover:-translate-y-px hover:opacity-90" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}>
            SIGN UP
          </button>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="max-w-7xl mx-auto px-6 md:px-16 pt-20 pb-16 flex flex-col lg:flex-row items-center gap-14 lg:gap-8">
        <div className="flex-1 lg:max-w-[520px]">
          <h1 className="text-5xl md:text-6xl lg:text-[64px] font-black text-white leading-[1.03] tracking-tight mb-5">
            Simple, Reliable<br />& Always Online.
          </h1>
          <p className="text-[15px] text-white/40 leading-relaxed mb-8 max-w-[400px]">
            Join Lumora and experience zero-hassle Discord bot hosting. Upload your code, we handle the rest.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <button onClick={() => setLocation('/login')} className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', boxShadow: '0 6px 24px rgba(99,102,241,0.35)' }}>
              Get Started <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => setLocation('/pricing')} className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white/60 border border-white/[0.10] bg-white/[0.02] hover:border-white/[0.18] hover:text-white/80 transition-all">
              Pricing
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-start gap-8">
            <div>
              <p className="font-mono text-[9px] text-white/20 tracking-[0.2em] mb-1">UPTIME</p>
              <p className="font-mono text-xl font-black text-white/80">99.9%</p>
            </div>
            <div className="w-px h-10 bg-white/[0.07] self-center" />
            <div>
              <p className="font-mono text-[9px] text-white/20 tracking-[0.2em] mb-1">DEPLOY TIME</p>
              <p className="font-mono text-xl font-black text-white/80">&lt; 60s</p>
            </div>
            <div className="w-px h-10 bg-white/[0.07] self-center" />
            <div>
              <p className="font-mono text-[9px] text-white/20 tracking-[0.2em] mb-1">AI REPAIRS</p>
              <p className="font-mono text-xl font-black text-white/80">Auto</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex justify-center lg:justify-end w-full">
          <DashboardPreview />
        </div>
      </section>

      {/* ─── Runtimes / Offers ─── */}
      <section id="features" className="border-y border-white/[0.04] bg-[#0b0b18] py-12">
        <div className="max-w-7xl mx-auto px-6 md:px-16">
          <p className="text-center font-mono text-[9px] tracking-[0.3em] text-white/20 mb-10">SUPPORTED RUNTIMES</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                name: 'Node.js',
                frameworks: 'discord.js · Sapphire · Eris',
                desc: 'Host your Node.js bots with zero config. Supports all major Discord frameworks and automatic npm install.',
                accent: '#84cc16',
                icon: 'JS',
              },
              {
                name: 'Python',
                frameworks: 'discord.py · py-cord · hikari',
                desc: 'Deploy Python bots effortlessly. pip requirements are auto-installed from your requirements.txt.',
                accent: '#3b82f6',
                icon: 'PY',
              },
              {
                name: 'Java',
                frameworks: 'JDA · Javacord · D4J',
                desc: 'Run JVM-based bots with full Maven/Gradle support and automatic dependency resolution.',
                accent: '#f97316',
                icon: 'JV',
              },
            ].map(({ name, frameworks, desc, accent, icon }) => (
              <div key={name} className="rounded-xl border border-white/[0.07] bg-[#0d0d1a] p-5 group hover:border-white/[0.12] transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center font-mono text-xs font-black shrink-0"
                    style={{ background: `${accent}15`, border: `1px solid ${accent}30`, color: accent }}>
                    {icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-white/80 text-sm">{name}</h3>
                    <p className="font-mono text-[9px] text-white/25">{frameworks}</p>
                  </div>
                </div>
                <p className="text-[11px] text-white/35 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="max-w-7xl mx-auto px-6 md:px-16 py-20">
        <p className="text-center font-mono text-[9px] tracking-[0.3em] text-[#6366f1]/50 mb-3">PLATFORM CAPABILITIES</p>
        <h2 className="text-center text-3xl font-black text-white mb-3 tracking-tight">Everything your bot needs</h2>
        <p className="text-center text-white/30 text-sm mb-12 max-w-md mx-auto">No infrastructure knowledge required.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Bot, title: 'AI Crash Repair', desc: 'Automatically diagnoses and patches crashes — up to 3 attempts before alerting you.', accent: '#a78bfa' },
            { icon: Github, title: 'GitHub Import', desc: 'Deploy directly from any public GitHub repo. Clone, install, launch — automatically.', accent: '#6ee7b7' },
            { icon: RotateCw, title: 'Auto-Restart', desc: '24/7 process monitoring. Instant restart on crash with configurable retry logic.', accent: '#93c5fd' },
            { icon: Shield, title: 'Sandboxed', desc: 'Every bot runs in its own isolated sandbox. No cross-user data leakage.', accent: '#fca5a5' },
            { icon: Zap, title: 'Live Console', desc: 'Real-time log stream with timestamps visible directly in your portal.', accent: '#fcd34d' },
            { icon: Server, title: 'Persistent Files', desc: 'Your bot files and data persist across restarts. Never lose your data.', accent: '#f9a8d4' },
          ].map(({ icon: Icon, title, desc, accent }) => (
            <div key={title} className="rounded-xl border border-white/[0.06] bg-[#0d0d18] p-5 hover:border-white/[0.11] transition-all duration-300 hover:-translate-y-0.5 group relative overflow-hidden">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(circle at 30% 20%, ${accent}0d 0%, transparent 60%)` }} />
              <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${accent}12`, border: `1px solid ${accent}20` }}>
                <Icon className="h-3.5 w-3.5" style={{ color: accent, opacity: 0.8 }} />
              </div>
              <h3 className="text-[12px] font-bold text-white/75 mb-1.5">{title}</h3>
              <p className="text-[10px] text-white/30 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 md:px-16 pb-20">
        <p className="text-center font-mono text-[9px] tracking-[0.3em] text-[#6366f1]/50 mb-3">PRICING</p>
        <h2 className="text-center text-3xl font-black text-white mb-3 tracking-tight">Simple, honest pricing.</h2>
        <p className="text-center text-white/30 text-sm mb-12 max-w-md mx-auto">Start free. Upgrade when your bot needs to stay online 24/7.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className={`rounded-2xl p-5 flex flex-col relative ${plan.bg} border ${plan.border}`}
              style={{ boxShadow: plan.featured ? `0 0 30px rgba(99,102,241,0.12)` : 'none' }}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[8px] font-bold font-mono tracking-widest text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
                  POPULAR
                </div>
              )}
              <div className="mb-4">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-black text-white">{plan.price}</span>
                  <span className="text-xs text-white/30 font-mono">{plan.period}</span>
                </div>
                <p className="font-bold text-sm text-white/80">{plan.name}</p>
                <p className="text-[10px] font-mono text-white/30 mt-0.5">{plan.note}</p>
              </div>
              <div className="flex-1 space-y-2 mb-5">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="h-3 w-3 shrink-0" style={{ color: plan.accent }} />
                    <span className="text-[10px] font-mono text-white/45">{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setLocation('/login')} className="w-full py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                style={{ background: plan.featured ? 'linear-gradient(135deg, #6366f1, #7c3aed)' : `${plan.accent}12`, border: `1px solid ${plan.accent}25`, color: plan.featured ? '#fff' : plan.accent }}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="max-w-7xl mx-auto px-6 md:px-16 pb-24">
        <div className="rounded-2xl px-10 py-14 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(124,58,237,0.04))', border: '1px solid rgba(99,102,241,0.12)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 55%)' }} />
          <div className="relative">
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Ready to deploy?</h2>
            <p className="text-white/30 text-sm mb-6 max-w-sm mx-auto">Log in with Discord and have your bot live in under 60 seconds.</p>
            <button onClick={() => setLocation('/login')} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white hover:-translate-y-0.5 transition-all" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', boxShadow: '0 6px 24px rgba(99,102,241,0.35)' }}>
              Launch Your Bot <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.04] px-6 md:px-16 py-7">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/lumora-brand.png" alt="" className="h-4 w-4 object-contain opacity-30" />
            <span className="font-mono text-[10px] text-white/18 tracking-[0.25em]">LUMORA</span>
          </div>
          <p className="text-[10px] text-white/15 font-mono">© 2025 Lumora · Secure Discord Bot Hosting</p>
          <div className="flex items-center gap-5 text-[10px] text-white/22 font-mono">
            <button onClick={() => setLocation('/pricing')} className="hover:text-white/50 transition-colors">Pricing</button>
            <a href="#features" className="hover:text-white/50 transition-colors">Features</a>
            <button onClick={() => setLocation('/login')} className="hover:text-white/50 transition-colors">Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
