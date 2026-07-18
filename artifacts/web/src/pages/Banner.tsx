/**
 * YouTube banner preview — visit /banner to see it.
 * Renders at exactly 1280×720 to match the screenshot viewport.
 */

const LANGS = [
  { name: 'Python',     bg: '#3776AB', text: '#FFD343', label: 'PY' },
  { name: 'JavaScript', bg: '#F7DF1E', text: '#000000', label: 'JS' },
  { name: 'TypeScript', bg: '#3178C6', text: '#ffffff', label: 'TS' },
  { name: 'Java',       bg: '#ED8B00', text: '#ffffff', label: 'JV' },
  { name: 'Go',         bg: '#00ADD8', text: '#ffffff', label: 'GO' },
  { name: 'Rust',       bg: '#CE4223', text: '#ffffff', label: 'RS' },
  { name: 'C#',         bg: '#9B4F96', text: '#ffffff', label: 'C#' },
  { name: 'Ruby',       bg: '#CC342D', text: '#ffffff', label: 'RB' },
];

export default function Banner() {
  return (
    <div
      style={{
        width: 1280,
        height: 720,
        overflow: 'hidden',
        position: 'relative',
        background: '#080810',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* ── Grid overlay ─────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '56px 56px',
          pointerEvents: 'none',
        }}
      />

      {/* ── Radial glow — top centre ─────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: -160,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 900,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)',
          opacity: 0.11,
          pointerEvents: 'none',
          filter: 'blur(2px)',
        }}
      />

      {/* ── Bottom-left accent glow ──────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: -80,
          left: -60,
          width: 400,
          height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, #818cf8 0%, transparent 70%)',
          opacity: 0.07,
          pointerEvents: 'none',
        }}
      />

      {/* ── Corner accent lines ───────────────────────────────────── */}
      <div style={{ position: 'absolute', top: 28, left: 28, width: 48, height: 2, background: '#6366f1', opacity: 0.5 }} />
      <div style={{ position: 'absolute', top: 28, left: 28, width: 2, height: 48, background: '#6366f1', opacity: 0.5 }} />
      <div style={{ position: 'absolute', top: 28, right: 28, width: 48, height: 2, background: '#6366f1', opacity: 0.5 }} />
      <div style={{ position: 'absolute', top: 28, right: 28, width: 2, height: 48, background: '#6366f1', opacity: 0.5 }} />
      <div style={{ position: 'absolute', bottom: 28, left: 28, width: 48, height: 2, background: '#6366f1', opacity: 0.5 }} />
      <div style={{ position: 'absolute', bottom: 28, left: 28, width: 2, height: 48, background: '#6366f1', opacity: 0.5 }} />
      <div style={{ position: 'absolute', bottom: 28, right: 28, width: 48, height: 2, background: '#6366f1', opacity: 0.5 }} />
      <div style={{ position: 'absolute', bottom: 28, right: 28, width: 2, height: 48, background: '#6366f1', opacity: 0.5 }} />

      {/* ── Top nav row: logo left, badge right ──────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 36,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 56px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/lumora-brand.png"
            alt="Lumora"
            style={{ height: 32, width: 32, objectFit: 'contain' }}
          />
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '0.22em',
              color: 'rgba(255,255,255,0.85)',
              textTransform: 'uppercase',
            }}
          >
            LUMORA
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 14px',
            borderRadius: 40,
            border: '1px solid rgba(99,102,241,0.25)',
            background: 'rgba(99,102,241,0.07)',
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6ee7b7', boxShadow: '0 0 6px #6ee7b7' }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em' }}>
            FREE · ALWAYS ON
          </span>
        </div>
      </div>

      {/* ── Main content block ────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
          zIndex: 1,
          marginTop: -20,
          marginRight: 200,
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.35em',
            color: 'rgba(99,102,241,0.75)',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          FREE 24/7
        </div>

        {/* Headline row 1 */}
        <div
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 800,
            fontSize: 108,
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            textAlign: 'center',
          }}
        >
          DISCORD BOT
        </div>

        {/* Headline row 2 — accented */}
        <div
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 800,
            fontSize: 108,
            lineHeight: 1.0,
            letterSpacing: '-0.03em',
            color: '#6366f1',
            textAlign: 'center',
          }}
        >
          HOSTING
        </div>

        {/* Divider */}
        <div
          style={{
            width: 64,
            height: 2,
            background: 'rgba(99,102,241,0.35)',
            margin: '20px auto 18px',
          }}
        />

        {/* Sub-line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {['Auto AI Repair', 'GitHub Import', 'Instant Deploy', 'Always Online'].map((item, i) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.06em' }}>
                {item}
              </span>
              {i < 3 && (
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(99,102,241,0.4)', display: 'inline-block' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Large Lumora icon — right side, no card box ───────────── */}
      <div
        style={{
          position: 'absolute',
          right: 68,
          top: '50%',
          transform: 'translateY(-55%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Soft glow behind icon */}
        <div
          style={{
            position: 'absolute',
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)',
            filter: 'blur(24px)',
          }}
        />
        <img
          src="/lumora-brand.png"
          alt=""
          style={{ width: 160, height: 160, objectFit: 'contain', position: 'relative' }}
        />
      </div>

      {/* ── Language badges strip ─────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 50,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.18em', marginRight: 6 }}>
          SUPPORTS
        </span>
        {LANGS.map((lang) => (
          <div
            key={lang.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 6,
              background: lang.bg + '22',
              border: `1px solid ${lang.bg}44`,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                background: lang.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 7, color: lang.text, lineHeight: 1 }}>
                {lang.label}
              </span>
            </div>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>
              {lang.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
