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

// ─── Sidebar nav data ──────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: Play,
    items: ['Introduction', 'Quick Start', 'Dashboard Overview', 'Connect Discord'],
    defaultOpen: true,
  },
  {
    id: 'features',
    label: 'Features',
    icon: Layers,
    items: ['AI Crash Repair', 'Auto Restart', 'Live Console Logs', 'File Manager', 'Environment Variables'],
    defaultOpen: false,
  },
  {
    id: 'runtimes',
    label: 'Runtimes',
    icon: Cpu,
    items: ['Node.js', 'Python', 'Java'],
    defaultOpen: false,
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: Server,
    items: ['Plans & Pricing', 'Usage Limits', 'Upgrade'],
    defaultOpen: false,
  },
];

// ─── SVG Illustrations ─────────────────────────────────────────────────────────
function RocketSVG() {
  return (
    <svg viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="rg" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(124,58,237,0.18)" strokeWidth="0.7"/>
        </pattern>
      </defs>
      <rect width="320" height="200" fill="url(#rg)"/>
      {/* Rocket body */}
      <ellipse cx="160" cy="100" rx="32" ry="54" fill="rgba(124,58,237,0.18)" stroke="rgba(124,58,237,0.45)" strokeWidth="1.5"/>
      {/* Nose */}
      <path d="M 160 46 L 128 100 L 192 100 Z" fill="rgba(124,58,237,0.3)" stroke="rgba(124,58,237,0.55)" strokeWidth="1.5"/>
      {/* Left wing */}
      <path d="M 128 112 L 95 152 L 128 132 Z" fill="rgba(99,102,241,0.28)" stroke="rgba(99,102,241,0.5)" strokeWidth="1"/>
      {/* Right wing */}
      <path d="M 192 112 L 225 152 L 192 132 Z" fill="rgba(99,102,241,0.28)" stroke="rgba(99,102,241,0.5)" strokeWidth="1"/>
      {/* Flame outer */}
      <ellipse cx="160" cy="162" rx="16" ry="24" fill="rgba(251,146,60,0.35)" stroke="rgba(251,146,60,0.5)" strokeWidth="1"/>
      {/* Flame inner */}
      <ellipse cx="160" cy="168" rx="9" ry="14" fill="rgba(253,224,71,0.4)"/>
      {/* Window */}
      <circle cx="160" cy="96" r="13" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
      <circle cx="160" cy="96" r="6" fill="rgba(255,255,255,0.22)"/>
      {/* Stars */}
      <circle cx="70" cy="55" r="2" fill="rgba(255,255,255,0.4)"/>
      <circle cx="255" cy="72" r="1.5" fill="rgba(255,255,255,0.3)"/>
      <circle cx="85" cy="145" r="1.5" fill="rgba(255,255,255,0.25)"/>
      <circle cx="275" cy="130" r="2" fill="rgba(255,255,255,0.35)"/>
    </svg>
  );
}

function DeploySVG() {
  return (
    <svg viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="dg" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(99,102,241,0.18)" strokeWidth="0.7"/>
        </pattern>
      </defs>
      <rect width="320" height="200" fill="url(#dg)"/>
      {/* Terminal window */}
      <rect x="52" y="38" width="178" height="126" rx="10" fill="rgba(10,10,30,0.42)" stroke="rgba(99,102,241,0.4)" strokeWidth="1.5"/>
      {/* Title bar */}
      <rect x="52" y="38" width="178" height="30" rx="10" fill="rgba(20,18,50,0.6)"/>
      <rect x="52" y="55" width="178" height="13" fill="rgba(20,18,50,0.6)"/>
      <circle cx="74" cy="53" r="5" fill="rgba(239,68,68,0.5)"/>
      <circle cx="92" cy="53" r="5" fill="rgba(251,191,36,0.5)"/>
      <circle cx="110" cy="53" r="5" fill="rgba(34,197,94,0.5)"/>
      {/* Code lines */}
      <rect x="68" y="78" width="92" height="6" rx="3" fill="rgba(167,139,250,0.7)"/>
      <rect x="68" y="92" width="130" height="6" rx="3" fill="rgba(255,255,255,0.18)"/>
      <rect x="68" y="106" width="78" height="6" rx="3" fill="rgba(99,102,241,0.55)"/>
      <rect x="68" y="120" width="108" height="6" rx="3" fill="rgba(255,255,255,0.14)"/>
      <rect x="68" y="134" width="60" height="6" rx="3" fill="rgba(34,197,94,0.5)"/>
      {/* Cursor blink */}
      <rect x="68" y="148" width="8" height="8" rx="1.5" fill="rgba(167,139,250,0.8)"/>
      {/* Arrow */}
      <path d="M 238 101 L 278 101" stroke="rgba(124,58,237,0.55)" strokeWidth="2.5" strokeDasharray="5 3"/>
      <path d="M 273 94 L 280 101 L 273 108" stroke="rgba(124,58,237,0.8)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Cloud */}
      <ellipse cx="295" cy="93" rx="22" ry="16" fill="rgba(124,58,237,0.18)" stroke="rgba(124,58,237,0.45)" strokeWidth="1.5"/>
      <ellipse cx="281" cy="99" rx="15" ry="11" fill="rgba(124,58,237,0.15)" stroke="rgba(124,58,237,0.4)" strokeWidth="1.5"/>
      <ellipse cx="305" cy="101" rx="12" ry="9" fill="rgba(124,58,237,0.15)" stroke="rgba(124,58,237,0.4)" strokeWidth="1.5"/>
    </svg>
  );
}

function BotSVG() {
  return (
    <svg viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="bg2" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="0.7"/>
        </pattern>
      </defs>
      <rect width="320" height="200" fill="url(#bg2)"/>
      {/* Bot head */}
      <rect x="110" y="52" width="100" height="96" rx="16" fill="rgba(124,58,237,0.18)" stroke="rgba(124,58,237,0.5)" strokeWidth="1.5"/>
      {/* Eyes */}
      <rect x="128" y="80" width="22" height="16" rx="5" fill="rgba(124,58,237,0.55)" stroke="rgba(167,139,250,0.7)" strokeWidth="1"/>
      <rect x="170" y="80" width="22" height="16" rx="5" fill="rgba(124,58,237,0.55)" stroke="rgba(167,139,250,0.7)" strokeWidth="1"/>
      {/* Eye glints */}
      <rect x="132" y="84" width="5" height="4" rx="1.5" fill="rgba(255,255,255,0.75)"/>
      <rect x="174" y="84" width="5" height="4" rx="1.5" fill="rgba(255,255,255,0.75)"/>
      {/* Mouth */}
      <path d="M 134 118 Q 160 132 186 118" stroke="rgba(167,139,250,0.8)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Antenna */}
      <line x1="160" y1="52" x2="160" y2="32" stroke="rgba(124,58,237,0.55)" strokeWidth="2"/>
      <circle cx="160" cy="27" r="7" fill="rgba(124,58,237,0.25)" stroke="rgba(124,58,237,0.6)" strokeWidth="1.5"/>
      {/* Side panels */}
      <rect x="94" y="80" width="16" height="32" rx="6" fill="rgba(99,102,241,0.18)" stroke="rgba(99,102,241,0.4)" strokeWidth="1"/>
      <rect x="210" y="80" width="16" height="32" rx="6" fill="rgba(99,102,241,0.18)" stroke="rgba(99,102,241,0.4)" strokeWidth="1"/>
      {/* Sparkles */}
      <path d="M 62 62 L 65 72 L 75 75 L 65 78 L 62 88 L 59 78 L 49 75 L 59 72 Z" fill="rgba(251,191,36,0.5)" stroke="rgba(251,191,36,0.55)" strokeWidth="0.5"/>
      <path d="M 252 48 L 254 56 L 262 58 L 254 60 L 252 68 L 250 60 L 242 58 L 250 56 Z" fill="rgba(251,191,36,0.4)" stroke="rgba(251,191,36,0.5)" strokeWidth="0.5"/>
      <path d="M 265 125 L 267 131 L 273 133 L 267 135 L 265 141 L 263 135 L 257 133 L 263 131 Z" fill="rgba(167,139,250,0.55)" strokeWidth="0.5"/>
    </svg>
  );
}

function ConsoleSVG() {
  return (
    <svg viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="cg" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(79,70,229,0.15)" strokeWidth="0.7"/>
        </pattern>
      </defs>
      <rect width="320" height="200" fill="url(#cg)"/>
      {/* Outer monitor */}
      <rect x="42" y="28" width="236" height="144" rx="12" fill="rgba(8,8,22,0.55)" stroke="rgba(79,70,229,0.4)" strokeWidth="1.5"/>
      {/* Title bar */}
      <rect x="42" y="28" width="236" height="34" rx="12" fill="rgba(15,12,38,0.7)"/>
      <rect x="42" y="49" width="236" height="13" fill="rgba(15,12,38,0.7)"/>
      <circle cx="66" cy="45" r="5.5" fill="rgba(239,68,68,0.5)"/>
      <circle cx="85" cy="45" r="5.5" fill="rgba(251,191,36,0.5)"/>
      <circle cx="104" cy="45" r="5.5" fill="rgba(34,197,94,0.5)"/>
      {/* Online badge */}
      <rect x="224" y="36" width="42" height="17" rx="8.5" fill="rgba(34,197,94,0.12)" stroke="rgba(34,197,94,0.3)" strokeWidth="1"/>
      <circle cx="234" cy="44.5" r="3" fill="rgba(34,197,94,0.85)"/>
      <text x="240" y="48" fontSize="7" fontFamily="monospace" fill="rgba(34,197,94,0.9)">LIVE</text>
      {/* Log lines */}
      <text x="58" y="82" fontSize="8.5" fontFamily="monospace" fill="rgba(167,139,250,0.9)">$ node index.js</text>
      <text x="58" y="97" fontSize="8.5" fontFamily="monospace" fill="rgba(124,58,237,0.75)">▸ Connecting to gateway…</text>
      <text x="58" y="112" fontSize="8.5" fontFamily="monospace" fill="rgba(34,197,94,0.85)">✓ MyBot#1234 is online</text>
      <text x="58" y="127" fontSize="8.5" fontFamily="monospace" fill="rgba(255,255,255,0.28)">/help → cooluser (38ms)</text>
      <text x="58" y="142" fontSize="8.5" fontFamily="monospace" fill="rgba(255,255,255,0.22)">/play → user_two (21ms)</text>
      {/* Blinking cursor */}
      <rect x="58" y="152" width="7" height="10" rx="1.5" fill="rgba(124,58,237,0.85)">
        <animate attributeName="opacity" values="1;0;1" dur="1.1s" repeatCount="indefinite"/>
      </rect>
    </svg>
  );
}

// ─── Hub cards ─────────────────────────────────────────────────────────────────
const HUB_CARDS = [
  {
    title: 'Quick Start',
    desc: 'Deploy your first Discord bot in under five minutes.',
    illu: <RocketSVG />,
    gradient: 'from-violet-600/20 via-violet-500/10 to-transparent',
    border: 'border-violet-200/60',
    action: '/login',
  },
  {
    title: 'Upload & Deploy',
    desc: 'Upload a ZIP or paste a GitHub URL — dependencies install automatically.',
    illu: <DeploySVG />,
    gradient: 'from-indigo-600/20 via-indigo-500/10 to-transparent',
    border: 'border-indigo-200/60',
    action: '/login',
  },
  {
    title: 'AI Crash Repair',
    desc: 'Lumora reads crash logs and patches your code. Up to 3 auto-fix attempts.',
    illu: <BotSVG />,
    gradient: 'from-purple-600/20 via-purple-500/10 to-transparent',
    border: 'border-purple-200/60',
    action: '/login',
  },
  {
    title: 'Live Console',
    desc: 'Stream, search, and filter your bot\'s stdout in the browser. No SSH.',
    illu: <ConsoleSVG />,
    gradient: 'from-blue-600/20 via-blue-500/10 to-transparent',
    border: 'border-blue-200/60',
    action: '/login',
  },
];

// ─── Quick path links ──────────────────────────────────────────────────────────
const QUICK_PATHS = [
  { icon: Zap,      label: 'Get live in 60 seconds',    sub: 'Fastest path to a running bot' },
  { icon: Bot,      label: 'Set up AI crash repair',    sub: 'Automatic code patching on crash' },
  { icon: Shield,   label: 'Secure your environment',   sub: 'Isolated sandbox & env variables' },
  { icon: Activity, label: 'Monitor with live logs',    sub: 'Real-time console streaming' },
  { icon: Code2,    label: 'Edit files in-browser',     sub: 'Syntax-highlighted file manager' },
  { icon: RotateCw, label: 'Configure auto-restart',    sub: 'Exponential backoff on crashes' },
];

// ─── Sidebar section ───────────────────────────────────────────────────────────
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
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors group"
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left tracking-wide uppercase text-[10.5px]">{section.label}</span>
        {open
          ? <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
          : <ChevronRight className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors" />}
      </button>
      {open && (
        <div className="mt-0.5 ml-2 border-l border-gray-200 pl-3">
          {section.items.map(item => (
            <button
              key={item}
              onClick={() => onItemClick(item)}
              className={`w-full text-left px-2 py-1.5 rounded-md text-[12.5px] transition-colors ${
                activeItem === item
                  ? 'text-violet-700 font-medium bg-violet-50'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ activeItem, onItemClick }: { activeItem: string; onItemClick: (s: string) => void }) {
  return (
    <aside className="w-60 shrink-0 flex flex-col gap-0.5 pr-4 pt-6 pb-10">
      {/* Label */}
      <div className="flex items-center gap-2 px-3 mb-4">
        <div className="h-5 w-5 rounded-md flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}>
          <img src="/lumora-brand.png" alt="" className="h-3 w-3 object-contain brightness-200" onError={e => (e.currentTarget.style.display = 'none')} />
        </div>
        <span className="text-[12px] font-semibold text-gray-500 tracking-wide">Lumora Docs</span>
      </div>

      {NAV_SECTIONS.map(section => (
        <SidebarSection
          key={section.id}
          section={section}
          activeItem={activeItem}
          onItemClick={onItemClick}
        />
      ))}

      {/* Resources */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Resources</p>
        {[
          { label: 'Discord Server', icon: '💬' },
          { label: 'Status Page', icon: '🟢' },
          { label: 'Changelog', icon: '📋' },
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

// ─── Top Nav ──────────────────────────────────────────────────────────────────
function TopNav({
  session,
  onLogin,
  sidebarOpen,
  setSidebarOpen,
}: {
  session: SessionData | null;
  onLogin: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
}) {
  const [, setLocation] = useLocation();
  const avatarUrl = session?.discord?.avatar && session.discord.id
    ? `https://cdn.discordapp.com/avatars/${session.discord.id}/${session.discord.avatar}.webp?size=64`
    : null;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="flex items-center h-14 px-4 gap-4">
        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
          onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>

        {/* Logo */}
        <button onClick={() => setLocation('/')} className="flex items-center gap-2 shrink-0">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}>
            <img src="/lumora-brand.png" alt="" className="h-3.5 w-3.5 object-contain brightness-200" onError={e => (e.currentTarget.style.display = 'none')} />
          </div>
          <span className="font-bold text-[15px] text-gray-900 tracking-tight">Lumora</span>
        </button>

        {/* Nav pills */}
        <nav className="hidden lg:flex items-center gap-0.5 ml-2">
          {[
            { label: 'Documentation', active: true },
            { label: 'Features', href: '#features' },
            { label: 'Pricing', action: () => setLocation('/pricing') },
            { label: 'Changelog' },
          ].map(({ label, active, href, action }) => (
            <a
              key={label}
              href={href ?? '#'}
              onClick={e => { if (action) { e.preventDefault(); action(); } }}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}>
              {label}
            </a>
          ))}
        </nav>

        {/* Search */}
        <div className="flex-1 max-w-sm mx-auto hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 cursor-text text-[13px] text-gray-400">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span>Search docs…</span>
          <span className="ml-auto flex items-center gap-0.5 text-[11px] text-gray-400">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[10px] font-mono">⌘</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[10px] font-mono">K</kbd>
          </span>
        </div>

        {/* Auth */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {session ? (
            <>
              <button
                onClick={() => setLocation('/dashboard')}
                className="hidden sm:flex h-8 px-3.5 items-center gap-1.5 rounded-lg text-[13px] font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">
                Dashboard
              </button>
              <div className="h-7 w-7 rounded-full border-2 border-white ring-1 ring-gray-200 overflow-hidden bg-violet-100 flex items-center justify-center">
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  : <span className="text-[11px] font-bold text-violet-700">{(session.discord?.username || session.ownerUsername || '?')[0].toUpperCase()}</span>}
              </div>
            </>
          ) : (
            <>
              <button onClick={onLogin}
                className="hidden sm:block h-8 px-3.5 rounded-lg text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors border border-transparent">
                Sign in
              </button>
              <button onClick={onLogin}
                className="h-8 px-4 rounded-lg text-[13px] font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 1px 6px rgba(124,58,237,0.3)' }}>
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
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <TopNav
        session={session}
        onLogin={goLogin}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 w-64 bg-white border-r border-gray-200 h-full overflow-y-auto px-4 pt-4 pb-10">
            <Sidebar activeItem={activeItem} onItemClick={item => { setActiveItem(item); setSidebarOpen(false); }} />
          </div>
        </div>
      )}

      {/* Body: sidebar + content */}
      <div className="max-w-[1240px] mx-auto px-4 flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-gray-100 shrink-0">
          <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 lg:px-12 pt-12 pb-24">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[12.5px] text-gray-400 mb-8">
            <span>Docs</span>
            <ChevronRight className="h-3 w-3" />
            <span>Getting Started</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-700 font-medium">Introduction</span>
          </div>

          {/* Hero heading */}
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-5 leading-[1.05]">
              Lumora Hosting
            </h1>
            <p className="text-[17px] text-gray-500 leading-relaxed">
              The easiest way to host your Discord bot 24/7. Upload your code,
              connect your bot token, and go live in under 60 seconds — with AI-powered crash repair built in.
            </p>
          </div>

          {/* Hub cards 2×2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16 max-w-3xl mx-auto">
            {HUB_CARDS.map(({ title, desc, illu, border, action }) => (
              <button
                key={title}
                onClick={() => setLocation(action)}
                className={`group text-left rounded-2xl border ${border} overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 bg-white`}
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {/* Illustration area */}
                <div className="h-36 overflow-hidden bg-gray-50 relative">
                  {illu}
                </div>
                {/* Text area */}
                <div className="p-5 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-semibold text-gray-900 text-[15px]">{title}</h3>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="max-w-3xl mx-auto border-t border-gray-100 mb-14" />

          {/* Quick paths */}
          <div className="max-w-3xl mx-auto" id="features">
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 uppercase tracking-widest mb-2">
                <span className="h-px w-5 bg-violet-300 inline-block" />
                Pick your path
              </div>
              <h2 className="text-2xl font-bold text-gray-900">What do you want to do?</h2>
              <p className="text-[14px] text-gray-500 mt-1">Jump to the guide that matches your goal.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {QUICK_PATHS.map(({ icon: Icon, label, sub }) => (
                <button
                  key={label}
                  onClick={goLogin}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50/40 transition-all text-left">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                    style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
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

          {/* CTA strip */}
          <div className="max-w-3xl mx-auto mt-16">
            <div className="rounded-2xl border border-violet-200 p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6"
              style={{ background: 'linear-gradient(145deg, rgba(124,58,237,0.04) 0%, rgba(99,102,241,0.02) 100%)' }}>
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-violet-600 uppercase tracking-widest mb-1.5">Free forever</p>
                <h3 className="text-xl font-bold text-gray-900 mb-1.5">Start hosting for free</h3>
                <p className="text-[13.5px] text-gray-500">One bot, 256 MB RAM, live console logs, and AI crash repair — all on the free plan.</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={goLogin}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 2px 12px rgba(124,58,237,0.3)' }}>
                  Deploy your bot free <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => setLocation('/pricing')}
                  className="px-5 py-2.5 rounded-xl text-[13.5px] text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 transition-colors text-center">
                  View all plans
                </button>
              </div>
            </div>
          </div>

          {/* Footer nav */}
          <div className="max-w-3xl mx-auto mt-16 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}>
                <img src="/lumora-brand.png" alt="" className="h-3 w-3 object-contain brightness-200" onError={e => (e.currentTarget.style.display = 'none')} />
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
