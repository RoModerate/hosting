import { useRef, useState } from 'react';
import { Github, UploadCloud, Loader2, XCircle, CheckCircle2, X, ChevronRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

const LANGUAGES = [
  {
    id: 'nodejs',
    label: 'Node.js',
    note: 'discord.js · Eris · Sapphire',
    requirement: 'package.json with a "start" script',
  },
  {
    id: 'python',
    label: 'Python',
    note: 'discord.py · py-cord · hikari',
    requirement: 'main.py or requirements.txt at root',
  },
  {
    id: 'java',
    label: 'Java',
    note: 'JDA · Javacord · D4J',
    requirement: 'pom.xml or build.gradle at root',
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
    if (!file.name.toLowerCase().endsWith('.zip')) { setError('Only .zip files are accepted.'); return; }
    if (file.size === 0) { setError('The selected file is empty.'); return; }
    if (file.size > MAX_UPLOAD_BYTES) { setError('File exceeds the 100 MB limit.'); return; }

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

    const finish = () => { setIsUploading(false); setUploadProgress(0); };

    xhr.addEventListener('load', () => {
      if (xhr.status === 202) {
        finish();
        toast.success('Bot deployed! Watch the status panel.');
        onDeployed();
        onClose();
        return;
      }
      finish();
      try {
        const d = JSON.parse(xhr.responseText);
        setError(d?.error || 'Upload failed.');
      } catch {
        setError(xhr.status === 413 ? 'File too large (max 100 MB).' : 'Upload failed.');
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
      setError('Enter a valid GitHub URL (https://github.com/user/repo).'); return;
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
      if (!res.ok) { setError(data?.error || 'GitHub deploy failed.'); return; }
      toast.success('Deploying from GitHub — watch the status panel.');
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-xl border border-white/[0.08] bg-[#111116] overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            {step === 'upload' && (
              <button
                onClick={() => { setStep('language'); setError(null); }}
                className="text-white/25 hover:text-white/60 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h2 className="font-mono font-bold text-sm text-white/85">
                {step === 'language' ? 'Deploy Bot' : `Deploy · ${lang?.label}`}
              </h2>
              <p className="text-[10px] font-mono text-white/25 mt-0.5">
                {step === 'language' ? 'Step 1 of 2 — Select runtime' : 'Step 2 of 2 — Upload source'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/25 hover:text-white/60 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">

          {/* ── Step 1: Language ── */}
          {step === 'language' && (
            <div className="space-y-4">
              <p className="text-xs font-mono text-white/35">Choose the runtime your bot is built with.</p>

              <div className="space-y-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLang(l.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors text-left ${
                      selectedLang === l.id
                        ? 'border-[#5c6cf5]/40 bg-[#5c6cf5]/[0.07]'
                        : 'border-white/[0.07] hover:border-white/[0.12] hover:bg-white/[0.02]'
                    }`}
                  >
                    <div>
                      <div className={`text-sm font-mono font-semibold ${selectedLang === l.id ? 'text-white/85' : 'text-white/55'}`}>
                        {l.label}
                      </div>
                      <div className="text-[10px] font-mono text-white/25 mt-0.5">{l.note}</div>
                    </div>
                    {selectedLang === l.id && <CheckCircle2 className="h-4 w-4 text-[#5c6cf5]/80 shrink-0" />}
                  </button>
                ))}
              </div>

              {selectedLang && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-white/[0.06] bg-white/[0.02]">
                  <span className="text-[10px] font-mono text-white/25">Requires:</span>
                  <span className="text-[10px] font-mono text-white/50">{lang?.requirement}</span>
                </div>
              )}

              <button
                onClick={() => selectedLang && setStep('upload')}
                disabled={!selectedLang}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-md text-sm font-semibold bg-[#3d4df0] hover:bg-[#4b5af2] text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-mono"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Method toggle */}
              <div className="flex rounded-lg border border-white/[0.07] p-1 bg-white/[0.02] gap-1">
                {(['zip', 'github'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setUploadMethod(m); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-mono font-semibold transition-all ${
                      uploadMethod === m
                        ? 'bg-white/[0.07] text-white/80'
                        : 'text-white/30 hover:text-white/55'
                    }`}
                  >
                    {m === 'zip' ? <UploadCloud className="h-3.5 w-3.5" /> : <Github className="h-3.5 w-3.5" />}
                    {m === 'zip' ? 'ZIP Upload' : 'GitHub'}
                  </button>
                ))}
              </div>

              {/* ZIP drop area */}
              {uploadMethod === 'zip' && (
                <div className="space-y-3">
                  <div
                    className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
                      isDragging
                        ? 'border-[#5c6cf5]/40 bg-[#5c6cf5]/[0.05]'
                        : isUploading
                        ? 'border-blue-500/30 bg-blue-500/[0.04] cursor-default'
                        : 'border-white/[0.08] hover:border-white/[0.15]'
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
                        <Loader2 className="h-7 w-7 text-blue-400/70 animate-spin" />
                        <div>
                          <p className="font-mono text-xs text-blue-400/70 font-semibold">
                            {uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Processing…'}
                          </p>
                          {uploadProgress > 0 && uploadProgress < 100 && (
                            <div className="mt-2 w-32 mx-auto bg-white/[0.06] rounded-full h-0.5 overflow-hidden">
                              <div className="h-full bg-blue-400/60 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                            </div>
                          )}
                          <p className="text-[10px] font-mono text-white/20 mt-2">Don't close this window</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <UploadCloud className="h-7 w-7 text-white/15" />
                        <div>
                          <p className="font-mono text-sm font-semibold text-white/50">Drop your ZIP here</p>
                          <p className="text-[11px] font-mono text-white/25 mt-1">or click to browse · max 100 MB</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    {[lang?.requirement || 'Start script required', 'Set secrets before deploying', 'Max 100 MB zip'].map((r) => (
                      <div key={r} className="flex items-center gap-2">
                        <span className="text-white/20 text-[10px]">·</span>
                        <span className="text-[10px] font-mono text-white/30">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GitHub */}
              {uploadMethod === 'github' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-white/30 tracking-wider">REPOSITORY URL</label>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                      <input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => { setGithubUrl(e.target.value); setError(null); }}
                        placeholder="https://github.com/user/my-bot"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/[0.08] bg-[#0e0e13] font-mono text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#5c6cf5]/40 transition-colors"
                        spellCheck={false}
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    {[
                      'Public repositories only',
                      'Default branch is cloned automatically',
                      lang?.requirement || 'Runtime entry point must be present',
                    ].map((r) => (
                      <div key={r} className="flex items-center gap-2">
                        <span className="text-white/20 text-[10px]">·</span>
                        <span className="text-[10px] font-mono text-white/30">{r}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={doGithubDeploy}
                    disabled={isUploading || !githubUrl.trim()}
                    className="w-full flex items-center justify-center gap-2 h-10 rounded-md text-sm font-semibold bg-[#3d4df0] hover:bg-[#4b5af2] text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-mono"
                  >
                    {isUploading ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cloning…</>
                    ) : (
                      <><Github className="h-3.5 w-3.5" /> Deploy from GitHub</>
                    )}
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg border border-red-500/15 bg-red-500/[0.05]">
                  <XCircle className="h-4 w-4 text-red-400/70 shrink-0 mt-0.5" />
                  <p className="text-xs font-mono text-red-300/70">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
