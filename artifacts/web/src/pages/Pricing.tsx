import { useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import {
  Check, X, ArrowRight, ChevronDown, ChevronRight,
  Bot, Shield, Zap, Search, Menu, Server, Cpu, Layers, Play,
  Upload, Settings, Activity, Code2, RotateCw, Lock,
  CreditCard, TrendingUp, AlertCircle,
} from 'lucide-react';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

interface SessionData {
  ticketId?: number;
  discord?: { id: string; username: string; globalName?: string | null; avatar?: string | null } | null;
  ownerUsername?: string;
}

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

type SectionId = 'getting-started' | 'features' | 'runtimes' | 'billing';

const NAV_SECTIONS: { id: SectionId; label: string; icon: any; items: string[]; defaultOpen: boolean }[] = [
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
  activeSection,
  onItemClick,
}: {
  section: typeof NAV_SECTIONS[0];
  activeSection: SectionId;
  onItemClick: (s: SectionId) => void;
}) {
  const [open, setOpen] = useState(section.defaultOpen || activeSection === section.id);
  const Icon = section.icon;
  const isActive = activeSection === section.id;
  return (
    <div className="mb-0.5">
      <button
        onClick={() => { setOpen(o => !o); onItemClick(section.id); }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-colors group"
        style={{
          color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.4)',
          background: isActive ? 'rgba(109,40,217,0.14)' : 'transparent',
        }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent'; } }}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left tracking-wide uppercase text-[10.5px]">{section.label}</span>
        {open
          ? <ChevronDown className="h-3 w-3 opacity-50" />
          : <ChevronRight className="h-3 w-3 opacity-50" />}
      </button>
      {open && (
        <div className="mt-0.5 ml-2 pl-3" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
          {section.items.map(item => (
            <button key={item} onClick={() => onItemClick(section.id)}
              className="w-full text-left px-2 py-1.5 rounded-md text-[12.5px] transition-colors"
              style={{
                color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.35)',
                fontWeight: isActive ? 500 : 400,
                background: 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = isActive ? '#c4b5fd' : 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent'; }}>
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar({ activeSection, onSectionClick }: { activeSection: SectionId; onSectionClick: (s: SectionId) => void }) {
  return (
    <aside className="w-60 shrink-0 flex flex-col gap-0.5 pr-4 pt-6 pb-10">
      <div className="flex items-center gap-2 px-3 mb-4">
        <img src="/lumora-brand.png" alt="Lumora" className="h-5 w-5 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
        <span className="text-[12px] font-semibold tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>Lumora Docs</span>
      </div>
      {NAV_SECTIONS.map(section => (
        <SidebarSection key={section.id} section={section} activeSection={activeSection} onItemClick={onSectionClick} />
      ))}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Resources</p>
        {[
          { label: 'Discord Server', href: 'https://discord.gg/4wEKPrgZmD' },
          { label: 'Status Page', href: '#' },
        ].map(({ label, href }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer"
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12.5px] transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent'; }}>
            {label}
          </a>
        ))}
      </div>
    </aside>
  );
}

// ── Section content components ────────────────────────────────────────────────

function GettingStartedContent({ onNavigate }: { onNavigate: (s: SectionId) => void }) {
  return (
    <div>
      <div className="text-center mb-14 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 uppercase tracking-widest mb-3">
          <span className="h-px w-5 bg-violet-300 inline-block" />
          Getting Started
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-[1.08]" style={{ color: 'rgba(255,255,255,0.92)' }}>
          From zero to live in&nbsp;60&nbsp;seconds.
        </h1>
        <p className="text-[16px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Follow these steps to upload your first Discord bot and get it running on Lumora.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-5 mb-16">
        {[
          { icon: Lock, step: '01', title: 'Sign in with Discord', desc: 'Go to the login page and click "Sign in with Discord". You\'ll be redirected to Discord to authorize Lumora to read your profile. Once authorized, you land on your personal dashboard.' },
          { icon: Upload, step: '02', title: 'Upload your bot code', desc: 'On your dashboard, click "Upload bot". Select a .zip file of your bot project. Lumora supports Node.js (detected via package.json) and Python (detected via requirements.txt or main.py). Your files are extracted and sandboxed.' },
          { icon: Settings, step: '03', title: 'Configure environment variables', desc: 'Navigate to the "Environment" tab in your dashboard. Add your DISCORD_TOKEN and any other secrets your bot needs. Variables are encrypted at rest and injected at runtime — never visible to other users.' },
          { icon: Zap, step: '04', title: 'Start your bot', desc: 'Hit the "Run" button. Lumora installs dependencies, detects your start command, and launches the process. You\'ll see live logs immediately. If your bot crashes, Lumora restarts it automatically.' },
        ].map(({ icon: Icon, step, title, desc }) => (
          <div key={step} className="flex gap-5 p-6 rounded-2xl transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <Icon className="h-4 w-4" style={{ color: '#c4b5fd' }} />
              </div>
              <span className="text-[10px] font-mono font-semibold" style={{ color: 'rgba(167,139,250,0.6)' }}>{step}</span>
            </div>
            <div>
              <h3 className="font-semibold text-[14.5px] mb-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>{title}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto rounded-2xl p-8 text-center"
        style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.22)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#a78bfa' }}>Next</p>
        <h3 className="text-xl font-bold mb-2" style={{ color: 'rgba(255,255,255,0.9)' }}>Explore the Features</h3>
        <p className="text-[13.5px] mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>Learn about AI crash repair, the file manager, live logs, and more.</p>
        <button onClick={() => onNavigate('features')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}>
          Explore Features <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function FeaturesContent() {
  const features = [
    {
      icon: Bot, title: 'AI Crash Repair',
      desc: 'When your bot crashes repeatedly, Lumora\'s AI reads the error logs, diagnoses the root cause, and applies code fixes automatically — without you touching a thing. Free plans get 3 repair attempts per crash cycle. Pro and Business plans get unlimited.',
    },
    {
      icon: RotateCw, title: 'Automatic Restarts',
      desc: 'Every crash is caught and the bot process is restarted within seconds using exponential backoff. If the bot keeps crashing, the AI repair system kicks in. Your uptime stays high even if your code has an edge-case bug.',
    },
    {
      icon: Terminal, title: 'Live Console Logs',
      desc: 'The dashboard streams your bot\'s stdout and stderr in real time directly in the browser. No SSH, no VPS, no terminal. Scroll back through recent history or watch the output as it happens.',
    },
    {
      icon: Code2, title: 'In-Browser File Editor',
      desc: 'Browse, open, and edit your bot\'s source files from the Files tab in your dashboard. Powered by CodeMirror with syntax highlighting for JavaScript, TypeScript, Python, and more. Save changes and restart with one click.',
    },
    {
      icon: Activity, title: 'Uptime Monitoring',
      desc: 'Lumora tracks your bot\'s running state at all times. The dashboard shows whether your bot is online, starting, crashed, or stopped — and surfaces the last known error message for quick diagnosis.',
    },
    {
      icon: Lock, title: 'Environment Variables',
      desc: 'Add secrets like DISCORD_TOKEN, API keys, and database URLs in the Environment tab. Variables are encrypted at rest and injected securely at runtime. They are never logged or visible to other users.',
    },
  ];

  return (
    <div>
      <div className="text-center mb-14 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 uppercase tracking-widest mb-3">
          <span className="h-px w-5 bg-violet-300 inline-block" />
          Features
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-[1.08]" style={{ color: 'rgba(255,255,255,0.92)' }}>
          Built for bots that can't afford downtime.
        </h1>
        <p className="text-[16px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Every Lumora plan includes a full hosting stack — not just a server.
        </p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl p-6 transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}>
            <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}>
              <Icon className="h-4 w-4" style={{ color: '#c4b5fd' }} />
            </div>
            <h3 className="font-semibold text-[14.5px] mb-2" style={{ color: 'rgba(255,255,255,0.85)' }}>{title}</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuntimesContent() {
  const runtimes = [
    {
      name: 'Node.js',
      badge: 'Fully supported',
      color: '#417e38',
      badgeBg: 'rgba(65,126,56,0.08)',
      badgeBorder: 'rgba(65,126,56,0.2)',
      desc: 'The most common runtime for Discord bots. Lumora detects Node.js projects from a package.json file and auto-installs dependencies with npm, yarn, or pnpm.',
      details: [
        'Supports all versions of discord.js, Eris, and other bot libraries',
        'Automatically runs npm install before starting',
        'Detects start command from scripts.start in package.json',
        'TypeScript supported — add a build step in your start command',
      ],
    },
    {
      name: 'Python',
      badge: 'Fully supported',
      color: '#2b6cb0',
      badgeBg: 'rgba(43,108,176,0.08)',
      badgeBorder: 'rgba(43,108,176,0.2)',
      desc: 'Lumora detects Python projects from requirements.txt or a main.py entry point. Supports discord.py, nextcord, py-cord, and any other Python bot library.',
      details: [
        'Auto-runs pip install -r requirements.txt',
        'Detects entry point from main.py, bot.py, or your start command',
        'Works with all major Discord Python wrappers',
        'Virtual environments managed automatically',
      ],
    },
    {
      name: 'Java',
      badge: 'Pro & Business',
      color: '#c05621',
      badgeBg: 'rgba(192,86,33,0.08)',
      badgeBorder: 'rgba(192,86,33,0.2)',
      desc: 'Run JVM-based bots using JDA, Javacord, or custom implementations. Available on Pro and Business plans. Provide a JAR file or a custom start command.',
      details: [
        'Bring a pre-compiled JAR or a build script',
        'JDA, Javacord, and similar libraries work out of the box',
        'Available on Pro and Business plans only',
        'Set a custom start command in the dashboard',
      ],
    },
  ];

  return (
    <div>
      <div className="text-center mb-14 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 uppercase tracking-widest mb-3">
          <span className="h-px w-5 bg-violet-300 inline-block" />
          Runtimes
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-[1.08]" style={{ color: 'rgba(255,255,255,0.92)' }}>
          Host your bot, in any language.
        </h1>
        <p className="text-[16px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Lumora auto-detects your runtime. Just upload your code — no configuration files required.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-5 mb-16">
        {runtimes.map(({ name, badge, color, badgeBg, badgeBorder, desc, details }) => (
          <div key={name} className="rounded-2xl p-7 transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="font-bold text-[17px]" style={{ color: 'rgba(255,255,255,0.9)' }}>{name}</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ color, background: badgeBg, border: `1px solid ${badgeBorder}` }}>
                {badge}
              </span>
            </div>
            <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
            <ul className="space-y-2">
              {details.map(d => (
                <li key={d} className="flex items-start gap-2.5 text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: '#a78bfa' }} />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function BillingContent({ onLogin }: { onLogin: () => void }) {
  return (
    <div>
      <div className="text-center mb-14 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 uppercase tracking-widest mb-3">
          <span className="h-px w-5 bg-violet-300 inline-block" />
          Billing
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-5 leading-[1.05]" style={{ color: 'rgba(255,255,255,0.92)' }}>
          Simple, honest pricing.
        </h1>
        <p className="text-[17px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Start for free. Upgrade when you need always-on hosting. No surprises, no per-seat fees.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16 max-w-4xl mx-auto">
        {PLANS.map(plan => (
          <div key={plan.name}
            className="relative rounded-2xl flex flex-col transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: plan.featured ? 'rgba(109,40,217,0.1)' : 'rgba(255,255,255,0.04)',
              border: plan.featured ? '1.5px solid rgba(124,58,237,0.45)' : '1px solid rgba(255,255,255,0.09)',
              boxShadow: plan.featured ? '0 0 40px rgba(124,58,237,0.15)' : undefined,
            }}>
            {plan.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-widest text-white"
                style={{ background: '#7c3aed' }}>
                MOST POPULAR
              </div>
            )}

            <div className="p-6 pb-4" style={{ borderBottom: `1px solid ${plan.featured ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
              <h2 className="font-bold text-[16px] mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>{plan.name}</h2>
              <p className="text-[12.5px] mb-5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>{plan.description}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[42px] font-black leading-none" style={{ color: 'rgba(255,255,255,0.95)' }}>{plan.price}</span>
                <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{plan.period}</span>
              </div>
            </div>

            <div className="p-6 flex-1">
              <ul className="space-y-3 mb-8">
                {plan.features.map(({ text, ok }) => (
                  <li key={text} className="flex items-center gap-3">
                    {ok
                      ? <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)' }}>
                          <Check className="h-2.5 w-2.5" style={{ color: '#c4b5fd' }} />
                        </div>
                      : <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <X className="h-2.5 w-2.5" style={{ color: 'rgba(255,255,255,0.2)' }} />
                        </div>}
                    <span className="text-[13px]" style={{ color: ok ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)' }}>{text}</span>
                  </li>
                ))}
              </ul>

              <button onClick={onLogin}
                className="w-full py-3 rounded-xl text-[14px] font-semibold transition-all hover:-translate-y-px"
                style={plan.featured
                  ? { background: '#7c3aed', color: '#fff', border: '1px solid rgba(167,139,250,0.3)', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }
                  : { color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent' }}
                onMouseEnter={e => { if (!plan.featured) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; } else { e.currentTarget.style.background = '#6d28d9'; } }}
                onMouseLeave={e => { if (!plan.featured) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; } else { e.currentTarget.style.background = '#7c3aed'; } }}>
                Get started
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Usage limits */}
      <div className="max-w-4xl mx-auto mb-14">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 uppercase tracking-widest mb-2">
            <span className="h-px w-5 bg-violet-300 inline-block" />
            Usage Limits
          </div>
          <h2 className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>Know your limits.</h2>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
          <table className="w-full text-[13.5px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th className="text-left px-6 py-4 font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>Limit</th>
                <th className="px-6 py-4 font-semibold text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>Free</th>
                <th className="px-6 py-4 font-semibold text-center" style={{ color: '#a78bfa' }}>Pro</th>
                <th className="px-6 py-4 font-semibold text-center" style={{ color: 'rgba(255,255,255,0.6)' }}>Business</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Projects',        '1',         '3',           'Unlimited'],
                ['RAM per bot',     '256 MB',    '512 MB',      '2 GB'],
                ['AI repair / crash', '3 attempts', 'Unlimited', 'Unlimited'],
                ['Uptime guarantee', '—',        '24/7',        '24/7'],
                ['Runtimes',        'Node, Python', 'All',      'All'],
                ['Support',         'Community', 'Email',       'Priority'],
              ].map(([label, free, pro, biz], i) => (
                <tr key={label} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td className="px-6 py-3.5 font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</td>
                  <td className="px-6 py-3.5 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>{free}</td>
                  <td className="px-6 py-3.5 text-center font-medium" style={{ color: '#a78bfa' }}>{pro}</td>
                  <td className="px-6 py-3.5 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>{biz}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrading */}
      <div className="max-w-4xl mx-auto mb-14">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 uppercase tracking-widest mb-2">
            <span className="h-px w-5 bg-violet-300 inline-block" />
            Upgrade
          </div>
          <h2 className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>Upgrading your plan.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: CreditCard, title: 'Contact your admin', desc: 'Lumora is invite-only. Reach out to your hosting admin to get an upgraded access key issued to your account.' },
            { icon: TrendingUp, title: 'Instant upgrade', desc: 'Once your new key is redeemed, plan limits update immediately. No restart required — your bot stays online.' },
            { icon: AlertCircle, title: 'Prorated billing', desc: 'Plan changes are prorated. You only pay for what you use. Downgrading takes effect at the next billing cycle.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <Icon className="h-4 w-4" style={{ color: '#c4b5fd' }} />
              </div>
              <h3 className="font-semibold text-[13.5px] mb-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>{title}</h3>
              <p className="text-[12.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-4xl mx-auto mb-14" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />

      {/* FAQ */}
      <div className="max-w-4xl mx-auto mb-16">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 uppercase tracking-widest mb-2">
            <span className="h-px w-5 bg-violet-300 inline-block" />
            FAQ
          </div>
          <h2 className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>Frequently asked questions</h2>
        </div>
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="font-semibold text-[14px] mb-2" style={{ color: 'rgba(255,255,255,0.85)' }}>{q}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA strip */}
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 relative overflow-hidden"
          style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.5), transparent)' }} />
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#a78bfa' }}>Free forever</p>
            <h3 className="text-xl font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.92)' }}>Deploy your first bot for free</h3>
            <p className="text-[13.5px]" style={{ color: 'rgba(255,255,255,0.42)' }}>No credit card required. One bot, 256 MB RAM, AI crash repair included.</p>
          </div>
          <button onClick={onLogin}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold shrink-0 transition-all hover:-translate-y-px"
            style={{ background: '#7c3aed', color: '#fff', border: '1px solid rgba(167,139,250,0.25)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#6d28d9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#7c3aed'; }}>
            Get started free <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Pricing page ─────────────────────────────────────────────────────────

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('billing');
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/session/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => { if (d?.ticketId) setSession(d); })
      .catch(() => {});
  }, []);

  const avatarUrl = session?.discord?.avatar && session.discord.id
    ? `https://cdn.discordapp.com/avatars/${session.discord.id}/${session.discord.avatar}.webp?size=64`
    : null;
  const displayName = session?.discord?.globalName || session?.discord?.username || session?.ownerUsername;

  const handleSectionClick = (s: SectionId) => {
    setActiveSection(s);
    setSidebarOpen(false);
  };

  const breadcrumbLabel: Record<SectionId, string> = {
    'getting-started': 'Getting Started',
    'features': 'Features',
    'runtimes': 'Runtimes',
    'billing': 'Billing',
  };

  return (
    <div className="min-h-screen" style={{ background: '#08070f', color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b" style={{ background: 'rgba(8,7,15,0.96)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottomColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center h-14 px-5 gap-4">
          <button className="lg:hidden p-1.5 rounded-md transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-4 w-4" />
          </button>

          {/* Logo */}
          <button onClick={() => setLocation('/')} className="flex items-center gap-2.5 shrink-0">
            <img src="/lumora-brand.png" alt="Lumora" className="h-6 w-6 object-contain"
              style={{ filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.5))' }}
              onError={e => (e.currentTarget.style.display = 'none')} />
            <span className="font-semibold text-[15px] tracking-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>Lumora</span>
          </button>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-0.5 ml-3">
            <button onClick={() => setLocation('/')}
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent'; }}>
              Home
            </button>
            <button onClick={() => handleSectionClick('billing')}
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
              style={{ color: activeSection === 'billing' ? '#a78bfa' : 'rgba(255,255,255,0.4)', background: activeSection === 'billing' ? 'rgba(109,40,217,0.15)' : 'transparent' }}
              onMouseEnter={e => { if (activeSection !== 'billing') { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; } }}
              onMouseLeave={e => { if (activeSection !== 'billing') { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent'; } }}>
              Pricing
            </button>
            <button onClick={() => handleSectionClick('getting-started')}
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
              style={{ color: activeSection !== 'billing' ? '#a78bfa' : 'rgba(255,255,255,0.4)', background: activeSection !== 'billing' ? 'rgba(109,40,217,0.15)' : 'transparent' }}
              onMouseEnter={e => { if (activeSection === 'billing') { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; } }}
              onMouseLeave={e => { if (activeSection === 'billing') { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent'; } }}>
              Docs
            </button>
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            {session ? (
              <>
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                    style={{ border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(124,58,237,0.25)' }}>
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      : <span className="text-[11px] font-bold" style={{ color: '#c4b5fd' }}>{(displayName || '?')[0].toUpperCase()}</span>}
                  </div>
                  <span className="hidden sm:block text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{displayName}</span>
                </div>
                <button onClick={() => setLocation('/dashboard')}
                  className="h-8 px-4 rounded-lg text-[13px] font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.11)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}>
                  Dashboard
                </button>
              </>
            ) : (
              <button onClick={() => setLocation('/login')}
                className="h-8 px-4 rounded-lg text-[13px] font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.11)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}>
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 w-64 h-full overflow-y-auto px-4 pt-4 pb-10" style={{ background: '#0b0a16', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
            <Sidebar activeSection={activeSection} onSectionClick={handleSectionClick} />
          </div>
        </div>
      )}

      {/* Body */}
      <div className="max-w-[1240px] mx-auto px-4 flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto shrink-0" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
          <Sidebar activeSection={activeSection} onSectionClick={handleSectionClick} />
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 lg:px-12 pt-12 pb-24">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[12.5px] mb-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <button onClick={() => setLocation('/')} className="transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.3)' }}>Docs</button>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{breadcrumbLabel[activeSection]}</span>
          </div>

          {activeSection === 'getting-started' && <GettingStartedContent onNavigate={handleSectionClick} />}
          {activeSection === 'features' && <FeaturesContent />}
          {activeSection === 'runtimes' && <RuntimesContent />}
          {activeSection === 'billing' && <BillingContent onLogin={() => setLocation('/login')} />}

          {/* Footer */}
          <div className="max-w-4xl mx-auto mt-16 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2">
              <img src="/lumora-brand.png" alt="" className="h-4 w-4 object-contain opacity-20" onError={e => (e.currentTarget.style.display = 'none')} />
              <span className="text-[12.5px] font-medium" style={{ color: 'rgba(255,255,255,0.2)' }}>Lumora Hosting</span>
            </div>
            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.12)' }}>© 2025 Lumora. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <button onClick={() => setLocation('/')} className="text-[12px] transition-colors" style={{ color: 'rgba(255,255,255,0.2)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>Home</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
