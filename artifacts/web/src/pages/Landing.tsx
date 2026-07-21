import { useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import {
  ArrowRight, Bot, Zap, RotateCw, Shield, Activity, Code2,
  Check, ChevronRight, Server, Star,
} from 'lucide-react';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SessionData {
  ticketId?: number;
  discord?: { id: string; username: string; globalName?: string | null; avatar?: string | null } | null;
  ownerUsername?: string;
}

// ─── Terminal mockup ──────────────────────────────────────────────────────────
const LOG_LINES = [
  { t: '$ node index.js',                      c: 'text-zinc-400' },
  { t: '▸ Installing dependencies…',           c: 'text-violet-400' },
  { t: '✓ 127 packages installed in 1.8s',    c: 'text-emerald-400' },
  { t: '▸ Connecting to Discord gateway…',     c: 'text-violet-400' },
  { t: '✓ Shard 0/1 ready',                   c: 'text-emerald-400' },
  { t: '✓ MyBot#1234 is online',              c: 'text-emerald-300 font-semibold' },
  { t: '  /help → cooluser (38ms)',            c: 'text-zinc-500' },
  { t: '  /play → another_user (22ms)',        c: 'text-zinc-500' },
  { t: '  memberJoin → Guild now 12,483',      c: 'text-zinc-500' },
];

function TerminalMockup() {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= LOG_LINES.length) return;
    const t = setTimeout(() => setShown(s => s + 1), shown === 0 ? 400 : 350);
    return () => clearTimeout(t);
  }, [shown]);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl"
      style={{ background: '#0d0d16', boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.08)' }}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/40" />
          </div>
          <span className="text-[11px] text-white/25 ml-1 font-mono">MyBot — Lumora Console</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-mono text-emerald-400 tracking-widest">ONLINE</span>
        </div>
      </div>

      {/* Sidebar + content */}
      <div className="flex">
        <div className="w-28 shrink-0 border-r border-white/[0.05] py-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
          {['Overview', 'Console', 'Files', 'Env Vars', 'Settings'].map((l, i) => (
            <div key={l} className={`px-3 py-1.5 text-[10px] font-mono flex items-center gap-1.5 ${
              i === 1 ? 'text-white/70 bg-violet-500/[0.08] border-r-2 border-violet-400' : 'text-white/22'
            }`}>
              {i === 1 && <span className="h-1 w-1 rounded-full bg-violet-400 shrink-0" />}
              {l}
            </div>
          ))}
        </div>
        <div className="flex-1 p-4 font-mono min-h-[180px]">
          <p className="text-[8px] tracking-[0.3em] text-white/20 mb-2">CONSOLE OUTPUT</p>
          <div className="space-y-1">
            {LOG_LINES.slice(0, shown).map((line, i) => (
              <p key={i} className={`text-[11px] leading-relaxed ${line.c}`}>{line.t}</p>
            ))}
            {shown < LOG_LINES.length && (
              <span className="text-[11px] text-white/30 animate-pulse">▊</span>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-white/[0.04]"
        style={{ background: 'rgba(0,0,0,0.3)' }}>
        {['US East', 'Node.js 20', '256 MB'].map((t, i) => (
          <span key={t} className={`font-mono text-[9px] text-white/20${i < 2 ? ' after:content-["·"] after:ml-4 after:text-white/10' : ''}`}>{t}</span>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <Zap className="h-2.5 w-2.5 text-violet-400/50" />
          <span className="font-mono text-[9px] text-violet-400/50">AI Repair ready</span>
        </div>
      </div>
    </div>
  );
}

// ─── Feature data ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Bot,      label: 'AI Crash Repair',       desc: 'Lumora reads your crash logs and auto-patches the code. Up to 3 attempts before you\'re notified.' },
  { icon: Zap,      label: '60-Second Deploy',       desc: 'Upload a ZIP or link a GitHub repo. Dependencies install automatically, bot goes live instantly.' },
  { icon: RotateCw, label: 'Instant Auto-Restart',   desc: 'Every crash is caught and restarted within milliseconds using exponential backoff.' },
  { icon: Shield,   label: 'Isolated Sandbox',       desc: 'Full process isolation. No shared memory, no cross-user access. Your tokens stay private.' },
  { icon: Activity, label: 'Live Console Logs',      desc: 'Stream, search, and filter your bot\'s stdout in the browser. No SSH required.' },
  { icon: Code2,    label: 'In-Browser Editor',      desc: 'Browse and edit source files with syntax highlighting, directly from the dashboard.' },
];

// ─── Nav component ────────────────────────────────────────────────────────────
function Nav({ session, onLogin }: { session: SessionData | null; onLogin: () => void }) {
  const [, setLocation] = useLocation();
  const avatarUrl = session?.discord?.avatar && session.discord.id
    ? `https://cdn.discordapp.com/avatars/${session.discord.id}/${session.discord.avatar}.webp?size=64`
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06]"
      style={{ background: 'rgba(9,9,15,0.92)', backdropFilter: 'blur(16px)' }}>
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => setLocation('/')} className="flex items-center gap-2.5 group">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}>
            <img src="/lumora-brand.png" alt="" className="h-4 w-4 object-contain brightness-200" />
          </div>
          <span className="font-bold text-[15px] text-white tracking-tight">Lumora</span>
        </button>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: 'Features', href: '#features' },
            { label: 'Pricing', action: () => setLocation('/pricing') },
          ].map(({ label, href, action }) => (
            <a key={label}
              href={href}
              onClick={e => { if (action) { e.preventDefault(); action(); } }}
              className="px-3.5 py-1.5 rounded-lg text-[13px] text-white/45 hover:text-white/80 hover:bg-white/[0.05] transition-all cursor-pointer">
              {label}
            </a>
          ))}
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {session ? (
            <>
              <button onClick={() => setLocation('/dashboard')}
                className="flex items-center gap-2 h-8 px-3.5 rounded-lg text-[13px] font-medium text-white/70 hover:text-white border border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.04] transition-all">
                Dashboard
              </button>
              <div className="h-7 w-7 rounded-full border border-white/[0.12] overflow-hidden flex items-center justify-center bg-violet-600/30">
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  : <span className="text-[11px] font-bold text-white/70">{(session.discord?.username || session.ownerUsername || '?')[0].toUpperCase()}</span>
                }
              </div>
            </>
          ) : (
            <>
              <button onClick={onLogin}
                className="h-8 px-3.5 rounded-lg text-[13px] text-white/50 hover:text-white/80 transition-colors">
                Sign in
              </button>
              <button onClick={onLogin}
                className="h-8 px-4 rounded-lg text-[13px] font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 2px 12px rgba(124,58,237,0.35)' }}>
                Get started free
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

  useEffect(() => {
    fetch(`${BASE}/api/session/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => { if (d?.ticketId) setSession(d); })
      .catch(() => {});
  }, []);

  const goLogin = () => setLocation('/login');

  return (
    <div className="min-h-screen text-white" style={{ background: '#09090f' }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-60 -left-60 w-[800px] h-[600px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.25) 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.2) 0%, transparent 65%)', filter: 'blur(80px)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.18]"
          style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <Nav session={session} onLogin={goLogin} />

      {/* ─── Hero ── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 max-w-xl relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-7 px-3 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/[0.07] text-[12px] text-violet-300/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI-powered crash repair is live
            <ChevronRight className="h-3 w-3 text-violet-400/50" />
          </div>

          <h1 className="text-[52px] md:text-[60px] font-black leading-[1.0] tracking-[-0.03em] text-white mb-6">
            Host your Discord<br />
            bot,{' '}
            <span style={{
              background: 'linear-gradient(135deg, #a78bfa 0%, #6366f1 50%, #a78bfa 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              worry-free.
            </span>
          </h1>

          <p className="text-[17px] text-white/45 leading-relaxed mb-8 max-w-md">
            Upload your code and go live in 60 seconds. Lumora handles installs,
            restarts, and AI-powered crash recovery — so you don't have to.
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            <button onClick={goLogin}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold text-white transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
              Deploy your bot free
              <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => setLocation('/pricing')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium text-white/50 border border-white/[0.1] hover:border-white/[0.2] hover:text-white/75 transition-all">
              View pricing
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['7c3aed','6366f1','a78bfa','4f46e5','8b5cf6'].map((c, i) => (
                <div key={i} className="h-7 w-7 rounded-full border-2 border-[#09090f] flex items-center justify-center text-[10px] font-bold text-white/60"
                  style={{ background: `#${c}55` }}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-[11px] text-white/35">Trusted by 1,300+ Discord developers</p>
            </div>
          </div>
        </div>

        {/* Terminal mockup */}
        <div className="flex-1 w-full max-w-[520px] relative z-10">
          {/* Floating chips */}
          <div className="absolute -top-4 -right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-[#09090f]/90 backdrop-blur-sm z-10"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[10px] text-emerald-400/80 font-bold">99.9% uptime</span>
          </div>
          <div className="absolute -bottom-4 -left-4 flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-500/20 bg-[#09090f]/90 backdrop-blur-sm z-10"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            <div className="h-6 w-6 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <Bot className="h-3 w-3 text-violet-400/70" />
            </div>
            <div>
              <p className="font-mono text-[8px] text-white/20 tracking-widest">AI REPAIR</p>
              <p className="font-mono text-[10px] text-white/60 font-bold">3 crashes fixed</p>
            </div>
          </div>
          <TerminalMockup />
        </div>
      </section>

      {/* ─── Trust bar ── */}
      <div className="border-y border-white/[0.05] py-5 relative z-10" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {[
            { icon: Shield,   text: 'Isolated per-user sandbox' },
            { icon: Zap,      text: 'Sub-60s cold start' },
            { icon: RotateCw, text: 'Auto-restart on crash' },
            { icon: Bot,      text: 'AI crash repair included' },
            { icon: Activity, text: 'Live log streaming' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon className="h-3 w-3 text-violet-400/40 shrink-0" />
              <span className="text-[12px] text-white/28">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Features ── */}
      <section id="features" className="relative z-10 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-lg mb-14">
            <p className="text-[11px] font-semibold tracking-widest text-violet-400/60 uppercase mb-3">Platform features</p>
            <h2 className="text-4xl font-black text-white tracking-tight mb-4">
              Everything you need,<br />
              <span className="text-white/35">nothing you don't.</span>
            </h2>
            <p className="text-white/40 text-[15px] leading-relaxed">
              From zero-config deploys to automatic AI recovery — Lumora covers every failure mode so your bot stays online.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map(({ icon: Icon, label, desc }, i) => (
              <div key={label}
                className="group relative p-6 rounded-2xl border border-white/[0.06] hover:border-violet-500/25 transition-all duration-300 hover:-translate-y-0.5 cursor-default overflow-hidden"
                style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                  style={{ background: 'radial-gradient(circle at 20% 20%, rgba(139,92,246,0.06) 0%, transparent 60%)' }} />
                <div className="h-10 w-10 rounded-xl mb-4 flex items-center justify-center"
                  style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.18)' }}>
                  <Icon className="h-5 w-5 text-violet-400/80" />
                </div>
                <h3 className="font-semibold text-white/85 mb-2 text-[14px]">{label}</h3>
                <p className="text-[13px] text-white/38 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ── */}
      <section className="relative z-10 py-24 border-y border-white/[0.04]" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-lg mx-auto mb-14">
            <p className="text-[11px] font-semibold tracking-widest text-violet-400/60 uppercase mb-3">How it works</p>
            <h2 className="text-4xl font-black text-white tracking-tight mb-4">Live in three steps.</h2>
            <p className="text-white/38 text-[15px]">No Docker. No YAML. No ops knowledge needed.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              { n: '1', title: 'Upload your code', desc: 'Drag a ZIP or paste a GitHub URL. Lumora auto-detects Node.js, Python, or any supported runtime.' },
              { n: '2', title: 'We build & launch', desc: 'Dependencies install in the background. Your bot process starts and logs stream live to your browser.' },
              { n: '3', title: 'Stay online forever', desc: 'Crashes get restarted instantly. Repeat crashes trigger AI repair. You get notified. Your bot stays up.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="relative p-6 rounded-2xl border border-white/[0.06] group hover:border-violet-500/20 transition-all"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center text-[13px] font-black text-violet-300 mb-5"
                  style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  {n}
                </div>
                <h3 className="font-semibold text-white/85 text-[14px] mb-2">{title}</h3>
                <p className="text-[13px] text-white/38 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing CTA ── */}
      <section className="relative z-10 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative rounded-3xl p-10 md:p-14 overflow-hidden border border-violet-500/15"
            style={{ background: 'linear-gradient(145deg, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.04) 100%)' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.12) 0%, transparent 60%)' }} />
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 mb-4">
                  {[
                    { label: 'Free', accent: '#6b7280' },
                    { label: 'Pro · $5/mo', accent: '#8b5cf6' },
                    { label: 'Business · $15/mo', accent: '#a78bfa' },
                  ].map(({ label, accent }) => (
                    <span key={label} className="px-2.5 py-1 rounded-full text-[11px] font-medium border"
                      style={{ color: accent, borderColor: `${accent}40`, background: `${accent}12` }}>
                      {label}
                    </span>
                  ))}
                </div>
                <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Simple, transparent pricing.</h2>
                <p className="text-white/40 text-[15px] leading-relaxed">
                  Start free, upgrade when you need always-on hosting. No surprises, no per-seat fees.
                </p>
              </div>
              <div className="flex flex-col gap-3 shrink-0">
                <button onClick={() => setLocation('/pricing')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold text-white whitespace-nowrap transition-all hover:-translate-y-px"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
                  View all plans <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={goLogin}
                  className="px-6 py-3 rounded-xl text-[14px] text-white/40 border border-white/[0.08] hover:text-white/65 hover:border-white/[0.16] transition-all text-center">
                  Start for free
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.05] py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}>
              <img src="/lumora-brand.png" alt="" className="h-3.5 w-3.5 object-contain brightness-200" />
            </div>
            <span className="font-semibold text-[13px] text-white/60">Lumora Hosting</span>
          </div>
          <p className="text-[12px] text-white/22">© 2025 Lumora. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="/pricing" className="text-[12px] text-white/25 hover:text-white/50 transition-colors">Pricing</a>
            <a href="/admin" className="text-[12px] text-white/25 hover:text-white/50 transition-colors">Admin</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
