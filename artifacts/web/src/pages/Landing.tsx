import { useLocation } from 'wouter';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Zap, RotateCw, Shield, Activity, Code2, Bot,
  LayoutDashboard, LogOut, ChevronDown, Upload, Settings2,
  Circle, Cpu, HardDrive, MemoryStick, Play, Square,
} from 'lucide-react';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

interface SessionData {
  ticketId?: number;
  discord?: { id: string; username: string; globalName?: string | null; avatar?: string | null } | null;
  ownerUsername?: string;
}

/* ─── avatar dropdown ──────────────────────────────────────────────────── */
function UserMenu({ session, avatarUrl, displayName, onNavigate }: {
  session: SessionData; avatarUrl: string | null; displayName: string | undefined;
  onNavigate: (p: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const logout = async () => {
    await fetch(`${BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    window.location.href = '/';
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all"
        style={{ background: open ? 'rgba(255,255,255,0.08)' : 'transparent' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}>
        <div className="h-6 w-6 rounded-full overflow-hidden flex items-center justify-center"
          style={{ border: '1.5px solid rgba(167,139,250,0.4)', background: 'rgba(124,58,237,0.3)' }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            : <span className="text-[10px] font-bold text-violet-300">{(displayName || '?')[0].toUpperCase()}</span>}
        </div>
        <ChevronDown className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl py-1.5 z-50"
          style={{ background: 'rgba(18,16,28,0.97)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.5)' }}>
          <div className="px-3 py-3 mb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: '1.5px solid rgba(167,139,250,0.3)', background: 'rgba(124,58,237,0.25)' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  : <span className="h-full w-full flex items-center justify-center text-[12px] font-bold text-violet-300">{(displayName || '?')[0].toUpperCase()}</span>}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>{displayName}</p>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Free plan</p>
              </div>
            </div>
          </div>
          {[
            { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
            { icon: Code2,           label: 'Pricing',   path: '/pricing'   },
          ].map(({ icon: Icon, label, path }) => (
            <button key={label} onClick={() => { onNavigate(path); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors text-left"
              style={{ color: 'rgba(255,255,255,0.55)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.background = 'transparent'; }}>
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-50" /> {label}
            </button>
          ))}
          <div className="my-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
          <button onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors text-left"
            style={{ color: 'rgba(248,113,113,0.8)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(248,113,113,0.8)'; e.currentTarget.style.background = 'transparent'; }}>
            <LogOut className="h-3.5 w-3.5 shrink-0" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── fake dashboard mockup ─────────────────────────────────────────────── */
function DashboardMockup() {
  const bots = [
    { name: 'MusicBot', status: 'online',  mem: 61,  cpu: 8  },
    { name: 'ModBot',   status: 'online',  mem: 38,  cpu: 3  },
    { name: 'StatsBot', status: 'crashed', mem: 0,   cpu: 0  },
  ];
  const selected = bots[0];

  return (
    <div className="w-full rounded-2xl overflow-hidden select-none"
      style={{
        background: '#0e0c18',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.4)',
        transform: 'perspective(1200px) rotateY(-6deg) rotateX(2deg)',
        transformOrigin: 'center center',
      }}>
      {/* window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3" style={{ background: '#13111f', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ff5f57' }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ffbd2e' }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#28c840' }} />
        <div className="ml-4 flex items-center gap-2">
          <img src="/lumora-brand.png" alt="" className="h-3.5 w-3.5 object-contain opacity-50"
            onError={e => (e.currentTarget.style.display = 'none')} />
          <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>Lumora Portal</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#22c55e' }} />
          <span className="text-[10px] font-mono" style={{ color: '#4ade80' }}>2 online</span>
        </div>
      </div>

      {/* body */}
      <div className="flex" style={{ minHeight: 320 }}>
        {/* sidebar */}
        <div className="w-44 shrink-0 py-3 px-2" style={{ background: '#0b0916', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[9px] font-bold uppercase tracking-widest px-2 mb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>My Bots</p>
          {bots.map((b) => (
            <div key={b.name}
              className="flex items-center gap-2 px-2 py-2 rounded-lg mb-0.5"
              style={{
                background: b.name === selected.name ? 'rgba(124,58,237,0.18)' : 'transparent',
                border: `1px solid ${b.name === selected.name ? 'rgba(124,58,237,0.25)' : 'transparent'}`,
              }}>
              <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: b.status === 'online' ? '#22c55e' : '#ef4444' }} />
              <span className="text-[12px] font-medium truncate" style={{ color: b.name === selected.name ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>{b.name}</span>
            </div>
          ))}
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-default"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              <Upload className="h-3 w-3 shrink-0" />
              <span className="text-[11px]">Upload bot</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-default" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <Settings2 className="h-3 w-3 shrink-0" />
              <span className="text-[11px]">Settings</span>
            </div>
          </div>
        </div>

        {/* main panel */}
        <div className="flex-1 p-4 overflow-hidden">
          {/* bot header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-[15px] font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>{selected.name}</h3>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
                  ONLINE
                </span>
              </div>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Uptime: 14d 6h 22m</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Square className="h-3 w-3" style={{ color: '#f87171' }} />
              </button>
              <button className="h-7 w-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <RotateCw className="h-3 w-3" style={{ color: '#4ade80' }} />
              </button>
            </div>
          </div>

          {/* stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { icon: MemoryStick, label: 'Memory',  value: `${selected.mem} MB`, max: 256, color: '#a78bfa', used: selected.mem / 256 },
              { icon: Cpu,         label: 'CPU',     value: `${selected.cpu}%`,   max: 100, color: '#60a5fa', used: selected.cpu / 100 },
              { icon: HardDrive,   label: 'Disk',    value: '24 MB',              max: 100, color: '#fb923c', used: 0.24 },
            ].map(({ icon: Icon, label, value, color, used }) => (
              <div key={label} className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className="h-3 w-3" style={{ color }} />
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                </div>
                <p className="text-[13px] font-bold mb-2" style={{ color: 'rgba(255,255,255,0.85)' }}>{value}</p>
                <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${used * 100}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>

          {/* log preview */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>Recent Logs</p>
            {[
              { t: '14:02', c: '#4ade80', m: '✓ Logged in as MusicBot#4829' },
              { t: '14:05', c: 'rgba(255,255,255,0.35)', m: '/play  →  Now playing: Blinding Lights' },
              { t: '14:11', c: '#fb923c', m: 'WARN  queue full, skipping track' },
              { t: '14:11', c: 'rgba(255,255,255,0.35)', m: 'Serving 3 voice channels' },
            ].map(({ t, c, m }) => (
              <div key={t + m} className="flex items-baseline gap-3 font-mono text-[10px] leading-relaxed">
                <span style={{ color: 'rgba(255,255,255,0.18)', minWidth: 34 }}>{t}</span>
                <span style={{ color: c }}>{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── main page ────────────────────────────────────────────────────────── */
export default function Landing() {
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/session/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => { if (d?.ticketId) setSession(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const avatarUrl = session?.discord?.avatar && session.discord.id
    ? `https://cdn.discordapp.com/avatars/${session.discord.id}/${session.discord.avatar}.webp?size=64`
    : null;
  const displayName = session?.discord?.globalName || session?.discord?.username || session?.ownerUsername;

  return (
    <div className="min-h-screen overflow-x-hidden"
      style={{ background: '#08070f', fontFamily: "'Inter', system-ui, sans-serif", color: '#fff' }}>

      {/* ── Big radial glow ─ sits behind everything ──────────────────── */}
      <div className="fixed inset-0 pointer-events-none select-none" style={{ zIndex: 0 }}>
        {/* main hero glow — left-center, large, purple */}
        <div style={{
          position: 'absolute',
          top: '-10%', left: '-5%',
          width: '80vw', height: '80vh',
          background: 'radial-gradient(ellipse at 30% 30%, rgba(109,40,217,0.35) 0%, rgba(79,70,229,0.12) 40%, transparent 70%)',
        }} />
        {/* secondary accent — right side, indigo */}
        <div style={{
          position: 'absolute',
          top: '20%', right: '-15%',
          width: '50vw', height: '60vh',
          background: 'radial-gradient(ellipse at 70% 40%, rgba(99,102,241,0.12) 0%, transparent 65%)',
        }} />
      </div>

      {/* ── Centered floating navbar ───────────────────────────────────── */}
      <div className="relative z-20 flex justify-center pt-5 px-4">
        <nav className="flex items-center gap-2 px-4 py-2.5 rounded-2xl w-full max-w-[780px]"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}>
          {/* logo */}
          <button onClick={() => setLocation('/')} className="flex items-center gap-2 mr-4 shrink-0">
            <img src="/lumora-brand.png" alt="Lumora" className="h-6 w-6 object-contain"
              style={{ filter: 'drop-shadow(0 0 8px rgba(167,139,250,0.6))' }}
              onError={e => (e.currentTarget.style.display = 'none')} />
            <span className="font-bold text-[15px] tracking-tight text-white">Lumora</span>
          </button>

          {/* links — empty, pricing is in footer */}
          <div className="flex items-center gap-0.5" />

          {/* right side */}
          <div className="ml-auto flex items-center gap-2">
            {!loading && (
              session ? (
                <>
                  <button onClick={() => setLocation('/dashboard')}
                    className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-medium transition-all"
                    style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)', color: '#c4b5fd' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.2)'; }}>
                    <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                  </button>
                  <UserMenu session={session} avatarUrl={avatarUrl} displayName={displayName} onNavigate={setLocation} />
                </>
              ) : (
                <>
                  <button onClick={() => setLocation('/login')}
                    className="px-3.5 py-1.5 rounded-xl text-[13px] font-medium transition-colors"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'transparent'; }}>
                    Login
                  </button>
                  <button onClick={() => setLocation('/login')}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[13px] font-bold transition-all"
                    style={{ background: '#7c3aed', color: '#fff', border: '1px solid rgba(167,139,250,0.3)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#6d28d9'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#7c3aed'; }}>
                    Sign Up <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </>
              )
            )}
          </div>
        </nav>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* left */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-8 text-[12px] font-semibold"
            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#c4b5fd' }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#a78bfa' }} />
            Discord bot hosting
          </div>

          <h1 className="font-black leading-[1.04] mb-6"
            style={{ fontSize: 'clamp(2.6rem, 5.5vw, 4rem)', letterSpacing: '-0.04em' }}>
            Simple, Reliable<br />
            <span style={{
              background: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 50%, #818cf8 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>& Affordable.</span>
          </h1>

          <p className="mb-10 leading-relaxed" style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.42)', maxWidth: 420 }}>
            Upload your bot, paste your token, go live in under a minute.
            Auto-restarts, AI crash repair, and a live dashboard — all included.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 mb-10">
            {session ? (
              <>
                <button onClick={() => setLocation('/dashboard')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold transition-all hover:-translate-y-px"
                  style={{ background: '#7c3aed', color: '#fff', border: '1px solid rgba(167,139,250,0.25)', boxShadow: '0 8px 30px rgba(124,58,237,0.35)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#6d28d9'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#7c3aed'; }}>
                  Open Dashboard <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => setLocation('/pricing')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold transition-all hover:-translate-y-px"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.11)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}>
                  View Plans
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setLocation('/login')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold transition-all hover:-translate-y-px"
                  style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}>
                  Get Started <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => setLocation('/pricing')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold transition-all hover:-translate-y-px"
                  style={{ background: '#7c3aed', color: '#fff', border: '1px solid rgba(167,139,250,0.25)', boxShadow: '0 8px 30px rgba(124,58,237,0.35)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#6d28d9'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#7c3aed'; }}>
                  Pricing
                </button>
              </>
            )}
          </div>

          {/* stat badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-3 w-3" viewBox="0 0 20 20" fill={i < 4 ? '#facc15' : '#374151'}>
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>4.8 / 5</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#4ade80' }} />
                <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>99.9% uptime</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <Bot className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>500+ bots hosted</span>
            </div>
          </div>
        </div>

        {/* right: dashboard mockup */}
        <div className="hidden lg:block">
          <DashboardMockup />
        </div>
      </section>

      {/* ── Feature cards ─────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 pb-28">
        <div className="text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-4" style={{ color: 'rgba(167,139,250,0.6)' }}>
            What's included
          </p>
          <h2 className="font-black tracking-tight" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', letterSpacing: '-0.035em' }}>
            Hosting so simple, we can't<br />put it in words
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Zap,      color: '#facc15', bg: 'rgba(250,204,21,0.1)',  border: 'rgba(250,204,21,0.18)',  title: 'Deploy in 60 seconds',  desc: 'Upload a ZIP, pick your runtime. Live in under a minute with zero server config.' },
            { icon: RotateCw, color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.18)', title: 'Always-on restarts',     desc: 'Exponential-backoff auto-restart keeps your bot alive through any crash.' },
            { icon: Bot,      color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',border: 'rgba(167,139,250,0.18)',title: 'AI crash repair',        desc: 'Repeated crashes trigger our AI — it reads the stack trace and patches your code.' },
            { icon: Shield,   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.18)', title: 'Isolated sandboxes',     desc: 'Every bot runs in its own process. Env vars encrypted at rest.' },
            { icon: Activity, color: '#f87171', bg: 'rgba(248,113,113,0.1)',border: 'rgba(248,113,113,0.18)',title: 'Live console logs',      desc: 'Stream and filter your bot stdout in the browser in real time.' },
            { icon: Code2,    color: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.18)', title: 'In-browser editor',      desc: 'Browse and edit your bot\'s source files directly in the portal with full syntax highlighting.' },
          ].map(({ icon: Icon, color, bg, border, title, desc }) => (
            <div key={title}
              className="rounded-2xl p-6 transition-all duration-200 cursor-default group"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = 'rgba(255,255,255,0.07)'; el.style.borderColor = 'rgba(255,255,255,0.13)'; el.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = 'rgba(255,255,255,0.04)'; el.style.borderColor = 'rgba(255,255,255,0.08)'; el.style.transform = 'translateY(0)'; }}>
              <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-5"
                style={{ background: bg, border: `1px solid ${border}` }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <h3 className="font-bold text-[15px] mb-2" style={{ color: 'rgba(255,255,255,0.88)' }}>{title}</h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-2xl mx-auto px-6 pb-32 text-center">
        <div className="relative rounded-3xl px-10 py-14 overflow-hidden"
          style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.22)' }}>
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.6) 50%, transparent 100%)' }} />
          <div className="absolute pointer-events-none" style={{
            top: '-80px', left: '50%', transform: 'translateX(-50%)',
            width: '400px', height: '200px',
            background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.25) 0%, transparent 70%)',
          }} />
          <h3 className="font-black tracking-tight mb-4" style={{ fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', letterSpacing: '-0.04em' }}>
            Start hosting today
          </h3>
          <p className="mb-8 leading-relaxed" style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.38)' }}>
            One bot, 256 MB RAM, live console, AI crash repair — all on the free plan.
          </p>
          <button onClick={() => setLocation(session ? '/dashboard' : '/login')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-[14px] font-bold transition-all hover:-translate-y-px"
            style={{ background: '#7c3aed', color: '#fff', border: '1px solid rgba(167,139,250,0.25)', boxShadow: '0 8px 32px rgba(124,58,237,0.45)' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#6d28d9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#7c3aed'; }}>
            {session ? 'Go to Dashboard' : 'Get started free'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 px-6 md:px-12 pb-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/lumora-brand.png" alt="" className="h-4 w-4 object-contain opacity-20"
              onError={e => (e.currentTarget.style.display = 'none')} />
            <span className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.15)' }}>Lumora Hosting</span>
          </div>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.1)' }}>© 2025 Lumora. All rights reserved.</p>
          <div className="flex items-center gap-5">
            {[
              { label: 'Pricing', path: '/pricing' },
              { label: 'Dashboard', path: '/dashboard' },
            ].map(({ label, path }) => (
              <button key={label} onClick={() => setLocation(path)}
                className="text-[12px] transition-colors"
                style={{ color: 'rgba(255,255,255,0.18)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
