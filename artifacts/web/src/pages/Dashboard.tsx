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
  Terminal, RotateCw, AlertTriangle, ChevronDown, ChevronUp,
  Activity, Zap, XCircle, Loader2, Key, Plus, Trash2, Save,
  Eye, EyeOff, Files, PowerOff, Upload, Clock, Send, Bot,
  LogOut, User, ChevronRight, Copy, Download, X, Search, Pause, Play,
  LayoutDashboard,
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

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; dot: string; text: string; border: string; bg: string }> = {
  online:       { label: 'Online',      dot: 'bg-emerald-400',              text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.08]' },
  running:      { label: 'Online',      dot: 'bg-emerald-400',              text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.08]' },
  connecting:   { label: 'Connecting',  dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-400',  border: 'border-yellow-500/20',  bg: 'bg-yellow-500/[0.08]'  },
  login_failed: { label: 'Login failed',dot: 'bg-orange-400',              text: 'text-orange-400',  border: 'border-orange-500/20',  bg: 'bg-orange-500/[0.08]'  },
  crashed:      { label: 'Crashed',     dot: 'bg-red-400',                 text: 'text-red-400',     border: 'border-red-500/20',     bg: 'bg-red-500/[0.08]'     },
  error:        { label: 'Error',       dot: 'bg-red-400',                 text: 'text-red-400',     border: 'border-red-500/20',     bg: 'bg-red-500/[0.08]'     },
  installing:   { label: 'Installing',  dot: 'bg-blue-400 animate-pulse',  text: 'text-blue-400',    border: 'border-blue-500/20',    bg: 'bg-blue-500/[0.08]'    },
  starting:     { label: 'Starting',    dot: 'bg-blue-400 animate-pulse',  text: 'text-blue-400',    border: 'border-blue-500/20',    bg: 'bg-blue-500/[0.08]'    },
  stopped:      { label: 'Offline',     dot: 'bg-white/20',                text: 'text-white/30',    border: 'border-white/[0.08]',   bg: 'bg-white/[0.02]'       },
};

function getStatus(status: string) {
  return STATUS_META[status] ?? STATUS_META.stopped;
}

function StatusBadge({ status }: { status: string }) {
  const s = getStatus(status);
  const spinning = status === 'installing' || status === 'starting' || status === 'connecting';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold ${s.text} ${s.border} ${s.bg}`}>
      {spinning
        ? <Loader2 className="h-3 w-3 animate-spin" />
        : <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      }
      {s.label}
    </span>
  );
}

// ─── Deployment Stages ───────────────────────────────────────────────────────
function DeploymentStages({ status, botName }: { status: string; botName?: string | null }) {
  const isInstalling = status === 'installing';
  const isStarting   = status === 'starting';
  const isConnecting = status === 'connecting';
  const isOnline     = status === 'online' || status === 'running';
  const isLoginFail  = status === 'login_failed';
  const isCrashed    = status === 'crashed' || status === 'error';

  const stages = [
    {
      label: 'Installing dependencies',
      done: !isInstalling,
      active: isInstalling,
      failed: false,
    },
    {
      label: 'Starting bot process',
      done: isConnecting || isOnline || isLoginFail || isCrashed,
      active: isStarting,
      failed: false,
    },
    {
      label: 'Connecting to Discord',
      done: isOnline,
      active: isConnecting,
      failed: isLoginFail,
    },
    {
      label: isOnline && botName ? `Online as ${botName}` : 'Online',
      done: isOnline,
      active: false,
      failed: isCrashed && (isConnecting || isStarting || isOnline),
    },
  ];

  return (
    <div className="px-5 py-3 border-b border-white/[0.04] space-y-1.5">
      {stages.map((stage, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="shrink-0 w-4 h-4 flex items-center justify-center">
            {stage.failed ? (
              <span className="text-red-400/70 text-[11px] font-bold">✗</span>
            ) : stage.done ? (
              <span className="text-emerald-400/80 text-[11px]">✓</span>
            ) : stage.active ? (
              <span className="inline-block h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            ) : (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/10" />
            )}
          </div>
          <span className={`text-[10.5px] font-mono transition-colors ${
            stage.failed ? 'text-red-400/60'
            : stage.done  ? 'text-emerald-400/70'
            : stage.active ? 'text-blue-400'
            : 'text-white/18'
          }`}>
            {stage.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function DiscordAvatar({ avatar, id, username }: { avatar: string | null; id: string; username: string }) {
  const src = avatar
    ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.${avatar.startsWith('a_') ? 'gif' : 'png'}?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(id) % 5}.png`;
  return (
    <img
      src={src}
      alt={username}
      className="h-full w-full object-cover"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

// ─── Profile Dropdown ─────────────────────────────────────────────────────────
function ProfileDropdown({ session }: { session: any }) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const discord = session?.discord;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${BASE}/api/keys/redeem`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
      document.cookie = 'hosting_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } catch {}
    setLocation('/login');
  };

  const displayName = discord?.globalName || discord?.username || session?.ownerUsername || 'User';
  const handle = discord?.username ? `@${discord.username}` : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200"
      >
        <div className="h-6 w-6 rounded-lg overflow-hidden bg-[#6366f1]/20 border border-white/[0.08] flex items-center justify-center shrink-0">
          {discord ? (
            <DiscordAvatar avatar={discord.avatar} id={discord.id} username={discord.username} />
          ) : (
            <User className="h-3.5 w-3.5 text-white/40" />
          )}
        </div>
        <span className="text-xs font-mono font-medium text-white/60 max-w-[100px] truncate hidden sm:block">{displayName}</span>
        <ChevronRight className={`h-3 w-3 text-white/25 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/[0.08] bg-[#0f0f1e] shadow-2xl shadow-black/60 overflow-hidden z-50 animate-page-in">
          <div className="px-4 py-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl overflow-hidden bg-[#6366f1]/20 border border-white/[0.08] flex items-center justify-center shrink-0">
                {discord ? (
                  <DiscordAvatar avatar={discord.avatar} id={discord.id} username={discord.username} />
                ) : (
                  <User className="h-4 w-4 text-white/40" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white/85 truncate">{displayName}</div>
                {handle && <div className="text-[11px] text-white/35 truncate font-mono">{handle}</div>}
              </div>
            </div>
          </div>

          <div className="px-4 py-2.5 border-b border-white/[0.06]">
            <div className="flex items-center justify-between text-[11px] font-mono mt-1">
              <span className="text-white/30">Expires</span>
              <span className="text-white/50">
                {session?.expiresAt ? formatDistanceToNow(new Date(session.expiresAt), { addSuffix: true }) : '—'}
              </span>
            </div>
          </div>

          <div className="p-1.5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.08] transition-all duration-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Live Console ────────────────────────────────────────────────────────────
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(log).then(() => toast.success('Logs copied'));
  };

  const handleDownload = () => {
    const blob = new Blob([log], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bot-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLog = searchQuery.trim()
    ? log.split('\n').filter(l => l.toLowerCase().includes(searchQuery.toLowerCase())).join('\n')
    : log;

  const colorLine = (line: string) => {
    if (/\b(error|err|fatal|fail|exception)\b/i.test(line)) return 'text-red-400/80';
    if (/\b(warn|warning)\b/i.test(line)) return 'text-yellow-400/80';
    if (/\b(info|log|debug)\b/i.test(line)) return 'text-white/55';
    if (line.startsWith('>')) return 'text-[#6366f1]/80';
    return 'text-white/45';
  };

  if (!hasBot) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
          <Terminal className="h-4 w-4 text-white/20" />
        </div>
        <p className="text-xs font-mono text-white/25">Deploy a bot to see console output</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b border-white/[0.05]">
        {showSearch && (
          <div className="flex-1 flex items-center gap-2 bg-white/[0.04] rounded-lg px-2.5 py-1.5 border border-white/[0.07]">
            <Search className="h-3 w-3 text-white/30 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs…"
              className="flex-1 bg-transparent text-[11px] font-mono text-white/70 placeholder:text-white/25 focus:outline-none"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-white/25 hover:text-white/50">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {!showSearch && (
          <>
            <button onClick={() => setShowSearch(true)} className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all" title="Search logs">
              <Search className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPaused(!paused)}
              className={`p-1.5 rounded-lg transition-all ${paused ? 'text-yellow-400 bg-yellow-500/10' : 'text-white/25 hover:text-white/60 hover:bg-white/[0.04]'}`}
              title={paused ? 'Resume' : 'Pause'}
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
            <button onClick={handleCopy} className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all" title="Copy logs">
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleDownload} className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all" title="Download logs">
              <Download className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setLog('')} className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all" title="Clear display">
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {showSearch && (
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-1.5 rounded-lg text-white/25 hover:text-white/60 transition-all ml-1">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!log ? (
        <div className="flex-1 flex items-center justify-center gap-2">
          <Loader2 className="h-3.5 w-3.5 text-white/20 animate-spin" />
          <p className="text-xs font-mono text-white/20">Waiting for output…</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5" onScroll={handleScroll}>
          {filteredLog.split('\n').map((line, i) => (
            line ? (
              <div key={i} className={`font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap break-words ${colorLine(line)}`}>
                {line}
              </div>
            ) : (
              <div key={i} className="h-1" />
            )
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {paused && (
        <div className="shrink-0 px-3 py-1.5 bg-yellow-500/[0.06] border-t border-yellow-500/15 flex items-center gap-2">
          <Pause className="h-3 w-3 text-yellow-400/60" />
          <span className="text-[10px] font-mono text-yellow-400/60">Output paused</span>
          <button onClick={() => setPaused(false)} className="ml-auto text-[10px] font-mono text-yellow-400/60 hover:text-yellow-400 transition-colors">Resume</button>
        </div>
      )}
    </div>
  );
}

// ─── AI Agent Panel ──────────────────────────────────────────────────────────
function AIAgent({ botStatus, errorMessage }: { botStatus?: string; errorMessage?: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length > 0) return;
    let greeting = "Hi! I'm Lumora AI. I can help you debug your bot, explain errors, or walk you through fixes. What do you need?";
    if (botStatus === 'crashed' || botStatus === 'error') {
      greeting = "Your bot has crashed. I can see the error logs — ask me what went wrong and I'll walk you through a fix.";
    } else if (botStatus === 'online' || botStatus === 'running') {
      greeting = "Your bot is online. Let me know if you have any questions about your deployment or run into issues.";
    } else if (botStatus === 'stopped') {
      greeting = "Your bot is stopped. Ask me anything about your setup or deployment — I'm here to help.";
    }
    setMessages([{ role: 'assistant', content: greeting }]);
  }, [botStatus]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const r = await fetch(`${BASE}/api/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await r.json() as { content?: string; error?: string; toolResults?: Array<{ tool: string; result: string }> };
      if (!r.ok) throw new Error(data.error || 'Request failed');
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.content ?? '',
        toolResults: data.toolResults?.length ? data.toolResults : undefined,
      }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Sorry, I ran into an issue: ${e?.message || 'Unknown error'}` }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
              {m.role === 'assistant' && (
                <img src="/lumora-brand.png" alt="" className="h-5 w-5 object-contain shrink-0 mt-0.5 mr-2" />
              )}
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-words ${
                m.role === 'user'
                  ? 'bg-[#6366f1]/12 border border-[#6366f1]/20 text-[#a5b4fc]'
                  : 'bg-white/[0.03] border border-white/[0.06] text-white/55'
              }`}>
                {m.content}
              </div>
            </div>
            {m.toolResults && m.toolResults.length > 0 && (
              <div className="ml-7 mt-1 space-y-1">
                {m.toolResults.map((tr, j) => (
                  <div key={j} className="flex items-center gap-1.5 text-[9px] font-mono text-white/25">
                    <span className="text-emerald-500/60">✓</span>
                    <span>{tr.tool === 'write_file' ? 'File written' : tr.tool === 'restart_bot' ? 'Bot restarted' : tr.tool}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <img src="/lumora-brand.png" alt="" className="h-5 w-5 object-contain shrink-0 mt-0.5 mr-2" />
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
              <Loader2 className="h-3 w-3 text-white/25 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/[0.05] p-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your bot…"
            rows={1}
            className="flex-1 resize-none bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 font-mono text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#6366f1]/30 transition-colors leading-relaxed max-h-28 overflow-y-auto"
            style={{ minHeight: '34px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="shrink-0 h-[34px] w-[34px] flex items-center justify-center rounded-xl bg-[#6366f1]/80 hover:bg-[#6366f1] text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[#6366f1]/20"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[9px] font-mono text-white/15 mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

// ─── Sidebar Nav Item ─────────────────────────────────────────────────────────
function BotUptimeCounter({ lastStartedAt, status }: { lastStartedAt: string | null | undefined; status: string }) {
  const [elapsed, setElapsed] = useState(0);
  const isLive = status === 'online' || status === 'running';

  useEffect(() => {
    if (!lastStartedAt || !isLive) { setElapsed(0); return; }
    const startMs = new Date(lastStartedAt).getTime();
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lastStartedAt, isLive]);

  const fmt = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  return (
    <div className="px-5 py-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`h-1 w-1 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
        <div className="text-[9px] font-mono text-white/22 tracking-widest">UPTIME</div>
      </div>
      <div className="font-mono text-xs text-white/60 tabular-nums">
        {isLive && lastStartedAt
          ? `${fmt(h)}:${fmt(m)}:${fmt(s)}`
          : '—'}
      </div>
    </div>
  );
}

function SideNavItem({
  icon: Icon, label, active, onClick, badge,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative ${
        active
          ? 'bg-[#6366f1]/10 border border-[#6366f1]/20 text-white'
          : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
      }`}
    >
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[#6366f1]" />
      )}
      <Icon className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-[#6366f1]' : 'text-white/30 group-hover:text-white/55'}`} />
      <span className="text-xs font-mono font-medium tracking-wide">{label}</span>
      {badge && (
        <span className="ml-auto text-[9px] font-mono text-[#6366f1]/60 bg-[#6366f1]/10 border border-[#6366f1]/15 rounded px-1.5 py-0.5">
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [removingBot, setRemovingBot] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'console' | 'files' | 'secrets' | 'ai'>('overview');

  // Env vars
  const [envEntries, setEnvEntries] = useState<EnvEntry[]>([]);
  const [envLoaded, setEnvLoaded] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);
  const [envDirty, setEnvDirty] = useState(false);

  const { data: session, isLoading, isError, error } = useGetSession({
    query: {
      queryKey: getGetSessionQueryKey(),
      retry: false,
      refetchInterval: (query: any) => {
        const s = (query.state.data as any)?.hostedBot?.status;
        if (s === 'installing' || s === 'starting' || s === 'connecting') return 2000;
        return false;
      },
    },
  });

  const restartBot = useRestartBot();
  const stopBot = useStopBot();

  useEffect(() => {
    if (isError && (error as any)?.status === 401) setLocation('/login');
  }, [isError, error, setLocation]);

  useEffect(() => {
    if (!session || envLoaded) return;
    setEnvLoaded(true);
    fetch(`${BASE}/api/bots/env`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data: any) => {
        const vars: Record<string, string> = data.vars ?? {};
        setEnvEntries(Object.entries(vars).map(([key, value]) => ({ key, value: String(value), hidden: true })));
      })
      .catch(() => {});
  }, [session, envLoaded]);

  useEffect(() => {
    const status = (session as any)?.hostedBot?.status;
    if (status === 'crashed' || status === 'error') setActiveTab('ai');
  }, [(session as any)?.hostedBot?.status]);

  const handleAddEnvRow = () => { setEnvEntries((prev) => [...prev, { key: '', value: '', hidden: false }]); setEnvDirty(true); };
  const handleEnvChange = (i: number, field: 'key' | 'value', val: string) => {
    setEnvEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
    setEnvDirty(true);
  };
  const handleToggleHidden = (i: number) => setEnvEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, hidden: !e.hidden } : e));
  const handleDeleteEnvRow = (i: number) => { setEnvEntries((prev) => prev.filter((_, idx) => idx !== i)); setEnvDirty(true); };

  const handleSaveEnv = async () => {
    const vars: Record<string, string> = {};
    for (const { key, value } of envEntries) {
      if (key.trim()) vars[key.trim()] = value;
    }
    setEnvSaving(true);
    try {
      const r = await fetch(`${BASE}/api/bots/env`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})) as any; throw new Error(d?.error || 'Failed to save'); }
      setEnvDirty(false);
      toast.success('Secrets saved — restart your bot to apply them.');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save secrets');
    } finally { setEnvSaving(false); }
  };

  const handleRestart = () => {
    restartBot.mutate(undefined, {
      onSuccess: () => { toast.success('Restarting bot…'); queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }); },
      onError: (err: any) => toast.error(`Restart failed: ${err?.data?.error || 'Unknown error'}`),
    });
  };

  const handleStop = () => {
    stopBot.mutate(undefined, {
      onSuccess: () => { toast.success('Bot stopped'); queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() }); },
      onError: (err: any) => toast.error(`Stop failed: ${err?.data?.error || 'Unknown error'}`),
    });
  };

  const handleRemoveBot = async () => {
    if (!confirm('Remove this bot? This stops the process and deletes the uploaded files.')) return;
    setRemovingBot(true);
    try {
      const r = await fetch(`${BASE}/api/bots`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) { const d = await r.json().catch(() => ({})) as any; throw new Error(d?.error || 'Failed to remove bot'); }
      toast.success('Bot removed');
      queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove bot');
    } finally { setRemovingBot(false); }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#080810]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
          </div>
          <p className="font-mono text-sm text-white/30 animate-pulse">Loading portal…</p>
        </div>
      </div>
    );
  }

  if (!session || isError) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#080810]">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-400/70" />
          </div>
          <div>
            <p className="font-mono text-sm text-white/50 mb-1">Session expired or not found</p>
            <p className="font-mono text-xs text-white/25">You may need to log in again.</p>
          </div>
          <button
            onClick={() => setLocation('/login')}
            className="mt-2 px-4 py-2 rounded-xl text-xs font-mono text-white/60 border border-white/[0.08] hover:border-white/[0.15] hover:text-white/80 transition-all duration-200"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  const { hostedBot } = session;
  const isProcessing = hostedBot?.status === 'installing' || hostedBot?.status === 'starting' || hostedBot?.status === 'connecting';
  const isBusy = restartBot.isPending || stopBot.isPending || isProcessing || removingBot;
  const canStop = !stopBot.isPending && hostedBot?.status !== 'stopped';

  const expiryStr = (() => {
    try {
      const d = new Date((session as any).expiresAt as string);
      return isNaN(d.getTime()) ? '—' : formatDistanceToNow(d, { addSuffix: true });
    } catch { return '—'; }
  })();

  const sideNavItems: Array<{ id: typeof activeTab; icon: React.ElementType; label: string; badge?: string }> = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'console', icon: Terminal, label: 'Console' },
    { id: 'files', icon: Files, label: 'Files' },
    { id: 'secrets', icon: Key, label: 'Secrets', badge: envEntries.length > 0 ? String(envEntries.length) : undefined },
    { id: 'ai', icon: Zap, label: 'AI Agent' },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-full bg-[#080810] text-[#c8cde8] flex flex-col overflow-hidden animate-page-in">
      {/* Subtle grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.018]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {showCreateModal && (
        <CreateBotModal
          onClose={() => setShowCreateModal(false)}
          onDeployed={() => {
            queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
            setShowCreateModal(false);
          }}
        />
      )}

      {/* ─── Top bar ──────────────────────────────────────────────────────── */}
      <header className="relative shrink-0 flex items-center justify-between h-13 px-5 border-b border-white/[0.06] bg-[#080810]/95 backdrop-blur-xl z-20">
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.25), transparent)' }}
        />
        <div className="flex items-center gap-3">
          <img src="/lumora-brand.png" alt="Lumora" className="h-7 w-7 object-contain" />
          <span className="font-mono font-black text-sm tracking-[0.18em] text-white">LUMORA</span>
          <span className="h-3.5 w-px bg-white/[0.08] mx-1" />
          <span className="text-xs font-mono text-white/25 hidden sm:block">Control Room</span>
          <button
            onClick={() => setLocation('/')}
            className="hidden sm:flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-lg border border-white/[0.06] text-[11px] font-mono text-white/22 hover:text-white/50 hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-200"
          >
            ← Home
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-white/22 border border-white/[0.05] rounded-lg px-2.5 py-1">
            <Clock className="h-3 w-3" />
            <span>Expires {expiryStr}</span>
          </div>
          <ProfileDropdown session={session} />
        </div>
      </header>

      {/* ─── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─── Left Sidebar ──────────────────────────────────────────────── */}
        <aside className="hidden md:flex w-52 shrink-0 flex-col border-r border-white/[0.06] bg-[#09091a] py-4 px-2 gap-1">
          {/* Bot status pill in sidebar */}
          {hostedBot && (
            <div className="mb-3 px-2">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <div className="flex items-center gap-2 mb-0.5">
                  <Activity className="h-3 w-3 text-white/25 shrink-0" />
                  <span className="font-mono text-[10px] text-white/30 tracking-wider truncate">{hostedBot.fileName || 'No bot'}</span>
                </div>
                <StatusBadge status={hostedBot.status} />
              </div>
            </div>
          )}

          {sideNavItems.map(({ id, icon, label, badge }) => (
            <SideNavItem
              key={id}
              icon={icon}
              label={label}
              active={activeTab === id}
              onClick={() => setActiveTab(id)}
              badge={badge}
            />
          ))}

          {/* Bottom actions */}
          <div className="mt-auto pt-4 border-t border-white/[0.05] space-y-1 px-1">
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={isBusy}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-mono text-white/40 hover:text-white/70 hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Upload className="h-3.5 w-3.5 shrink-0" />
              {hostedBot ? 'Replace Bot' : 'Deploy Bot'}
            </button>
          </div>
        </aside>

        {/* ─── Main content ──────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">

            {/* ── Overview Tab ─────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {/* Bot card or deploy prompt */}
                {hostedBot && hostedBot.fileName ? (
                  <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d1a] overflow-hidden">
                    {/* Top accent */}
                    <div className="h-px w-full"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)' }}
                    />
                    {/* Bot header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
                      <div className="flex items-center gap-3.5">
                        <div className="h-10 w-10 rounded-xl border border-[#6366f1]/20 bg-[#6366f1]/[0.08] flex items-center justify-center shrink-0">
                          <Activity className="h-4.5 w-4.5 text-[#6366f1]/60" />
                        </div>
                        <div>
                          <div className="font-mono font-bold text-sm text-white/90">{hostedBot.fileName}</div>
                          <div className="text-[11px] text-white/28 mt-0.5 font-mono">
                            {hostedBot.lastStartedAt
                              ? `Started ${formatDistanceToNow(new Date(hostedBot.lastStartedAt), { addSuffix: true })}`
                              : 'Not started yet'}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={hostedBot.status} />
                        {(hostedBot as any).botName && (hostedBot.status === 'online' || hostedBot.status === 'running') && (
                          <span className="text-[9px] font-mono text-emerald-400/50 whitespace-nowrap">
                            {(hostedBot as any).botName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stat cards */}
                    <div className="grid grid-cols-3 divide-x divide-white/[0.04] border-b border-white/[0.04]">
                      <BotUptimeCounter lastStartedAt={hostedBot.lastStartedAt} status={hostedBot.status} />
                      {[
                        { label: 'Restarts', value: String(hostedBot.restartCount) },
                        { label: 'Command', value: hostedBot.startCommand || '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="px-5 py-3.5">
                          <div className="text-[9px] font-mono text-white/22 tracking-widest mb-1.5">{label.toUpperCase()}</div>
                          <div className="font-mono text-xs text-white/60 truncate" title={value}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Deployment stages */}
                    {(isProcessing || hostedBot.status === 'online' || hostedBot.status === 'running' || hostedBot.status === 'login_failed') && (
                      <DeploymentStages status={hostedBot.status} botName={(hostedBot as any).botName} />
                    )}

                    {/* Processing message */}
                    {isProcessing && hostedBot.errorMessage && (
                      <div className="px-5 py-2.5 border-b border-blue-500/10 flex items-center gap-2.5 bg-blue-500/[0.04]">
                        <Loader2 className="h-3 w-3 text-blue-400 animate-spin shrink-0" />
                        <span className="text-xs font-mono text-blue-400/80 truncate">{hostedBot.errorMessage}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="px-5 py-3.5 flex flex-wrap items-center gap-2">
                      {hostedBot.status === 'stopped' ? (
                        <button
                          onClick={handleRestart}
                          disabled={restartBot.isPending || stopBot.isPending || removingBot}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-emerald-500/30 text-xs font-mono text-emerald-400/80 hover:text-emerald-300 hover:border-emerald-400/50 hover:bg-emerald-500/[0.08] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Play className={`h-3.5 w-3.5 ${restartBot.isPending ? 'animate-pulse' : ''}`} />
                          {restartBot.isPending ? 'Starting…' : 'Run'}
                        </button>
                      ) : (
                        <button
                          onClick={handleRestart}
                          disabled={isBusy}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-white/[0.07] text-xs font-mono text-white/45 hover:text-white/75 hover:border-white/[0.14] hover:bg-white/[0.03] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <RotateCw className={`h-3.5 w-3.5 ${restartBot.isPending ? 'animate-spin' : ''}`} />
                          {restartBot.isPending ? 'Restarting…' : 'Restart'}
                        </button>
                      )}
                      <button
                        onClick={handleStop}
                        disabled={!canStop}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-white/[0.07] text-xs font-mono text-white/45 hover:text-white/75 hover:border-white/[0.14] hover:bg-white/[0.03] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <PowerOff className="h-3.5 w-3.5" />
                        {stopBot.isPending ? 'Stopping…' : 'Stop'}
                      </button>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-white/[0.07] text-xs font-mono text-white/45 hover:text-white/75 hover:border-white/[0.14] hover:bg-white/[0.03] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Replace
                      </button>
                      <button
                        onClick={handleRemoveBot}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-500/15 text-xs font-mono text-red-400/45 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/[0.05] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {removingBot ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="rounded-2xl border-2 border-dashed border-white/[0.06] hover:border-[#6366f1]/30 transition-all duration-300 p-14 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#6366f1]/[0.02] group"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <div className="h-14 w-14 rounded-2xl border border-white/[0.07] bg-white/[0.02] group-hover:bg-[#6366f1]/[0.08] group-hover:border-[#6366f1]/20 flex items-center justify-center mb-4 transition-all duration-300">
                      <Plus className="h-6 w-6 text-white/20 group-hover:text-[#6366f1]/60 transition-colors duration-300" />
                    </div>
                    <h3 className="font-mono font-bold text-sm text-white/40 mb-1.5">No bot deployed</h3>
                    <p className="text-xs text-white/22 font-mono">Click to deploy — ZIP upload or GitHub import</p>
                  </div>
                )}

                {/* AI repair notice */}
                {hostedBot && (hostedBot as any).repairAttempts > 0 && (hostedBot.status === 'crashed' || hostedBot.status === 'error') && (
                  <div className="rounded-xl border border-[#6366f1]/15 bg-[#6366f1]/[0.05] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-3.5 w-3.5 text-[#6366f1]" />
                      <span className="font-mono text-xs text-white/55 font-bold tracking-wider">AI AUTO-REPAIR</span>
                      <span className="ml-auto font-mono text-[10px] text-white/25 border border-white/[0.06] rounded-md px-1.5 py-0.5">
                        {(hostedBot as any).repairAttempts}/3 attempts
                      </span>
                    </div>
                    <p className="text-xs text-white/35 leading-relaxed font-mono">
                      Lumora's AI attempted to fix your bot automatically. Check the AI panel for details.
                    </p>
                  </div>
                )}

                {/* AI explanation */}
                {hostedBot?.aiExplanation && (
                  <div className="rounded-xl border border-white/[0.06] bg-[#0d0d1a] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Bot className="h-3.5 w-3.5 text-white/25" />
                      <span className="font-mono text-xs text-white/45 font-bold tracking-wider">AI DIAGNOSTIC</span>
                    </div>
                    <p className="text-xs text-white/45 leading-relaxed border-l-2 border-[#6366f1]/20 pl-3 font-mono">
                      {hostedBot.aiExplanation}
                    </p>
                  </div>
                )}

                {/* Crash log */}
                {hostedBot?.errorMessage && !isProcessing && (
                  <div className="rounded-xl border border-red-500/12 bg-red-500/[0.03] overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-500/[0.03] transition-colors"
                      onClick={() => setShowLogs(!showLogs)}
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-400/50" />
                        <span className="font-mono text-xs text-red-400/70 font-bold tracking-wider">CRASH LOG</span>
                      </div>
                      {showLogs ? <ChevronUp className="h-3.5 w-3.5 text-red-400/30" /> : <ChevronDown className="h-3.5 w-3.5 text-red-400/30" />}
                    </button>
                    {showLogs && (
                      <div className="px-4 pb-4">
                        <pre className="text-[10px] font-mono text-red-300/50 bg-[#0a0a12] rounded-xl p-3 overflow-x-auto max-h-48 border border-red-500/[0.08] whitespace-pre-wrap">
                          {hostedBot.errorMessage}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* AI repair history */}
                {(() => {
                  let entries: Array<{ timestamp: string; action: string; description: string }> = [];
                  try { entries = JSON.parse((hostedBot as any)?.repairLog ?? '[]'); } catch { entries = []; }
                  if (entries.length === 0) return null;
                  return (
                    <div className="rounded-xl border border-white/[0.06] bg-[#0d0d1a] overflow-hidden">
                      <div className="px-5 py-3 border-b border-white/[0.05] flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-[#6366f1]/60" />
                        <span className="font-mono text-xs text-white/45 font-bold tracking-wider">AI REPAIR HISTORY</span>
                        <span className="ml-auto font-mono text-[10px] text-white/25 border border-white/[0.06] rounded-md px-1.5 py-0.5">
                          {entries.length} action{entries.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="divide-y divide-white/[0.04]">
                        {entries.slice(-8).reverse().map((e, i) => (
                          <div key={i} className="px-5 py-2.5 flex items-start gap-2.5">
                            <span className="text-emerald-500/50 text-[10px] mt-0.5 shrink-0">✓</span>
                            <div className="min-w-0 flex-1">
                              <span className="font-mono text-[10px] text-white/50 block truncate">{e.description}</span>
                              <span className="font-mono text-[9px] text-white/20">
                                {(() => { try { return new Date(e.timestamp).toLocaleString(); } catch { return e.timestamp; } })()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Empty state */}
                {!hostedBot?.errorMessage && !hostedBot?.aiExplanation && !(hostedBot && (hostedBot as any).repairAttempts > 0) && (() => {
                  let entries: Array<unknown> = [];
                  try { entries = JSON.parse((hostedBot as any)?.repairLog ?? '[]'); } catch { entries = []; }
                  return entries.length === 0;
                })() && hostedBot && (
                  <div className="rounded-xl border border-white/[0.05] bg-[#0d0d1a] px-5 py-8 flex flex-col items-center text-center">
                    <Activity className="h-7 w-7 text-white/[0.08] mb-3" />
                    <p className="font-mono text-xs text-white/20 tracking-wider">Bot is running — no issues to report.</p>
                  </div>
                )}

                {/* Plan info */}
                <div className="rounded-xl border border-white/[0.05] bg-[#0d0d1a] px-4 py-3.5">
                  <p className="font-mono text-[9px] text-white/20 tracking-[0.25em] mb-3">PLAN DETAILS</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { k: 'Runtime', v: 'Python · Node.js · Java' },
                      { k: 'Network', v: 'Isolated' },
                      { k: 'Storage', v: 'Persistent' },
                      { k: 'Duration', v: (session as any).hostingDurationDays != null ? `${(session as any).hostingDurationDays}d` : '—' },
                    ].map(({ k, v }) => (
                      <div key={k}>
                        <div className="text-[9px] font-mono text-white/20 mb-0.5 tracking-widest">{k.toUpperCase()}</div>
                        <div className="text-xs font-mono text-white/50">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Console Tab ──────────────────────────────────────────── */}
            {activeTab === 'console' && (
              <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a14] overflow-hidden flex flex-col" style={{ minHeight: '500px' }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.015] shrink-0">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500/40" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/40" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/40" />
                  </div>
                  <span className="ml-2 text-[11px] font-mono text-white/25 tracking-wider">bot — stdout</span>
                  {hostedBot && (
                    <div className="ml-auto flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${hostedBot.status === 'online' || hostedBot.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                      <StatusBadge status={hostedBot.status} />
                    </div>
                  )}
                </div>
                <LiveConsole hasBot={!!(hostedBot && hostedBot.fileName)} />
              </div>
            )}

            {/* ── Files Tab ────────────────────────────────────────────── */}
            {activeTab === 'files' && (
              <FileManager hasBot={!!hostedBot} />
            )}

            {/* ── Secrets Tab ──────────────────────────────────────────── */}
            {activeTab === 'secrets' && (
              <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d1a] overflow-hidden">
                <div className="h-px w-full"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)' }}
                />
                <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xs text-white/60 font-bold tracking-[0.15em]">ENVIRONMENT SECRETS</div>
                    <div className="text-[11px] text-white/25 font-mono mt-0.5">Injected at startup — restart to apply</div>
                  </div>
                  {envDirty && <span className="text-[10px] font-mono text-yellow-400/60 bg-yellow-500/[0.08] border border-yellow-500/15 rounded-md px-2 py-0.5">Unsaved changes</span>}
                </div>

                <div className="p-5 space-y-4">
                  <p className="text-xs text-white/28 font-mono leading-relaxed">
                    Add keys like <span className="text-white/50">DISCORD_TOKEN</span> or <span className="text-white/50">MONGODB_URI</span>. Save, then restart to apply.
                  </p>

                  {envEntries.length > 0 && (
                    <div className="space-y-2">
                      {envEntries.map((entry, i) => (
                        <div key={i} className="flex gap-2 items-center group">
                          <input
                            type="text"
                            placeholder="KEY"
                            value={entry.key}
                            onChange={(e) => handleEnvChange(i, 'key', e.target.value)}
                            className="flex-[0_0_36%] bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 font-mono text-xs text-white/65 placeholder:text-white/18 focus:outline-none focus:border-[#6366f1]/30 transition-colors uppercase"
                            spellCheck={false}
                          />
                          <div className="flex-1 relative">
                            <input
                              type={entry.hidden ? 'password' : 'text'}
                              placeholder="value"
                              value={entry.value}
                              onChange={(e) => handleEnvChange(i, 'value', e.target.value)}
                              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 pr-8 font-mono text-xs text-white/65 placeholder:text-white/18 focus:outline-none focus:border-[#6366f1]/30 transition-colors"
                              spellCheck={false}
                            />
                            <button
                              type="button"
                              onClick={() => handleToggleHidden(i)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/18 hover:text-white/45 transition-colors"
                            >
                              {entry.hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteEnvRow(i)}
                            className="text-white/15 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {envEntries.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/[0.06] p-10 text-center">
                      <Key className="h-6 w-6 text-white/10 mx-auto mb-2" />
                      <p className="text-[11px] font-mono text-white/20">No secrets added yet.</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleAddEnvRow}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-white/[0.07] text-xs font-mono text-white/35 hover:text-white/65 hover:border-white/[0.14] transition-all duration-200"
                    >
                      <Plus className="h-3 w-3" />
                      Add Secret
                    </button>
                    <button
                      onClick={handleSaveEnv}
                      disabled={envSaving || !envDirty}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#6366f1]/25 text-xs font-mono text-[#6366f1]/70 hover:text-[#6366f1] hover:border-[#6366f1]/45 hover:bg-[#6366f1]/[0.05] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {envSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      {envSaving ? 'Saving…' : 'Save Secrets'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── AI Agent Tab ─────────────────────────────────────────── */}
            {activeTab === 'ai' && (
              <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d1a] overflow-hidden flex flex-col" style={{ minHeight: '500px' }}>
                <div className="shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.05]">
                  <div className="h-8 w-8 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-[#6366f1]/70" />
                  </div>
                  <div>
                    <div className="font-mono text-xs text-white/65 font-bold tracking-wider">LUMORA AI AGENT</div>
                    <div className="text-[10px] font-mono text-white/25">Debugging & diagnostics assistant</div>
                  </div>
                  {(hostedBot?.status === 'crashed' || hostedBot?.status === 'error') && (
                    <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-500/20 bg-red-500/[0.06]">
                      <AlertTriangle className="h-3 w-3 text-red-400/70" />
                      <span className="text-[10px] font-mono text-red-400/70">Bot crashed</span>
                    </div>
                  )}
                </div>
                <AIAgent botStatus={hostedBot?.status} errorMessage={hostedBot?.errorMessage} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ─── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav className="md:hidden shrink-0 border-t border-white/[0.06] bg-[#09091a] flex items-center">
        {sideNavItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              activeTab === id ? 'text-[#6366f1]' : 'text-white/25 hover:text-white/50'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-[9px] font-mono tracking-wide">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
