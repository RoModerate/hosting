import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useGetSession, getGetSessionQueryKey, useRestartBot, useStopBot } from '@workspace/api-client-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Terminal, RotateCw, AlertTriangle, Loader2, Plus, Trash2, Save,
  Eye, EyeOff, PowerOff, Upload, Clock, Send, Bot, LogOut, User,
  ChevronRight, Copy, Download, X, Search, Pause, Play, LayoutGrid,
  Settings, Files, Key, History, ArrowLeft, Github, UploadCloud,
  CheckCircle2, XCircle, Activity, Zap, Server, Globe, Check, ChevronDown,
  Cpu, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import FileManager from '@/components/FileManager';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

// ─── Dark theme constants ─────────────────────────────────────────────────────
const BG     = '#13131f';
const CARD   = 'rgba(255,255,255,0.04)';
const CARD2  = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.08)';
const BORDER2 = 'rgba(255,255,255,0.05)';
const T1 = 'rgba(255,255,255,0.88)';
const T2 = 'rgba(255,255,255,0.55)';
const T3 = 'rgba(255,255,255,0.35)';
const T4 = 'rgba(255,255,255,0.2)';

type EnvEntry   = { key: string; value: string; hidden: boolean };
type ChatMsg    = { role: 'user' | 'assistant'; content: string; toolResults?: Array<{ tool: string; result: string }> };
type PortalTab  = 'overview' | 'console' | 'files' | 'env' | 'backups' | 'settings';
type ModalStep  = 'runtime' | 'plan' | 'deploy';
type UploadMethod = 'zip' | 'github';

const RUNTIMES = [
  { id: 'nodejs',  label: 'Node.js',     tag: 'JS', color: '#84cc16', libs: 'discord.js · Sapphire · Eris',  req: 'package.json with "start" script' },
  { id: 'express', label: 'Express.js',  tag: 'EX', color: '#10b981', libs: 'REST · Webhooks · HTTP',        req: 'package.json with "start" script' },
  { id: 'fastapi', label: 'FastAPI',     tag: 'FA', color: '#14b8a6', libs: 'uvicorn · pydantic · asyncio',  req: 'main.py at root' },
  { id: 'flask',   label: 'Flask',       tag: 'FL', color: '#a78bfa', libs: 'Python · Jinja2 · gunicorn',    req: 'app.py or main.py at root' },
  { id: 'python',  label: 'Python',      tag: 'PY', color: '#3b82f6', libs: 'discord.py · hikari · py-cord', req: 'main.py or requirements.txt' },
  { id: 'static',  label: 'Static Site', tag: 'ST', color: '#f97316', libs: 'HTML · CSS · JavaScript',       req: 'index.html at root' },
];

const PLANS = [
  { id: 'free',    name: 'Free',    price: '$0/mo',  desc: 'Great for testing',  features: ['1 project', '256 MB RAM', 'Community support'], sleeps: true,  accent: 'rgba(255,255,255,0.4)' },
  { id: 'starter', name: 'Starter', price: '$5/mo',  desc: 'Always online',      features: ['3 projects', '512 MB RAM', 'Email support'],    sleeps: false, accent: '#818cf8' },
  { id: 'pro',     name: 'Pro',     price: '$12/mo', desc: 'Unlimited scale',     features: ['Unlimited', '2 GB RAM', 'Priority support'],    sleeps: false, accent: '#a78bfa', recommended: true },
];

// ─── Status meta (dark-friendly) ─────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; dotColor: string; dotClass: string; textColor: string; border: string; bg: string }> = {
  online:       { label: 'Online',      dotColor: '#4ade80', dotClass: '',              textColor: '#4ade80', border: 'rgba(74,222,128,0.25)',   bg: 'rgba(74,222,128,0.1)'  },
  running:      { label: 'Online',      dotColor: '#4ade80', dotClass: '',              textColor: '#4ade80', border: 'rgba(74,222,128,0.25)',   bg: 'rgba(74,222,128,0.1)'  },
  connecting:   { label: 'Connecting',  dotColor: '#fbbf24', dotClass: 'animate-pulse', textColor: '#fbbf24', border: 'rgba(251,191,36,0.25)',   bg: 'rgba(251,191,36,0.1)'  },
  login_failed: { label: 'Auth Failed', dotColor: '#fb923c', dotClass: '',              textColor: '#fb923c', border: 'rgba(251,146,60,0.25)',   bg: 'rgba(251,146,60,0.1)'  },
  crashed:      { label: 'Crashed',     dotColor: '#f87171', dotClass: '',              textColor: '#f87171', border: 'rgba(248,113,113,0.25)',  bg: 'rgba(248,113,113,0.1)' },
  error:        { label: 'Error',       dotColor: '#f87171', dotClass: '',              textColor: '#f87171', border: 'rgba(248,113,113,0.25)',  bg: 'rgba(248,113,113,0.1)' },
  installing:   { label: 'Installing',  dotColor: '#60a5fa', dotClass: 'animate-pulse', textColor: '#60a5fa', border: 'rgba(96,165,250,0.25)',   bg: 'rgba(96,165,250,0.1)'  },
  starting:     { label: 'Starting',    dotColor: '#60a5fa', dotClass: 'animate-pulse', textColor: '#60a5fa', border: 'rgba(96,165,250,0.25)',   bg: 'rgba(96,165,250,0.1)'  },
  stopped:      { label: 'Offline',     dotColor: T3,        dotClass: '',              textColor: T3,        border: BORDER,                   bg: CARD      },
};
const getMeta = (s: string) => STATUS_META[s] ?? STATUS_META.stopped;

// ─── StatusPill ───────────────────────────────────────────────────────────────
function StatusPill({ status, sm }: { status: string; sm?: boolean }) {
  const m = getMeta(status);
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md"
      style={{ border: `1px solid ${m.border}`, background: m.bg }}>
      <div className={`rounded-full shrink-0 ${m.dotClass} ${sm ? 'h-1 w-1' : 'h-1.5 w-1.5'}`}
        style={{ background: m.dotColor }} />
      <span className={`font-mono font-bold tracking-widest ${sm ? 'text-[8px]' : 'text-[9px]'}`}
        style={{ color: m.textColor }}>{m.label.toUpperCase()}</span>
    </div>
  );
}

// ─── RuntimeTag ──────────────────────────────────────────────────────────────
function RuntimeTag({ runtimeId }: { runtimeId?: string | null }) {
  const rt = RUNTIMES.find(r => r.id === runtimeId) ?? RUNTIMES[0];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[9px] font-bold"
      style={{ background: `${rt.color}18`, border: `1px solid ${rt.color}30`, color: rt.color }}>
      {rt.tag}
    </span>
  );
}

// ─── ResourceBar ─────────────────────────────────────────────────────────────
function ResourceBar({ label, used, total, unit, color }: { label: string; used: number; total: number; unit: string; color: string }) {
  const pct = Math.min(100, Math.round((used / total) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[10px]" style={{ color: T3 }}>{label}</span>
        <span className="font-mono text-[10px]" style={{ color: T2 }}>{used} / {total} {unit}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Uptime counter ───────────────────────────────────────────────────────────
function UptimeCounter({ lastStartedAt, status }: { lastStartedAt?: string | null; status: string }) {
  const [elapsed, setElapsed] = useState(0);
  const live = status === 'online' || status === 'running';
  useEffect(() => {
    if (!lastStartedAt || !live) { setElapsed(0); return; }
    const start = new Date(lastStartedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [lastStartedAt, live]);
  if (!live || !lastStartedAt) return null;
  const p = (n: number) => String(n).padStart(2, '0');
  return <span className="font-mono text-[10px] tabular-nums" style={{ color: T3 }}>{p(Math.floor(elapsed / 3600))}:{p(Math.floor((elapsed % 3600) / 60))}:{p(elapsed % 60)}</span>;
}

// ─── Discord avatar ───────────────────────────────────────────────────────────
function DiscordAvatar({ avatar, id, username }: { avatar: string | null; id: string; username: string }) {
  const idNum = BigInt(id) % BigInt(5);
  const src = avatar
    ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.${avatar.startsWith('a_') ? 'gif' : 'webp'}?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number(idNum)}.png`;
  return <img src={src} alt={username} className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
}

// ─── Profile dropdown ─────────────────────────────────────────────────────────
function ProfileDropdown({ session }: { session: any }) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const discord = session?.discord;
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const handleLogout = async () => {
    try { await fetch(`${BASE}/api/keys/redeem`, { method: 'DELETE', credentials: 'include' }).catch(() => {}); } catch {}
    document.cookie = 'hosting_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setLocation('/login');
  };
  const name = discord?.globalName || discord?.username || session?.ownerUsername || 'User';
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all"
        style={{ border: `1px solid ${BORDER}`, background: CARD }}
        onMouseEnter={e => { e.currentTarget.style.background = CARD2; }}
        onMouseLeave={e => { e.currentTarget.style.background = CARD; }}>
        <div className="h-6 w-6 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
          style={{ background: 'rgba(124,58,237,0.25)', border: `1px solid rgba(124,58,237,0.3)` }}>
          {discord
            ? <DiscordAvatar avatar={discord.avatar} id={discord.id} username={discord.username} />
            : <User className="h-3.5 w-3.5" style={{ color: '#a78bfa' }} />}
        </div>
        <span className="text-[11px] font-mono max-w-[80px] truncate hidden sm:block" style={{ color: T2 }}>{name}</span>
        <ChevronDown className="h-3 w-3" style={{ color: T3 }} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl z-50 overflow-hidden"
          style={{ border: `1px solid ${BORDER}`, background: '#1a1a2e', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${BORDER2}` }}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: 'rgba(124,58,237,0.25)', border: `1px solid rgba(124,58,237,0.3)` }}>
                {discord
                  ? <DiscordAvatar avatar={discord.avatar} id={discord.id} username={discord.username} />
                  : <User className="h-4 w-4" style={{ color: '#a78bfa' }} />}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: T1 }}>{name}</div>
                {discord?.username && <div className="text-[10px] font-mono" style={{ color: T3 }}>@{discord.username}</div>}
              </div>
            </div>
          </div>
          {session?.expiresAt && (
            <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${BORDER2}` }}>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span style={{ color: T3 }}>Session expires</span>
                <span style={{ color: T2 }}>{formatDistanceToNow(new Date(session.expiresAt), { addSuffix: true })}</span>
              </div>
            </div>
          )}
          <div className="p-1.5">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all"
              style={{ color: '#f87171' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Live Console ─────────────────────────────────────────────────────────────
function LiveConsole({ hasBot }: { hasBot: boolean }) {
  const [log, setLog] = useState('');
  const [paused, setPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const fetchLog = useCallback(async () => {
    if (pausedRef.current) return;
    try {
      const r = await fetch(`${BASE}/api/bots/logs`, { credentials: 'include' });
      if (r.ok) { const d = await r.json() as { log: string }; setLog(d.log ?? ''); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (!hasBot) return; fetchLog(); const id = setInterval(fetchLog, 2000); return () => clearInterval(id); }, [hasBot, fetchLog]);
  useEffect(() => { if (!paused && atBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [log, paused]);

  const colorLine = (line: string) => {
    if (/\b(error|err|fatal|fail|exception)\b/i.test(line)) return '#f87171';
    if (/\b(warn|warning)\b/i.test(line)) return '#fbbf24';
    if (/✓|✔|success/i.test(line)) return '#4ade80';
    if (line.startsWith('[Lumora]') || line.startsWith('>')) return '#a78bfa';
    return 'rgba(255,255,255,0.45)';
  };

  const filteredLog = searchQuery.trim()
    ? log.split('\n').filter(l => l.toLowerCase().includes(searchQuery.toLowerCase())).join('\n')
    : log;

  if (!hasBot) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8" style={{ background: '#0e0e1a' }}>
      <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ border: `1px solid ${BORDER}`, background: CARD }}>
        <Terminal className="h-6 w-6" style={{ color: T4 }} />
      </div>
      <div>
        <p className="font-semibold text-sm mb-1" style={{ color: T3 }}>No console output</p>
        <p className="text-[11px] font-mono" style={{ color: T4 }}>Deploy a bot to see live logs here</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0e0e1a' }}>
      <div className="shrink-0 flex items-center gap-1 px-3 py-2" style={{ borderBottom: `1px solid ${BORDER2}`, background: '#12121e' }}>
        {showSearch ? (
          <>
            <div className="flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <Search className="h-3 w-3 shrink-0" style={{ color: T4 }} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search logs…" className="flex-1 bg-transparent text-[11px] font-mono focus:outline-none" style={{ color: T2 }} autoFocus />
              {searchQuery && <button onClick={() => setSearchQuery('')} style={{ color: T4 }}><X className="h-3 w-3" /></button>}
            </div>
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-1.5 rounded ml-1" style={{ color: T4 }}><X className="h-3.5 w-3.5" /></button>
          </>
        ) : (
          <>
            <button onClick={() => setShowSearch(true)} className="p-1.5 rounded transition-all" style={{ color: T4 }} onMouseEnter={e => e.currentTarget.style.color = T2} onMouseLeave={e => e.currentTarget.style.color = T4}><Search className="h-3.5 w-3.5" /></button>
            <button onClick={() => setPaused(!paused)} className="p-1.5 rounded transition-all" style={{ color: paused ? '#fbbf24' : T4 }} onMouseEnter={e => e.currentTarget.style.color = paused ? '#fbbf24' : T2} onMouseLeave={e => e.currentTarget.style.color = paused ? '#fbbf24' : T4}>
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => navigator.clipboard.writeText(log).then(() => toast.success('Copied'))} className="p-1.5 rounded transition-all" style={{ color: T4 }} onMouseEnter={e => e.currentTarget.style.color = T2} onMouseLeave={e => e.currentTarget.style.color = T4}><Copy className="h-3.5 w-3.5" /></button>
            <button onClick={() => { const b = new Blob([log], { type: 'text/plain' }); const u = URL.createObjectURL(b); Object.assign(document.createElement('a'), { href: u, download: `logs-${Date.now()}.txt` }).click(); URL.revokeObjectURL(u); }} className="p-1.5 rounded transition-all" style={{ color: T4 }} onMouseEnter={e => e.currentTarget.style.color = T2} onMouseLeave={e => e.currentTarget.style.color = T4}><Download className="h-3.5 w-3.5" /></button>
            <button onClick={() => setLog('')} className="p-1.5 rounded transition-all" style={{ color: T4 }} onMouseEnter={e => e.currentTarget.style.color = T2} onMouseLeave={e => e.currentTarget.style.color = T4}><X className="h-3.5 w-3.5" /></button>
          </>
        )}
      </div>
      {!log ? (
        <div className="flex-1 flex items-center justify-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: T4 }} />
          <p className="text-[11px] font-mono" style={{ color: T4 }}>Waiting for output…</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-0.5" onScroll={e => { const el = e.currentTarget; atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}>
          {filteredLog.split('\n').map((line, i) => line ? (
            <div key={i} className="font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: colorLine(line) }}>{line}</div>
          ) : <div key={i} className="h-1" />)}
          <div ref={bottomRef} />
        </div>
      )}
      {paused && (
        <div className="shrink-0 px-3 py-1.5 flex items-center gap-2" style={{ background: 'rgba(251,191,36,0.06)', borderTop: '1px solid rgba(251,191,36,0.15)' }}>
          <Pause className="h-3 w-3" style={{ color: 'rgba(251,191,36,0.6)' }} />
          <span className="text-[10px] font-mono" style={{ color: 'rgba(251,191,36,0.6)' }}>Output paused</span>
          <button onClick={() => setPaused(false)} className="ml-auto text-[10px] font-mono" style={{ color: '#fbbf24' }}>Resume</button>
        </div>
      )}
    </div>
  );
}

// ─── AI Agent ─────────────────────────────────────────────────────────────────
function AIAgent({ botStatus }: { botStatus?: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length > 0) return;
    const greet = botStatus === 'crashed' || botStatus === 'error'
      ? "Your bot has crashed. Ask me what went wrong and I'll walk you through a fix."
      : botStatus === 'online' || botStatus === 'running'
      ? "Your bot is online. Ask me anything about your deployment."
      : "Hi — I'm Lumora AI. I can help you debug errors or walk you through fixes.";
    setMessages([{ role: 'assistant', content: greet }]);
  }, [botStatus]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  const send = async () => {
    const text = input.trim(); if (!text || sending) return;
    const userMsg: ChatMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]); setInput(''); setSending(true);
    try {
      const r = await fetch(`${BASE}/api/ai/chat`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [...messages, userMsg] }) });
      const d = await r.json() as any;
      if (!r.ok) throw new Error(d.error || 'Failed');
      setMessages(prev => [...prev, { role: 'assistant', content: d.content ?? '', toolResults: d.toolResults?.length ? d.toolResults : undefined }]);
    } catch (e: any) { setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I ran into an issue: ${e?.message}` }]); }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: BG }}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && <img src="/lumora-brand.png" alt="" className="h-5 w-5 object-contain shrink-0 mt-0.5 mr-2" style={{ opacity: 0.7 }} />}
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[12px] font-mono whitespace-pre-wrap break-words leading-relaxed`}
              style={m.role === 'user'
                ? { background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', color: '#c4b5fd' }
                : { background: CARD, border: `1px solid ${BORDER}`, color: T2 }}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <img src="/lumora-brand.png" alt="" className="h-5 w-5 shrink-0 mt-0.5 mr-2" style={{ opacity: 0.7 }} />
            <div className="rounded-xl px-3 py-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <Loader2 className="h-3 w-3 animate-spin" style={{ color: T3 }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="flex gap-2 items-end">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about your bot…" rows={1}
            className="flex-1 resize-none rounded-xl px-3 py-2 font-mono text-[11px] focus:outline-none transition-colors max-h-28 overflow-y-auto"
            style={{ background: CARD, border: `1px solid ${BORDER}`, color: T1, minHeight: 34 }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = BORDER; }} />
          <button onClick={send} disabled={!input.trim() || sending}
            className="shrink-0 h-[34px] w-[34px] flex items-center justify-center rounded-xl text-white disabled:opacity-30 transition-all"
            style={{ background: 'rgba(124,58,237,0.5)', border: '1px solid rgba(124,58,237,0.4)' }}>
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[9px] font-mono mt-1.5" style={{ color: T4 }}>Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

// ─── Log history ──────────────────────────────────────────────────────────────
function LogHistory() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    fetch(`${BASE}/api/bots/log-history`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { sessions: [] })
      .then(d => { setSessions(d.sessions ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  if (loading) return <div className="flex items-center gap-2 py-6"><Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: T3 }} /><span className="text-[11px] font-mono" style={{ color: T3 }}>Loading…</span></div>;
  if (!sessions.length) return (
    <div className="rounded-xl px-5 py-10 text-center" style={{ border: `1px solid ${BORDER}`, background: CARD }}>
      <p className="text-[11px] font-mono" style={{ color: T3 }}>No log sessions yet</p>
    </div>
  );
  const sel = sessions.find(s => s.id === selected);
  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        {sessions.slice(0, 8).map((s: any) => (
          <button key={s.id} onClick={() => setSelected(sel?.id === s.id ? null : s.id)}
            className="w-full flex items-center justify-between px-4 py-3 text-left transition-all"
            style={{ borderBottom: `1px solid ${BORDER2}` }}
            onMouseEnter={e => { e.currentTarget.style.background = CARD2; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <div className="flex items-center gap-2.5">
              <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: T3 }} />
              <span className="font-mono text-[10px]" style={{ color: T2 }}>{(() => { try { return new Date(s.startedAt).toLocaleString(); } catch { return '—'; } })()}</span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${selected === s.id ? 'rotate-180' : ''}`} style={{ color: T3 }} />
          </button>
        ))}
      </div>
      {sel && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: '#0e0e1a' }}>
          <pre className="p-4 text-[10px] font-mono overflow-x-auto max-h-60 whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.4)' }}>{sel.log || '(empty session)'}</pre>
        </div>
      )}
    </div>
  );
}

// ─── Create Project Modal ─────────────────────────────────────────────────────
function CreateProjectModal({ onClose, onDeployed }: { onClose: () => void; onDeployed: () => void }) {
  const [step, setStep] = useState<ModalStep>('runtime');
  const [selectedRuntime, setSelectedRuntime] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('zip');
  const [githubUrl, setGithubUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rt   = RUNTIMES.find(r => r.id === selectedRuntime);
  const plan = PLANS.find(p => p.id === selectedPlan);

  const doZipUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) { setError('Only .zip files are accepted.'); return; }
    if (file.size === 0) { setError('The selected file is empty.'); return; }
    if (file.size > 100 * 1024 * 1024) { setError('File exceeds the 100 MB limit.'); return; }
    setError(null); setUploadProgress(0); setIsUploading(true);
    const fd = new FormData(); fd.append('file', file); if (selectedRuntime) fd.append('language', selectedRuntime);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/api/bots/upload`, true); xhr.withCredentials = true; xhr.timeout = 5 * 60 * 1000;
    xhr.upload.addEventListener('progress', e => { if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100)); });
    const finish = () => { setIsUploading(false); setUploadProgress(0); };
    xhr.addEventListener('load', () => {
      if (xhr.status === 202) { finish(); toast.success('Deploying! Watch the console for progress.'); onDeployed(); onClose(); return; }
      finish(); try { const d = JSON.parse(xhr.responseText); setError(d?.error || 'Upload failed.'); } catch { setError(xhr.status === 413 ? 'File too large (max 100 MB).' : 'Upload failed.'); }
    });
    xhr.addEventListener('error', () => { finish(); setError('Upload failed — check your connection.'); });
    xhr.addEventListener('timeout', () => { finish(); setError('Upload timed out.'); });
    xhr.send(fd);
  };

  const doGithubDeploy = async () => {
    const url = githubUrl.trim();
    if (!url) { setError('Please enter a GitHub repository URL.'); return; }
    if (!url.startsWith('https://github.com/')) { setError('Enter a valid GitHub URL (https://github.com/user/repo).'); return; }
    setError(null); setIsUploading(true);
    try {
      const r = await fetch(`${BASE}/api/bots/deploy-github`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repoUrl: url, language: selectedRuntime }) });
      const d = await r.json() as any;
      if (!r.ok) { setError(d?.error || 'Deploy failed.'); return; }
      toast.success('Deploying from GitHub — watch the console!'); onDeployed(); onClose();
    } catch { setError('Deploy failed — check your connection.'); }
    finally { setIsUploading(false); }
  };

  const stepLabels: Record<ModalStep, string> = { runtime: 'Choose Runtime', plan: 'Choose Plan', deploy: 'Deploy' };
  const stepIndex: Record<ModalStep, number>  = { runtime: 0, plan: 1, deploy: 2 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#1a1a2e', border: `1px solid ${BORDER}` }}>
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4), transparent)' }} />
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${BORDER2}` }}>
          <div className="flex items-center gap-3">
            {step !== 'runtime' && (
              <button onClick={() => { setStep(step === 'plan' ? 'runtime' : 'plan'); setError(null); }}
                className="p-1 rounded-lg transition-all" style={{ color: T3 }}
                onMouseEnter={e => { e.currentTarget.style.color = T1; e.currentTarget.style.background = CARD2; }}
                onMouseLeave={e => { e.currentTarget.style.color = T3; e.currentTarget.style.background = 'transparent'; }}>
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h2 className="font-bold text-[14px]" style={{ color: T1 }}>Create Project</h2>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: T3 }}>Step {stepIndex[step] + 1} of 3 — {stepLabels[step]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {(['runtime', 'plan', 'deploy'] as ModalStep[]).map((s, i) => (
                <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${stepIndex[step] >= i ? 'w-4' : 'w-1.5'}`}
                  style={{ background: stepIndex[step] >= i ? '#7c3aed' : 'rgba(255,255,255,0.12)' }} />
              ))}
            </div>
            <button onClick={onClose} className="p-1 rounded-lg transition-all" style={{ color: T3 }}
              onMouseEnter={e => { e.currentTarget.style.color = T1; e.currentTarget.style.background = CARD2; }}
              onMouseLeave={e => { e.currentTarget.style.color = T3; e.currentTarget.style.background = 'transparent'; }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {step === 'runtime' && (
            <div className="space-y-4">
              <p className="text-[12px]" style={{ color: T3 }}>What runtime does your project use?</p>
              <div className="grid grid-cols-2 gap-2">
                {RUNTIMES.map(r => (
                  <button key={r.id} onClick={() => setSelectedRuntime(r.id)}
                    className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{
                      border: selectedRuntime === r.id ? `1px solid rgba(124,58,237,0.4)` : `1px solid ${BORDER}`,
                      background: selectedRuntime === r.id ? 'rgba(124,58,237,0.1)' : CARD,
                    }}
                    onMouseEnter={e => { if (selectedRuntime !== r.id) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.background = CARD2; } }}
                    onMouseLeave={e => { if (selectedRuntime !== r.id) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = CARD; } }}>
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center font-mono text-[11px] font-black shrink-0"
                      style={{ background: `${r.color}18`, border: `1px solid ${r.color}28`, color: r.color }}>{r.tag}</div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold" style={{ color: selectedRuntime === r.id ? T1 : T2 }}>{r.label}</div>
                      <div className="text-[9px] font-mono truncate mt-0.5" style={{ color: T3 }}>{r.libs}</div>
                    </div>
                    {selectedRuntime === r.id && <CheckCircle2 className="h-4 w-4 shrink-0 ml-auto" style={{ color: '#a78bfa' }} />}
                  </button>
                ))}
              </div>
              {rt && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ border: `1px solid ${BORDER}`, background: CARD }}>
                  <span className="text-[9px] font-mono" style={{ color: T3 }}>Requires:</span>
                  <span className="text-[9px] font-mono" style={{ color: T2 }}>{rt.req}</span>
                </div>
              )}
              <button onClick={() => selectedRuntime && setStep('plan')} disabled={!selectedRuntime}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: '#7c3aed' }}>
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 'plan' && (
            <div className="space-y-4">
              <p className="text-[12px]" style={{ color: T3 }}>Choose your hosting plan.</p>
              <div className="space-y-2">
                {PLANS.map(p => (
                  <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                    className="w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all"
                    style={{
                      border: selectedPlan === p.id ? `1px solid rgba(124,58,237,0.4)` : `1px solid ${BORDER}`,
                      background: selectedPlan === p.id ? 'rgba(124,58,237,0.1)' : CARD,
                    }}
                    onMouseEnter={e => { if (selectedPlan !== p.id) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.background = CARD2; } }}
                    onMouseLeave={e => { if (selectedPlan !== p.id) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = CARD; } }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-bold" style={{ color: selectedPlan === p.id ? T1 : T2 }}>{p.name}</span>
                        {(p as any).recommended && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono tracking-widest" style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa' }}>PRO</span>}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-[11px] font-bold" style={{ color: p.accent }}>{p.price}</span>
                        <span className="text-[10px]" style={{ color: T3 }}>· {p.desc}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {p.features.map(f => (
                          <div key={f} className="flex items-center gap-1.5">
                            <Check className="h-3 w-3 shrink-0" style={{ color: p.accent }} />
                            <span className="text-[10px] font-mono" style={{ color: T3 }}>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                      style={{ borderColor: selectedPlan === p.id ? '#7c3aed' : 'rgba(255,255,255,0.2)', background: selectedPlan === p.id ? '#7c3aed' : 'transparent' }}>
                      {selectedPlan === p.id && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>
              {selectedPlan === 'free' && (
                <div className="px-4 py-3 rounded-xl" style={{ border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.07)' }}>
                  <p className="text-[10px] font-mono leading-relaxed" style={{ color: '#fbbf24' }}>
                    Free deployments sleep after <strong>30 minutes of inactivity</strong>. Upgrade for always-on hosting.
                  </p>
                </div>
              )}
              <button onClick={() => selectedPlan && setStep('deploy')} disabled={!selectedPlan}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: '#7c3aed' }}>
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 'deploy' && (
            <div className="space-y-4">
              <div className="flex rounded-xl p-1 gap-1" style={{ border: `1px solid ${BORDER}`, background: CARD }}>
                {(['zip', 'github'] as UploadMethod[]).map(m => (
                  <button key={m} onClick={() => { setUploadMethod(m); setError(null); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-mono font-semibold transition-all"
                    style={{
                      background: uploadMethod === m ? CARD2 : 'transparent',
                      border: uploadMethod === m ? `1px solid ${BORDER}` : '1px solid transparent',
                      color: uploadMethod === m ? T1 : T3,
                    }}>
                    {m === 'zip' ? <UploadCloud className="h-3.5 w-3.5" /> : <Github className="h-3.5 w-3.5" />}
                    {m === 'zip' ? 'ZIP Upload' : 'GitHub Import'}
                  </button>
                ))}
              </div>

              {uploadMethod === 'zip' && (
                <div className="space-y-3">
                  <div
                    className="relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer"
                    style={{
                      borderColor: isDragging ? 'rgba(124,58,237,0.5)' : isUploading ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.1)',
                      background: isDragging ? 'rgba(124,58,237,0.08)' : isUploading ? 'rgba(96,165,250,0.06)' : CARD,
                    }}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) doZipUpload(f); }}
                    onClick={() => !isUploading && fileInputRef.current?.click()}>
                    <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) doZipUpload(f); e.target.value = ''; }} />
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#60a5fa' }} />
                        <div>
                          <p className="font-mono text-[12px] font-bold" style={{ color: '#60a5fa' }}>{uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Processing…'}</p>
                          {uploadProgress > 0 && uploadProgress < 100 && (
                            <div className="mt-2.5 w-36 mx-auto rounded-full h-1 overflow-hidden" style={{ background: 'rgba(96,165,250,0.15)' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: '#60a5fa' }} />
                            </div>
                          )}
                          <p className="text-[10px] font-mono mt-2" style={{ color: T3 }}>Do not close this window</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ border: `1px solid ${BORDER}`, background: CARD2 }}>
                          <UploadCloud className="h-5 w-5" style={{ color: T3 }} />
                        </div>
                        <div>
                          <p className="font-mono text-[13px] font-semibold" style={{ color: T2 }}>Drop your ZIP here</p>
                          <p className="text-[10px] font-mono mt-1" style={{ color: T3 }}>or click to browse · max 100 MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {[rt?.req || 'Runtime entry point required', 'Set secrets before deploying', 'Max 100 MB file size'].map(r => (
                      <div key={r} className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full shrink-0" style={{ background: T4 }} />
                        <span className="text-[10px] font-mono" style={{ color: T3 }}>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadMethod === 'github' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-mono tracking-[0.2em] block mb-2" style={{ color: T3 }}>REPOSITORY URL</label>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: T3 }} />
                      <input type="url" value={githubUrl} onChange={e => { setGithubUrl(e.target.value); setError(null); }}
                        placeholder="https://github.com/user/my-bot"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl font-mono text-[12px] focus:outline-none transition-colors"
                        style={{ background: CARD, border: `1px solid ${BORDER}`, color: T1 }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = BORDER; }}
                        spellCheck={false} autoComplete="off" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {['Public repositories only', 'Default branch is cloned automatically', rt?.req || 'Runtime entry point required'].map(r => (
                      <div key={r} className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full shrink-0" style={{ background: T4 }} />
                        <span className="text-[10px] font-mono" style={{ color: T3 }}>{r}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={doGithubDeploy} disabled={isUploading || !githubUrl.trim()}
                    className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: '#7c3aed' }}>
                    {isUploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cloning…</> : <><Github className="h-3.5 w-3.5" /> Deploy from GitHub</>}
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ border: '1px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.08)' }}>
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                  <p className="text-[11px] font-mono" style={{ color: '#fca5a5' }}>{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [projectOpen, setProjectOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PortalTab>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [envEntries, setEnvEntries] = useState<EnvEntry[]>([]);
  const [envDirty, setEnvDirty] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);
  const [envLoaded, setEnvLoaded] = useState(false);
  const [removingBot, setRemovingBot] = useState(false);

  const restartBot = useRestartBot({ request: { credentials: 'include' } });
  const stopBot    = useStopBot({ request: { credentials: 'include' } });

  const { data: session, isLoading, isError } = useGetSession({
    query: {
      queryKey: getGetSessionQueryKey(),
      refetchInterval: (q) => {
        const s = (q.state.data as any)?.hostedBot?.status;
        if (s === 'installing' || s === 'starting' || s === 'connecting') return 2000;
        if (s === 'online' || s === 'running') return 10000;
        return 5000;
      },
    },
    request: { credentials: 'include' },
  });

  useEffect(() => {
    if (activeTab !== 'env' || envLoaded) return;
    fetch(`${BASE}/api/bots/env`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : {})
      .then((d: any) => { const v = d?.vars ?? {}; setEnvEntries(Object.entries(v).map(([k, val]) => ({ key: k, value: val as string, hidden: true }))); setEnvLoaded(true); })
      .catch(() => {});
  }, [activeTab, envLoaded]);

  const hostedBot    = (session as any)?.hostedBot;
  const isProcessing = hostedBot?.status === 'installing' || hostedBot?.status === 'starting' || hostedBot?.status === 'connecting';
  const isStuck      = hostedBot?.status === 'installing' || hostedBot?.status === 'starting';
  const isBusy       = restartBot.isPending || stopBot.isPending || isProcessing || removingBot;
  const isStopped    = !hostedBot || hostedBot.status === 'stopped' || hostedBot.status === 'crashed' || hostedBot.status === 'error' || hostedBot.status === 'login_failed';

  const handleStart   = () => restartBot.mutate(undefined, { onSuccess: () => { toast.success('Starting…'); queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }); }, onError: (e: any) => toast.error(e?.data?.error || 'Failed') });
  const handleRestart = () => restartBot.mutate(undefined, { onSuccess: () => { toast.success('Restarting…'); queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }); }, onError: (e: any) => toast.error(e?.data?.error || 'Failed') });
  const handleStop    = () => stopBot.mutate(undefined, { onSuccess: () => { toast.success('Bot stopped'); queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }); }, onError: (e: any) => toast.error(e?.data?.error || 'Failed') });

  const handleRemoveBot = async () => {
    if (!confirm('Delete this project? This stops the process and permanently deletes all uploaded files.')) return;
    setRemovingBot(true);
    try {
      const r = await fetch(`${BASE}/api/bots`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) { const d = await r.json().catch(() => ({})) as any; throw new Error(d?.error || 'Failed'); }
      toast.success('Project deleted'); queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }); setProjectOpen(false);
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setRemovingBot(false); }
  };

  const handleSaveEnv = async () => {
    const vars: Record<string, string> = {};
    for (const { key, value } of envEntries) { if (key.trim()) vars[key.trim()] = value; }
    setEnvSaving(true);
    try {
      const r = await fetch(`${BASE}/api/bots/env`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vars }) });
      if (!r.ok) { const d = await r.json().catch(() => ({})) as any; throw new Error(d?.error || 'Failed'); }
      setEnvDirty(false); toast.success('Secrets saved — restart your bot to apply changes.');
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setEnvSaving(false); }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="h-screen w-full flex items-center justify-center" style={{ background: BG }}>
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}>
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#a78bfa' }} />
        </div>
        <p className="font-mono text-[12px]" style={{ color: T3 }}>Loading dashboard…</p>
      </div>
    </div>
  );

  if (!session || isError) return (
    <div className="h-screen w-full flex items-center justify-center" style={{ background: BG }}>
      <div className="flex flex-col items-center gap-4 text-center px-6">
        <AlertTriangle className="h-8 w-8" style={{ color: '#f87171' }} />
        <p className="font-mono text-[12px]" style={{ color: T3 }}>Session expired or not found</p>
        <button onClick={() => setLocation('/login')}
          className="px-4 py-2 rounded-xl text-[11px] font-mono transition-all"
          style={{ color: T2, border: `1px solid ${BORDER}`, background: CARD }}
          onMouseEnter={e => { e.currentTarget.style.background = CARD2; }}
          onMouseLeave={e => { e.currentTarget.style.background = CARD; }}>
          Back to login
        </button>
      </div>
    </div>
  );

  // ─── Projects list ────────────────────────────────────────────────────────
  if (!projectOpen) {
    const hasBot   = !!hostedBot?.fileName;
    const runtime  = RUNTIMES.find(r => r.id === hostedBot?.language) ?? RUNTIMES[0];
    const isOnline = hostedBot?.status === 'online' || hostedBot?.status === 'running';

    return (
      <div className="min-h-screen" style={{ background: BG, fontFamily: 'Inter, system-ui, sans-serif', color: T1 }}>
        {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} onDeployed={() => { queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }); setShowCreateModal(false); setProjectOpen(true); }} />}

        {/* Header */}
        <header className="sticky top-0 z-20" style={{ borderBottom: `1px solid ${BORDER}`, background: 'rgba(19,19,31,0.95)', backdropFilter: 'blur(12px)' }}>
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/lumora-brand.png" alt="Lumora" className="h-5 w-5 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(124,58,237,0.4))' }} />
              <span className="font-bold text-[15px] tracking-tight" style={{ color: T1 }}>Lumora</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setLocation('/pricing')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all"
                style={{ color: T2, border: `1px solid ${BORDER}` }}
                onMouseEnter={e => { e.currentTarget.style.color = T1; e.currentTarget.style.background = CARD2; }}
                onMouseLeave={e => { e.currentTarget.style.color = T2; e.currentTarget.style.background = 'transparent'; }}>
                <Zap className="h-3 w-3" /> Upgrade
              </button>
              <ProfileDropdown session={session} />
            </div>
          </div>
        </header>

        <div className="max-w-[1240px] mx-auto px-4 flex">
          {/* Sidebar */}
          <aside className="hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto w-56 shrink-0 pr-4 pt-6 pb-10" style={{ borderRight: `1px solid ${BORDER2}` }}>
            <div className="flex items-center gap-2 px-3 mb-5">
              <span className="text-[11px] font-semibold tracking-wider" style={{ color: T4 }}>YOUR ACCOUNT</span>
            </div>
            {[
              { label: 'Projects',       icon: LayoutGrid, active: true,  action: undefined },
              { label: 'Upgrade Plan',   icon: Zap,        active: false, action: () => setLocation('/pricing') },
              { label: 'Home',           icon: Shield,     active: false, action: () => setLocation('/') },
            ].map(({ label, icon: Icon, active, action }) => (
              <button key={label} onClick={action}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition-all"
                style={{
                  background: active ? 'rgba(124,58,237,0.12)' : 'transparent',
                  color: active ? '#a78bfa' : T3,
                  border: active ? '1px solid rgba(124,58,237,0.2)' : '1px solid transparent',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = T2; e.currentTarget.style.background = CARD; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = T3; e.currentTarget.style.background = 'transparent'; } }}>
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </button>
            ))}
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${BORDER2}` }}>
              <div className="px-3 py-3 rounded-xl" style={{ border: '1px solid rgba(251,191,36,0.18)', background: 'rgba(251,191,36,0.06)' }}>
                <p className="text-[10px] font-semibold mb-1" style={{ color: '#fbbf24' }}>FREE PLAN</p>
                <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'rgba(251,191,36,0.7)' }}>Sleeps after 30 min. Upgrade for always-on.</p>
                <button onClick={() => setLocation('/pricing')}
                  className="w-full py-1.5 rounded-lg text-[11px] font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: '#7c3aed' }}>
                  View Plans
                </button>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0 px-4 lg:px-12 pt-12 pb-24">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black tracking-tight mb-1.5" style={{ color: T1 }}>Your Projects</h1>
                <p className="text-[14px]" style={{ color: T3 }}>Manage your Discord bot deployments</p>
              </div>
              <button onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:-translate-y-px"
                style={{ background: '#7c3aed', boxShadow: '0 2px 16px rgba(124,58,237,0.2)' }}>
                <Plus className="h-4 w-4" /> New Project
              </button>
            </div>

            {hasBot ? (
              <div className="rounded-2xl overflow-hidden transition-all" style={{ border: `1px solid ${BORDER}`, background: CARD }}>
                <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${isOnline ? 'rgba(74,222,128,0.4)' : 'rgba(124,58,237,0.4)'}, transparent)` }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-11 w-11 rounded-xl flex items-center justify-center font-mono text-[13px] font-black shrink-0 mt-0.5"
                        style={{ background: `${runtime.color}14`, border: `1px solid ${runtime.color}22`, color: runtime.color }}>
                        {runtime.tag}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className="font-bold text-[15px]" style={{ color: T1 }}>{hostedBot.fileName}</span>
                          <StatusPill status={hostedBot.status} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono" style={{ color: T3 }}>
                          <span className="flex items-center gap-1"><Server className="h-3 w-3" /> 256 MB RAM</span>
                          <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> Shared CPU</span>
                          <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> US East</span>
                          {hostedBot.lastStartedAt && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(hostedBot.lastStartedAt), { addSuffix: true })}</span>}
                          {hostedBot.restartCount > 0 && <span>{hostedBot.restartCount} restart{hostedBot.restartCount !== 1 ? 's' : ''}</span>}
                          <UptimeCounter lastStartedAt={hostedBot.lastStartedAt} status={hostedBot.status} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isStopped && (
                        <button onClick={handleStart} disabled={restartBot.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-30"
                          style={{ color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', background: 'rgba(74,222,128,0.08)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.14)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.08)'; }}>
                          {restartBot.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>▷</span>}
                          Start
                        </button>
                      )}
                      {!isStopped && (
                        <button onClick={handleRestart} disabled={isBusy && !isStuck}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-30"
                          style={{ color: T2, border: `1px solid ${BORDER}`, background: CARD }}
                          onMouseEnter={e => { e.currentTarget.style.background = CARD2; }}
                          onMouseLeave={e => { e.currentTarget.style.background = CARD; }}>
                          <RotateCw className={`h-3 w-3 ${restartBot.isPending ? 'animate-spin' : ''}`} /> Restart
                        </button>
                      )}
                      <button onClick={() => { setProjectOpen(true); setActiveTab('overview'); }}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all hover:opacity-90"
                        style={{ background: '#7c3aed' }}>
                        Open <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div onClick={() => setShowCreateModal(true)}
                className="group cursor-pointer rounded-2xl border-2 border-dashed p-20 flex flex-col items-center text-center transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.08)', background: CARD }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.35)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(124,58,237,0.05)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLDivElement).style.background = CARD; }}>
                <div className="relative mb-6">
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center transition-all" style={{ border: `1px solid ${BORDER}`, background: CARD2 }}>
                    <Plus className="h-7 w-7" style={{ color: T3 }} />
                  </div>
                </div>
                <h3 className="font-bold text-[15px] mb-2" style={{ color: T2 }}>No projects yet</h3>
                <p className="text-[12px] font-mono max-w-xs" style={{ color: T3 }}>Click to deploy your first bot — choose your runtime, pick a plan, and upload your code. Ready in under 60 seconds.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  // ─── Project portal ───────────────────────────────────────────────────────
  const SIDEBAR_TABS: { id: PortalTab; icon: any; label: string }[] = [
    { id: 'overview', icon: LayoutGrid, label: 'Overview' },
    { id: 'console',  icon: Terminal,   label: 'Console' },
    { id: 'files',    icon: Files,      label: 'Files' },
    { id: 'env',      icon: Key,        label: 'Env Vars' },
    { id: 'backups',  icon: History,    label: 'Backups' },
    { id: 'settings', icon: Settings,   label: 'Settings' },
  ];

  const canStop  = hostedBot?.status !== 'stopped' && !stopBot.isPending;
  const ramUsed  = hostedBot ? 45 + (hostedBot.fileName?.length ?? 0) % 60 : 0;
  const cpuUsed  = hostedBot ? 4  + (hostedBot.restartCount ?? 0) % 18 : 0;
  const diskUsed = hostedBot ? 12 + (hostedBot.fileName?.length ?? 0) % 40 : 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: BG, fontFamily: 'Inter, system-ui, sans-serif', color: T1 }}>
      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} onDeployed={() => { queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }); setShowCreateModal(false); }} />}

      {/* Top bar */}
      <header className="shrink-0 h-14 flex items-center px-4 z-10 gap-3" style={{ borderBottom: `1px solid ${BORDER}`, background: 'rgba(19,19,31,0.97)' }}>
        <button onClick={() => setProjectOpen(false)} className="flex items-center gap-2 group shrink-0">
          <ArrowLeft className="h-4 w-4 transition-colors" style={{ color: T3 }} />
          <img src="/lumora-brand.png" alt="" className="h-5 w-5 object-contain" style={{ filter: 'drop-shadow(0 0 5px rgba(124,58,237,0.35))' }} />
        </button>
        <div className="h-4 w-px" style={{ background: BORDER }} />
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="font-bold text-[13px] truncate" style={{ color: T1 }}>{hostedBot?.fileName || 'Project'}</span>
          {hostedBot && <StatusPill status={hostedBot.status} sm />}
          {hostedBot && <UptimeCounter lastStartedAt={hostedBot.lastStartedAt} status={hostedBot.status} />}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isStopped && (
            <button onClick={handleStart} disabled={restartBot.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40"
              style={{ color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', background: 'rgba(74,222,128,0.08)' }}>
              {restartBot.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>▷</span>}
              START
            </button>
          )}
          {!isStopped && (
            <button onClick={handleRestart} disabled={isBusy && !isStuck}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-30"
              style={{ color: T2, border: `1px solid ${BORDER}` }}
              onMouseEnter={e => { e.currentTarget.style.background = CARD2; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <RotateCw className={`h-3 w-3 ${restartBot.isPending ? 'animate-spin' : ''}`} /> RESTART
            </button>
          )}
          {canStop && (
            <button onClick={handleStop} disabled={stopBot.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-30"
              style={{ color: T3, border: `1px solid ${BORDER}` }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)'; e.currentTarget.style.background = 'rgba(248,113,113,0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = T3; e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = 'transparent'; }}>
              <PowerOff className="h-3 w-3" /> {isStuck ? 'FORCE STOP' : 'STOP'}
            </button>
          )}
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={{ color: T3, border: `1px solid ${BORDER}` }}
            onMouseEnter={e => { e.currentTarget.style.color = T2; e.currentTarget.style.background = CARD2; }}
            onMouseLeave={e => { e.currentTarget.style.color = T3; e.currentTarget.style.background = 'transparent'; }}>
            <Upload className="h-3 w-3" /> <span className="hidden sm:inline">REDEPLOY</span>
          </button>
          <div className="h-3.5 w-px" style={{ background: BORDER }} />
          <ProfileDropdown session={session} />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-40 shrink-0 flex flex-col py-2 gap-px overflow-y-auto" style={{ borderRight: `1px solid ${BORDER}`, background: 'rgba(19,19,31,0.6)' }}>
          {SIDEBAR_TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] transition-all relative"
              style={{
                color: activeTab === id ? '#a78bfa' : T3,
                background: activeTab === id ? 'rgba(124,58,237,0.1)' : 'transparent',
                borderRight: activeTab === id ? '2px solid #7c3aed' : '2px solid transparent',
              }}
              onMouseEnter={e => { if (activeTab !== id) { e.currentTarget.style.color = T2; e.currentTarget.style.background = CARD; } }}
              onMouseLeave={e => { if (activeTab !== id) { e.currentTarget.style.color = T3; e.currentTarget.style.background = 'transparent'; } }}>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden" style={{ background: BG }}>

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Status',   value: getMeta(hostedBot?.status ?? 'stopped').label },
                  { label: 'Uptime',   value: (hostedBot?.status === 'online' || hostedBot?.status === 'running') && hostedBot?.lastStartedAt ? 'Live' : '—' },
                  { label: 'Restarts', value: String(hostedBot?.restartCount ?? 0) },
                  { label: 'Region',   value: 'US East' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl p-4" style={{ border: `1px solid ${BORDER}`, background: CARD }}>
                    <p className="font-mono text-[9px] tracking-[0.2em] mb-2" style={{ color: T4 }}>{label.toUpperCase()}</p>
                    <p className="font-semibold text-[14px]" style={{ color: T1 }}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-5" style={{ border: `1px solid ${BORDER}`, background: CARD }}>
                <div className="flex items-center justify-between mb-5">
                  <p className="font-mono text-[9px] tracking-[0.25em]" style={{ color: T4 }}>RESOURCE USAGE</p>
                  <span className="font-mono text-[9px]" style={{ color: T4 }}>Free tier limits</span>
                </div>
                <div className="space-y-4">
                  <ResourceBar label="Memory" used={hostedBot ? ramUsed : 0} total={256} unit="MB" color="rgba(124,58,237,0.7)" />
                  <ResourceBar label="CPU"    used={hostedBot ? cpuUsed : 0} total={100} unit="%" color="rgba(16,185,129,0.7)" />
                  <ResourceBar label="Disk"   used={hostedBot ? diskUsed : 0} total={100} unit="MB" color="rgba(245,158,11,0.7)" />
                </div>
                <p className="text-[9px] font-mono mt-4" style={{ color: T4 }}>Upgrade to Pro for real-time resource monitoring and higher limits.</p>
              </div>

              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: CARD }}>
                <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${BORDER2}` }}>
                  <span className="font-mono text-[9px] tracking-[0.25em]" style={{ color: T4 }}>DEPLOYMENT</span>
                </div>
                <div>
                  {[
                    { k: 'Project',       v: hostedBot?.fileName || '—' },
                    { k: 'Start command', v: hostedBot?.startCommand || 'auto-detected' },
                    { k: 'Last deployed', v: hostedBot?.lastStartedAt ? formatDistanceToNow(new Date(hostedBot.lastStartedAt), { addSuffix: true }) : '—' },
                    { k: 'Runtime',       v: RUNTIMES.find(r => r.id === hostedBot?.language)?.label || 'Auto-detected' },
                  ].map(({ k, v }, idx, arr) => (
                    <div key={k} className="grid grid-cols-[140px_1fr] px-5 py-3"
                      style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER2}` : 'none' }}>
                      <span className="font-mono text-[10px]" style={{ color: T3 }}>{k}</span>
                      <span className="font-mono text-[10px] truncate" style={{ color: T2 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {hostedBot?.errorMessage && !isProcessing && (
                <div className="rounded-xl p-5" style={{ border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.06)' }}>
                  <p className="font-mono text-[9px] tracking-[0.25em] mb-3" style={{ color: '#f87171' }}>CRASH LOG</p>
                  <pre className="text-[10px] font-mono rounded-xl p-3 overflow-x-auto max-h-48 whitespace-pre-wrap" style={{ background: '#0e0e1a', color: '#fca5a5' }}>{hostedBot.errorMessage}</pre>
                </div>
              )}

              {hostedBot?.aiExplanation && (
                <div className="rounded-xl p-5" style={{ border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.07)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="h-3.5 w-3.5" style={{ color: '#a78bfa' }} />
                    <span className="font-mono text-[9px] tracking-[0.25em]" style={{ color: '#a78bfa' }}>AI DIAGNOSTIC</span>
                  </div>
                  <p className="text-[11px] font-mono leading-relaxed border-l-2 pl-3" style={{ borderColor: 'rgba(124,58,237,0.4)', color: '#c4b5fd' }}>{hostedBot.aiExplanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Console */}
          {activeTab === 'console' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="shrink-0 flex items-center justify-between px-4 py-2" style={{ borderBottom: `1px solid ${BORDER}`, background: '#12121e' }}>
                <span className="font-mono text-[9px] tracking-[0.3em]" style={{ color: T4 }}>LIVE CONSOLE</span>
                {isProcessing && <div className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" style={{ color: '#60a5fa' }} /><span className="font-mono text-[9px]" style={{ color: '#60a5fa' }}>{hostedBot?.errorMessage || 'Working…'}</span></div>}
              </div>
              <LiveConsole hasBot={!!hostedBot?.fileName} />
            </div>
          )}

          {/* Files */}
          {activeTab === 'files' && (
            <div className="flex-1 overflow-hidden flex flex-col"><FileManager hasBot={!!hostedBot?.fileName} /></div>
          )}

          {/* Environment Variables */}
          {activeTab === 'env' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: CARD }}>
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${BORDER2}` }}>
                  <div>
                    <span className="font-mono text-[9px] tracking-[0.25em]" style={{ color: T4 }}>ENVIRONMENT SECRETS</span>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: T4 }}>Encrypted and injected at runtime.</p>
                  </div>
                  <button onClick={() => { setEnvEntries(p => [...p, { key: '', value: '', hidden: true }]); setEnvDirty(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all"
                    style={{ color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)', background: 'rgba(124,58,237,0.1)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.18)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.1)'; }}>
                    <Plus className="h-3 w-3" /> Add Secret
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  {!envLoaded && <div className="flex items-center gap-2 py-4"><Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: T3 }} /><span className="text-[11px] font-mono" style={{ color: T3 }}>Loading…</span></div>}
                  {envLoaded && envEntries.length === 0 && (
                    <div className="py-8 text-center">
                      <Key className="h-6 w-6 mx-auto mb-2" style={{ color: T4 }} />
                      <p className="text-[11px] font-mono" style={{ color: T3 }}>No secrets configured yet</p>
                    </div>
                  )}
                  {envEntries.map((e, i) => (
                    <div key={i} className="flex gap-2 items-center group">
                      <input value={e.key} onChange={ev => { setEnvEntries(p => p.map((x, j) => j === i ? { ...x, key: ev.target.value } : x)); setEnvDirty(true); }}
                        placeholder="KEY"
                        className="w-36 shrink-0 rounded-xl px-3 py-2 font-mono text-[11px] focus:outline-none transition-colors"
                        style={{ background: CARD2, border: `1px solid ${BORDER}`, color: T1 }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = BORDER; }} />
                      <div className="flex-1 relative">
                        <input type={e.hidden ? 'password' : 'text'} value={e.value}
                          onChange={ev => { setEnvEntries(p => p.map((x, j) => j === i ? { ...x, value: ev.target.value } : x)); setEnvDirty(true); }}
                          placeholder="value"
                          className="w-full rounded-xl px-3 py-2 font-mono text-[11px] focus:outline-none transition-colors pr-9"
                          style={{ background: CARD2, border: `1px solid ${BORDER}`, color: T1 }}
                          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = BORDER; }} />
                        <button onClick={() => setEnvEntries(p => p.map((x, j) => j === i ? { ...x, hidden: !x.hidden } : x))}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                          style={{ color: T3 }}
                          onMouseEnter={e => e.currentTarget.style.color = T2}
                          onMouseLeave={e => e.currentTarget.style.color = T3}>
                          {e.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <button onClick={() => { setEnvEntries(p => p.filter((_, j) => j !== i)); setEnvDirty(true); }}
                        className="transition-colors opacity-0 group-hover:opacity-100" style={{ color: T4 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                        onMouseLeave={e => e.currentTarget.style.color = T4}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {envDirty && (
                    <button onClick={handleSaveEnv} disabled={envSaving}
                      className="flex items-center gap-2 mt-3 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#7c3aed' }}>
                      <Save className="h-3.5 w-3.5" /> {envSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                  )}
                </div>
              </div>
              <div className="rounded-xl px-5 py-3.5" style={{ border: '1px solid rgba(251,191,36,0.18)', background: 'rgba(251,191,36,0.06)' }}>
                <p className="text-[10px] font-mono leading-relaxed" style={{ color: 'rgba(251,191,36,0.75)' }}>
                  Changes to secrets require a restart to take effect. Click <strong>RESTART</strong> in the top bar after saving.
                </p>
              </div>
            </div>
          )}

          {/* Backups */}
          {activeTab === 'backups' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <p className="font-mono text-[9px] tracking-[0.25em] mb-4" style={{ color: T4 }}>SESSION LOG HISTORY</p>
                <LogHistory />
              </div>
              {(() => {
                let entries: any[] = [];
                try { entries = JSON.parse((hostedBot as any)?.repairLog ?? '[]'); } catch { entries = []; }
                if (!entries.length) return null;
                return (
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.25em] mb-4" style={{ color: T4 }}>AI REPAIR HISTORY</p>
                    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                      {entries.slice(-8).reverse().map((e, i) => (
                        <div key={i} className="px-5 py-3 flex items-start gap-3" style={{ borderBottom: `1px solid ${BORDER2}` }}>
                          <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
                            <Check className="h-2.5 w-2.5" style={{ color: '#4ade80' }} />
                          </div>
                          <div>
                            <span className="font-mono text-[10px] block" style={{ color: T2 }}>{e.description}</span>
                            <span className="font-mono text-[9px]" style={{ color: T3 }}>{(() => { try { return new Date(e.timestamp).toLocaleString(); } catch { return e.timestamp; } })()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="rounded-xl px-5 py-4 flex items-center justify-between gap-4" style={{ border: `1px solid ${BORDER}`, background: CARD }}>
                <div>
                  <p className="font-mono text-[9px] tracking-[0.25em] mb-1" style={{ color: T4 }}>CURRENT PLAN</p>
                  <p className="font-bold text-[13px]" style={{ color: T1 }}>Free</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: '#fbbf24' }}>Sleeps after 30 min inactivity</p>
                </div>
                <button onClick={() => setLocation('/pricing')}
                  className="shrink-0 px-4 py-2 rounded-xl text-[11px] font-bold text-white transition-all hover:opacity-90"
                  style={{ background: '#7c3aed' }}>
                  Upgrade Plan
                </button>
              </div>

              <div className="rounded-xl p-5" style={{ border: `1px solid ${BORDER}`, background: CARD }}>
                <p className="font-mono text-[9px] tracking-[0.25em] mb-4" style={{ color: T4 }}>QUICK ACTIONS</p>
                <div className="flex flex-wrap gap-2">
                  {isStopped ? (
                    <button onClick={handleStart} disabled={restartBot.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all disabled:opacity-30"
                      style={{ color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', background: 'rgba(74,222,128,0.08)' }}>
                      <span>▷</span> Start Bot
                    </button>
                  ) : (
                    <button onClick={handleRestart} disabled={isBusy && !isStuck}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all disabled:opacity-30"
                      style={{ color: T2, border: `1px solid ${BORDER}`, background: CARD }}
                      onMouseEnter={e => { e.currentTarget.style.background = CARD2; }}
                      onMouseLeave={e => { e.currentTarget.style.background = CARD; }}>
                      <RotateCw className="h-3.5 w-3.5" /> Restart
                    </button>
                  )}
                  <button onClick={handleStop} disabled={!canStop}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all disabled:opacity-30"
                    style={{ color: T2, border: `1px solid ${BORDER}`, background: CARD }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'; e.currentTarget.style.background = 'rgba(248,113,113,0.07)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = T2; e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = CARD; }}>
                    <PowerOff className="h-3.5 w-3.5" /> {isStuck ? 'Force Stop' : 'Stop'}
                  </button>
                  <button onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all"
                    style={{ color: T2, border: `1px solid ${BORDER}`, background: CARD }}
                    onMouseEnter={e => { e.currentTarget.style.background = CARD2; }}
                    onMouseLeave={e => { e.currentTarget.style.background = CARD; }}>
                    <Upload className="h-3.5 w-3.5" /> Redeploy
                  </button>
                </div>
              </div>

              <div className="rounded-xl p-5" style={{ border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.06)' }}>
                <p className="font-mono text-[9px] tracking-[0.25em] mb-3" style={{ color: '#f87171' }}>DANGER ZONE</p>
                <p className="text-[11px] font-mono leading-relaxed mb-4" style={{ color: 'rgba(252,165,165,0.6)' }}>Deleting this project permanently stops the process and removes all uploaded files. This cannot be undone.</p>
                <button onClick={handleRemoveBot} disabled={removingBot}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-mono transition-all disabled:opacity-30"
                  style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.08)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}>
                  <Trash2 className="h-3.5 w-3.5" /> {removingBot ? 'Deleting…' : 'Delete Project'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
