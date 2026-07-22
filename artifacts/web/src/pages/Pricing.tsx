import { useLocation } from 'wouter';
import { useState } from 'react';
import {
  Check, X, ArrowRight, ChevronDown, ChevronRight,
  Bot, Shield, Zap, Search, Menu, Server, Cpu, Layers, Play,
} from 'lucide-react';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Try Lumora out. Great for development and testing.',
    featured: false,
    features: [
      { text: '1 project', ok: true },
      { text: '256 MB RAM', ok: true },
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
  { q: 'What happens when my bot crashes?', a: 'Lumora auto-restarts it instantly. Repeated crashes trigger the AI repair system — it reads logs and patches the code. Free: 3 attempts. Pro & Business: unlimited.' },
  { q: 'What runtimes are supported?', a: 'Node.js, Python, Java, and more. Lumora auto-detects your runtime from package.json, requirements.txt, or your start command.' },
  { q: 'Can I upgrade or downgrade at any time?', a: 'Yes. Switch plans anytime from the admin panel. Changes take effect immediately with prorated billing.' },
  { q: 'Is my bot\'s code safe?', a: 'Every bot runs in a fully isolated sandbox. No cross-user access, no shared memory. Tokens and env vars are encrypted at rest.' },
  { q: 'How do I get access?', a: 'Lumora is invite-only. Contact the admin or join the Discord server to request a hosting key. Sign in with Discord and you\'re in.' },
];

const NAV_SECTIONS = [
  {
    id: 'getting-started', label: 'Getting Started', icon: Play,
    items: ['Introduction', 'Quick Start', 'Dashboard Overview', 'Connect Discord'],
    defaultOpen: false,
  },
  {
    id: 'features', label: 'Features', icon: Layers,
    items: ['AI Crash Repair', 'Auto Restart', 'Live Console Logs', 'File Manager'],
    defaultOpen: false,
  },
  {
    id: 'runtimes', label: 'Runtimes', icon: Cpu,
    items: ['Node.js', 'Python', 'Java'],
    defaultOpen: false,
  },
  {
    id: 'billing', label: 'Billing', icon: Server,
    items: ['Plans & Pricing', 'Usage Limits', 'Upgrade'],
    defaultOpen: true,
  },
];

function SidebarSection({
  section,
  activeItem,
  onItemClick,
}: {
  section: typeof NAV_SECTIONS[0];
  activeItem: string;
  onItemClick: (s: string) => void;
}) {
  const [open, setOpen] = useState(section.defaultOpen);
  const Icon = section.icon;
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors group">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left tracking-wide uppercase text-[10.5px]">{section.label}</span>
        {open
          ? <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />
          : <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />}
      </button>
      {open && (
        <div className="mt-0.5 ml-2 border-l border-gray-200 pl-3">
          {section.items.map(item => (
            <button key={item} onClick={() => onItemClick(item)}
              className={`w-full text-left px-2 py-1.5 rounded-md text-[12.5px] transition-colors ${
                activeItem === item
                  ? 'text-violet-700 font-medium bg-violet-50'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}>
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar({ onItemClick }: { onItemClick: (s: string) => void }) {
  const [, setLocation] = useLocation();
  return (
    <aside className="w-60 shrink-0 flex flex-col gap-0.5 pr-4 pt-6 pb-10">
      <div className="flex items-center gap-2 px-3 mb-4">
        <img src="/lumora-brand.png" alt="Lumora" className="h-5 w-5 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
        <span className="text-[12px] font-semibold text-gray-500 tracking-wide">Lumora Docs</span>
      </div>
      {NAV_SECTIONS.map(section => (
        <SidebarSection key={section.id} section={section} activeItem="Plans & Pricing" onItemClick={onItemClick} />
      ))}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Resources</p>
        {[
          { label: 'Discord Server', icon: '💬' },
          { label: 'Status Page', icon: '🟢' },
        ].map(({ label, icon }) => (
          <button key={label}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12.5px] text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors">
            <span className="text-xs">{icon}</span>
            {label}
          </button>
        ))}
      </div>
    </aside>
  );
}

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center h-14 px-4 gap-4">
          <button className="lg:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-4 w-4" />
          </button>
          <button onClick={() => setLocation('/')} className="flex items-center gap-2 shrink-0">
            <img src="/lumora-brand.png" alt="Lumora" className="h-6 w-6 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
            <span className="font-bold text-[15px] text-gray-900 tracking-tight">Lumora</span>
          </button>
          <nav className="hidden lg:flex items-center gap-0.5 ml-2">
            {[
              { label: 'Documentation', action: () => setLocation('/') },
              { label: 'Features', action: () => setLocation('/') },
              { label: 'Pricing', active: true },
            ].map(({ label, active, action }) => (
              <button key={label} onClick={action}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}>
                {label}
              </button>
            ))}
          </nav>
          <div className="flex-1 max-w-sm mx-auto hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 cursor-text text-[13px] text-gray-400">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span>Search docs…</span>
            <span className="ml-auto flex items-center gap-0.5 text-[11px]">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[10px] font-mono">⌘</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[10px] font-mono">K</kbd>
            </span>
          </div>
          <div className="ml-auto shrink-0">
            <button onClick={() => setLocation('/login')}
              className="h-8 px-4 rounded-lg text-[13px] font-semibold text-white hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}>
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 w-64 bg-white border-r border-gray-200 h-full overflow-y-auto px-4 pt-4 pb-10">
            <Sidebar onItemClick={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Body */}
      <div className="max-w-[1240px] mx-auto px-4 flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-gray-100 shrink-0">
          <Sidebar onItemClick={() => {}} />
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 lg:px-12 pt-12 pb-24">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[12.5px] text-gray-400 mb-8">
            <button onClick={() => setLocation('/')} className="hover:text-gray-700 transition-colors">Docs</button>
            <ChevronRight className="h-3 w-3" />
            <span>Billing</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-700 font-medium">Plans & Pricing</span>
          </div>

          {/* Heading */}
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 uppercase tracking-widest mb-3">
              <span className="h-px w-5 bg-violet-300 inline-block" />
              Billing
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-5 leading-[1.05]">
              Simple, honest pricing.
            </h1>
            <p className="text-[17px] text-gray-500 leading-relaxed">
              Start for free. Upgrade when you need always-on hosting. No surprises, no per-seat fees.
            </p>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16 max-w-4xl mx-auto">
            {PLANS.map(plan => (
              <div key={plan.name}
                className={`relative bg-white rounded-2xl flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                  plan.featured
                    ? 'border-2 border-violet-400 shadow-md'
                    : 'border border-gray-200'
                }`}
                style={{ boxShadow: plan.featured ? '0 0 0 1px rgba(124,58,237,0.15), 0 4px 20px rgba(124,58,237,0.08)' : undefined }}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-widest text-white"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}>
                    MOST POPULAR
                  </div>
                )}

                {/* Card header */}
                <div className={`p-6 pb-4 border-b ${plan.featured ? 'border-violet-100' : 'border-gray-100'}`}>
                  <h2 className="font-bold text-gray-900 text-[16px] mb-1">{plan.name}</h2>
                  <p className="text-[12.5px] text-gray-500 mb-5 leading-relaxed">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[42px] font-black text-gray-900 leading-none">{plan.price}</span>
                    <span className="text-[13px] text-gray-400">{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="p-6 flex-1">
                  <ul className="space-y-3 mb-8">
                    {plan.features.map(({ text, ok }) => (
                      <li key={text} className="flex items-center gap-3">
                        {ok
                          ? <div className="h-4 w-4 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                              <Check className="h-2.5 w-2.5 text-violet-600" />
                            </div>
                          : <div className="h-4 w-4 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                              <X className="h-2.5 w-2.5 text-gray-300" />
                            </div>}
                        <span className={`text-[13px] ${ok ? 'text-gray-700' : 'text-gray-300'}`}>{text}</span>
                      </li>
                    ))}
                  </ul>

                  <button onClick={() => setLocation('/login')}
                    className={`w-full py-3 rounded-xl text-[14px] font-semibold transition-all hover:-translate-y-px ${
                      plan.featured
                        ? 'text-white hover:opacity-90'
                        : 'text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    style={plan.featured ? { background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 4px 16px rgba(124,58,237,0.25)' } : {}}>
                    Get started
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="max-w-4xl mx-auto border-t border-gray-100 mb-14" />

          {/* Feature highlights */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 uppercase tracking-widest mb-2">
                <span className="h-px w-5 bg-violet-300 inline-block" />
                Included on every plan
              </div>
              <h2 className="text-2xl font-bold text-gray-900">No plan is bare.</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Bot,    title: 'AI crash repair',       desc: 'Automatic crash analysis and code patching. No manual debugging.' },
                { icon: Shield, title: 'Isolated sandbox',      desc: 'Fully isolated container per bot. No shared processes or cross-user data.' },
                { icon: Zap,    title: 'Deploy in 60 seconds',  desc: 'Upload a ZIP or paste a GitHub URL. Auto-install, auto-detect.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-all">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                    <Icon className="h-4.5 w-4.5 text-violet-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-[13.5px] mb-1.5">{title}</h3>
                  <p className="text-[12.5px] text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 uppercase tracking-widest mb-2">
                <span className="h-px w-5 bg-violet-300 inline-block" />
                FAQ
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Frequently asked questions</h2>
            </div>
            <div className="space-y-3">
              {FAQ.map(({ q, a }) => (
                <div key={q} className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 text-[14px] mb-2">{q}</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA strip */}
          <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl border border-violet-200 bg-white p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6"
              style={{ background: 'linear-gradient(145deg, rgba(124,58,237,0.03) 0%, rgba(99,102,241,0.02) 100%)' }}>
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-violet-600 uppercase tracking-widest mb-1.5">Free forever</p>
                <h3 className="text-xl font-bold text-gray-900 mb-1.5">Deploy your first bot for free</h3>
                <p className="text-[13.5px] text-gray-500">No credit card required. One bot, 256 MB RAM, AI crash repair included.</p>
              </div>
              <button onClick={() => setLocation('/login')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white shrink-0 hover:opacity-90 transition-all"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 2px 12px rgba(124,58,237,0.3)' }}>
                Get started free <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="max-w-4xl mx-auto mt-16 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/lumora-brand.png" alt="" className="h-5 w-5 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
              <span className="text-[12.5px] text-gray-400 font-medium">Lumora Hosting</span>
            </div>
            <p className="text-[12px] text-gray-300">© 2025 Lumora. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <button onClick={() => setLocation('/')} className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors">Docs</button>
              <button onClick={() => setLocation('/admin')} className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors">Admin</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
