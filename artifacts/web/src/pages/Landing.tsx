import { useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import {
  Search, ChevronDown, ChevronRight,
  Bot, Zap, RotateCw, Shield, Activity, Code2,
  ArrowRight, Play, Layers, Cpu, Server, Menu, X,
} from 'lucide-react';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

interface SessionData {
  ticketId?: number;
  discord?: { id: string; username: string; globalName?: string | null; avatar?: string | null } | null;
  ownerUsername?: string;
}

const NAV_SECTIONS = [
  {
    id: 'getting-started', label: 'Getting Started', icon: Play,
    items: ['Introduction', 'Quick Start', 'Dashboard Overview', 'Connect Discord'], defaultOpen: true,
  },
  {
    id: 'features', label: 'Features', icon: Layers,
    items: ['AI Crash Repair', 'Auto Restart', 'Live Console Logs', 'File Manager', 'Environment Variables'], defaultOpen: false,
  },
  {
    id: 'runtimes', label: 'Runtimes', icon: Cpu,
    items: ['Node.js', 'Python', 'Java'], defaultOpen: false,
  },
  {
    id: 'billing', label: 'Billing', icon: Server,
    items: ['Plans & Pricing', 'Usage Limits', 'Upgrade'], defaultOpen: false,
  },
];

// ─── Clean geometric SVG illustrations ───────────────────────────────────────
// Inspired by Mintlify's monoline style — thin violet strokes, no fills

function IlluDeploy() {
  return (
    <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Grid */}
      <defs>
        <pattern id="g1" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(124,58,237,0.07)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="280" height="160" fill="url(#g1)"/>

      {/* Terminal card */}
      <rect x="48" y="28" width="150" height="104" rx="10" fill="white" stroke="rgba(124,58,237,0.2)" strokeWidth="1.5"/>
      {/* Title bar dots */}
      <circle cx="66" cy="44" r="3.5" fill="rgba(239,68,68,0.4)"/>
      <circle cx="78" cy="44" r="3.5" fill="rgba(251,191,36,0.4)"/>
      <circle cx="90" cy="44" r="3.5" fill="rgba(34,197,94,0.4)"/>
      <line x1="48" y1="54" x2="198" y2="54" stroke="rgba(124,58,237,0.1)" strokeWidth="1"/>
      {/* Code lines */}
      <rect x="62" y="66" width="70" height="5" rx="2.5" fill="rgba(124,58,237,0.35)"/>
      <rect x="62" y="78" width="100" height="5" rx="2.5" fill="rgba(124,58,237,0.12)"/>
      <rect x="62" y="90" width="56" height="5" rx="2.5" fill="rgba(99,102,241,0.4)"/>
      <rect x="62" y="102" width="84" height="5" rx="2.5" fill="rgba(124,58,237,0.1)"/>
      <rect x="62" y="114" width="40" height="5" rx="2.5" fill="rgba(34,197,94,0.4)"/>
      {/* Cursor */}
      <rect x="62" y="124" width="6" height="6" rx="1" fill="rgba(124,58,237,0.7)">
        <animate attributeName="opacity" values="1;0;1" dur="1.2s" repeatCount="indefinite"/>
      </rect>

      {/* Arrow */}
      <path d="M 206 80 L 228 80" stroke="rgba(124,58,237,0.5)" strokeWidth="1.5" strokeDasharray="4 3"/>
      <path d="M 224 75 L 230 80 L 224 85" stroke="rgba(124,58,237,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>

      {/* Cloud shape (outline) */}
      <path d="M 250 72 a14 14 0 0 1 0 28 H 238 a10 10 0 0 1 0-20 a14 14 0 0 1 12-8z"
        fill="rgba(124,58,237,0.06)" stroke="rgba(124,58,237,0.35)" strokeWidth="1.5"/>
    </svg>
  );
}

function IlluZap() {
  return (
    <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="g2" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(99,102,241,0.07)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="280" height="160" fill="url(#g2)"/>

      {/* Hexagon */}
      <polygon points="140,28 172,46 172,82 140,100 108,82 108,46"
        fill="rgba(124,58,237,0.04)" stroke="rgba(124,58,237,0.25)" strokeWidth="1.5"/>

      {/* Bolt */}
      <path d="M 148 44 L 132 78 L 142 78 L 132 116 L 158 72 L 146 72 Z"
        fill="rgba(124,58,237,0.12)" stroke="rgba(124,58,237,0.55)" strokeWidth="1.5"
        strokeLinejoin="round"/>

      {/* Orbit rings */}
      <ellipse cx="140" cy="64" rx="52" ry="18" fill="none" stroke="rgba(124,58,237,0.12)" strokeWidth="1" strokeDasharray="3 4"/>
      <ellipse cx="140" cy="64" rx="70" ry="26" fill="none" stroke="rgba(99,102,241,0.09)" strokeWidth="1" strokeDasharray="3 6"/>

      {/* Dots on rings */}
      <circle cx="188" cy="64" r="3" fill="rgba(124,58,237,0.4)"/>
      <circle cx="92" cy="64" r="3" fill="rgba(99,102,241,0.35)"/>
      <circle cx="140" cy="38" r="2.5" fill="rgba(124,58,237,0.3)"/>
    </svg>
  );
}

function IlluShield() {
  return (
    <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="g3" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(124,58,237,0.07)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="280" height="160" fill="url(#g3)"/>

      {/* Shield */}
      <path d="M 140 24 L 176 38 L 176 76 C 176 104 140 124 140 124 C 140 124 104 104 104 76 L 104 38 Z"
        fill="rgba(124,58,237,0.06)" stroke="rgba(124,58,237,0.3)" strokeWidth="1.5" strokeLinejoin="round"/>

      {/* Check inside */}
      <path d="M 124 72 L 134 84 L 156 60" stroke="rgba(124,58,237,0.7)" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" fill="none"/>

      {/* Radiating lines */}
      <line x1="80" y1="50" x2="96" y2="58" stroke="rgba(124,58,237,0.18)" strokeWidth="1"/>
      <line x1="70" y1="76" x2="90" y2="76" stroke="rgba(124,58,237,0.14)" strokeWidth="1"/>
      <line x1="200" y1="50" x2="184" y2="58" stroke="rgba(124,58,237,0.18)" strokeWidth="1"/>
      <line x1="210" y1="76" x2="190" y2="76" stroke="rgba(124,58,237,0.14)" strokeWidth="1"/>
      <line x1="140" y1="14" x2="140" y2="22" stroke="rgba(124,58,237,0.18)" strokeWidth="1"/>

      {/* Corner dots */}
      <circle cx="72" cy="48" r="2" fill="rgba(124,58,237,0.25)"/>
      <circle cx="208" cy="48" r="2" fill="rgba(99,102,241,0.25)"/>
      <circle cx="140" cy="138" r="2" fill="rgba(124,58,237,0.2)"/>
    </svg>
  );
}

function IlluLogs() {
  return (
    <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="g4" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(79,70,229,0.07)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="280" height="160" fill="url(#g4)"/>

      {/* Monitor outline */}
      <rect x="56" y="26" width="168" height="110" rx="10" fill="white" stroke="rgba(79,70,229,0.22)" strokeWidth="1.5"/>
      <line x1="56" y1="46" x2="224" y2="46" stroke="rgba(79,70,229,0.1)" strokeWidth="1"/>
      <circle cx="73" cy="36" r="3.5" fill="rgba(239,68,68,0.35)"/>
      <circle cx="85" cy="36" r="3.5" fill="rgba(251,191,36,0.35)"/>
      <circle cx="97" cy="36" r="3.5" fill="rgba(34,197,94,0.35)"/>

      {/* Live badge */}
      <rect x="180" y="30" width="32" height="12" rx="6" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.4)" strokeWidth="1"/>
      <circle cx="188" cy="36" r="2.5" fill="rgba(34,197,94,0.9)"/>
      <text x="193" y="39.5" fontSize="6" fontFamily="monospace" fill="rgba(34,197,94,0.9)">LIVE</text>

      {/* Log lines with varying widths */}
      <rect x="70" y="58" width="88" height="5" rx="2.5" fill="rgba(124,58,237,0.5)"/>
      <rect x="70" y="70" width="128" height="5" rx="2.5" fill="rgba(124,58,237,0.12)"/>
      <rect x="70" y="82" width="108" height="5" rx="2.5" fill="rgba(34,197,94,0.4)"/>
      <rect x="70" y="94" width="72" height="5" rx="2.5" fill="rgba(124,58,237,0.1)"/>
      <rect x="70" y="106" width="96" height="5" rx="2.5" fill="rgba(124,58,237,0.1)"/>
      <rect x="70" y="118" width="56" height="5" rx="2.5" fill="rgba(239,68,68,0.4)"/>

      {/* Cursor blink */}
      <rect x="70" y="128" width="5" height="7" rx="1" fill="rgba(124,58,237,0.8)">
        <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>
      </rect>
    </svg>
  );
}

// ─── Hub cards ────────────────────────────────────────────────────────────────
const HUB_CARDS = [
  { title: 'Quick Start', desc: 'Deploy your first Discord bot in under five minutes.', illu: <IlluDeploy />, accent: '#7c3aed', action: '/login' },
  { title: 'Always-On Hosting', desc: '24/7 uptime with auto-restart and exponential backoff.', illu: <IlluZap />, accent: '#6366f1', action: '/pricing' },
  { title: 'Secure Sandboxing', desc: 'Every bot runs isolated — env vars encrypted at rest.', illu: <IlluShield />, accent: '#8b5cf6', action: '/login' },
  { title: 'Live Console', desc: 'Stream, search and filter stdout in the browser. No SSH.', illu: <IlluLogs />, accent: '#4f46e5', action: '/login' },
];

const QUICK_PATHS = [
  { icon: Zap,      label: 'Get live in 60 seconds',  sub: 'Fastest path to a running bot' },
  { icon: Bot,      label: 'Set up AI crash repair',  sub: 'Automatic code patching on crash' },
  { icon: Shield,   label: 'Secure your environment', sub: 'Isolated sandbox + encrypted vars' },
  { icon: Activity, label: 'Monitor with live logs',  sub: 'Real-time console streaming' },
  { icon: Code2,    label: 'Edit files in-browser',   sub: 'Syntax-highlighted file manager' },
  { icon: RotateCw, label: 'Configure auto-restart',  sub: 'Exponential backoff on crashes' },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function SidebarSection({ section, activeItem, onItemClick }: {
  section: typeof NAV_SECTIONS[0]; activeItem: string; onItemClick: (s: string) => void;
}) {
  const [open, setOpen] = useState(section.defaultOpen);
  const Icon = section.icon;
  return (
    <div className="mb-0.5">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors group">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left tracking-wide uppercase text-[10px]">{section.label}</span>
        {open ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
      </button>
      {open && (
        <div className="mt-0.5 ml-2 border-l border-gray-200 pl-3">
          {section.items.map(item => (
            <button key={item} onClick={() => onItemClick(item)}
              className={`w-full text-left px-2 py-1.5 rounded-md text-[12.5px] transition-colors ${
                activeItem === item ? 'text-violet-700 font-medium bg-violet-50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}>
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar({ activeItem, onItemClick }: { activeItem: string; onItemClick: (s: string) => void }) {
  return (
    <aside className="w-60 shrink-0 flex flex-col gap-0.5 pr-4 pt-6 pb-10">
      <div className="flex items-center gap-2.5 px-3 mb-5">
        <div className="h-5 w-5 rounded-md overflow-hidden flex items-center justify-center shrink-0" style={{ background: '#0c0c14' }}>
          <img src="/lumora-brand.png" alt="Lumora" className="h-4 w-4 object-contain" />
        </div>
        <span className="text-[12px] font-semibold text-gray-500 tracking-wide">Lumora Docs</span>
      </div>
      {NAV_SECTIONS.map(s => (
        <SidebarSection key={s.id} section={s} activeItem={activeItem} onItemClick={onItemClick} />
      ))}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Resources</p>
        {[
          { label: 'Discord Server', icon: '💬' },
          { label: 'Status Page', icon: '🟢' },
        ].map(({ label, icon }) => (
          <button key={label} className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12.5px] text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors">
            <span className="text-xs">{icon}</span>{label}
          </button>
        ))}
      </div>
    </aside>
  );
}

// ─── Top Nav ──────────────────────────────────────────────────────────────────
function TopNav({ session, onLogin, sidebarOpen, setSidebarOpen }: {
  session: SessionData | null; onLogin: () => void; sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void;
}) {
  const [, setLocation] = useLocation();
  const avatarUrl = session?.discord?.avatar && session.discord.id
    ? `https://cdn.discordapp.com/avatars/${session.discord.id}/${session.discord.avatar}.webp?size=64`
    : null;
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/70">
      <div className="flex items-center h-14 px-5 gap-4">
        <button className="lg:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>

        {/* Logo */}
        <button onClick={() => setLocation('/')} className="flex items-center gap-2.5 shrink-0 group">
          <div className="h-7 w-7 rounded-[8px] overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform" style={{ background: '#0c0c14' }}>
            <img src="/lumora-brand.png" alt="Lumora" className="h-6 w-6 object-contain" />
          </div>
          <span className="font-bold text-[15px] text-gray-900 tracking-tight">Lumora</span>
        </button>

        {/* Nav */}
        <nav className="hidden lg:flex items-center gap-0.5 ml-2">
          {[
            { label: 'Documentation', active: true },
            { label: 'Features', action: () => {} },
            { label: 'Pricing', action: () => setLocation('/pricing') },
          ].map(({ label, active, action }) => (
            <button key={label} onClick={action}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                active ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}>
              {label}
            </button>
          ))}
        </nav>

        {/* Search */}
        <div className="flex-1 max-w-sm mx-auto hidden md:flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-100 border border-gray-200 cursor-text text-[13px] text-gray-400 hover:border-gray-300 transition-colors">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">Search docs…</span>
          <span className="flex items-center gap-0.5 shrink-0">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[10px] font-mono text-gray-500">⌘</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[10px] font-mono text-gray-500">K</kbd>
          </span>
        </div>

        {/* Auth */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {session ? (
            <>
              <button onClick={() => setLocation('/dashboard')}
                className="hidden sm:flex h-8 px-3.5 items-center gap-1.5 rounded-lg text-[13px] font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">
                Dashboard
              </button>
              <div className="h-7 w-7 rounded-full border border-gray-200 overflow-hidden bg-violet-100 flex items-center justify-center">
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-[11px] font-bold text-violet-700">{(session.discord?.username || session.ownerUsername || '?')[0].toUpperCase()}</span>}
              </div>
            </>
          ) : (
            <>
              <button onClick={onLogin} className="hidden sm:block h-8 px-3.5 rounded-lg text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors">Sign in</button>
              <button onClick={onLogin}
                className="h-8 px-4 rounded-lg text-[13px] font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 1px 8px rgba(124,58,237,0.25)' }}>
                Get started
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<SessionData | null>(null);
  const [activeItem, setActiveItem] = useState('Introduction');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/session/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => { if (d?.ticketId) setSession(d); })
      .catch(() => {});
  }, []);

  const goLogin = () => setLocation('/login');

  return (
    <div className="min-h-screen text-gray-900" style={{ background: '#f6f6f7', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <TopNav session={session} onLogin={goLogin} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 w-64 bg-white border-r border-gray-200 h-full overflow-y-auto px-4 pt-4 pb-10">
            <Sidebar activeItem={activeItem} onItemClick={item => { setActiveItem(item); setSidebarOpen(false); }} />
          </div>
        </div>
      )}

      <div className="max-w-[1240px] mx-auto px-4 flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-gray-200/60 shrink-0">
          <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 lg:px-14 pt-12 pb-28">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[12.5px] text-gray-400 mb-10">
            <span>Docs</span>
            <ChevronRight className="h-3 w-3" />
            <span>Getting Started</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-700 font-medium">Introduction</span>
          </div>

          {/* ── Hero ──────────────────────────────────────────────────────────── */}
          <div className="max-w-2xl mx-auto text-center mb-16">
            {/* Big icon in dark badge */}
            <div className="flex justify-center mb-7">
              <div className="relative">
                <div className="h-[88px] w-[88px] rounded-[26px] overflow-hidden flex items-center justify-center"
                  style={{ background: '#0c0c14', boxShadow: '0 0 0 1px rgba(124,58,237,0.25), 0 8px 32px rgba(0,0,0,0.18), 0 0 60px rgba(124,58,237,0.12)' }}>
                  <img src="/lumora-brand.png" alt="Lumora" className="h-[72px] w-[72px] object-contain" />
                </div>
                {/* Subtle glow ring */}
                <div className="absolute -inset-1 rounded-[30px] -z-10 blur-xl opacity-40"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }} />
              </div>
            </div>

            <h1 className="text-5xl md:text-[60px] font-black text-gray-950 tracking-[-0.03em] mb-5 leading-[1.03]">
              Lumora Hosting
            </h1>
            <p className="text-[17px] text-gray-500 leading-relaxed max-w-xl mx-auto">
              The simplest way to keep your Discord bot online 24/7 — upload your code, paste your token, and you're live in under a minute.
            </p>

            <div className="flex items-center justify-center gap-3 mt-8">
              <button onClick={goLogin}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-px hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 2px 14px rgba(124,58,237,0.3)' }}>
                Get started free <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => setLocation('/pricing')}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-medium text-gray-600 border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition-all">
                View plans
              </button>
            </div>
          </div>

          {/* ── Hub cards — clean, Mintlify-style ────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16 max-w-3xl mx-auto">
            {HUB_CARDS.map(({ title, desc, illu, accent, action }) => (
              <button key={title} onClick={() => setLocation(action)}
                className="group text-left rounded-2xl border border-gray-200/80 overflow-hidden bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {/* Illustration — white bg, monoline violet */}
                <div className="h-36 overflow-hidden bg-gray-50/80 border-b border-gray-100">
                  {illu}
                </div>
                {/* Text */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 text-[15px]">{title}</h3>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* ── Divider ───────────────────────────────────────────────────────── */}
          <div className="max-w-3xl mx-auto border-t border-gray-200/60 mb-14" />

          {/* ── Pick your path ───────────────────────────────────────────────── */}
          <div className="max-w-3xl mx-auto" id="features">
            <div className="mb-7">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 uppercase tracking-widest mb-2">
                <span className="h-px w-5 bg-violet-300 inline-block" /> Pick your path
              </div>
              <h2 className="text-2xl font-bold text-gray-900">What do you want to do?</h2>
              <p className="text-[14px] text-gray-500 mt-1">Jump to the guide that matches your goal.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {QUICK_PATHS.map(({ icon: Icon, label, sub }) => (
                <button key={label} onClick={goLogin}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-white hover:border-violet-200 hover:bg-violet-50/50 transition-all text-left">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-50 border border-gray-200 group-hover:border-violet-200 group-hover:bg-violet-50 transition-colors">
                    <Icon className="h-4 w-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-gray-800 group-hover:text-violet-700 transition-colors">{label}</p>
                    <p className="text-[12px] text-gray-400 truncate">{sub}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* ── CTA strip ────────────────────────────────────────────────────── */}
          <div className="max-w-3xl mx-auto mt-16">
            <div className="rounded-2xl border border-violet-200/70 p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-white"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-violet-600 uppercase tracking-widest mb-1.5">Free forever</p>
                <h3 className="text-xl font-bold text-gray-900 mb-1.5">Start hosting today</h3>
                <p className="text-[13.5px] text-gray-500">One bot, 256 MB RAM, live console, AI crash repair — no credit card needed.</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={goLogin}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 2px 12px rgba(124,58,237,0.28)' }}>
                  Deploy your bot <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => setLocation('/pricing')}
                  className="px-5 py-2.5 rounded-xl text-[13.5px] text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 transition-colors text-center bg-gray-50">
                  Compare plans
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="max-w-3xl mx-auto mt-16 pt-8 border-t border-gray-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-[4px] overflow-hidden flex items-center justify-center" style={{ background: '#0c0c14' }}>
                <img src="/lumora-brand.png" alt="" className="h-3.5 w-3.5 object-contain" />
              </div>
              <span className="text-[12.5px] text-gray-400 font-medium">Lumora Hosting</span>
            </div>
            <p className="text-[12px] text-gray-300">© 2025 Lumora. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <button onClick={() => setLocation('/pricing')} className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors">Pricing</button>
              <button onClick={() => setLocation('/admin')} className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors">Admin</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
