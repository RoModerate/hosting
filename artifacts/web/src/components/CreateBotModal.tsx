import { useRef, useState } from 'react';
import { Github, UploadCloud, Loader2, XCircle, CheckCircle2, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

const LANGUAGES = [
  {
    id: 'nodejs',
    emoji: '🟩',
    label: 'Node.js',
    desc: 'discord.js, Eris, etc.',
    color: 'hover:border-emerald-500/50 hover:bg-emerald-500/8 data-[sel=true]:border-emerald-500/50 data-[sel=true]:bg-emerald-500/10',
    accent: 'text-emerald-400',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    requirement: 'package.json with a "start" script',
  },
  {
    id: 'python',
    emoji: '🐍',
    label: 'Python',
    desc: 'discord.py, py-cord, etc.',
    color: 'hover:border-blue-500/50 hover:bg-blue-500/8 data-[sel=true]:border-blue-500/50 data-[sel=true]:bg-blue-500/10',
    accent: 'text-blue-400',
    badge: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    requirement: 'main.py or requirements.txt',
  },
  {
    id: 'java',
    emoji: '☕',
    label: 'Java',
    desc: 'JDA, Javacord, etc.',
    color: 'hover:border-orange-500/50 hover:bg-orange-500/8 data-[sel=true]:border-orange-500/50 data-[sel=true]:bg-orange-500/10',
    accent: 'text-orange-400',
    badge: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
    requirement: 'pom.xml or build.gradle',
  },
];

type Step = 'language' | 'upload';
type UploadMethod = 'zip' | 'github';

interface Props {
  onClose: () => void;
  onDeployed: () => void;
}

export default function CreateBotModal({ onClose, onDeployed }: Props) {
  const [step, setStep] = useState<Step>('language');
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('zip');
  const [githubUrl, setGithubUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lang = LANGUAGES.find((l) => l.id === selectedLang);

  const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

  const doZipUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Only .zip files are supported.');
      return;
    }
    if (file.size === 0) {
      setError('The selected file is empty.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('File is too large. Max size is 100MB.');
      return;
    }

    setError(null);
    setUploadProgress(0);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    if (selectedLang) formData.append('language', selectedLang);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/api/bots/upload`, true);
    xhr.withCredentials = true;
    xhr.timeout = 5 * 60 * 1000;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    });

    const finish = () => {
      setIsUploading(false);
      setUploadProgress(0);
    };

    xhr.addEventListener('load', () => {
      if (xhr.status === 202) {
        setUploadProgress(100);
        finish();
        toast.success('Bot deployed! Monitoring status in dashboard.');
        onDeployed();
        onClose();
        return;
      }
      finish();
      try {
        const d = JSON.parse(xhr.responseText);
        setError(d?.error || 'Upload failed.');
      } catch {
        setError(xhr.status === 413 ? 'File too large (max 100MB).' : 'Upload failed.');
      }
    });
    xhr.addEventListener('error', () => { finish(); setError('Upload failed — connection interrupted.'); });
    xhr.addEventListener('abort', () => { finish(); setError('Upload cancelled.'); });
    xhr.addEventListener('timeout', () => { finish(); setError('Upload timed out.'); });

    xhr.send(formData);
  };

  const doGithubDeploy = async () => {
    const url = githubUrl.trim();
    if (!url) { setError('Please enter a GitHub repository URL.'); return; }
    if (!url.startsWith('https://github.com/') && !url.startsWith('http://github.com/')) {
      setError('Please enter a valid GitHub URL (https://github.com/...).');
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const res = await fetch(`${BASE}/api/bots/deploy-github`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: url, language: selectedLang }),
      });
      const data = await res.json() as any;
      if (!res.ok) {
        setError(data?.error || 'GitHub deploy failed.');
        return;
      }
      toast.success('Bot deployed from GitHub! Monitoring status in dashboard.');
      onDeployed();
      onClose();
    } catch {
      setError('GitHub deploy failed — check your connection.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(12,11,22,0.98) 0%, rgba(8,7,18,0.99) 100%)', boxShadow: '0 0 0 1px rgba(139,92,246,0.12), 0 32px 80px rgba(0,0,0,0.7)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
          <div className="flex items-center gap-3">
            {step === 'upload' && (
              <button
                onClick={() => { setStep('language'); setError(null); }}
                className="text-white/30 hover:text-white/60 transition-colors text-xs font-mono"
              >
                ← back
              </button>
            )}
            <div>
              <h2 className="font-mono font-bold text-sm tracking-wider text-white">
                {step === 'language' ? 'NEW BOT' : `DEPLOY · ${lang?.label.toUpperCase()}`}
              </h2>
              <p className="text-[10px] font-mono text-white/30 mt-0.5">
                {step === 'language' ? 'Step 1 of 2 — Select runtime' : 'Step 2 of 2 — Upload source'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {/* ── Step 1: Language selection ── */}
          {step === 'language' && (
            <div className="space-y-4">
              <p className="text-xs font-mono text-white/40">Choose the runtime your bot is built with.</p>
              <div className="grid grid-cols-3 gap-3">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    data-sel={selectedLang === l.id}
                    onClick={() => setSelectedLang(l.id)}
                    className={`flex flex-col items-center gap-2 rounded-xl border border-white/8 bg-white/2 p-4 transition-all cursor-pointer ${l.color}`}
                  >
                    <span className="text-2xl">{l.emoji}</span>
                    <span className={`text-xs font-mono font-bold ${selectedLang === l.id ? l.accent : 'text-white/60'}`}>{l.label}</span>
                    <span className="text-[9px] font-mono text-white/30 text-center leading-tight">{l.desc}</span>
                    {selectedLang === l.id && (
                      <CheckCircle2 className={`h-3.5 w-3.5 ${l.accent}`} />
                    )}
                  </button>
                ))}
              </div>

              {selectedLang && (
                <div className="rounded-lg border border-white/6 bg-white/2 px-4 py-3 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white/30">Requires:</span>
                  <span className="text-[10px] font-mono text-white/60">{lang?.requirement}</span>
                </div>
              )}

              <Button
                onClick={() => selectedLang && setStep('upload')}
                disabled={!selectedLang}
                className="w-full h-10 font-mono text-xs tracking-widest bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white border-0"
              >
                Continue
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}

          {/* ── Step 2: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Upload method toggle */}
              <div className="flex rounded-xl border border-white/8 p-1 bg-white/2 gap-1">
                {(['zip', 'github'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setUploadMethod(m); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
                      uploadMethod === m
                        ? 'bg-violet-600 text-white shadow-md'
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {m === 'zip' ? <UploadCloud className="h-3.5 w-3.5" /> : <Github className="h-3.5 w-3.5" />}
                    {m === 'zip' ? 'ZIP Upload' : 'GitHub'}
                  </button>
                ))}
              </div>

              {/* ZIP upload area */}
              {uploadMethod === 'zip' && (
                <div className="space-y-3">
                  <div
                    className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
                      isDragging
                        ? 'border-violet-500/60 bg-violet-500/6 scale-[1.01]'
                        : isUploading
                        ? 'border-blue-500/40 bg-blue-500/5 cursor-default'
                        : 'border-white/10 hover:border-violet-500/40 hover:bg-violet-500/4'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault(); setIsDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file) doZipUpload(file);
                    }}
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) doZipUpload(file);
                        e.target.value = '';
                      }}
                    />
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                        <div>
                          <p className="font-mono text-xs text-blue-400 font-bold tracking-wider">
                            {uploadProgress < 100 ? `UPLOADING… ${uploadProgress}%` : 'PROCESSING...'}
                          </p>
                          {uploadProgress > 0 && uploadProgress < 100 && (
                            <div className="mt-2 mx-4 bg-blue-500/10 rounded-full h-1 overflow-hidden">
                              <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                            </div>
                          )}
                          <p className="text-[10px] font-mono text-white/30 mt-1.5">Do not close this window</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 rounded-full border border-white/10 bg-white/4 flex items-center justify-center">
                          <UploadCloud className="h-6 w-6 text-white/40" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-bold text-white/70">Drop your ZIP here</p>
                          <p className="text-[11px] font-mono text-white/30 mt-1">or click to browse · max 100MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {[
                      lang?.requirement || 'Start script required',
                      'Add bot secrets in dashboard before uploading',
                      'Max 100MB zip',
                    ].map((r) => (
                      <li key={r} className="flex items-center gap-2">
                        <span className="text-violet-400/50 text-[10px]">▸</span>
                        <span className="text-[10px] font-mono text-white/35">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* GitHub import */}
              {uploadMethod === 'github' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-white/40 tracking-wider">REPOSITORY URL</label>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => { setGithubUrl(e.target.value); setError(null); }}
                        placeholder="https://github.com/user/my-bot"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/8 bg-white/3 font-mono text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                        spellCheck={false}
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/6 bg-white/2 px-4 py-3 space-y-1">
                    {[
                      'Public repositories only (no auth token required)',
                      'Default branch is cloned and zipped automatically',
                      lang?.requirement || 'Runtime entry point must be present',
                    ].map((r) => (
                      <div key={r} className="flex items-center gap-2">
                        <span className="text-violet-400/50 text-[10px]">▸</span>
                        <span className="text-[10px] font-mono text-white/35">{r}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={doGithubDeploy}
                    disabled={isUploading || !githubUrl.trim()}
                    className="w-full h-10 font-mono text-xs tracking-widest bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white border-0"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        CLONING REPO...
                      </>
                    ) : (
                      <>
                        <Github className="h-3.5 w-3.5 mr-2" />
                        DEPLOY FROM GITHUB
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-500/25 bg-red-500/8 px-4 py-3 flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs font-mono text-red-300/80">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
