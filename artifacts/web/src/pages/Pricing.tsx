import { useLocation } from 'wouter';
import { Check, X, ArrowRight, ArrowLeft, Zap, Shield, Bot } from 'lucide-react';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Try Lumora out. Great for development and testing.',
    accent: '#6b7280',
    featured: false,
    features: [
      { text: '1 project', ok: true },
      { text: '256 MB RAM',  ok: true },
      { text: 'Node.js & Python runtimes', ok: true },
      { text: 'AI crash repair (3 attempts)', ok: true },
      { text: 'Live console logs', ok: true },
      { text: 'In-browser file editor', ok: true },
      { text: 'Always-on 24/7 uptime', ok: false },
      { text: 'Priority support', ok: false },
    ],
  },
  {
    name: 'Pro',
    price: '$5',
    period: '/month',
    description: 'For bots that need to stay online 24/7 without interruption.',
    accent: '#8b5cf6',
    featured: true,
    features: [
      { text: '3 projects', ok: true },
      { text: '512 MB RAM', ok: true },
      { text: 'All runtimes (Node, Python, Java)', ok: true },
      { text: 'AI crash repair (unlimited)', ok: true },
      { text: 'Live console logs', ok: true },
      { text: 'In-browser file editor', ok: true },
      { text: 'Always-on 24/7 uptime', ok: true },
      { text: 'Email support', ok: true },
    ],
  },
  {
    name: 'Business',
    price: '$15',
    period: '/month',
    description: 'Run a fleet of bots with maximum resources and dedicated support.',
    accent: '#a78bfa',
    featured: false,
    features: [
      { text: 'Unlimited projects', ok: true },
      { text: '2 GB RAM per bot', ok: true },
      { text: 'All runtimes', ok: true },
      { text: 'AI crash repair (unlimited)', ok: true },
      { text: 'Live console logs', ok: true },
      { text: 'In-browser file editor', ok: true },
      { text: 'Always-on 24/7 uptime', ok: true },
      { text: 'Priority dedicated support', ok: true },
    ],
  },
];

const FAQ = [
  {
    q: 'What happens when my bot crashes on the free plan?',
    a: 'Lumora automatically restarts it instantly. If it keeps crashing, the AI repair system reads the logs and patches the code — up to 3 times on the free plan, unlimited on Pro and Business.',
  },
  {
    q: 'What runtimes are supported?',
    a: 'Node.js, Python, Java, and more. Lumora auto-detects your runtime from package.json, requirements.txt, or your start command. No configuration needed.',
  },
  {
    q: 'Can I upgrade or downgrade my plan at any time?',
    a: 'Yes. You can switch plans at any time from the admin panel. Changes take effect immediately with prorated billing.',
  },
  {
    q: 'Is my bot\'s code safe?',
    a: 'Every bot runs in a fully isolated sandbox with no cross-user access. Your environment variables and tokens are encrypted at rest.',
  },
  {
    q: 'How do I get access?',
    a: 'Lumora is invite-only right now. Contact the admin or join the Discord server to request a hosting key. Once you have a key, sign in with Discord and you\'re in.',
  },
];

export default function Pricing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen text-white" style={{ background: '#09090f' }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-15"
          style={{ background: 'radial-gradient(ellipse, #7c3aed 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div className="absolute inset-0 opacity-[0.15]"
          style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      {/* Nav */}
      <header className="relative z-40 border-b border-white/[0.06]"
        style={{ background: 'rgba(9,9,15,0.92)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => setLocation('/')} className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}>
              <img src="/lumora-brand.png" alt="" className="h-4 w-4 object-contain brightness-200" />
            </div>
            <span className="font-bold text-[15px] text-white">Lumora</span>
          </button>
          <button onClick={() => setLocation('/login')}
            className="h-8 px-4 rounded-lg text-[13px] font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 2px 12px rgba(124,58,237,0.35)' }}>
            Get started free
          </button>
        </div>
      </header>

      <main className="relative z-10">
        {/* Header */}
        <section className="py-20 text-center px-6">
          <p className="text-[11px] font-semibold tracking-widest text-violet-400/60 uppercase mb-4">Pricing</p>
          <h1 className="text-[48px] md:text-[56px] font-black tracking-tight text-white mb-5">
            Simple, honest pricing.
          </h1>
          <p className="text-[17px] text-white/40 max-w-md mx-auto leading-relaxed">
            Start for free. Upgrade when you need always-on hosting. No surprises.
          </p>
        </section>

        {/* Plans */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map((plan) => (
              <div key={plan.name}
                className={`relative rounded-2xl p-6 flex flex-col border transition-all duration-300 hover:-translate-y-1 ${
                  plan.featured ? 'border-violet-500/30' : 'border-white/[0.07]'
                }`}
                style={{
                  background: plan.featured
                    ? 'linear-gradient(145deg, rgba(139,92,246,0.08) 0%, rgba(99,102,241,0.04) 100%)'
                    : 'linear-gradient(145deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)',
                  boxShadow: plan.featured ? '0 0 0 1px rgba(139,92,246,0.2)' : 'none',
                }}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-widest text-white"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}>
                    MOST POPULAR
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="font-bold text-white text-[16px] mb-1">{plan.name}</h2>
                  <p className="text-[12px] text-white/35 mb-5 leading-relaxed">{plan.description}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[40px] font-black text-white leading-none">{plan.price}</span>
                    <span className="text-[13px] text-white/30">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map(({ text, ok }) => (
                    <li key={text} className="flex items-center gap-2.5">
                      {ok
                        ? <Check className="h-4 w-4 shrink-0" style={{ color: plan.accent }} />
                        : <X className="h-4 w-4 shrink-0 text-white/15" />}
                      <span className={`text-[13px] ${ok ? 'text-white/60' : 'text-white/22'}`}>{text}</span>
                    </li>
                  ))}
                </ul>

                <button onClick={() => setLocation('/login')}
                  className={`w-full py-3 rounded-xl text-[14px] font-semibold transition-all hover:-translate-y-px ${
                    plan.featured ? 'text-white' : 'text-white/55 border border-white/[0.08] hover:border-white/[0.16] hover:text-white/75'
                  }`}
                  style={plan.featured ? {
                    background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                    boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
                  } : { background: 'rgba(255,255,255,0.04)' }}>
                  Get started
                </button>
              </div>
            ))}
          </div>

          {/* Feature highlights */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Bot,    title: 'AI crash repair on every plan', desc: 'All plans include automatic AI-powered crash analysis and code repair. No manual debugging required.' },
              { icon: Shield, title: 'Your code is always private',   desc: 'Every bot runs in a fully isolated container. No shared processes, no cross-user data access.' },
              { icon: Zap,    title: 'Deploy in under 60 seconds',    desc: 'Upload a ZIP, paste a GitHub URL, or connect a repo. Dependencies install automatically in the background.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 rounded-2xl border border-white/[0.05]"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.18)' }}>
                  <Icon className="h-4.5 w-4.5 text-violet-400/80" />
                </div>
                <h3 className="font-semibold text-white/80 text-[13px] mb-1.5">{title}</h3>
                <p className="text-[12px] text-white/35 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-white/[0.05] py-24" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-3xl font-black text-white tracking-tight mb-12 text-center">Frequently asked questions</h2>
            <div className="space-y-6">
              {FAQ.map(({ q, a }) => (
                <div key={q} className="border-b border-white/[0.05] pb-6 last:border-0 last:pb-0">
                  <h3 className="font-semibold text-white/80 text-[14px] mb-2">{q}</h3>
                  <p className="text-[13px] text-white/40 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center px-6">
          <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Ready to get started?</h2>
          <p className="text-white/38 text-[15px] mb-8">Deploy your first bot for free — no credit card required.</p>
          <button onClick={() => setLocation('/login')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-[14px] font-semibold text-white transition-all hover:-translate-y-px"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 6px 24px rgba(124,58,237,0.4)' }}>
            Deploy your bot free <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <button onClick={() => setLocation('/')}
            className="flex items-center gap-1.5 text-[12px] text-white/25 hover:text-white/50 transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </button>
          <p className="text-[12px] text-white/18">© 2025 Lumora. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
