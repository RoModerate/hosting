import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetSession,
  getGetSessionQueryKey,
  useUploadBot,
  useRestartBot,
} from '@workspace/api-client-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Terminal,
  UploadCloud,
  RotateCw,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  Key,
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Files,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import FileManager from '@/components/FileManager';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

type UploadOutcome = {
  status: 'running' | 'crashed' | 'error';
  message: string;
  detail?: string | null;
  startCommand?: string | null;
  aiExplanation?: string | null;
} | null;

type EnvEntry = { key: string; value: string; hidden: boolean };

const STATUS_META: Record<string, { label: string; color: string; glow: string; icon: React.ReactNode }> = {
  running: {
    label: 'RUNNING',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    glow: '0 0 12px rgba(52,211,153,0.4)',
    icon: <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" /></span>,
  },
  crashed: {
    label: 'CRASHED',
    color: 'text-red-400 border-red-500/30 bg-red-500/10',
    glow: '0 0 12px rgba(248,113,113,0.3)',
    icon: <XCircle className="h-3 w-3 text-red-400" />,
  },
  error: {
    label: 'ERROR',
    color: 'text-red-400 border-red-500/30 bg-red-500/10',
    glow: '0 0 12px rgba(248,113,113,0.3)',
    icon: <AlertTriangle className="h-3 w-3 text-red-400" />,
  },
  installing: {
    label: 'INSTALLING',
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    glow: '0 0 12px rgba(96,165,250,0.3)',
    icon: <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />,
  },
  starting: {
    label: 'STARTING',
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    glow: '0 0 12px rgba(96,165,250,0.3)',
    icon: <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />,
  },
  stopped: {
    label: 'STOPPED',
    color: 'text-muted-foreground border-border bg-muted/30',
    glow: 'none',
    icon: <span className="h-2 w-2 rounded-full bg-muted-foreground" />,
  },
};

function getStatusMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.stopped;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [uploadOutcome, setUploadOutcome] = useState<UploadOutcome>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Env vars state
  const [envEntries, setEnvEntries] = useState<EnvEntry[]>([]);
  const [envLoaded, setEnvLoaded] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);
  const [envDirty, setEnvDirty] = useState(false);

  const isUploadingRef = useRef(false);
  const botStatus = useRef<string | undefined>(undefined);

  const { data: session, isLoading, isError, error } = useGetSession({
    query: {
      queryKey: getGetSessionQueryKey(),
      retry: false,
      refetchInterval: (query) => {
        const s = (query.state.data as any)?.hostedBot?.status;
        if (isUploadingRef.current || s === 'installing' || s === 'starting') return 2000;
        return false;
      },
    },
  });

  const uploadBot = useUploadBot();
  const restartBot = useRestartBot();

  useEffect(() => {
    if (isError && (error as any)?.status === 401) {
      setLocation('/');
    }
  }, [isError, error, setLocation]);

  useEffect(() => {
    const current = session?.hostedBot?.status;
    if (botStatus.current && botStatus.current !== current && current !== 'installing' && current !== 'starting') {
      botStatus.current = current;
    } else {
      botStatus.current = current;
    }
  }, [session?.hostedBot?.status]);

  useEffect(() => {
    const status = session?.hostedBot?.status;
    if (!isUploadingRef.current) return;
    if (!status || status === 'installing' || status === 'starting') return;
    isUploadingRef.current = false;
    setIsUploading(false);
    if (status === 'running') {
      toast.success('Bot is live and running!');
    } else {
      toast.error(status === 'crashed' ? 'Bot crashed on startup — check the error logs below.' : 'Deployment failed — check the error logs below.');
    }
  }, [session?.hostedBot?.status]);

  // Load env vars once we have a session
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

  const handleEnvChange = (index: number, field: 'key' | 'value', val: string) => {
    setEnvEntries((prev) => prev.map((e, i) => i === index ? { ...e, [field]: val } : e));
    setEnvDirty(true);
  };

  const handleToggleHidden = (index: number) => {
    setEnvEntries((prev) => prev.map((e, i) => i === index ? { ...e, hidden: !e.hidden } : e));
  };

  const handleDeleteEnvRow = (index: number) => {
    setEnvEntries((prev) => prev.filter((_, i) => i !== index));
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

  const handleUpload = (file: File) => {
    if (!file.name.endsWith('.zip')) {
      setUploadError('Only .zip files are supported. Please select a .zip archive.');
      return;
    }
    setUploadOutcome(null);
    setUploadError(null);
    isUploadingRef.current = true;
    setIsUploading(true);

    uploadBot.mutate(
      { data: { file } },
      {
        onSuccess: (result: any) => {
          if (result?.status === 'processing') {
            queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
            return;
          }
          isUploadingRef.current = false;
          setIsUploading(false);
          setUploadOutcome(result as UploadOutcome);
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
        },
        onError: (err: any) => {
          isUploadingRef.current = false;
          setIsUploading(false);
          const msg = err?.data?.error || err?.message || 'Upload failed. Please try again.';
          setUploadError(msg);
        },
      }
    );
  };

  const handleRestart = () => {
    restartBot.mutate(undefined, {
      onSuccess: () => {
        toast.success('Restart triggered');
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
      },
      onError: (err: any) => {
        toast.error(`Restart failed: ${err?.data?.error || err?.error || 'Unknown error'}`);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 font-mono text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="animate-pulse tracking-widest">INITIALIZING SESSION...</span>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const { hostedBot } = session;
  const statusMeta = hostedBot ? getStatusMeta(hostedBot.status) : null;
  const isProcessing = isUploading || hostedBot?.status === 'installing' || hostedBot?.status === 'starting';

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-background">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(var(--primary)/0.06)_0%,transparent_70%)]" />

      <div className="relative p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center border border-primary/30 bg-primary/5"
              style={{ boxShadow: '0 0 16px hsl(var(--primary)/0.2)' }}
            >
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-mono font-bold tracking-widest text-foreground">LUMORA</h1>
              <p className="text-xs font-mono text-muted-foreground">
                <span className="text-primary/80">@{session.ownerUsername}</span>
                <span className="mx-1 opacity-30">•</span>
                <span>TICKET-{session.ticketId}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border/60 bg-card/50 text-xs font-mono text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary/60" />
            <span>EXPIRES</span>
            <span className="text-foreground font-semibold">
              {(() => { try { const d = new Date(session.expiresAt as unknown as string); return isNaN(d.getTime()) ? '—' : formatDistanceToNow(d, { addSuffix: true }); } catch { return '—'; } })()}
            </span>
          </div>
        </header>

        <Tabs defaultValue="overview" className="space-y-5">
          <TabsList className="font-mono text-xs tracking-widest bg-background/60 border border-border/50 h-9">
            <TabsTrigger value="overview" className="text-[10px] tracking-widest px-4 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none">
              OVERVIEW
            </TabsTrigger>
            <TabsTrigger value="files" className="text-[10px] tracking-widest px-4 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none flex items-center gap-1.5">
              <Files className="h-3 w-3" />
              FILES
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="mt-0">
            <FileManager hasBot={!!hostedBot} />
          </TabsContent>

          <TabsContent value="overview" className="mt-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main panel */}
          <div className="lg:col-span-2 space-y-5">

            {/* Bot Status Card */}
            <div
              className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden"
              style={{
                borderColor: hostedBot ? (hostedBot.status === 'running' ? 'rgba(52,211,153,0.2)' : hostedBot.status === 'crashed' || hostedBot.status === 'error' ? 'rgba(248,113,113,0.2)' : 'rgba(96,165,250,0.2)') : 'hsl(var(--border))',
                boxShadow: hostedBot?.status === 'running' ? '0 0 30px rgba(52,211,153,0.06)' : '0 4px 24px rgba(0,0,0,0.3)',
              }}
            >
              <div className="p-5">
                {hostedBot ? (
                  <>
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <h2 className="font-mono font-bold text-base text-foreground">{hostedBot.fileName}</h2>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">Active Deployment</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs px-3 py-1 flex items-center gap-2 ${statusMeta?.color}`}
                        style={{ boxShadow: statusMeta?.glow }}
                      >
                        {statusMeta?.icon}
                        {statusMeta?.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {[
                        { label: 'RESTARTS', value: hostedBot.restartCount },
                        {
                          label: 'STARTED',
                          value: hostedBot.lastStartedAt
                            ? formatDistanceToNow(new Date(hostedBot.lastStartedAt), { addSuffix: true })
                            : '—',
                        },
                        { label: 'COMMAND', value: hostedBot.startCommand || '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-background/60 border border-border/40 p-3">
                          <div className="text-[10px] font-mono text-muted-foreground mb-1 tracking-wider">{label}</div>
                          <div className="font-mono text-sm text-foreground truncate" title={String(value)}>{String(value)}</div>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={handleRestart}
                      disabled={restartBot.isPending || isProcessing}
                      className="w-full font-mono text-xs tracking-widest h-10"
                      variant="outline"
                    >
                      <RotateCw className={`w-3.5 h-3.5 mr-2 ${restartBot.isPending ? 'animate-spin' : ''}`} />
                      {restartBot.isPending ? 'RESTARTING...' : 'RESTART BOT'}
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="h-14 w-14 rounded-2xl border border-dashed border-border/60 flex items-center justify-center mb-4 opacity-40">
                      <Activity className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-mono text-sm font-semibold text-muted-foreground tracking-widest mb-2">
                      NO BOT DEPLOYED
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground/60 max-w-xs">
                      Add your secrets below, then upload your bot's .zip file to get started.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Outcome Banner */}
            {uploadOutcome && (
              <div
                className={`rounded-xl border p-4 ${
                  uploadOutcome.status === 'running'
                    ? 'border-emerald-500/25 bg-emerald-500/5'
                    : 'border-red-500/25 bg-red-500/5'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {uploadOutcome.status === 'running' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                  )}
                  <span className={`font-mono text-xs font-bold tracking-wider ${uploadOutcome.status === 'running' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {uploadOutcome.status === 'running' ? 'DEPLOYMENT SUCCESSFUL' : 'DEPLOYMENT FAILED'}
                  </span>
                </div>
                <p className="text-xs font-mono text-muted-foreground mb-2">{uploadOutcome.message}</p>
                {uploadOutcome.detail && (
                  <pre className="text-[10px] font-mono text-muted-foreground/70 bg-background/60 rounded-lg p-3 overflow-x-auto max-h-32 border border-border/30 whitespace-pre-wrap">
                    {uploadOutcome.detail}
                  </pre>
                )}
              </div>
            )}

            {/* AI Diagnostics */}
            {hostedBot?.aiExplanation && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4"
                style={{ boxShadow: '0 0 20px rgba(99,102,241,0.07)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="h-4 w-4 text-indigo-400" />
                  <span className="font-mono text-xs text-indigo-400 font-bold tracking-wider">AI DIAGNOSTIC</span>
                </div>
                <p className="text-xs text-indigo-100/70 leading-relaxed border-l-2 border-indigo-500/40 pl-3 font-mono italic">
                  {hostedBot.aiExplanation}
                </p>
              </div>
            )}

            {/* Error Logs */}
            {hostedBot?.errorMessage && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-500/10 transition-colors"
                  onClick={() => setShowLogs(!showLogs)}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                    <span className="font-mono text-xs text-red-400 font-bold tracking-wider">CRASH LOGS</span>
                  </div>
                  {showLogs ? (
                    <ChevronUp className="h-4 w-4 text-red-400/60" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-red-400/60" />
                  )}
                </button>
                {showLogs && (
                  <div className="px-4 pb-4">
                    <pre className="text-[10px] font-mono text-red-300/70 bg-background/60 rounded-lg p-3 overflow-x-auto max-h-48 border border-red-500/10 whitespace-pre-wrap">
                      {hostedBot.errorMessage}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Secrets / Environment Variables Panel */}
            <div className="rounded-xl border border-violet-500/20 bg-card/50 backdrop-blur-sm overflow-hidden"
              style={{ boxShadow: '0 0 24px rgba(139,92,246,0.05)' }}
            >
              <div className="px-5 py-4 border-b border-violet-500/15 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-violet-400" />
                  <span className="font-mono text-xs text-violet-400 font-bold tracking-wider">SECRETS & ENV VARS</span>
                </div>
                {envDirty && (
                  <span className="text-[10px] font-mono text-yellow-400/80 tracking-wider">● UNSAVED</span>
                )}
              </div>

              <div className="p-5 space-y-3">
                <p className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
                  Add your bot's secrets here (e.g. <span className="text-violet-300/80">DISCORD_TOKEN</span>, <span className="text-violet-300/80">MONGODB_URI</span>). They are injected into the process when your bot starts. Save first, then restart.
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
                          className="flex-[0_0_38%] bg-background/60 border border-border/50 rounded-lg px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors uppercase"
                          spellCheck={false}
                        />
                        <div className="flex-1 relative">
                          <input
                            type={entry.hidden ? 'password' : 'text'}
                            placeholder="value"
                            value={entry.value}
                            onChange={(e) => handleEnvChange(i, 'value', e.target.value)}
                            className="w-full bg-background/60 border border-border/50 rounded-lg px-3 py-2 pr-8 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                            spellCheck={false}
                          />
                          <button
                            type="button"
                            onClick={() => handleToggleHidden(i)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                          >
                            {entry.hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteEnvRow(i)}
                          className="text-muted-foreground/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {envEntries.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border/40 p-4 text-center">
                    <p className="text-[10px] font-mono text-muted-foreground/50">No secrets added yet. Click below to add one.</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddEnvRow}
                    className="font-mono text-[10px] tracking-widest h-8 border-border/50 hover:border-violet-500/40 hover:text-violet-300"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    ADD SECRET
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveEnv}
                    disabled={envSaving || !envDirty}
                    className="font-mono text-[10px] tracking-widest h-8 bg-violet-600/80 hover:bg-violet-600 text-white border-0"
                  >
                    {envSaving ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3 mr-1" />
                    )}
                    {envSaving ? 'SAVING...' : 'SAVE SECRETS'}
                  </Button>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Upload Zone */}
            <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border/40">
                <span className="font-mono text-xs text-muted-foreground tracking-widest">DEPLOYMENT</span>
              </div>
              <div className="p-4">
                <div
                  className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer select-none
                    ${isDragging
                      ? 'border-primary/60 bg-primary/5 scale-[1.02]'
                      : isUploading
                      ? 'border-blue-500/40 bg-blue-500/5'
                      : 'border-border/40 hover:border-primary/40 hover:bg-primary/3'
                    }
                  `}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleUpload(file);
                  }}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".zip"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                      e.target.value = '';
                    }}
                  />

                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                      <div>
                        <p className="font-mono text-xs text-blue-400 font-bold tracking-wider">
                          {hostedBot?.status === 'installing' ? 'INSTALLING DEPS...' : hostedBot?.status === 'starting' ? 'STARTING BOT...' : 'UPLOADING...'}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                          {hostedBot?.status === 'installing' ? 'May take several minutes for large projects' : 'Please wait...'}
                        </p>
                      </div>
                    </div>
                  ) : uploadError ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 rounded-full border border-red-500/40 bg-red-500/10 flex items-center justify-center">
                        <XCircle className="h-5 w-5 text-red-400" />
                      </div>
                      <div>
                        <p className="font-mono text-xs font-bold tracking-wider text-red-400">UPLOAD FAILED</p>
                        <p className="text-[10px] font-mono text-red-300/70 mt-1 max-w-[180px] text-center leading-relaxed">
                          {uploadError}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground/50 mt-2">Click to try again</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 rounded-full border border-border/60 bg-background/60 flex items-center justify-center">
                        <UploadCloud className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-mono text-xs font-bold tracking-wider text-foreground">UPLOAD ZIP</p>
                        <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                          Drag & drop or click to browse
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Requirements */}
                <div className="mt-4 space-y-1.5">
                  {[
                    'Add secrets above before uploading',
                    'package.json with "start" script',
                    'Max 100MB zip size',
                  ].map((req, i) => (
                    <div key={req} className="flex items-center gap-2">
                      <span className={`text-[10px] ${i === 0 ? 'text-violet-400/70' : 'text-primary/40'}`}>▸</span>
                      <span className={`text-[10px] font-mono ${i === 0 ? 'text-violet-300/70' : 'text-muted-foreground/60'}`}>{req}</span>
                    </div>
                  ))}
                  {uploadError && (
                    <div className="mt-3 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2">
                      <p className="text-[10px] font-mono text-red-400 leading-relaxed">{uploadError}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="rounded-xl border border-border/60 bg-card/50 p-4">
              <p className="font-mono text-[10px] text-muted-foreground tracking-widest mb-3">SYSTEM</p>
              <div className="space-y-2">
                {[
                  { k: 'RUNTIME', v: 'Node.js / Python', color: '' },
                  { k: 'NETWORK', v: 'ISOLATED', color: 'text-emerald-400' },
                  { k: 'STORAGE', v: 'EPHEMERAL', color: 'text-yellow-400' },
                  { k: 'HOSTING', v: `${session.hostingDurationDays}d plan`, color: 'text-primary/80' },
                ].map(({ k, v, color }) => (
                  <div key={k} className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-muted-foreground">{k}</span>
                    <span className={`text-[10px] font-mono font-semibold ${color || 'text-foreground'}`}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
