import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetSession,
  getGetSessionQueryKey,
  useRestartBot,
  useStopBot,
} from '@workspace/api-client-react';
import CreateBotModal from '@/components/CreateBotModal';
import { formatDistanceToNow } from 'date-fns';
import {
  Terminal, RotateCw, AlertTriangle, Activity, Zap, Loader2,
  Plus, Trash2, Save, Eye, EyeOff, PowerOff, Upload, Clock, Send, Bot,
  LogOut, User, ChevronRight, Copy, Download, X, Search, Pause, Play,
  LayoutGrid, Settings, Files, Package, History, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import FileManager from '@/components/FileManager';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

type EnvEntry = { key: string; value: string; hidden: boolean };
type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  toolResults?: Array<{ tool: string; result: string }>;
};
type PortalTab = 'overview' | 'manage' | 'files' | 'addons' | 'backups' | 'settings';

// ─── Status helpers ────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; dot: string; text: string; border: string; bg: string }> = {
  online:       { label: 'ONLINE',      dot: 'bg-emerald-400',             text: 'text-emerald-400',  border: 'border-emerald-500/25',  bg: 'bg-emerald-500/[0.08]'  },
  running:      { label: 'ONLINE',      dot: 'bg-emerald-400',             text: 'text-emerald-400',  border: 'border-emerald-500/25',  bg: 'bg-emerald-500/[0.08]'  },
  connecting:   { label: 'CONNECTING',  dot: 'bg-yellow-400 animate-pulse',text: 'text-yellow-400',   border: 'border-yellow-500/25',   bg: 'bg-yellow-500/[0.08]'   },
  login_failed: { label: 'AUTH FAILED', dot: 'bg-orange-400',              text: 'text-orange-400',   border: 'border-orange-500/25',   bg: 'bg-orange-500/[0.08]'   },
  crashed:      { label: 'CRASHED',     dot: 'bg-red-400',                 text: 'text-red-400',      border: 'border-red-500/25',      bg: 'bg-red-500/[0.08]'      },
  error:        { label: 'ERROR',       dot: 'bg-red-400',                 text: 'text-red-400',      border: 'border-red-500/25',      bg: 'bg-red-500/[0.08]'      },
  installing:   { label: 'INSTALLING',  dot: 'bg-blue-400 animate-pulse',  text: 'text-blue-400',     border: 'border-blue-500/25',     bg: 'bg-blue-500/[0.08]'     },
  starting:     { label: 'STARTING',    dot: 'bg-blue-400 animate-pulse',  text: 'text-blue-400',     border: 'border-blue-500/25',     bg: 'bg-blue-500/[0.08]'     },
  stopped:      { label: 'STOPPED',     dot: 'bg-white/20',                text: 'text-white/35',     border: 'border-white/[0.08]',    bg: 'bg-white/[0.02]'        },
};
function getStatusMeta(s: string) { return STATUS_META[s] ?? STATUS_META.stopped; }

function StatusPill({ status }: { status: string }) {
  const m = getStatusMeta(status);
  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${m.border} ${m.bg}`}>
      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${m.dot}`} />
      <span className={`font-mono text-[9px] font-bold tracking-widest ${m.text}`}>{m.label}</span>
    </div>
  );
}

// ─── Bot uptime counter ───────────────────────────────────────────────────────
function BotUptimeCounter({ lastStartedAt, status }: { lastStartedAt?: string | null; status: string }) {
  const [elapsed, setElapsed] = useState(0);
  const isLive = status === 'online' || status === 'running';
  useEffect(() => {
    if (!lastStartedAt || !isLive) { setElapsed(0); return; }
    const start = new Date(lastStartedAt).getTime();
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lastStartedAt, isLive]);
  if (!isLive || !lastStartedAt) return null;
  const fmt = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return (
    <span className="font-mono text-[10px] text-white/25 tabular-nums hidden sm:inline">
      {fmt(h)}:{fmt(m)}:{fmt(s)}
    </span>
  );
}

// ─── Deployment stages ────────────────────────────────────────────────────────
function DeploymentStages({ status, botName }: { status: string; botName?: string | null }) {
  const stages = [
    { label: 'Installing dependencies', done: status !== 'installing', active: status === 'installing', failed: false },
    { label: 'Starting bot process', done: ['connecting','online','running','login_failed','crashed','error'].includes(status), active: status === 'starting', failed: false },
    { label: 'Connecting to Discord', done: status === 'online' || status === 'running', active: status === 'connecting', failed: status === 'login_failed' },
    { label: (status === 'online' || status === 'running') && botName ? `Online as ${botName}` : 'Online', done: status === 'online' || status === 'running', active: false, failed: false },
  ];
  return (
    <div className="p-4 space-y-2">
      {stages.map((stage, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="shrink-0 w-4 flex justify-center">
            {stage.failed ? <span className="text-red-400/70 text-[10px]">✗</span>
              : stage.done ? <span className="text-emerald-400/80 text-[10px]">✓</span>
              : stage.active ? <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              : <div className="h-1 w-1 rounded-full bg-white/10" />}
          </div>
          <span className={`text-[10.5px] font-mono ${stage.failed ? 'text-red-400/60' : stage.done ? 'text-emerald-400/70' : stage.active ? 'text-blue-400' : 'text-white/18'}`}>
            {stage.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Discord avatar ───────────────────────────────────────────────────────────
function DiscordAvatar({ avatar, id, username }: { avatar: string | null; id: string; username: string }) {
  const src = avatar
    ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.${avatar.startsWith('a_') ? 'gif' : 'png'}?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(id) % 5}.png`;
  return <img src={src} alt={username} className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
}

// ─── Profile dropdown ─────────────────────────────────────────────────────────
function ProfileDropdown({ session }: { session: any }) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const discord = session?.discord;

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try { await fetch(`${BASE}/api/keys/redeem`, { method: 'DELETE', credentials: 'include' }).catch(() => {}); } catch {}
    document.cookie = 'hosting_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setLocation('/login');
  };

  const displayName = discord?.globalName || discord?.username || session?.ownerUsername || 'User';

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] transition-all">
        <div className="h-6 w-6 rounded-md overflow-hidden bg-[#6366f1]/20 border border-white/[0.08] flex items-center justify-center shrink-0">
          {discord ? <DiscordAvatar avatar={discord.avatar} id={discord.id} username={discord.username} /> : <User className="h-3.5 w-3.5 text-white/40" />}
        </div>
        <span className="text-xs font-mono text-white/55 max-w-[90px] truncate hidden sm:block">{displayName}</span>
        <ChevronRight className={`h-3 w-3 text-white/25 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/[0.08] bg-[#0f0f1e] shadow-2xl shadow-black/60 z-50">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg overflow-hidden bg-[#6366f1]/20 border border-white/[0.08] flex items-center justify-center shrink-0">
                {discord ? <DiscordAvatar avatar={discord.avatar} id={discord.id} username={discord.username} /> : <User className="h-4 w-4 text-white/40" />}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white/85 truncate">{displayName}</div>
                {discord?.username && <div className="text-[10px] text-white/35 font-mono">@{discord.username}</div>}
              </div>
            </div>
          </div>
          <div className="px-4 py-2.5 border-b border-white/[0.06]">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-white/30">Session expires</span>
              <span className="text-white/45">{session?.expiresAt ? formatDistanceToNow(new Date(session.expiresAt), { addSuffix: true }) : '—'}</span>
            </div>
          </div>
          <div className="p-1.5">
            <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.08] transition-all">
              <LogOut className="h-3.5 w-3.5" />Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Live console ─────────────────────────────────────────────────────────────
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
      if (!r.ok) return;
      const data = await r.json() as { log: string };
      setLog(data.log ?? '');
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!hasBot) return;
    fetchLog();
    const id = setInterval(fetchLog, 2000);
    return () => clearInterval(id);
  }, [hasBot, fetchLog]);

  useEffect(() => {
    if (!paused && atBottomRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [log, paused]);

  const colorLine = (line: string) => {
    if (/\b(error|err|fatal|fail|exception)\b/i.test(line)) return 'text-red-400/75';
    if (/\b(warn|warning)\b/i.test(line)) return 'text-yellow-400/75';
    if (/✓|✔|success/i.test(line)) return 'text-emerald-400/75';
    if (line.startsWith('[Lumora]') || line.startsWith('>')) return 'text-[#6366f1]/70';
    return 'text-white/45';
  };

  const filteredLog = searchQuery.trim()
    ? log.split('\n').filter(l => l.toLowerCase().includes(searchQuery.toLowerCase())).join('\n')
    : log;

  if (!hasBot) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
        <div className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
          <Terminal className="h-4 w-4 text-white/20" />
        </div>
        <p className="text-xs font-mono text-white/25">Deploy a bot to see console output</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#08080f]">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-0.5 px-2 py-1.5 border-b border-white/[0.05] bg-[#0a0a14]">
        {showSearch ? (
          <>
            <div className="flex-1 flex items-center gap-2 bg-white/[0.04] rounded-md px-2 py-1 border border-white/[0.07]">
              <Search className="h-3 w-3 text-white/30 shrink-0" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search logs…" className="flex-1 bg-transparent text-[11px] font-mono text-white/70 placeholder:text-white/25 focus:outline-none" autoFocus />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="text-white/25 hover:text-white/50"><X className="h-3 w-3" /></button>}
            </div>
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-1.5 rounded text-white/25 hover:text-white/55 ml-1"><X className="h-3.5 w-3.5" /></button>
          </>
        ) : (
          <>
            <button onClick={() => setShowSearch(true)} className="p-1.5 rounded text-white/25 hover:text-white/55 hover:bg-white/[0.04] transition-all" title="Search"><Search className="h-3.5 w-3.5" /></button>
            <button onClick={() => setPaused(!paused)} className={`p-1.5 rounded transition-all ${paused ? 'text-yellow-400 bg-yellow-500/10' : 'text-white/25 hover:text-white/55 hover:bg-white/[0.04]'}`} title={paused ? 'Resume' : 'Pause'}>
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => navigator.clipboard.writeText(log).then(() => toast.success('Copied'))} className="p-1.5 rounded text-white/25 hover:text-white/55 hover:bg-white/[0.04] transition-all" title="Copy"><Copy className="h-3.5 w-3.5" /></button>
            <button onClick={() => { const b = new Blob([log], { type: 'text/plain' }); const u = URL.createObjectURL(b); Object.assign(document.createElement('a'), { href: u, download: `logs-${Date.now()}.txt` }).click(); URL.revokeObjectURL(u); }} className="p-1.5 rounded text-white/25 hover:text-white/55 hover:bg-white/[0.04] transition-all" title="Download"><Download className="h-3.5 w-3.5" /></button>
            <button onClick={() => setLog('')} className="p-1.5 rounded text-white/25 hover:text-white/55 hover:bg-white/[0.04] transition-all" title="Clear"><X className="h-3.5 w-3.5" /></button>
          </>
        )}
      </div>
      {/* Log output */}
      {!log ? (
        <div className="flex-1 flex items-center justify-center gap-2">
          <Loader2 className="h-3.5 w-3.5 text-white/20 animate-spin" />
          <p className="text-xs font-mono text-white/20">Waiting for output…</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-0.5" onScroll={e => { const el = e.currentTarget; atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}>
          {filteredLog.split('\n').map((line, i) => line ? (
            <div key={i} className={`font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap break-words ${colorLine(line)}`}>{line}</div>
          ) : <div key={i} className="h-1" />)}
          <div ref={bottomRef} />
        </div>
      )}
      {paused && (
        <div className="shrink-0 px-3 py-1.5 bg-yellow-500/[0.05] border-t border-yellow-500/15 flex items-center gap-2">
          <Pause className="h-3 w-3 text-yellow-400/60" />
          <span className="text-[10px] font-mono text-yellow-400/60">Output paused</span>
          <button onClick={() => setPaused(false)} className="ml-auto text-[10px] font-mono text-yellow-400/60 hover:text-yellow-400">Resume</button>
        </div>
      )}
    </div>
  );
}

// ─── AI Agent (Addons tab) ────────────────────────────────────────────────────
function AIAgent({ botStatus, errorMessage }: { botStatus?: string; errorMessage?: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length > 0) return;
    let greeting = "Hi! I'm Lumora AI. I can help you debug your bot, explain errors, or walk you through fixes.";
    if (botStatus === 'crashed' || botStatus === 'error') greeting = "Your bot has crashed. Ask me what went wrong and I'll walk you through a fix.";
    else if (botStatus === 'online' || botStatus === 'running') greeting = "Your bot is online! Let me know if you need help with your deployment.";
    setMessages([{ role: 'assistant', content: greeting }]);
  }, [botStatus]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput(''); setSending(true);
    try {
      const r = await fetch(`${BASE}/api/ai/chat`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [...messages, userMsg] }) });
      const data = await r.json() as { content?: string; error?: string; toolResults?: Array<{ tool: string; result: string }> };
      if (!r.ok) throw new Error(data.error || 'Request failed');
      setMessages(prev => [...prev, { role: 'assistant', content: data.content ?? '', toolResults: data.toolResults?.length ? data.toolResults : undefined }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I ran into an issue: ${e?.message || 'Unknown error'}` }]);
    } finally { setSending(false); inputRef.current?.focus(); }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && <img src="/lumora-brand.png" alt="" className="h-5 w-5 object-contain shrink-0 mt-0.5 mr-2" />}
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] font-mono whitespace-pre-wrap break-words leading-relaxed ${m.role === 'user' ? 'bg-[#6366f1]/12 border border-[#6366f1]/20 text-[#a5b4fc]' : 'bg-white/[0.03] border border-white/[0.06] text-white/55'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <img src="/lumora-brand.png" alt="" className="h-5 w-5 shrink-0 mt-0.5 mr-2" />
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2"><Loader2 className="h-3 w-3 text-white/25 animate-spin" /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-white/[0.05] p-3">
        <div className="flex gap-2 items-end">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about your bot…" rows={1} className="flex-1 resize-none bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 font-mono text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#6366f1]/30 transition-colors max-h-28 overflow-y-auto" style={{ minHeight: 34 }} />
          <button onClick={sendMessage} disabled={!input.trim() || sending} className="shrink-0 h-[34px] w-[34px] flex items-center justify-center rounded-xl bg-[#6366f1]/80 hover:bg-[#6366f1] text-white disabled:opacity-30 transition-all">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[9px] font-mono text-white/15 mt-1.5">Enter to send · Shift+Enter for new line</p>
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

  // Env vars state
  const [envEntries, setEnvEntries] = useState<EnvEntry[]>([]);
  const [envDirty, setEnvDirty] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);
  const [envLoaded, setEnvLoaded] = useState(false);

  const restartBot = useRestartBot({ request: { credentials: 'include' } });
  const stopBot = useStopBot({ request: { credentials: 'include' } });
  const [removingBot, setRemovingBot] = useState(false);

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

  // Load env vars when settings tab is opened
  useEffect(() => {
    if (activeTab !== 'settings' || envLoaded) return;
    fetch(`${BASE}/api/bots/env`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : {})
      .then((d: any) => {
        const vars = d?.vars ?? {};
        setEnvEntries(Object.entries(vars).map(([key, value]) => ({ key, value: value as string, hidden: false })));
        setEnvLoaded(true);
      })
      .catch(() => {});
  }, [activeTab, envLoaded]);

  // Auto-open project if bot exists
  useEffect(() => {
    if (session?.hostedBot && !projectOpen) {
      // Don't auto-open on first load; let user see projects list
    }
  }, [session?.hostedBot]);

  const hostedBot = (session as any)?.hostedBot;
  const isProcessing = hostedBot?.status === 'installing' || hostedBot?.status === 'starting' || hostedBot?.status === 'connecting';
  const isBusy = restartBot.isPending || stopBot.isPending || isProcessing || removingBot;
  // Force stop is always available when stuck — bypasses isBusy for installing/starting
  const isStuck = hostedBot?.status === 'installing' || hostedBot?.status === 'starting';

  const handleStart = () => {
    restartBot.mutate(undefined, {
      onSuccess: () => { toast.success('Starting bot…'); queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }); },
      onError: (err: any) => toast.error(`Failed: ${err?.data?.error || 'Unknown error'}`),
    });
  };
  const handleRestart = () => {
    restartBot.mutate(undefined, {
      onSuccess: () => { toast.success('Restarting…'); queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }); },
      onError: (err: any) => toast.error(`Failed: ${err?.data?.error || 'Unknown error'}`),
    });
  };
  const handleStop = () => {
    stopBot.mutate(undefined, {
      onSuccess: () => { toast.success('Bot stopped'); queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }); },
      onError: (err: any) => toast.error(`Failed: ${err?.data?.error || 'Unknown error'}`),
    });
  };
  const handleRemoveBot = async () => {
    if (!confirm('Remove this project? This stops the process and deletes all uploaded files.')) return;
    setRemovingBot(true);
    try {
      const r = await fetch(`${BASE}/api/bots`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) { const d = await r.json().catch(() => ({})) as any; throw new Error(d?.error || 'Failed'); }
      toast.success('Project removed');
      queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
      setProjectOpen(false);
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
      setEnvDirty(false);
      toast.success('Secrets saved — restart your bot to apply.');
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setEnvSaving(false); }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#080810]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#6366f1]/50" />
          <p className="font-mono text-sm text-white/25">Loading portal…</p>
        </div>
      </div>
    );
  }

  if (!session || isError) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#080810]">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <AlertTriangle className="h-8 w-8 text-red-400/40" />
          <p className="font-mono text-sm text-white/40">Session expired or not found</p>
          <button onClick={() => setLocation('/login')} className="px-4 py-2 rounded-xl text-xs font-mono text-white/60 border border-white/[0.08] hover:border-white/[0.18]">Back to login</button>
        </div>
      </div>
    );
  }

  // ─── Projects list view ───────────────────────────────────────────────────
  if (!projectOpen) {
    return (
      <div className="min-h-screen bg-[#080810] text-[#c8cde8]">
        {showCreateModal && (
          <CreateBotModal onClose={() => setShowCreateModal(false)} onDeployed={() => { queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }); setShowCreateModal(false); setProjectOpen(true); }} />
        )}
        {/* Fixed background */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.018]"
          style={{ backgroundImage: `linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)`, backgroundSize: '48px 48px' }} />

        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between h-13 px-6 md:px-10 border-b border-white/[0.05] bg-[#080810]/95 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <img src="/lumora-brand.png" alt="Lumora" className="h-6 w-6 object-contain" />
            <span className="font-mono font-black text-sm tracking-[0.18em] text-white">LUMORA</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation('/pricing')} className="hidden sm:block px-3 py-1.5 text-[11px] font-mono text-white/35 hover:text-white/60 border border-white/[0.06] rounded-lg hover:border-white/[0.12] transition-all">
              Upgrade
            </button>
            <ProfileDropdown session={session} />
          </div>
        </header>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pt-10 pb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Your Projects</h1>
              <p className="text-sm text-white/30 font-mono mt-1">Manage your Discord bot deployments</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-90" style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}>
              <Plus className="h-4 w-4" />New Project
            </button>
          </div>

          {/* Bot card or empty state */}
          {hostedBot?.fileName ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d1a] overflow-hidden group hover:border-white/[0.12] transition-all duration-300">
              <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.35), transparent)' }} />
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl border border-[#6366f1]/20 bg-[#6366f1]/[0.08] flex items-center justify-center shrink-0">
                    <Activity className="h-5 w-5 text-[#6366f1]/60" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-base text-white/85">{hostedBot.fileName}</span>
                      <StatusPill status={hostedBot.status} />
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-mono text-white/25">
                      {hostedBot.lastStartedAt && (
                        <span>Last started {formatDistanceToNow(new Date(hostedBot.lastStartedAt), { addSuffix: true })}</span>
                      )}
                      {hostedBot.restartCount > 0 && <span>{hostedBot.restartCount} restart{hostedBot.restartCount !== 1 ? 's' : ''}</span>}
                      <BotUptimeCounter lastStartedAt={hostedBot.lastStartedAt} status={hostedBot.status} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(hostedBot.status === 'stopped' || hostedBot.status === 'crashed' || hostedBot.status === 'error') && (
                    <button onClick={handleStart} disabled={restartBot.isPending}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white border border-emerald-500/30 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.15] transition-all disabled:opacity-30">
                      {restartBot.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>▷</span>}
                      Start
                    </button>
                  )}
                  <button onClick={() => { setProjectOpen(true); setActiveTab('overview'); }}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white/75 border border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.07] hover:text-white transition-all">
                    Open <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div onClick={() => setShowCreateModal(true)}
              className="rounded-2xl border-2 border-dashed border-white/[0.06] hover:border-[#6366f1]/30 p-16 flex flex-col items-center text-center cursor-pointer hover:bg-[#6366f1]/[0.02] transition-all duration-300 group">
              <div className="h-14 w-14 rounded-2xl border border-white/[0.07] bg-white/[0.02] group-hover:bg-[#6366f1]/[0.08] group-hover:border-[#6366f1]/20 flex items-center justify-center mb-4 transition-all">
                <Plus className="h-6 w-6 text-white/20 group-hover:text-[#6366f1]/60 transition-colors" />
              </div>
              <h3 className="font-bold text-white/40 mb-1.5">No projects yet</h3>
              <p className="text-xs text-white/22 font-mono">Click to deploy your first bot — ZIP upload or GitHub import</p>
            </div>
          )}

          {/* Free plan notice */}
          <div className="mt-6 rounded-xl border border-white/[0.05] bg-white/[0.01] px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white/35 font-mono">FREE PLAN</p>
              <p className="text-[11px] text-white/22 font-mono mt-0.5">Your bot restarts every 6 hours. Upgrade for always-on hosting.</p>
            </div>
            <button onClick={() => setLocation('/pricing')} className="shrink-0 px-3.5 py-1.5 rounded-lg text-[11px] font-bold text-[#6366f1]/80 border border-[#6366f1]/20 bg-[#6366f1]/[0.05] hover:bg-[#6366f1]/[0.10] transition-all">
              Upgrade →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Project portal view (Pella-style) ────────────────────────────────────
  const SIDEBAR_ITEMS: { id: PortalTab; icon: any; label: string }[] = [
    { id: 'overview', icon: LayoutGrid, label: 'Overview' },
    { id: 'manage',   icon: Wrench,     label: 'Manage' },
    { id: 'files',    icon: Files,      label: 'Files' },
    { id: 'addons',   icon: Zap,        label: 'Addons' },
    { id: 'backups',  icon: History,    label: 'Backups' },
    { id: 'settings', icon: Settings,   label: 'Settings' },
  ];

  const isStopped = hostedBot?.status === 'stopped' || hostedBot?.status === 'crashed' || hostedBot?.status === 'error';
  const canStop = hostedBot?.status !== 'stopped' && !stopBot.isPending;

  return (
    <div className="h-screen bg-[#0a0a10] text-[#c8cde8] flex flex-col overflow-hidden">
      {showCreateModal && (
        <CreateBotModal onClose={() => setShowCreateModal(false)} onDeployed={() => { queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }); setShowCreateModal(false); }} />
      )}

      {/* ─── Top bar ────────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center h-[46px] px-4 border-b border-white/[0.06] bg-[#0a0a10] z-10 gap-3">
        {/* Logo + back */}
        <button onClick={() => setProjectOpen(false)} className="flex items-center gap-2.5 shrink-0 group">
          <img src="/lumora-brand.png" alt="" className="h-5 w-5 object-contain opacity-70 group-hover:opacity-90 transition-opacity" />
          <span className="font-mono font-bold text-xs tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors hidden sm:block">LUMORA</span>
        </button>
        <div className="h-3.5 w-px bg-white/[0.08]" />

        {/* Project name + status */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="font-bold text-sm text-white/75 truncate">{hostedBot?.fileName || 'My Bot'}</span>
          {hostedBot && <StatusPill status={hostedBot.status} />}
          {hostedBot && <BotUptimeCounter lastStartedAt={hostedBot.lastStartedAt} status={hostedBot.status} />}
          {isStuck && (
            <span className="font-mono text-[9px] text-white/25 animate-pulse hidden sm:inline">
              {hostedBot.errorMessage || 'Working…'}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* START (green, visible when stopped/error/crashed) */}
          {isStopped && (
            <button onClick={handleStart} disabled={restartBot.isPending}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold text-white border border-emerald-500/40 bg-emerald-500/[0.12] hover:bg-emerald-500/[0.2] transition-all disabled:opacity-40"
              style={{ boxShadow: '0 0 12px rgba(52,211,153,0.1)' }}>
              {restartBot.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="text-xs">▷</span>}
              START
            </button>
          )}

          {/* RESTART */}
          {!isStopped && (
            <button onClick={handleRestart} disabled={isBusy && !isStuck}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono text-white/55 border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.06] hover:text-white/80 transition-all disabled:opacity-30">
              <RotateCw className={`h-3 w-3 ${restartBot.isPending ? 'animate-spin' : ''}`} />
              RESTART
            </button>
          )}

          {/* STOP — always enabled during installing/starting (force stop fix) */}
          {canStop && (
            <button onClick={handleStop} disabled={stopBot.isPending}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono text-white/40 border border-white/[0.08] bg-white/[0.01] hover:bg-red-500/[0.08] hover:text-red-400/80 hover:border-red-500/20 transition-all disabled:opacity-30"
              title={isStuck ? 'Force stop (stuck installation)' : 'Stop'}>
              <PowerOff className="h-3 w-3" />
              {isStuck ? 'FORCE STOP' : 'STOP'}
            </button>
          )}

          {/* New Deploy */}
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono text-white/55 border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.06] hover:text-white/80 transition-all">
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline">NEW DEPLOY</span>
          </button>

          <div className="h-3.5 w-px bg-white/[0.08] hidden sm:block" />
          <ProfileDropdown session={session} />
        </div>
      </header>

      {/* ─── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─── Left sidebar ─────────────────────────────────────────────── */}
        <aside className="w-36 shrink-0 flex flex-col border-r border-white/[0.05] bg-[#08080e] py-2 gap-0.5 overflow-y-auto">
          {SIDEBAR_ITEMS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-mono transition-all duration-150 ${activeTab === id
                ? 'text-white/80 bg-white/[0.05] border-r-2 border-[#6366f1]'
                : 'text-white/28 hover:text-white/55 hover:bg-white/[0.025]'}`}>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </aside>

        {/* ─── Main content ──────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* ── Overview (Console) ─── */}
          {activeTab === 'overview' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/[0.04] bg-[#090913]">
                <span className="font-mono text-[9px] tracking-[0.3em] text-white/20">CONSOLE</span>
                {isProcessing && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-400/60" />
                    <span className="font-mono text-[9px] text-blue-400/60">{hostedBot?.errorMessage || 'Working…'}</span>
                  </div>
                )}
              </div>

              {/* Deployment stages (during setup) */}
              {isProcessing && hostedBot && (
                <div className="shrink-0 border-b border-white/[0.04] bg-[#09090f]">
                  <DeploymentStages status={hostedBot.status} botName={(hostedBot as any).botName} />
                </div>
              )}

              <LiveConsole hasBot={!!hostedBot?.fileName} />
            </div>
          )}

          {/* ── Manage ─── */}
          {activeTab === 'manage' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="rounded-xl border border-white/[0.07] bg-[#0d0d1a] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-white/[0.05]">
                  <span className="font-mono text-[9px] tracking-[0.25em] text-white/30">BOT INFO</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {[
                    { label: 'Project', value: hostedBot?.fileName || '—' },
                    { label: 'Status', value: hostedBot ? getStatusMeta(hostedBot.status).label : '—' },
                    { label: 'Start command', value: hostedBot?.startCommand || 'auto-detected' },
                    { label: 'Restarts', value: String(hostedBot?.restartCount ?? 0) },
                    { label: 'Last started', value: hostedBot?.lastStartedAt ? formatDistanceToNow(new Date(hostedBot.lastStartedAt), { addSuffix: true }) : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="grid grid-cols-[120px_1fr] px-5 py-3">
                      <span className="text-[10px] font-mono text-white/25">{label}</span>
                      <span className="text-[11px] font-mono text-white/55 truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-[#0d0d1a] p-5">
                <p className="font-mono text-[9px] tracking-[0.25em] text-white/30 mb-4">CONTROLS</p>
                <div className="flex flex-wrap gap-2">
                  {isStopped ? (
                    <button onClick={handleStart} disabled={restartBot.isPending} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white border border-emerald-500/30 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.15] transition-all disabled:opacity-30">
                      <span>▷</span> Start
                    </button>
                  ) : (
                    <button onClick={handleRestart} disabled={isBusy && !isStuck} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono text-white/55 border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.06] transition-all disabled:opacity-30">
                      <RotateCw className="h-3.5 w-3.5" /> Restart
                    </button>
                  )}
                  <button onClick={handleStop} disabled={!canStop || stopBot.isPending} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono text-white/55 border border-white/[0.10] bg-white/[0.02] hover:bg-red-500/[0.08] hover:text-red-400/80 hover:border-red-500/20 transition-all disabled:opacity-30">
                    <PowerOff className="h-3.5 w-3.5" /> {isStuck ? 'Force Stop' : 'Stop'}
                  </button>
                  <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono text-white/55 border border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.06] transition-all">
                    <Upload className="h-3.5 w-3.5" /> Replace
                  </button>
                </div>
              </div>

              {/* Error/crash log */}
              {hostedBot?.errorMessage && !isProcessing && (
                <div className="rounded-xl border border-red-500/12 bg-red-500/[0.03] p-5">
                  <p className="font-mono text-[9px] tracking-[0.25em] text-red-400/60 mb-3">CRASH LOG</p>
                  <pre className="text-[10px] font-mono text-red-300/50 bg-[#0a0a12] rounded-xl p-3 overflow-x-auto max-h-48 border border-red-500/[0.08] whitespace-pre-wrap">{hostedBot.errorMessage}</pre>
                </div>
              )}

              {/* AI explanation */}
              {hostedBot?.aiExplanation && (
                <div className="rounded-xl border border-white/[0.06] bg-[#0d0d1a] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="h-3.5 w-3.5 text-[#6366f1]/50" />
                    <span className="font-mono text-[9px] tracking-[0.25em] text-white/30">AI DIAGNOSTIC</span>
                  </div>
                  <p className="text-xs text-white/40 font-mono leading-relaxed border-l-2 border-[#6366f1]/20 pl-3">{hostedBot.aiExplanation}</p>
                </div>
              )}

              {/* Danger zone */}
              <div className="rounded-xl border border-red-500/10 bg-red-500/[0.02] p-5">
                <p className="font-mono text-[9px] tracking-[0.25em] text-red-400/40 mb-3">DANGER ZONE</p>
                <button onClick={handleRemoveBot} disabled={removingBot} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono text-red-400/55 border border-red-500/20 bg-red-500/[0.05] hover:bg-red-500/[0.10] hover:text-red-400 transition-all disabled:opacity-30">
                  <Trash2 className="h-3.5 w-3.5" /> {removingBot ? 'Removing…' : 'Delete Project'}
                </button>
              </div>
            </div>
          )}

          {/* ── Files ─── */}
          {activeTab === 'files' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <FileManager />
            </div>
          )}

          {/* ── Addons (AI Agent) ─── */}
          {activeTab === 'addons' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="shrink-0 px-4 py-2 border-b border-white/[0.04] bg-[#090913]">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-[#6366f1]/50" />
                  <span className="font-mono text-[9px] tracking-[0.3em] text-white/20">AI ASSISTANT</span>
                </div>
              </div>
              <AIAgent botStatus={hostedBot?.status} errorMessage={hostedBot?.errorMessage} />
            </div>
          )}

          {/* ── Backups (log history) ─── */}
          {activeTab === 'backups' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <p className="font-mono text-[9px] tracking-[0.25em] text-white/25">LOG HISTORY</p>
              <LogHistory />
              {/* AI repair log */}
              {(() => {
                let entries: Array<{ timestamp: string; action: string; description: string }> = [];
                try { entries = JSON.parse((hostedBot as any)?.repairLog ?? '[]'); } catch { entries = []; }
                if (!entries.length) return null;
                return (
                  <div className="rounded-xl border border-white/[0.06] bg-[#0d0d1a] overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/[0.05] flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-[#6366f1]/50" />
                      <span className="font-mono text-[9px] tracking-[0.25em] text-white/30">AI REPAIR HISTORY</span>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {entries.slice(-8).reverse().map((e, i) => (
                        <div key={i} className="px-5 py-2.5 flex items-start gap-2.5">
                          <span className="text-emerald-500/50 text-[10px] mt-0.5 shrink-0">✓</span>
                          <div>
                            <span className="font-mono text-[10px] text-white/45 block">{e.description}</span>
                            <span className="font-mono text-[9px] text-white/20">{(() => { try { return new Date(e.timestamp).toLocaleString(); } catch { return e.timestamp; } })()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Settings (env vars) ─── */}
          {activeTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Env vars */}
              <div className="rounded-xl border border-white/[0.07] bg-[#0d0d1a] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.05]">
                  <span className="font-mono text-[9px] tracking-[0.25em] text-white/30">ENVIRONMENT SECRETS</span>
                  <button onClick={() => { setEnvEntries(prev => [...prev, { key: '', value: '', hidden: true }]); setEnvDirty(true); }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono text-[#6366f1]/70 border border-[#6366f1]/20 bg-[#6366f1]/[0.05] hover:bg-[#6366f1]/[0.10] transition-all">
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  {envEntries.length === 0 && (
                    <p className="text-xs font-mono text-white/20 text-center py-4">No secrets configured</p>
                  )}
                  {envEntries.map((entry, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={entry.key} onChange={e => { setEnvEntries(p => p.map((x, j) => j === i ? { ...x, key: e.target.value } : x)); setEnvDirty(true); }}
                        placeholder="KEY" className="w-36 shrink-0 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 font-mono text-[11px] text-white/60 placeholder:text-white/15 focus:outline-none focus:border-[#6366f1]/30 transition-colors" />
                      <div className="flex-1 relative">
                        <input type={entry.hidden ? 'password' : 'text'} value={entry.value}
                          onChange={e => { setEnvEntries(p => p.map((x, j) => j === i ? { ...x, value: e.target.value } : x)); setEnvDirty(true); }}
                          placeholder="value" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 font-mono text-[11px] text-white/60 placeholder:text-white/15 focus:outline-none focus:border-[#6366f1]/30 transition-colors pr-8" />
                        <button onClick={() => setEnvEntries(p => p.map((x, j) => j === i ? { ...x, hidden: !x.hidden } : x))} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/55">
                          {entry.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <button onClick={() => { setEnvEntries(p => p.filter((_, j) => j !== i)); setEnvDirty(true); }} className="text-white/20 hover:text-red-400/60 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {envDirty && (
                    <button onClick={handleSaveEnv} disabled={envSaving} className="flex items-center gap-1.5 mt-2 px-4 py-2 rounded-lg text-xs font-bold text-white border border-[#6366f1]/30 bg-[#6366f1]/[0.10] hover:bg-[#6366f1]/[0.18] transition-all disabled:opacity-50">
                      <Save className="h-3.5 w-3.5" /> {envSaving ? 'Saving…' : 'Save Secrets'}
                    </button>
                  )}
                </div>
              </div>

              {/* Plan info */}
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white/30 font-mono">FREE PLAN</p>
                  <p className="text-[11px] text-white/20 font-mono mt-0.5">Upgrade to keep your bot online 24/7</p>
                </div>
                <button onClick={() => setLocation('/pricing')} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#6366f1]/70 border border-[#6366f1]/20 bg-[#6366f1]/[0.05] hover:bg-[#6366f1]/[0.10] transition-all">
                  View Plans
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Log history (used in Backups tab) ────────────────────────────────────────
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

  if (loading) return <div className="flex items-center gap-2 py-4"><Loader2 className="h-3.5 w-3.5 animate-spin text-white/20" /><span className="text-xs font-mono text-white/20">Loading…</span></div>;
  if (!sessions.length) return <div className="rounded-xl border border-white/[0.05] bg-[#0d0d1a] px-5 py-8 text-center"><p className="text-xs font-mono text-white/20">No log history yet</p></div>;

  const sel = sessions.find(s => s.id === selected);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/[0.07] bg-[#0d0d1a] overflow-hidden">
        <div className="divide-y divide-white/[0.04]">
          {sessions.slice(0, 10).map((s: any) => (
            <button key={s.id} onClick={() => setSelected(sel?.id === s.id ? null : s.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors text-left">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-white/20 shrink-0" />
                <span className="font-mono text-[10px] text-white/40">{(() => { try { return new Date(s.startedAt).toLocaleString(); } catch { return '—'; } })()}</span>
              </div>
              <span className="font-mono text-[9px] text-white/20">{selected === s.id ? '▲' : '▼'}</span>
            </button>
          ))}
        </div>
      </div>
      {sel && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0a0a12] overflow-hidden">
          <pre className="p-4 text-[10px] font-mono text-white/40 overflow-x-auto max-h-64 whitespace-pre-wrap">{sel.log || '(empty)'}</pre>
        </div>
      )}
    </div>
  );
}
