import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-white" style={{ background: '#09090f' }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.14]"
          style={{ backgroundImage: 'radial-gradient(rgba(139,92,246,0.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] opacity-15"
          style={{ background: 'radial-gradient(ellipse, #7c3aed 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative text-center max-w-sm">
        <p className="text-[80px] font-black text-white/[0.06] leading-none mb-2 select-none">404</p>
        <div className="h-10 w-10 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 8px 32px rgba(124,58,237,0.3)' }}>
          <img src="/lumora-brand.png" alt="" className="h-6 w-6 object-contain brightness-200" />
        </div>
        <h1 className="text-[22px] font-bold text-white tracking-tight mb-2">Page not found</h1>
        <p className="text-[14px] text-white/38 leading-relaxed mb-8">
          This page doesn't exist. It may have been moved or the URL might be wrong.
        </p>
        <button onClick={() => setLocation('/')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:-translate-y-px"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}>
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </button>
      </div>
    </div>
  );
}
