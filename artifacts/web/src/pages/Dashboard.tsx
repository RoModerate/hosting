import { useEffect, useRef, useState } from 'react';
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
  Terminal,
  RotateCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  XCircle,
  Loader2,
  Key,
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Files,
  PowerOff,
  Upload,
  Clock,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import FileManager from '@/components/FileManager';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

type EnvEntry = { key: string; value: string; hidden: boolean };

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; dot: string; text: string; border: string; bg: string }> = {
  online:        { label: 'Online',      dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.06]' },
  running:       { label: 'Online',      dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.06]' },
  connecting:    { label: 'Connecting',  dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'bg-yellow-500/[0.06]' },
  login_failed:  { label: 'Login failed',dot: 'bg-orange-400', text: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/[0.06]' },
  crashed:       { label: 'Crashed',     dot: 'bg-red-400', text: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/[0.06]' },
  error:         { label: 'Error',       dot: 'bg-red-400', text: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/[0.06]' },
  installing:    { label: 'Installing',  dot: 'bg-blue-400 animate-pulse', text: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/[0.06]' },
  starting:      { label: 'Starting',    dot: 'bg-blue-400 animate-pulse', text: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/[0.06]' },
  stopped:       { label: 'Offline',     dot: 'bg-white/20', text: 'text-white/30', border: 'border-white/[0.07]', bg: 'bg-white/[0.02]' },
};

function getStatus(status: string) {
  return STATUS_META[status] ?? STATUS_META.stopped;
}

// ─── StatusBadge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = getStatus(status);
  const spinning = status === 'installing' || status === 'starting' || status === 'connecting';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-semibold ${s.text} ${s.border} ${s.bg}`}>
      {spinning
        ? <Loader2 className="h-3 w-3 animate-spin" />
        : <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      }
      {s.label}
    </span>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [removingBot, setRemovingBot] = useState(false);

  // Env vars
  const [envEntries, setEnvEntries] = useState<EnvEntry[]>([]);
  const [envLoaded, setEnvLoaded] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);
  const [envDirty, setEnvDirty] = useState(false);

  const { data: session, isLoading, isError, error } = useGetSession({
    query: {
      queryKey: getGetSessionQueryKey(),
      retry: false,
      refetchInterval: (query) => {
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
        setEnvEntries(
          Object.entries(vars).map(([key, value]) => ({ key, value: String(value), hidden: true }))
        );
      })
      .catch(() => {});
  }, [session, envLoaded]);

  const handleAddEnvRow = () => {
    setEnvEntries((prev) => [...prev, { key: '', value: '', hidden: false }]);
    setEnvDirty(true);
  };

  const handleEnvChange = (i: number, field: 'key' | 'value', val: string) => {
    setEnvEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
    setEnvDirty(true);
  };

  const handleToggleHidden = (i: number) => {
    setEnvEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, hidden: !e.hidden } : e));
  };

  const handleDeleteEnvRow = (i: number) => {
    setEnvEntries((prev) => prev.filter((_, idx) => idx !== i));
    setEnvDirty(true);
  };

  const handleSaveEnv = async () => {
    const vars: Record<string, string> = {};
    for (const { key, value } of envEntries) {
      if (key.trim()) vars[key.trim()] = value;
    }
    setEnvSaving(true);
    try {
      const r = await fetch(`${BASE}/api/bots/env`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({})) as any;
        throw new Error(d?.error || 'Failed to save');
      }
      setEnvDirty(false);
      toast.success('Secrets saved — restart your bot to apply them.');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save secrets');
    } finally {
      setEnvSaving(false);
    }
  };

  const handleRestart = () => {
    restartBot.mutate(undefined, {
      onSuccess: () => {
        toast.success('Restarting bot…');
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
      },
      onError: (err: any) => toast.error(`Restart failed: ${err?.data?.error || 'Unknown error'}`),
    });
  };

  const handleStop = () => {
    stopBot.mutate(undefined, {
      onSuccess: () => {
        toast.success('Bot stopped');
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
      },
      onError: (err: any) => toast.error(`Stop failed: ${err?.data?.error || 'Unknown error'}`),
    });
  };

  const handleRemoveBot = async () => {
    if (!confirm('Remove this bot? This stops the process and deletes the uploaded files. You can deploy a new bot afterwards.')) return;
    setRemovingBot(true);
    try {
      const r = await fetch(`${BASE}/api/bots`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) {
        const d = await r.json().catch(() => ({})) as any;
        throw new Error(d?.error || 'Failed to remove bot');
      }
      toast.success('Bot removed');
      queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove bot');
    } finally {
      setRemovingBot(false);
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0b0b0f]">
        <div className="flex items-center gap-3 font-mono text-sm text-white/30">
          <Loader2 className="h-4 w-4 animate-spin text-[#5c6cf5]" />
          <span className="animate-pulse tracking-widest">Initializing session…</span>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const { hostedBot } = session;
  const isProcessing = hostedBot?.status === 'installing' || hostedBot?.status === 'starting' || hostedBot?.status === 'connecting';
  const isBusy = restartBot.isPending || stopBot.isPending || isProcessing || removingBot;

  const expiryStr = (() => {
    try {
      const d = new Date(session.expiresAt as unknown as string);
      return isNaN(d.getTime()) ? '—' : formatDistanceToNow(d, { addSuffix: true });
    } catch { return '—'; }
  })();

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-[#0b0b0f] text-[#c8c8d8]">

      {/* Modal */}
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
      <header className="sticky top-0 z-20 flex items-center justify-between h-13 px-6 border-b border-white/[0.06] bg-[#0b0b0f]/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Zap className="h-4 w-4 text-[#5c6cf5]" />
          <span className="font-mono font-bold text-sm tracking-[0.18em] text-white">LUMORA</span>
          <span className="text-white/15 mx-1">·</span>
          <span className="text-xs font-mono text-white/35">@{session.ownerUsername}</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-white/30">
          <span>TICKET-{session.ticketId}</span>
          <span className="h-3.5 w-px bg-white/[0.08]" />
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Expires {expiryStr}
          </span>
        </div>
      </header>

      {/* ─── Main content ─────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-5">

        {/* Bot panel */}
        {hostedBot && hostedBot.fileName ? (
          <div className="rounded-xl border border-white/[0.07] bg-[#111116]">
            {/* Bot header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-lg border border-white/[0.07] bg-white/[0.03] flex items-center justify-center shrink-0">
                  <Activity className="h-4 w-4 text-white/30" />
                </div>
                <div>
                  <div className="font-mono font-semibold text-sm text-white/85">{hostedBot.fileName}</div>
                  <div className="text-[11px] text-white/30 mt-0.5">
                    {hostedBot.lastStartedAt
                      ? `Started ${formatDistanceToNow(new Date(hostedBot.lastStartedAt), { addSuffix: true })}`
                      : 'Not started yet'}
                  </div>
                </div>
              </div>
              <StatusBadge status={hostedBot.status} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 divide-x divide-white/[0.05] border-b border-white/[0.05]">
              {[
                { label: 'Restarts', value: String(hostedBot.restartCount) },
                { label: 'Started', value: hostedBot.lastStartedAt ? formatDistanceToNow(new Date(hostedBot.lastStartedAt), { addSuffix: true }) : '—' },
                { label: 'Command', value: hostedBot.startCommand || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="px-6 py-4">
                  <div className="text-[10px] font-mono text-white/25 tracking-wider mb-1">{label.toUpperCase()}</div>
                  <div className="font-mono text-sm text-white/70 truncate" title={value}>{value}</div>
                </div>
              ))}
            </div>

            {/* Processing indicator */}
            {isProcessing && (
              <div className="px-6 py-3 border-b border-white/[0.05] flex items-center gap-3 bg-blue-500/[0.04]">
                <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin shrink-0" />
                <span className="text-xs font-mono text-blue-400">
                  {hostedBot.status === 'installing' ? 'Installing dependencies…' : hostedBot.status === 'starting' ? 'Starting bot…' : 'Connecting…'}
                </span>
                <span className="text-xs text-white/25 font-mono">This may take a minute</span>
              </div>
            )}

            {/* Actions */}
            <div className="px-6 py-4 flex flex-wrap items-center gap-2">
              <button
                onClick={handleRestart}
                disabled={isBusy}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-white/[0.09] text-xs font-mono text-white/50 hover:text-white/80 hover:border-white/[0.15] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <RotateCw className={`h-3.5 w-3.5 ${restartBot.isPending ? 'animate-spin' : ''}`} />
                {restartBot.isPending ? 'Restarting…' : 'Restart'}
              </button>
              <button
                onClick={handleStop}
                disabled={isBusy || hostedBot.status === 'stopped'}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-white/[0.09] text-xs font-mono text-white/50 hover:text-white/80 hover:border-white/[0.15] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <PowerOff className="h-3.5 w-3.5" />
                {stopBot.isPending ? 'Stopping…' : 'Stop'}
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={isBusy}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-white/[0.09] text-xs font-mono text-white/50 hover:text-white/80 hover:border-white/[0.15] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Upload className="h-3.5 w-3.5" />
                Replace Bot
              </button>
              <button
                onClick={handleRemoveBot}
                disabled={isBusy}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-red-500/20 text-xs font-mono text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {removingBot ? 'Removing…' : 'Remove Bot'}
              </button>
            </div>
          </div>
        ) : (
          /* No bot state */
          <div
            className="rounded-xl border-2 border-dashed border-white/[0.07] hover:border-[#5c6cf5]/30 transition-colors p-12 flex flex-col items-center justify-center text-center cursor-pointer"
            onClick={() => setShowCreateModal(true)}
          >
            <div className="h-12 w-12 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center mb-4">
              <Plus className="h-5 w-5 text-white/20" />
            </div>
            <h3 className="font-mono font-semibold text-sm text-white/50 mb-1">No bot deployed</h3>
            <p className="text-xs text-white/25 font-mono">Click to deploy your first bot — ZIP upload or GitHub import</p>
          </div>
        )}

        {/* ─── Tabs ───────────────────────────────────────────────────────── */}
        <Tabs defaultValue="overview" className="space-y-5">
          <TabsList className="h-9 bg-white/[0.03] border border-white/[0.07] gap-0.5 p-1">
            <TabsTrigger
              value="overview"
              className="text-[11px] font-mono tracking-wider h-7 px-4 text-white/35 data-[state=active]:bg-white/[0.07] data-[state=active]:text-white/80 data-[state=active]:shadow-none rounded"
            >
              OVERVIEW
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="text-[11px] font-mono tracking-wider h-7 px-4 text-white/35 data-[state=active]:bg-white/[0.07] data-[state=active]:text-white/80 data-[state=active]:shadow-none rounded flex items-center gap-1.5"
            >
              <Files className="h-3 w-3" /> FILES
            </TabsTrigger>
            <TabsTrigger
              value="secrets"
              className="text-[11px] font-mono tracking-wider h-7 px-4 text-white/35 data-[state=active]:bg-white/[0.07] data-[state=active]:text-white/80 data-[state=active]:shadow-none rounded flex items-center gap-1.5"
            >
              <Key className="h-3 w-3" /> SECRETS
            </TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="mt-0 space-y-4">

            {/* AI repair notice */}
            {hostedBot && (hostedBot as any).repairAttempts > 0 && (hostedBot.status === 'crashed' || hostedBot.status === 'error') && (
              <div className="rounded-xl border border-white/[0.07] bg-[#111116] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-3.5 w-3.5 text-[#5c6cf5]" />
                  <span className="font-mono text-xs text-white/60 font-semibold tracking-wider">AI AUTO-REPAIR</span>
                  <span className="ml-auto font-mono text-[10px] text-white/30 border border-white/[0.07] rounded px-1.5 py-0.5">
                    {(hostedBot as any).repairAttempts}/3 attempts
                  </span>
                </div>
                <p className="text-xs text-white/40 leading-relaxed font-mono">
                  Lumora's AI repair system attempted to fix your bot automatically. Check the crash logs, verify your secrets, then re-upload if needed.
                </p>
              </div>
            )}

            {/* AI diagnostic */}
            {hostedBot?.aiExplanation && (
              <div className="rounded-xl border border-white/[0.07] bg-[#111116] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="h-3.5 w-3.5 text-white/35" />
                  <span className="font-mono text-xs text-white/50 font-semibold tracking-wider">AI DIAGNOSTIC</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed border-l-2 border-white/[0.08] pl-3 font-mono">
                  {hostedBot.aiExplanation}
                </p>
              </div>
            )}

            {/* Crash logs */}
            {hostedBot?.errorMessage && (
              <div className="rounded-xl border border-red-500/15 bg-red-500/[0.04] overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-red-500/[0.04] transition-colors"
                  onClick={() => setShowLogs(!showLogs)}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400/60" />
                    <span className="font-mono text-xs text-red-400/80 font-semibold tracking-wider">CRASH LOG</span>
                  </div>
                  {showLogs ? <ChevronUp className="h-4 w-4 text-red-400/40" /> : <ChevronDown className="h-4 w-4 text-red-400/40" />}
                </button>
                {showLogs && (
                  <div className="px-5 pb-4">
                    <pre className="text-[10px] font-mono text-red-300/60 bg-[#0e0e13] rounded-lg p-3 overflow-x-auto max-h-52 border border-red-500/10 whitespace-pre-wrap">
                      {hostedBot.errorMessage}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Empty state for overview */}
            {!hostedBot?.errorMessage && !hostedBot?.aiExplanation && !(hostedBot && (hostedBot as any).repairAttempts > 0) && (
              <div className="rounded-xl border border-white/[0.06] bg-[#111116] px-6 py-10 flex flex-col items-center text-center">
                <Activity className="h-8 w-8 text-white/10 mb-3" />
                <p className="font-mono text-xs text-white/25 tracking-wider">
                  {hostedBot ? 'Bot is running — no issues to report.' : 'No bot deployed yet. Deploy one above to get started.'}
                </p>
              </div>
            )}

            {/* Plan info */}
            <div className="rounded-xl border border-white/[0.06] bg-[#111116] px-5 py-4">
              <p className="font-mono text-[10px] text-white/25 tracking-widest mb-3">PLAN</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { k: 'Runtime', v: 'Python · Node.js · Java' },
                  { k: 'Network', v: 'Isolated' },
                  { k: 'Storage', v: 'Persistent' },
                  { k: 'Duration', v: `${session.hostingDurationDays}d` },
                ].map(({ k, v }) => (
                  <div key={k}>
                    <div className="text-[10px] font-mono text-white/25 mb-0.5">{k}</div>
                    <div className="text-xs font-mono text-white/55">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── Files ── */}
          <TabsContent value="files" className="mt-0">
            <FileManager hasBot={!!hostedBot} />
          </TabsContent>

          {/* ── Secrets ── */}
          <TabsContent value="secrets" className="mt-0">
            <div className="rounded-xl border border-white/[0.07] bg-[#111116] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs text-white/60 font-semibold tracking-wider">ENVIRONMENT SECRETS</div>
                  <div className="text-[11px] text-white/25 font-mono mt-0.5">Injected into your bot's process at startup</div>
                </div>
                {envDirty && <span className="text-[10px] font-mono text-yellow-400/70">Unsaved changes</span>}
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-white/35 font-mono leading-relaxed">
                  Add keys like <span className="text-white/55">DISCORD_TOKEN</span> or <span className="text-white/55">MONGODB_URI</span>. Save changes, then restart your bot to apply them.
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
                          className="flex-[0_0_36%] bg-[#0e0e13] border border-white/[0.08] rounded-md px-3 py-2 font-mono text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#5c6cf5]/40 transition-colors uppercase"
                          spellCheck={false}
                        />
                        <div className="flex-1 relative">
                          <input
                            type={entry.hidden ? 'password' : 'text'}
                            placeholder="value"
                            value={entry.value}
                            onChange={(e) => handleEnvChange(i, 'value', e.target.value)}
                            className="w-full bg-[#0e0e13] border border-white/[0.08] rounded-md px-3 py-2 pr-8 font-mono text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#5c6cf5]/40 transition-colors"
                            spellCheck={false}
                          />
                          <button
                            type="button"
                            onClick={() => handleToggleHidden(i)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
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
                  <div className="rounded-lg border border-dashed border-white/[0.07] p-6 text-center">
                    <p className="text-[11px] font-mono text-white/25">No secrets added yet.</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddEnvRow}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-white/[0.09] text-xs font-mono text-white/40 hover:text-white/70 hover:border-white/[0.15] transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add Secret
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEnv}
                    disabled={envSaving || !envDirty}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-[#5c6cf5]/30 text-xs font-mono text-[#5c6cf5]/80 hover:text-[#5c6cf5] hover:border-[#5c6cf5]/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {envSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    {envSaving ? 'Saving…' : 'Save Secrets'}
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
