import { useState, useEffect, useCallback, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import { StreamLanguage } from '@codemirror/language';
import { properties } from '@codemirror/legacy-modes/mode/properties';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  ChevronRight,
  ChevronDown as ChevronDownIcon,
  File as FileIcon,
  Folder,
  FolderOpen,
  UploadCloud,
  Trash2,
  Save,
  RotateCw,
  Plus,
  FolderPlus,
  Loader2,
  AlertTriangle,
  Binary,
  RefreshCw,
  Search,
  X,
  Zap,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRestartBot, getGetSessionQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  extension: string | null;
}

// ─── Language detection ──────────────────────────────────────────────────────

function getExtensions(ext: string | null) {
  if (!ext) return [];
  switch (ext.toLowerCase()) {
    case '.js':
    case '.mjs':
    case '.cjs':
      return [javascript()];
    case '.ts':
    case '.tsx':
    case '.jsx':
      return [javascript({ typescript: true, jsx: true })];
    case '.json':
      return [json()];
    case '.py':
      return [python()];
    case '.env':
    case '.properties':
    case '.ini':
      return [StreamLanguage.define(properties)];
    default:
      return [];
  }
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: 'include', ...opts });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as any)?.error || `Request failed (${r.status})`);
  return data;
}

async function listDir(path: string): Promise<FileEntry[]> {
  const data = await apiFetch(`${BASE}/api/bots/files/list?path=${encodeURIComponent(path)}`);
  return (data as any).entries ?? [];
}

async function readFile(path: string): Promise<{ content: string | null; isBinary: boolean; size: number; truncated: boolean }> {
  return await apiFetch(`${BASE}/api/bots/files/read?path=${encodeURIComponent(path)}`);
}

async function saveFile(path: string, content: string) {
  return await apiFetch(`${BASE}/api/bots/files/write`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  });
}

async function deleteEntry(path: string) {
  return await apiFetch(`${BASE}/api/bots/files?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
}

async function mkdirEntry(path: string) {
  return await apiFetch(`${BASE}/api/bots/files/mkdir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
}

async function uploadFile(file: File, targetDir: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('path', targetDir);
  const r = await fetch(`${BASE}/api/bots/files/upload`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as any)?.error || 'Upload failed');
  return data;
}

// ─── Tree node component ──────────────────────────────────────────────────────

interface TreeNodeProps {
  entry: FileEntry;
  depth: number;
  selectedPath: string | null;
  onSelect: (entry: FileEntry) => void;
  refreshToken: number;
}

function TreeNode({ entry, depth, selectedPath, onSelect, refreshToken }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const isSelected = selectedPath === entry.path;

  const toggle = async () => {
    if (entry.type !== 'directory') return;
    if (!expanded && children === null) {
      setLoading(true);
      try {
        const items = await listDir(entry.path);
        setChildren(items);
      } catch {
        toast.error('Failed to load folder contents');
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setExpanded(!expanded);
  };

  useEffect(() => {
    if (expanded && entry.type === 'directory') {
      setLoading(true);
      listDir(entry.path)
        .then((items) => setChildren(items))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const icon = entry.type === 'directory'
    ? expanded
      ? <FolderOpen className="h-3.5 w-3.5 text-yellow-400/70 shrink-0" />
      : <Folder className="h-3.5 w-3.5 text-yellow-400/60 shrink-0" />
    : entry.type === 'symlink'
    ? <FileIcon className="h-3.5 w-3.5 text-blue-400/60 shrink-0" />
    : <FileIcon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />;

  return (
    <div>
      <button
        className={`
          w-full flex items-center gap-1.5 px-2 py-[3px] rounded text-left transition-colors text-xs font-mono
          ${isSelected
            ? 'bg-primary/15 text-primary'
            : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (entry.type === 'directory') toggle();
          else onSelect(entry);
        }}
      >
        {entry.type === 'directory' ? (
          <span className="shrink-0 w-3 h-3 flex items-center justify-center">
            {loading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : expanded
              ? <ChevronDownIcon className="h-3 w-3" />
              : <ChevronRight className="h-3 w-3" />}
          </span>
        ) : (
          <span className="shrink-0 w-3" />
        )}
        {icon}
        <span className="truncate">{entry.name}</span>
        {entry.type === 'file' && entry.size > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground/30 shrink-0">{humanSize(entry.size)}</span>
        )}
      </button>
      {expanded && children !== null && (
        <div>
          {children.length === 0 ? (
            <div
              className="text-[10px] font-mono text-muted-foreground/30 py-1"
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
            >
              empty
            </div>
          ) : (
            children.map((child) => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                refreshToken={refreshToken}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── AI Settings Panel ────────────────────────────────────────────────────────

function AISettingsPanel() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasSavedKey, setHasSavedKey] = useState(false);

  // Load current key from bot env vars
  useEffect(() => {
    fetch(`${BASE}/api/bots/env`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data: any) => {
        const vars: Record<string, string> = data.vars ?? {};
        if (vars['OPENROUTER_API_KEY']) {
          setHasSavedKey(true);
          // Don't prefill the actual key for security — just show it's set
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      // Load current env vars, add/update the OPENROUTER_API_KEY
      const r1 = await fetch(`${BASE}/api/bots/env`, { credentials: 'include' });
      const data1 = await r1.json() as any;
      const currentVars: Record<string, string> = data1.vars ?? {};
      currentVars['OPENROUTER_API_KEY'] = apiKey.trim();

      const r2 = await fetch(`${BASE}/api/bots/env`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars: currentVars }),
      });
      if (!r2.ok) {
        const d = await r2.json().catch(() => ({})) as any;
        throw new Error(d?.error || 'Failed to save');
      }
      setHasSavedKey(true);
      setApiKey('');
      toast.success('AI key saved — restart your bot to apply AI repair.');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save key');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Remove your OpenRouter API key?')) return;
    setSaving(true);
    try {
      const r1 = await fetch(`${BASE}/api/bots/env`, { credentials: 'include' });
      const data1 = await r1.json() as any;
      const currentVars: Record<string, string> = data1.vars ?? {};
      delete currentVars['OPENROUTER_API_KEY'];

      const r2 = await fetch(`${BASE}/api/bots/env`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars: currentVars }),
      });
      if (!r2.ok) throw new Error('Failed to remove key');
      setHasSavedKey(false);
      toast.success('AI key removed.');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove key');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center shrink-0">
          <Zap className="h-3.5 w-3.5 text-[#6366f1]/70" />
        </div>
        <div>
          <div className="font-mono text-xs text-white/70 font-semibold tracking-wider">AI SETTINGS</div>
          <div className="text-[10px] font-mono text-white/30 mt-0.5">Bring your own OpenRouter key</div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
        <p className="text-xs font-mono text-white/40 leading-relaxed">
          Lumora uses AI to automatically fix crashed bots and power the coding assistant.
          Add your own free <span className="text-white/60">OpenRouter</span> API key so AI features work for your bot without using platform credits.
        </p>
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6366f1]/70 hover:text-[#6366f1] transition-colors"
        >
          Get a free key at openrouter.ai/keys →
        </a>
      </div>

      {/* Current key status */}
      {hasSavedKey && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-400/70 shrink-0" />
          <span className="text-xs font-mono text-emerald-400/70 flex-1">API key is saved and active</span>
          <button
            onClick={handleRemove}
            disabled={saving}
            className="text-[10px] font-mono text-red-400/50 hover:text-red-400 transition-colors disabled:opacity-30"
          >
            Remove
          </button>
        </div>
      )}

      {/* Key input */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono text-white/35 tracking-wider">
          {hasSavedKey ? 'UPDATE KEY' : 'YOUR OPENROUTER KEY'}
        </label>
        <div className="relative flex items-center">
          <Key className="absolute left-3 h-3.5 w-3.5 text-white/20 pointer-events-none" />
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-or-..."
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-10 py-2.5 font-mono text-xs text-white/65 placeholder:text-white/20 focus:outline-none focus:border-[#6366f1]/40 focus:ring-1 focus:ring-[#6366f1]/20 transition-colors"
            spellCheck={false}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 text-white/20 hover:text-white/45 transition-colors"
          >
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="text-[10px] font-mono text-white/20 leading-relaxed">
          Key is stored securely with your bot secrets and never exposed in logs or the UI.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !apiKey.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6366f1]/80 hover:bg-[#6366f1] text-white text-xs font-mono font-semibold transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[#6366f1]/20"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
        {saving ? 'Saving…' : hasSavedKey ? 'Update Key' : 'Save Key'}
      </button>

      {/* What AI can do */}
      <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-4 space-y-2.5">
        <p className="text-[10px] font-mono text-white/30 tracking-wider">WITH YOUR KEY, AI CAN</p>
        {[
          'Automatically diagnose and fix crashes on startup',
          'Read, edit, and write your bot files',
          'Install missing packages automatically',
          'Answer questions and explain errors in the AI chat',
        ].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <span className="text-emerald-500/50 text-[10px]">✓</span>
            <span className="text-[11px] font-mono text-white/35">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main FileManager component ───────────────────────────────────────────────

interface FileManagerProps {
  hasBot: boolean;
}

export default function FileManager({ hasBot }: FileManagerProps) {
  const queryClient = useQueryClient();
  const restartBot = useRestartBot();

  // Sub-tab: 'files' | 'ai'
  const [subTab, setSubTab] = useState<'files' | 'ai'>('files');

  // Tree state
  const [rootEntries, setRootEntries] = useState<FileEntry[] | null>(null);
  const [rootLoading, setRootLoading] = useState(false);
  const [treeRefreshToken, setTreeRefreshToken] = useState(0);

  // Editor state
  const [selectedEntry, setSelectedEntry] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isBinary, setIsBinary] = useState(false);
  const [fileTruncated, setFileTruncated] = useState(false);
  const [fileSize, setFileSize] = useState(0);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileSaving, setFileSaving] = useState(false);

  // Upload
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // New file/folder dialog
  const [newNameInput, setNewNameInput] = useState('');
  const [newNameMode, setNewNameMode] = useState<'file' | 'folder' | null>(null);
  const newNameRef = useRef<HTMLInputElement>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileEntry[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDirty = fileContent !== originalContent;

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults(null); setSearchLoading(false); return; }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const data = await apiFetch(`${BASE}/api/bots/files/search?q=${encodeURIComponent(q.trim())}`) as any;
        setSearchResults(data.results ?? []);
      } catch {
        toast.error('Search failed');
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 280);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSearchLoading(false);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  };

  const refreshRoot = useCallback(async () => {
    setRootLoading(true);
    try {
      const items = await listDir('');
      setRootEntries(items);
      setTreeRefreshToken((t) => t + 1);
    } catch {
      toast.error('Failed to load file tree');
    } finally {
      setRootLoading(false);
    }
  }, []);

  // Load root tree when tab becomes active and a bot exists
  useEffect(() => {
    if (hasBot && rootEntries === null && subTab === 'files') {
      refreshRoot();
    }
  }, [hasBot, rootEntries, refreshRoot, subTab]);

  const handleSelectFile = async (entry: FileEntry) => {
    if (entry.type !== 'file') return;
    if (isDirty && selectedEntry) {
      const ok = window.confirm('You have unsaved changes. Discard them and open another file?');
      if (!ok) return;
    }
    setSelectedEntry(entry);
    setFileLoading(true);
    setFileContent('');
    setOriginalContent('');
    setIsBinary(false);
    setFileTruncated(false);
    try {
      const result = await readFile(entry.path);
      setFileSize(result.size);
      setFileTruncated(result.truncated);
      if (result.isBinary) {
        setIsBinary(true);
      } else {
        const text = result.content ?? '';
        setFileContent(text);
        setOriginalContent(text);
        setIsBinary(false);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to open file');
      setSelectedEntry(null);
    } finally {
      setFileLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedEntry || isBinary || fileSaving) return;
    setFileSaving(true);
    try {
      await saveFile(selectedEntry.path, fileContent);
      setOriginalContent(fileContent);
      toast.success(`Saved — restart your bot to apply changes.`, {
        action: { label: 'Restart now', onClick: handleRestartBot },
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save file');
    } finally {
      setFileSaving(false);
    }
  };

  const handleRestartBot = () => {
    restartBot.mutate(undefined, {
      onSuccess: () => {
        toast.success('Bot restarted');
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
      },
      onError: (err: any) => {
        toast.error(`Restart failed: ${err?.data?.error || err?.message || 'Unknown error'}`);
      },
    });
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    const label = selectedEntry.type === 'directory' ? 'folder and all its contents' : 'file';
    const ok = window.confirm(`Delete this ${label}?\n\n${selectedEntry.path}`);
    if (!ok) return;
    try {
      await deleteEntry(selectedEntry.path);
      toast.success('Deleted');
      setSelectedEntry(null);
      setFileContent('');
      setOriginalContent('');
      await refreshRoot();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  const handleUpload = async (file: File) => {
    const targetDir = selectedEntry
      ? selectedEntry.type === 'directory'
        ? selectedEntry.path
        : selectedEntry.path.split('/').slice(0, -1).join('/')
      : '';
    setUploading(true);
    try {
      const result = await uploadFile(file, targetDir) as any;
      toast.success(`Uploaded ${file.name}`);
      await refreshRoot();
      if (result?.path) {
        const ext = result.path.split('.').pop();
        const textExts = ['js', 'ts', 'tsx', 'jsx', 'json', 'py', 'env', 'txt', 'md', 'sh', 'yml', 'yaml', 'toml', 'css', 'html', 'xml', 'csv', 'ini', 'properties', 'mjs', 'cjs'];
        if (textExts.includes(ext?.toLowerCase() ?? '')) {
          const fakeEntry: FileEntry = {
            name: file.name,
            path: result.path,
            type: 'file',
            size: file.size,
            extension: '.' + (ext ?? ''),
          };
          handleSelectFile(fakeEntry);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = '';
    }
  };

  const handleNewNameSubmit = async () => {
    const name = newNameInput.trim();
    if (!name) return;
    const base = selectedEntry
      ? selectedEntry.type === 'directory'
        ? selectedEntry.path
        : selectedEntry.path.split('/').slice(0, -1).join('/')
      : '';
    const fullPath = base ? `${base}/${name}` : name;
    try {
      if (newNameMode === 'folder') {
        await mkdirEntry(fullPath);
        toast.success('Folder created');
      } else {
        await saveFile(fullPath, '');
        toast.success('File created');
        const fakeEntry: FileEntry = {
          name,
          path: fullPath,
          type: 'file',
          size: 0,
          extension: '.' + name.split('.').pop(),
        };
        handleSelectFile(fakeEntry);
      }
      setNewNameMode(null);
      setNewNameInput('');
      await refreshRoot();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && selectedEntry && !isBinary) handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDirty, selectedEntry, isBinary, fileContent]); // eslint-disable-line

  useEffect(() => {
    if (newNameMode && newNameRef.current) {
      newNameRef.current.focus();
    }
  }, [newNameMode]);

  if (!hasBot) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
        {/* Sub-tab bar even when no bot */}
        <div className="flex items-center border-b border-border/40">
          {(['files', 'ai'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-mono tracking-wide border-b-2 transition-all duration-200 -mb-px ${
                subTab === tab
                  ? 'border-[#6366f1] text-white/75'
                  : 'border-transparent text-white/25 hover:text-white/50'
              }`}
            >
              {tab === 'files' ? <Folder className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
              {tab === 'files' ? 'Files' : 'AI Settings'}
            </button>
          ))}
        </div>
        {subTab === 'ai' ? (
          <AISettingsPanel />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-14 w-14 rounded-2xl border border-dashed border-border/50 flex items-center justify-center mb-4 opacity-40">
              <Folder className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-mono text-sm font-semibold text-muted-foreground tracking-widest mb-2">
              NO BOT UPLOADED YET
            </h3>
            <p className="text-xs font-mono text-muted-foreground/50 max-w-xs">
              Upload a bot .zip file first, then come back here to browse and edit your bot's files.
            </p>
          </div>
        )}
      </div>
    );
  }

  const extensions = selectedEntry ? getExtensions(selectedEntry.extension) : [];
  const currentDir = selectedEntry
    ? selectedEntry.type === 'directory'
      ? selectedEntry.path
      : selectedEntry.path.split('/').slice(0, -1).join('/')
    : '';

  return (
    <div
      className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden"
      style={{ minHeight: 520 }}
    >
      {/* Sub-tab bar */}
      <div className="flex items-center border-b border-border/40 bg-background/20">
        {(['files', 'ai'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-mono tracking-wide border-b-2 transition-all duration-200 -mb-px ${
              subTab === tab
                ? 'border-[#6366f1] text-white/75'
                : 'border-transparent text-white/25 hover:text-white/50'
            }`}
          >
            {tab === 'files' ? <Folder className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
            {tab === 'files' ? 'Files' : 'AI Settings'}
          </button>
        ))}
      </div>

      {/* AI Settings tab */}
      {subTab === 'ai' && <AISettingsPanel />}

      {/* Files tab */}
      {subTab === 'files' && (
        <>
          {/* Upload drop zone — prominent, full-width */}
          <div
            className="relative border-b border-border/30 bg-background/10"
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-[#6366f1]/5', 'border-[#6366f1]/30'); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('bg-[#6366f1]/5', 'border-[#6366f1]/30'); }}
            onDrop={async (e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('bg-[#6366f1]/5', 'border-[#6366f1]/30');
              const file = e.dataTransfer.files[0];
              if (file) handleUpload(file);
            }}
          >
            <button
              onClick={() => uploadRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 text-sm font-mono text-white/35 hover:text-white/65 hover:bg-[#6366f1]/[0.04] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading
                ? <Loader2 className="h-4 w-4 animate-spin text-[#6366f1]/60" />
                : <UploadCloud className="h-4 w-4 text-[#6366f1]/50" />}
              <span>{uploading ? 'Uploading…' : 'Upload file'}</span>
              {!uploading && (
                <span className="text-[10px] text-white/18 font-mono border border-white/[0.07] rounded px-1.5 py-0.5">
                  or drag & drop
                </span>
              )}
              {currentDir && !uploading && (
                <span className="text-[10px] font-mono text-white/20">→ {currentDir}/</span>
              )}
            </button>
            <input
              ref={uploadRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-background/20 flex-wrap">
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest mr-1">FILES</span>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] font-mono tracking-wider text-muted-foreground hover:text-foreground"
              onClick={() => { setNewNameMode('file'); setNewNameInput(''); }}
              title="New file"
            >
              <Plus className="h-3 w-3 mr-1" />
              NEW FILE
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] font-mono tracking-wider text-muted-foreground hover:text-foreground"
              onClick={() => { setNewNameMode('folder'); setNewNameInput(''); }}
              title="New folder"
            >
              <FolderPlus className="h-3 w-3 mr-1" />
              NEW FOLDER
            </Button>

            <div className="flex-1" />

            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] font-mono tracking-wider text-muted-foreground hover:text-foreground"
              onClick={refreshRoot}
              disabled={rootLoading}
              title="Refresh file tree"
            >
              <RefreshCw className={`h-3 w-3 ${rootLoading ? 'animate-spin' : ''}`} />
            </Button>

            {selectedEntry && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] font-mono tracking-wider text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                onClick={handleDelete}
                title="Delete selected"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                DELETE
              </Button>
            )}

            {selectedEntry && !isBinary && (
              <Button
                size="sm"
                className="h-7 px-3 text-[10px] font-mono tracking-wider bg-primary/80 hover:bg-primary text-primary-foreground border-0"
                onClick={handleSave}
                disabled={fileSaving || !isDirty}
                title="Save (Ctrl+S)"
              >
                {fileSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                {fileSaving ? 'SAVING...' : isDirty ? 'SAVE*' : 'SAVED'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-[10px] font-mono tracking-wider border-border/50 hover:border-primary/40"
              onClick={handleRestartBot}
              disabled={restartBot.isPending}
              title="Restart bot"
            >
              <RotateCw className={`h-3 w-3 mr-1 ${restartBot.isPending ? 'animate-spin' : ''}`} />
              {restartBot.isPending ? 'RESTARTING...' : 'RESTART BOT'}
            </Button>
          </div>

          {/* New name input bar */}
          {newNameMode && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-primary/20 bg-primary/5">
              <span className="text-[10px] font-mono text-primary/80 shrink-0">
                {newNameMode === 'folder' ? 'New folder name:' : 'New file name:'}
                {currentDir && <span className="text-muted-foreground"> in {currentDir}/</span>}
              </span>
              <input
                ref={newNameRef}
                value={newNameInput}
                onChange={(e) => setNewNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNewNameSubmit();
                  if (e.key === 'Escape') { setNewNameMode(null); setNewNameInput(''); }
                }}
                className="flex-1 bg-background/60 border border-primary/30 rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary/60"
                placeholder={newNameMode === 'folder' ? 'my-folder' : 'new-file.js'}
                spellCheck={false}
              />
              <Button size="sm" className="h-6 px-3 text-[10px] font-mono" onClick={handleNewNameSubmit}>
                CREATE
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] font-mono text-muted-foreground"
                onClick={() => { setNewNameMode(null); setNewNameInput(''); }}
              >
                CANCEL
              </Button>
            </div>
          )}

          {/* Main pane: sidebar + editor */}
          <div className="flex" style={{ height: 460 }}>

            {/* File tree sidebar */}
            <div className="w-56 shrink-0 border-r border-border/40 flex flex-col bg-background/20">
              {/* Search input */}
              <div className="px-2 py-2 border-b border-border/30">
                <div className="relative flex items-center">
                  {searchLoading
                    ? <Loader2 className="absolute left-2 h-3 w-3 animate-spin text-muted-foreground/40 pointer-events-none" />
                    : <Search className="absolute left-2 h-3 w-3 text-muted-foreground/40 pointer-events-none" />}
                  <input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search files…"
                    className="w-full bg-background/60 border border-border/40 rounded-md pl-7 pr-6 py-1.5 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
                    spellCheck={false}
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-1.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tree or search results */}
              <div className="flex-1 overflow-y-auto py-2">
                {searchQuery.trim() ? (
                  searchResults === null || searchLoading ? (
                    <div className="flex items-center gap-2 px-4 py-6 text-muted-foreground/50">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      <span className="text-[10px] font-mono">Searching…</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center px-3">
                      <Search className="h-5 w-5 text-muted-foreground/20 mb-2" />
                      <p className="text-[10px] font-mono text-muted-foreground/40">No matches found</p>
                      <p className="text-[9px] font-mono text-muted-foreground/25 mt-1">Searches by filename</p>
                    </div>
                  ) : (
                    <div>
                      <div className="px-3 pb-1">
                        <span className="text-[9px] font-mono text-muted-foreground/30 tracking-widest">{searchResults.length} RESULT{searchResults.length !== 1 ? 'S' : ''}</span>
                      </div>
                      {searchResults.map((entry) => {
                        const isSelected = selectedEntry?.path === entry.path;
                        const dir = entry.path.includes('/')
                          ? entry.path.split('/').slice(0, -1).join('/') + '/'
                          : '';
                        return (
                          <button
                            key={entry.path}
                            className={`w-full flex items-start gap-1.5 px-3 py-1.5 text-left transition-colors ${isSelected ? 'bg-primary/15' : 'hover:bg-white/5'}`}
                            onClick={() => { if (entry.type === 'file') handleSelectFile(entry); }}
                            title={entry.path}
                          >
                            <span className="mt-0.5 shrink-0">
                              {entry.type === 'directory'
                                ? <Folder className="h-3 w-3 text-yellow-400/60" />
                                : <FileIcon className={`h-3 w-3 ${isSelected ? 'text-primary' : 'text-muted-foreground/50'}`} />}
                            </span>
                            <span className="flex flex-col min-w-0">
                              <span className={`text-[11px] font-mono font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>{entry.name}</span>
                              {dir && <span className="text-[9px] font-mono text-muted-foreground/40 truncate">{dir}</span>}
                            </span>
                            {entry.type === 'file' && entry.size > 0 && (
                              <span className="ml-auto text-[9px] text-muted-foreground/30 shrink-0 mt-0.5">{humanSize(entry.size)}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )
                ) : (
                  rootLoading && rootEntries === null ? (
                    <div className="flex items-center gap-2 px-4 py-6 text-muted-foreground/50">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-[10px] font-mono">Loading...</span>
                    </div>
                  ) : rootEntries === null ? (
                    <div className="px-4 py-6 text-[10px] font-mono text-muted-foreground/40">
                      No files found
                    </div>
                  ) : rootEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center px-3">
                      <Folder className="h-6 w-6 text-muted-foreground/20 mb-2" />
                      <p className="text-[10px] font-mono text-muted-foreground/40">Empty directory</p>
                      <p className="text-[10px] font-mono text-muted-foreground/30 mt-1">Upload a file to get started</p>
                    </div>
                  ) : (
                    rootEntries.map((entry) => (
                      <TreeNode
                        key={entry.path}
                        entry={entry}
                        depth={0}
                        selectedPath={selectedEntry?.path ?? null}
                        onSelect={handleSelectFile}
                        refreshToken={treeRefreshToken}
                      />
                    ))
                  )
                )}
              </div>
            </div>

            {/* Editor pane */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {fileLoading ? (
                <div className="flex items-center justify-center flex-1 gap-2 text-muted-foreground/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs font-mono">Opening file...</span>
                </div>
              ) : !selectedEntry ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center p-6">
                  <FileIcon className="h-8 w-8 text-muted-foreground/15" />
                  <div>
                    <p className="text-xs font-mono text-muted-foreground/40">Select a file from the sidebar to edit it</p>
                    <p className="text-[10px] font-mono text-muted-foreground/25 mt-1">Ctrl+S to save · Syntax highlighting for .js .ts .json .py .env</p>
                  </div>
                </div>
              ) : isBinary ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center p-6">
                  <Binary className="h-8 w-8 text-muted-foreground/20" />
                  <div>
                    <p className="text-xs font-mono text-muted-foreground/50 font-semibold">{selectedEntry.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground/30 mt-1">
                      Binary file ({humanSize(fileSize)}) — cannot be edited as text.
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground/30 mt-0.5">
                      Use Upload to replace it with a new version.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Editor header */}
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 bg-background/40 shrink-0">
                    <FileIcon className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                    <span className="text-[10px] font-mono text-muted-foreground truncate">{selectedEntry.path}</span>
                    {isDirty && <span className="ml-auto text-[10px] font-mono text-yellow-400/80 shrink-0">● UNSAVED</span>}
                    {fileTruncated && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-orange-400/70 shrink-0">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        TRUNCATED (file &gt;4MB)
                      </span>
                    )}
                  </div>

                  {/* CodeMirror editor */}
                  <div className="flex-1 overflow-auto">
                    <CodeMirror
                      value={fileContent}
                      height="100%"
                      minHeight="420px"
                      theme={oneDark}
                      extensions={extensions}
                      onChange={(val) => setFileContent(val)}
                      basicSetup={{
                        lineNumbers: true,
                        foldGutter: true,
                        dropCursor: true,
                        allowMultipleSelections: false,
                        indentOnInput: true,
                        bracketMatching: true,
                        closeBrackets: true,
                        autocompletion: true,
                        highlightSelectionMatches: true,
                        searchKeymap: true,
                      }}
                      style={{ fontSize: '12px', fontFamily: 'var(--font-mono, monospace)' }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
