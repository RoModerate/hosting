import { useLocation } from 'wouter';
import { Check, Zap, Shield, ArrowRight, X } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Try Lumora out. Bot goes offline for 10 min every 6 hours.',
    accent: '#6b7280',
    accentBg: 'rgba(107,114,128,0.06)',
    accentBorder: 'rgba(107,114,128,0.15)',
    cta: 'Get Started Free',
    featured: false,
    features: [
      { text: '1 project', included: true },
      { text: '6h continuous uptime (restarts required)', included: true },
      { text: '100 MB storage', included: true },
      { text: 'Node.js, Python, Java runtimes', included: true },
      { text: 'AI crash repair (3 attempts)', included: true },
      { text: 'Live console logs', included: true },
      { text: 'Always-on hosting', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$5',
    period: '/mo',
    description: 'For serious bots that need 24/7 uptime and more resources.',
    accent: '#6366f1',
    accentBg: 'rgba(99,102,241,0.08)',
    accentBorder: 'rgba(99,102,241,0.25)',
    cta: 'Start Pro',
    featured: true,
    features: [
      { text: '1 project', included: true },
      { text: 'Always-on 24/7 hosting', included: true },
      { text: '512 MB storage', included: true },
      { text: 'Node.js, Python, Java runtimes', included: true },
      { text: 'AI crash repair (3 attempts)', included: true },
      { text: 'Live console logs', included: true },
      { text: 'GitHub auto-deploy', included: true },
      { text: 'Priority support', included: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: '$15',
    period: '/mo',
    description: 'Run a fleet of bots with maximum storage and dedicated support.',
    accent: '#a78bfa',
    accentBg: 'rgba(167,139,250,0.06)',
    accentBorder: 'rgba(167,139,250,0.15)',
    cta: 'Start Business',
    featured: false,
    features: [
      { text: 'Up to 5 projects', included: true },
      { text: 'Always-on 24/7 hosting', included: true },
      { text: '2 GB storage', included: true },
      { text: 'Node.js, Python, Java runtimes', included: true },
      { text: 'AI crash repair (unlimited)', included: true },
      { text: 'Live console logs', included: true },
      { text: 'GitHub auto-deploy', included: true },
      { text: 'Priority + dedicated support', included: true },
    ],
  },
];

export default function Pricing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#080810] text-[#c8cde8]">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 w-[900px] h-[400px] -translate-x-1/2 opacity-[0.07]"
          style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)' }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between h-14 px-6 md:px-14 border-b border-white/[0.05]">
        <button onClick={() => setLocation('/')} className="flex items-center gap-2.5">
          <img src="/lumora-brand.png" alt="Lumora" className="h-6 w-6 object-contain opacity-90" />
          <span className="font-mono font-bold text-sm tracking-[0.2em] text-white/90">LUMORA</span>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation('/login')} className="px-4 py-1.5 text-xs font-mono text-white/60 rounded-lg border border-white/[0.10] hover:border-white/[0.2] hover:text-white transition-all">
            Login
          </button>
          <button onClick={() => setLocation('/login')} className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
            Sign Up Free
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-14 py-20">
        <div className="text-center mb-16">
          <p className="font-mono text-[9px] tracking-[0.35em] text-[#6366f1]/50 mb-3">PLANS & PRICING</p>
          <h1 className="text-5xl font-black text-white mb-4 tracking-tight">Simple, honest pricing.</h1>
          <p className="text-white/40 text-sm max-w-md mx-auto">
            Start free. Upgrade when your bot needs to stay online 24/7.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {PLANS.map((plan) => (
            <div key={plan.id}
              className="relative rounded-2xl p-6 flex flex-col"
              style={{
                background: plan.featured ? 'linear-gradient(145deg, #0f0f20, #0c0c1a)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${plan.accentBorder}`,
                boxShadow: plan.featured ? `0 0 40px ${plan.accent}18` : 'none',
              }}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-[9px] font-bold font-mono tracking-widest text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-sm text-white/30 font-mono">{plan.period}</span>
                </div>
                <h3 className="font-bold text-lg text-white/90 mb-1">{plan.name}</h3>
                <p className="text-xs text-white/35 leading-relaxed">{plan.description}</p>
              </div>

              <div className="flex-1 space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    {f.included
                      ? <Check className="h-3.5 w-3.5 shrink-0" style={{ color: plan.accent }} />
                      : <X className="h-3.5 w-3.5 shrink-0 text-white/15" />
                    }
                    <span className={`text-xs font-mono ${f.included ? 'text-white/55' : 'text-white/20'}`}>{f.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setLocation('/login')}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{
                  background: plan.featured ? 'linear-gradient(135deg, #6366f1, #7c3aed)' : plan.accentBg,
                  border: `1px solid ${plan.accentBorder}`,
                  color: plan.featured ? '#ffffff' : plan.accent,
                }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-white/80 text-center mb-8 font-mono tracking-wide">Frequently asked</h2>
          {[
            { q: 'What happens when my free bot goes offline?', a: 'After 6 hours of continuous runtime, your bot is automatically paused for 10 minutes. You can restart it manually at any time from your portal — or upgrade to Pro for 24/7 uptime.' },
            { q: 'What runtimes do you support?', a: 'Node.js (discord.js, Sapphire, Eris), Python (discord.py, py-cord, hikari), and Java (JDA, Javacord, D4J). All dependency installation is handled automatically.' },
            { q: 'What happens if my bot crashes?', a: 'Our AI repair engine analyses the crash logs and attempts up to 3 automatic fixes. If it can\'t repair it, you\'ll see the full crash log in your console.' },
            { q: 'How do I deploy my bot?', a: 'Upload a ZIP file or import directly from a public GitHub repository. Lumora detects your runtime, installs dependencies, and starts your bot in under a minute.' },
          ].map(({ q, a }, i) => (
            <div key={i} className="border-b border-white/[0.06] py-5">
              <h3 className="font-semibold text-white/70 text-sm mb-2">{q}</h3>
              <p className="text-xs text-white/35 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] px-6 md:px-14 py-7 mt-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-mono text-[10px] text-white/18 tracking-[0.25em]">LUMORA</span>
          <p className="text-[10px] text-white/15 font-mono">© 2025 Lumora · Secure Discord Bot Hosting</p>
          <div className="flex items-center gap-5 text-[10px] text-white/22 font-mono">
            <button onClick={() => setLocation('/')} className="hover:text-white/50">Home</button>
            <button onClick={() => setLocation('/login')} className="hover:text-white/50">Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
