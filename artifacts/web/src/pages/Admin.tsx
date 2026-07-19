import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGetAdminStatus,
  getGetAdminStatusQueryKey,
  useUpdateAdminConfig,
} from '@workspace/api-client-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Lock, ShieldAlert, Bot, Settings2, CheckCircle2, XCircle,
  Save, Key, Plus, Copy, RefreshCw, Loader2, Eye, EyeOff,
  MessageSquare, Trash2, Users, Link, Zap, AlertTriangle,
  Terminal, Shield,
} from 'lucide-react';
import { toast } from 'sonner';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

const configSchema = z.object({
  adminPassword: z.string().min(1, 'Admin password is required'),
  discordBotToken: z.string().optional(),
  discordGuildId: z.string().optional(),
  discordStaffRoleId: z.string().optional(),
  discordTicketCategoryName: z.string().optional(),
  openrouterApiKey: z.string().optional(),
  openrouterModel: z.string().optional(),
});

type ConfigFormValues = z.infer<typeof configSchema>;

interface GeneratedKey {
  key: string;
  durationDays: number;
  createdAt: string;
}

interface TicketEntry {
  id: number;
  ownerId: string;
  ownerUsername: string;
  status: string;
  keys: Array<{
    id: number;
    key: string;
    status: string;
    expiresAt: string | null;
    hostingDurationDays: number | null;
  }>;
}

interface UserEntry {
  id: number;
  ownerId: string;
  ownerUsername: string;
  status: string;
  botStatus?: string;
  keys: Array<{
    id: number;
    key: string;
    status: string;
    expiresAt: string | null;
    hostingDurationDays: number | null;
  }>;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono ${ok ? 'text-emerald-400' : 'text-white/25'}`}>
      {ok
        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        : <XCircle className="h-3.5 w-3.5 text-white/20" />}
      {ok ? 'Set' : 'Not set'}
    </span>
  );
}

// ─── Key Generator ────────────────────────────────────────────────────────────
function KeyGenerator({ adminPassword }: { adminPassword: string }) {
  const [generating, setGenerating] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<GeneratedKey[]>([]);
  const [duration, setDuration] = useState(30);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const r = await fetch(`${BASE}/api/admin/keys/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
        body: JSON.stringify({ hostingDurationDays: duration }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({})) as any;
        throw new Error(d?.error || 'Failed to generate key');
      }
      const data = await r.json() as any;
      setGeneratedKeys(prev => [{ key: data.key, durationDays: duration, createdAt: new Date().toISOString() }, ...prev]);
      toast.success('Key generated successfully');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate key');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success('Key copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d1a] overflow-hidden">
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)' }} />
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
        <div className="h-8 w-8 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center">
          <Key className="h-4 w-4 text-[#6366f1]/70" />
        </div>
        <div>
          <h3 className="font-mono text-sm text-white/80 font-bold tracking-wide">Generate Access Key</h3>
          <p className="text-[11px] text-white/30 mt-0.5 font-mono">Create hosting keys for new users</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-white/35 tracking-[0.2em]">DURATION (DAYS)</label>
          <div className="flex gap-2 flex-wrap">
            {[7, 14, 30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all duration-200 ${
                  duration === d
                    ? 'border-[#6366f1]/40 bg-[#6366f1]/10 text-[#6366f1]/80'
                    : 'border-white/[0.07] text-white/35 hover:border-white/[0.14] hover:text-white/60'
                }`}
              >
                {d}d
              </button>
            ))}
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                className="w-16 bg-white/[0.03] border border-white/[0.07] rounded-lg px-2.5 py-1.5 font-mono text-xs text-white/65 text-center focus:outline-none focus:border-[#6366f1]/30 transition-colors"
                min={1} max={365}
              />
              <span className="text-xs font-mono text-white/25">days</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold font-mono text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}
        >
          {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Plus className="h-4 w-4" /> Generate Key</>}
        </button>

        {generatedKeys.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-mono text-white/25 tracking-[0.2em]">GENERATED KEYS</p>
            {generatedKeys.map((gk) => (
              <div key={gk.key} className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <code className="flex-1 font-mono text-xs text-white/70 tracking-wider truncate">{gk.key}</code>
                <span className="text-[10px] font-mono text-white/25 shrink-0">{gk.durationDays}d</span>
                <button
                  onClick={() => handleCopy(gk.key)}
                  className={`shrink-0 p-1.5 rounded-lg transition-all duration-200 ${
                    copiedKey === gk.key ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/25 hover:text-white/60 hover:bg-white/[0.05]'
                  }`}
                >
                  {copiedKey === gk.key ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ticket Manager ───────────────────────────────────────────────────────────
function TicketManager({ adminPassword }: { adminPassword: string }) {
  const [tickets, setTickets] = useState<TicketEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<number | null>(null);
  const [linkDiscordId, setLinkDiscordId] = useState('');
  const [linkDiscordUser, setLinkDiscordUser] = useState('');
  const [linking, setLinking] = useState(false);
  const [genDiscordId, setGenDiscordId] = useState('');
  const [genDiscordUser, setGenDiscordUser] = useState('');
  const [genDays, setGenDays] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/tickets`, { headers: { 'x-admin-password': adminPassword } });
      if (!r.ok) throw new Error('Failed to fetch tickets');
      const data = await r.json() as { tickets: TicketEntry[] };
      setTickets(data.tickets);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleLink = async (ticketId: number) => {
    if (!linkDiscordId.trim()) return;
    setLinking(true);
    try {
      const r = await fetch(`${BASE}/api/admin/tickets/${ticketId}/link`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
        body: JSON.stringify({ discordUserId: linkDiscordId.trim(), discordUsername: linkDiscordUser.trim() || undefined }),
      });
      if (!r.ok) throw new Error('Failed to link');
      toast.success('Discord ID linked successfully');
      setLinkingId(null);
      setLinkDiscordId('');
      setLinkDiscordUser('');
      fetchTickets();
    } catch (e: any) {
      toast.error(e?.message || 'Link failed');
    } finally {
      setLinking(false);
    }
  };

  const handleGenerateForUser = async () => {
    if (!genDiscordId.trim()) { toast.error('Enter a Discord ID first'); return; }
    setGenerating(true);
    try {
      const r = await fetch(`${BASE}/api/admin/keys/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
        body: JSON.stringify({ hostingDurationDays: genDays, discordUserId: genDiscordId.trim(), discordUsername: genDiscordUser.trim() || undefined }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})) as any; throw new Error(d?.error || 'Failed'); }
      const data = await r.json() as { key: string };
      navigator.clipboard?.writeText(data.key);
      setCopiedKey(data.key);
      toast.success('Key generated and copied!');
      setGenDiscordId('');
      setGenDiscordUser('');
      fetchTickets();
      setTimeout(() => setCopiedKey(null), 3000);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate key');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard?.writeText(key);
    setCopiedKey(key);
    toast.success('Copied!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Issue key to Discord user */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d1a] overflow-hidden">
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)' }} />
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center">
            <Key className="h-4 w-4 text-[#6366f1]/70" />
          </div>
          <div>
            <h3 className="font-mono text-sm text-white/80 font-bold tracking-wide">Issue Key to Discord User</h3>
            <p className="text-[11px] text-white/30 mt-0.5 font-mono">Creates a ticket + key linked to their Discord ID</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-white/35 tracking-[0.2em]">DISCORD USER ID *</label>
              <input
                value={genDiscordId}
                onChange={(e) => setGenDiscordId(e.target.value)}
                placeholder="123456789012345678"
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 font-mono text-xs text-white/65 placeholder:text-white/18 focus:outline-none focus:border-[#6366f1]/30 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-white/35 tracking-[0.2em]">USERNAME (OPTIONAL)</label>
              <input
                value={genDiscordUser}
                onChange={(e) => setGenDiscordUser(e.target.value)}
                placeholder="username"
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 font-mono text-xs text-white/65 placeholder:text-white/18 focus:outline-none focus:border-[#6366f1]/30 transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[7, 14, 30, 60, 90].map((d) => (
              <button key={d} onClick={() => setGenDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${genDays === d ? 'border-[#6366f1]/40 bg-[#6366f1]/10 text-[#6366f1]/80' : 'border-white/[0.07] text-white/35 hover:border-white/[0.14] hover:text-white/60'}`}>
                {d}d
              </button>
            ))}
            <input type="number" value={genDays} onChange={(e) => setGenDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
              className="w-16 bg-white/[0.03] border border-white/[0.07] rounded-lg px-2 py-1.5 font-mono text-xs text-white/65 text-center focus:outline-none focus:border-[#6366f1]/30" min={1} max={365} />
          </div>
          {copiedKey && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <code className="flex-1 font-mono text-xs text-emerald-400/90 tracking-wider truncate">{copiedKey}</code>
              <span className="text-[10px] font-mono text-emerald-400/50">copied!</span>
            </div>
          )}
          <button onClick={handleGenerateForUser} disabled={generating || !genDiscordId.trim()}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold font-mono text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}>
            {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Plus className="h-4 w-4" /> Generate &amp; Copy Key</>}
          </button>
        </div>
      </div>

      {/* Tickets list */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d1a] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
              <Users className="h-4 w-4 text-white/40" />
            </div>
            <div>
              <h3 className="font-mono text-sm text-white/80 font-bold tracking-wide">All Tickets</h3>
              <p className="text-[11px] text-white/30 mt-0.5 font-mono">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={fetchTickets} disabled={loading}
            className="p-2 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12">
            <Loader2 className="h-4 w-4 text-white/20 animate-spin" />
            <span className="text-xs font-mono text-white/20">Loading…</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Users className="h-8 w-8 text-white/10" />
            <p className="text-xs font-mono text-white/20">No tickets yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {tickets.map((ticket) => {
              const activeKey = ticket.keys.find(k => k.status === 'active');
              const isLinking = linkingId === ticket.id;
              const isUnassigned = ticket.ownerId.startsWith('unassigned-');
              return (
                <div key={ticket.id} className="px-5 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-white/40">#{ticket.id}</span>
                        {isUnassigned ? (
                          <span className="text-[10px] font-mono text-yellow-400/60 bg-yellow-500/[0.08] border border-yellow-500/15 rounded px-1.5 py-0.5">Unlinked</span>
                        ) : (
                          <span className="font-mono text-xs text-white/70">{ticket.ownerUsername}</span>
                        )}
                        {activeKey ? (
                          <span className="text-[10px] font-mono text-emerald-400/70 bg-emerald-500/[0.08] border border-emerald-500/15 rounded px-1.5 py-0.5">Active key</span>
                        ) : (
                          <span className="text-[10px] font-mono text-white/20 border border-white/[0.06] rounded px-1.5 py-0.5">No key</span>
                        )}
                      </div>
                      {!isUnassigned && (
                        <div className="text-[10px] font-mono text-white/25 mt-0.5">ID: {ticket.ownerId}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {activeKey && (
                        <button onClick={() => handleCopy(activeKey.key)}
                          className={`p-1.5 rounded-lg transition-all ${copiedKey === activeKey.key ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/25 hover:text-white/60 hover:bg-white/[0.04]'}`}
                          title="Copy key">
                          {copiedKey === activeKey.key ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button onClick={() => { setLinkingId(isLinking ? null : ticket.id); setLinkDiscordId(''); setLinkDiscordUser(''); }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono border transition-all ${isLinking ? 'border-[#6366f1]/30 bg-[#6366f1]/10 text-[#6366f1]/70' : 'border-white/[0.07] text-white/35 hover:border-white/[0.14] hover:text-white/60'}`}>
                        <Link className="h-3 w-3" />
                        {isLinking ? 'Cancel' : 'Link ID'}
                      </button>
                    </div>
                  </div>

                  {isLinking && (
                    <div className="flex gap-2 items-center pt-1">
                      <input
                        value={linkDiscordId}
                        onChange={(e) => setLinkDiscordId(e.target.value)}
                        placeholder="Discord User ID"
                        className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 font-mono text-xs text-white/65 placeholder:text-white/18 focus:outline-none focus:border-[#6366f1]/30 transition-colors"
                      />
                      <input
                        value={linkDiscordUser}
                        onChange={(e) => setLinkDiscordUser(e.target.value)}
                        placeholder="username"
                        className="w-28 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 font-mono text-xs text-white/65 placeholder:text-white/18 focus:outline-none focus:border-[#6366f1]/30 transition-colors"
                      />
                      <button onClick={() => handleLink(ticket.id)} disabled={linking || !linkDiscordId.trim()}
                        className="shrink-0 h-9 px-3 rounded-xl text-xs font-mono font-bold bg-[#6366f1] hover:bg-[#7577f3] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                        {linking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Users Manager ────────────────────────────────────────────────────────────
function UsersManager({ adminPassword }: { adminPassword: string }) {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/admin/users`, {
        headers: { 'x-admin-password': adminPassword },
      });
      if (!r.ok) throw new Error('Failed to fetch users');
      const data = await r.json() as { tickets?: UserEntry[]; users?: UserEntry[] };
      setUsers(data.users ?? data.tickets ?? []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSuspend = async (id: number) => {
    setActingId(id);
    try {
      const r = await fetch(`${BASE}/api/admin/tickets/${id}/suspend`, {
        method: 'POST',
        headers: { 'x-admin-password': adminPassword },
      });
      if (!r.ok) throw new Error('Failed to suspend');
      toast.success('User suspended');
      fetchUsers();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to suspend');
    } finally {
      setActingId(null);
    }
  };

  const handleResetBot = async (id: number) => {
    setActingId(id);
    try {
      const r = await fetch(`${BASE}/api/admin/tickets/${id}/reset-bot`, {
        method: 'POST',
        headers: { 'x-admin-password': adminPassword },
      });
      if (!r.ok) throw new Error('Failed to reset bot');
      toast.success('Bot reset');
      fetchUsers();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reset bot');
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    setActingId(id);
    try {
      const r = await fetch(`${BASE}/api/admin/tickets/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword },
      });
      if (!r.ok) throw new Error('Failed to delete');
      toast.success('User deleted');
      fetchUsers();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d1a] overflow-hidden">
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)' }} />
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
            <Users className="h-4 w-4 text-white/40" />
          </div>
          <div>
            <h3 className="font-mono text-sm text-white/80 font-bold tracking-wide">User Management</h3>
            <p className="text-[11px] text-white/30 mt-0.5 font-mono">{users.length} user{users.length !== 1 ? 's' : ''} registered</p>
          </div>
        </div>
        <button onClick={fetchUsers} disabled={loading}
          className="p-2 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all disabled:opacity-40">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12">
          <Loader2 className="h-4 w-4 text-white/20 animate-spin" />
          <span className="text-xs font-mono text-white/20">Loading users…</span>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <Users className="h-9 w-9 text-white/10" />
          <p className="text-xs font-mono text-white/20">No users yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['User', 'Discord ID', 'Bot Status', 'Plan Expires', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-mono text-white/25 tracking-[0.2em] font-normal">{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {users.map((user) => {
                const activeKey = user.keys.find(k => k.status === 'active');
                const isUnassigned = user.ownerId.startsWith('unassigned-');
                const isActing = actingId === user.id;
                const expiresAt = activeKey?.expiresAt
                  ? new Date(activeKey.expiresAt).toLocaleDateString()
                  : '—';

                return (
                  <tr key={user.id} className="hover:bg-white/[0.015] transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="font-mono text-xs text-white/70 font-medium">
                        {isUnassigned ? <span className="text-yellow-400/60">Unlinked</span> : user.ownerUsername || '—'}
                      </div>
                      <div className="text-[10px] font-mono text-white/25 mt-0.5">#{user.id}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[11px] text-white/40 truncate block max-w-[140px]">
                        {isUnassigned ? '—' : user.ownerId}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {user.botStatus ? (
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border ${
                          user.botStatus === 'online' || user.botStatus === 'running'
                            ? 'text-emerald-400/70 border-emerald-500/15 bg-emerald-500/[0.06]'
                            : user.botStatus === 'stopped'
                            ? 'text-white/25 border-white/[0.06] bg-transparent'
                            : 'text-yellow-400/70 border-yellow-500/15 bg-yellow-500/[0.06]'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            user.botStatus === 'online' || user.botStatus === 'running' ? 'bg-emerald-400' :
                            user.botStatus === 'stopped' ? 'bg-white/20' : 'bg-yellow-400'
                          }`} />
                          {user.botStatus}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-white/20">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[11px] text-white/40">{expiresAt}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleSuspend(user.id)}
                          disabled={isActing}
                          title="Suspend"
                          className="p-1.5 rounded-lg text-yellow-400/50 hover:text-yellow-400 hover:bg-yellow-500/[0.08] border border-transparent hover:border-yellow-500/20 transition-all disabled:opacity-30"
                        >
                          {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => handleResetBot(user.id)}
                          disabled={isActing}
                          title="Reset Bot"
                          className="p-1.5 rounded-lg text-blue-400/50 hover:text-blue-400 hover:bg-blue-500/[0.08] border border-transparent hover:border-blue-500/20 transition-all disabled:opacity-30"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={isActing}
                          title="Delete User"
                          className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/[0.08] border border-transparent hover:border-red-500/20 transition-all disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Admin ───────────────────────────────────────────────────────────────
export default function Admin() {
  const queryClient = useQueryClient();
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'keys' | 'users' | 'system'>('config');

  const { data: statusData, isError, error, isFetching } = useGetAdminStatus({
    query: {
      enabled: !!adminPassword,
      queryKey: getGetAdminStatusQueryKey(),
      retry: false,
    },
    request: {
      headers: { 'x-admin-password': adminPassword },
    }
  });

  const updateConfig = useUpdateAdminConfig({
    request: { headers: { 'x-admin-password': adminPassword } }
  });

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      adminPassword: '',
      discordBotToken: '',
      discordGuildId: '',
      discordStaffRoleId: '',
      discordTicketCategoryName: 'Tickets',
      openrouterApiKey: '',
      openrouterModel: '',
    },
  });

  useEffect(() => {
    form.setValue('adminPassword', adminPassword);
  }, [adminPassword, form]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) return;
    setAdminPassword(passwordInput);
  };

  const onSubmit = (data: ConfigFormValues) => {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
    ) as ConfigFormValues;
    payload.adminPassword = adminPassword;

    const loadingToast = toast.loading('Saving configuration…');
    updateConfig.mutate(
      { data: payload },
      {
        onSuccess: (newStatus: any) => {
          toast.success('Configuration saved', { id: loadingToast });
          queryClient.setQueryData(getGetAdminStatusQueryKey(), newStatus);
          form.reset({ ...form.getValues(), discordBotToken: '', openrouterApiKey: '' });
        },
        onError: (err: any) => {
          toast.error(`Save failed: ${err?.error || 'Unknown error'}`, { id: loadingToast });
        },
      }
    );
  };

  // ─── Login view ──────────────────────────────────────────────────────────
  if (!adminPassword || (isError && (error as any)?.status === 401)) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 bg-[#080810] animate-page-in">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 opacity-[0.018]"
            style={{
              backgroundImage: `linear-gradient(rgba(239,68,68,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.6) 1px, transparent 1px)`,
              backgroundSize: '56px 56px',
            }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(ellipse, #ef4444 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative w-full max-w-sm">
          <div className="text-center mb-8 space-y-3">
            <div className="flex justify-center mb-5">
              <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center"
                style={{ boxShadow: '0 0 40px rgba(239,68,68,0.12)' }}>
                <ShieldAlert className="h-8 w-8 text-red-400/70" />
              </div>
            </div>
            <h1 className="text-2xl font-black font-mono tracking-[0.15em] text-white">ADMIN ACCESS</h1>
            <p className="text-[10px] font-mono tracking-[0.3em] text-white/25">LUMORA OPERATIONS CONSOLE</p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl p-6 relative overflow-hidden"
            style={{ boxShadow: '0 0 0 1px rgba(239,68,68,0.06) inset, 0 32px 64px rgba(0,0,0,0.6)' }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)' }}
            />
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Admin password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-10 h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] font-mono text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-red-500/30 transition-all duration-200"
                  data-testid="input-admin-password"
                  autoFocus
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {isError && (error as any)?.status === 401 && adminPassword && (
                <div className="flex items-center gap-2 text-xs font-mono text-red-400/70 text-center py-1 justify-center">
                  <XCircle className="h-3.5 w-3.5" />
                  Access denied — incorrect password
                </div>
              )}

              <button type="submit"
                className="w-full h-12 rounded-xl font-black font-mono tracking-[0.18em] text-sm text-white transition-all duration-200 disabled:opacity-50"
                disabled={isFetching || !passwordInput}
                style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', boxShadow: '0 4px 16px rgba(220,38,38,0.25)' }}
                data-testid="button-admin-login"
              >
                {isFetching ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> VERIFYING…</span>
                ) : 'AUTHORIZE'}
              </button>
            </form>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4 text-[10px] font-mono text-white/15">
            <Shield className="h-3 w-3" />
            <span>Restricted access · Lumora Operations</span>
          </div>
        </div>
      </div>
    );
  }

  if (!statusData) return null;

  const TABS: Array<{ id: typeof activeTab; icon: React.ElementType; label: string }> = [
    { id: 'config', icon: Settings2, label: 'Config' },
    { id: 'keys', icon: Key, label: 'Keys' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'system', icon: Terminal, label: 'System' },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-[#080810] text-[#c8cde8] animate-page-in">
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.018]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Top nav */}
      <header className="relative sticky top-0 z-20 flex items-center justify-between h-14 px-5 border-b border-white/[0.06] bg-[#080810]/95 backdrop-blur-xl">
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.3), transparent)' }}
        />
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-red-500/[0.08] border border-red-500/15 flex items-center justify-center">
            <Settings2 className="h-4 w-4 text-red-400/60" />
          </div>
          <div>
            <h1 className="font-black font-mono text-sm tracking-[0.12em] text-white">OPERATIONS CONSOLE</h1>
            <p className="text-[10px] font-mono text-white/25 tracking-wider">Lumora System Administration</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono ${
            statusData.botConnected
              ? 'bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/15'
              : 'bg-red-500/[0.08] text-red-400/70 border-red-500/15'
          }`}>
            <Bot className="h-3.5 w-3.5" />
            {statusData.botConnected ? (statusData.botTag || 'Bot Connected') : 'Bot Offline'}
          </div>
          <button
            onClick={() => setAdminPassword('')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.07] text-xs font-mono text-white/35 hover:text-white/65 hover:border-white/[0.14] transition-all duration-200"
          >
            <Lock className="h-3 w-3" />
            Lock
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-6 space-y-6">
        {/* Tab nav */}
        <div className="flex gap-1 border-b border-white/[0.05] pb-0">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-mono border-b-2 transition-all duration-200 -mb-px ${
                activeTab === id
                  ? 'border-[#6366f1] text-white/80'
                  : 'border-transparent text-white/28 hover:text-white/55'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Config Tab */}
        {activeTab === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d1a] overflow-hidden">
                <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)' }} />
                <div className="px-5 py-4 border-b border-white/[0.05]">
                  <h2 className="font-mono text-sm text-white/70 font-bold tracking-wide">Core Variables</h2>
                  <p className="text-[11px] font-mono text-white/30 mt-0.5">Only fill fields you wish to update.</p>
                </div>
                <div className="p-5">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                      {/* Discord section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-1">
                          <MessageSquare className="h-3.5 w-3.5 text-[#5865F2]/60" />
                          <span className="text-[10px] font-mono text-white/35 tracking-[0.2em]">DISCORD</span>
                        </div>
                        <FormField control={form.control} name="discordBotToken"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-mono text-[10px] text-white/35 tracking-wider">BOT TOKEN</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="MTxxxxxxxxxx.Gxxxxx.xxxxx" {...field}
                                  className="font-mono bg-white/[0.03] border-white/[0.07] focus:border-[#6366f1]/30 text-white/70 placeholder:text-white/15 rounded-xl"
                                  data-testid="input-discord-token" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={form.control} name="discordGuildId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-mono text-[10px] text-white/35 tracking-wider">GUILD ID</FormLabel>
                                <FormControl>
                                  <Input placeholder="123456789012345678" {...field}
                                    className="font-mono bg-white/[0.03] border-white/[0.07] focus:border-[#6366f1]/30 text-white/70 placeholder:text-white/15 rounded-xl"
                                    data-testid="input-guild-id" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField control={form.control} name="discordStaffRoleId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-mono text-[10px] text-white/35 tracking-wider">STAFF ROLE ID</FormLabel>
                                <FormControl>
                                  <Input placeholder="123456789012345678" {...field}
                                    className="font-mono bg-white/[0.03] border-white/[0.07] focus:border-[#6366f1]/30 text-white/70 placeholder:text-white/15 rounded-xl"
                                    data-testid="input-staff-role-id" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField control={form.control} name="discordTicketCategoryName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-mono text-[10px] text-white/35 tracking-wider">TICKET CATEGORY</FormLabel>
                              <FormControl>
                                <Input placeholder="Tickets" {...field}
                                  className="font-mono bg-white/[0.03] border-white/[0.07] focus:border-[#6366f1]/30 text-white/70 placeholder:text-white/15 rounded-xl" />
                              </FormControl>
                              <FormDescription className="text-[11px] font-mono text-white/25">Category where the bot listens for keys</FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* AI section */}
                      <div className="space-y-3 pt-2 border-t border-white/[0.05]">
                        <div className="flex items-center gap-2 pb-1 pt-1">
                          <Zap className="h-3.5 w-3.5 text-[#6366f1]/60" />
                          <span className="text-[10px] font-mono text-white/35 tracking-[0.2em]">AI DIAGNOSTICS (OPTIONAL)</span>
                        </div>
                        <FormField control={form.control} name="openrouterApiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-mono text-[10px] text-white/35 tracking-wider">OPENROUTER API KEY</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="sk-or-v1-..." {...field}
                                  className="font-mono bg-white/[0.03] border-white/[0.07] focus:border-[#6366f1]/30 text-white/70 placeholder:text-white/15 rounded-xl"
                                  data-testid="input-openrouter-key" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField control={form.control} name="openrouterModel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-mono text-[10px] text-white/35 tracking-wider">MODEL</FormLabel>
                              <FormControl>
                                <Input placeholder="anthropic/claude-3.5-sonnet" {...field}
                                  className="font-mono bg-white/[0.03] border-white/[0.07] focus:border-[#6366f1]/30 text-white/70 placeholder:text-white/15 rounded-xl" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full font-mono font-bold rounded-xl text-white border-0"
                        disabled={updateConfig.isPending}
                        data-testid="button-save-config"
                        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}
                      >
                        {updateConfig.isPending ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Applying Changes…</>
                        ) : (
                          <><Save className="h-4 w-4 mr-2" />Save Configuration</>
                        )}
                      </Button>
                    </form>
                  </Form>
                </div>
              </div>
            </div>

            {/* Status sidebar */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d1a] overflow-hidden">
                <div className="px-4 py-3.5 border-b border-white/[0.05]">
                  <h3 className="font-mono text-xs text-white/50 font-bold tracking-[0.15em]">ENVIRONMENT STATUS</h3>
                </div>
                <div className="p-4">
                  <ul className="space-y-2.5">
                    {statusData.configKeys.map((item: any) => (
                      <li key={item.key} className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-white/40">{item.key}</span>
                        <StatusDot ok={item.isSet} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <KeyGenerator adminPassword={adminPassword} />
            </div>
          </div>
        )}

        {/* Keys Tab */}
        {activeTab === 'keys' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <KeyGenerator adminPassword={adminPassword} />
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <UsersManager adminPassword={adminPassword} />
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Environment status */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d1a] overflow-hidden">
              <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)' }} />
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                  <Terminal className="h-4 w-4 text-white/40" />
                </div>
                <div>
                  <h3 className="font-mono text-sm text-white/80 font-bold tracking-wide">Environment Status</h3>
                  <p className="text-[11px] text-white/30 mt-0.5 font-mono">Current configuration health</p>
                </div>
              </div>
              <div className="p-5">
                <ul className="space-y-3">
                  {statusData.configKeys.map((item: any) => (
                    <li key={item.key} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                      <span className="font-mono text-[11px] text-white/45">{item.key}</span>
                      <StatusDot ok={item.isSet} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bot status */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d1a] overflow-hidden">
              <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)' }} />
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white/40" />
                </div>
                <div>
                  <h3 className="font-mono text-sm text-white/80 font-bold tracking-wide">Discord Bot Status</h3>
                  <p className="text-[11px] text-white/30 mt-0.5 font-mono">Management bot connection</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-white/40">Connection</span>
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono ${statusData.botConnected ? 'text-emerald-400' : 'text-red-400/70'}`}>
                    {statusData.botConnected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {statusData.botConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {statusData.botTag && (
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-white/40">Bot Tag</span>
                    <span className="font-mono text-[11px] text-white/60">{statusData.botTag}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
