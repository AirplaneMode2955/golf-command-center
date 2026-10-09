import type { ReactNode } from 'react';

const TAU = Math.PI * 2;

export const RESULT_COLORS = {
  eagles: '#fde047',
  birdies: '#4ade80',
  pars: '#7dd3fc',
  bogeys: '#fb923c',
  doubles: '#fb7185',
} as const;

function polar(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

/** Arc path between two angles (radians, 0 = right, clockwise) on a circle. */
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p0.x.toFixed(2)},${p0.y.toFixed(2)} A${r},${r} 0 ${large} 1 ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
}

/** Donut split into parts. Centre shows whatever you pass as children. */
export function Donut({ parts, size = 168, label, children }: { parts: { value: number; color: string; label: string }[]; size?: number; label: string; children?: ReactNode }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const c = size / 2;
  const r = c - 12;
  let a = -Math.PI / 2;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <svg width={size} height={size} role="img" aria-label={label}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={20} />
        {parts.map((p) => {
          if (p.value <= 0) return null;
          const sweep = (p.value / total) * TAU;
          const gap = parts.filter((x) => x.value > 0).length > 1 ? 0.025 : 0;
          const d = arc(c, c, r, a + gap / 2, a + Math.max(sweep - gap / 2, gap / 2 + 0.001));
          a += sweep;
          return <path key={p.label} d={d} fill="none" stroke={p.color} strokeWidth={20}><title>{`${p.label}: ${p.value}`}</title></path>;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  );
}

/** One circular progress ring with a value inside and a caption below. */
export function Ring({ pct, value, caption, sub, color }: { pct: number; value: string; caption: string; sub?: string; color: string }) {
  const size = 92;
  const c = size / 2;
  const r = c - 8;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ textAlign: 'center', minWidth: 0 }}>
      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
        <svg width={size} height={size} role="img" aria-label={`${caption} ${value}`}>
          <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={9} />
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={`${(p / 100) * circ} ${circ}`}
            transform={`rotate(-90 ${c} ${c})`}
          />
        </svg>
        <div className="num" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>
          {value}
        </div>
      </div>
      <div style={{ marginTop: 6, fontWeight: 600, fontSize: 15 }}>{caption}</div>
      {sub ? <div style={{ color: 'var(--dim)', fontSize: 14 }}>{sub}</div> : null}
    </div>
  );
}

/** Half-circle gauge: left miss, hit, right miss. Everything is a share of the holes tracked. */
export function FairwayGauge({ left, hit, right, other, count }: { left: number; hit: number; right: number; other: number; count: number }) {
  const W = 260;
  const cx = W / 2;
  const cy = 128;
  const r = 100;
  const total = count || 1;
  const segs = [
    { v: left, color: '#fb7185', label: 'Left' },
    { v: hit, color: '#4ade80', label: 'Fairway' },
    { v: right, color: '#fb7185', label: 'Right' },
    { v: Math.max(other, 0), color: '#6b7280', label: 'Other' },
  ];
  let a = Math.PI;
  const gap = 0.018;
  const pct = (v: number) => `${((v / total) * 100).toFixed(1)}%`;
  return (
    <div style={{ maxWidth: 300, margin: '0 auto' }}>
      <svg viewBox={`0 0 ${W} 178`} width="100%" role="img" aria-label={`Fairways hit ${pct(hit)}, left ${pct(left)}, right ${pct(right)}`}>
        <path d={arc(cx, cy, r, Math.PI, 2 * Math.PI)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={22} />
        {segs.map((s) => {
          if (s.v <= 0) return null;
          const sweep = (s.v / total) * Math.PI;
          const d = arc(cx, cy, r, a + gap, a + Math.max(sweep - gap, gap + 0.002));
          a += sweep;
          return <path key={s.label} d={d} fill="none" stroke={s.color} strokeWidth={22}><title>{`${s.label}: ${pct(s.v)}`}</title></path>;
        })}
        <text x={cx} y={cy - 18} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 38, fontWeight: 700 }}>
          {(pct(hit)).replace('%', '')}
          <tspan style={{ fontSize: 18 }}>%</tspan>
        </text>
        <text x={cx} y={cy + 4} textAnchor="middle" style={{ fill: 'var(--dim)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
          fairways hit
        </text>
        <text x={cx - r} y={cy + 24} textAnchor="middle" style={{ fill: '#fb7185', fontSize: 16, fontWeight: 600 }}>
          {pct(left)}
        </text>
        <text x={cx - r} y={cy + 42} textAnchor="middle" style={{ fontSize: 13, fontFamily: 'var(--font-sans)' }}>
          left
        </text>
        <text x={cx + r} y={cy + 24} textAnchor="middle" style={{ fill: '#fb7185', fontSize: 16, fontWeight: 600 }}>
          {pct(right)}
        </text>
        <text x={cx + r} y={cy + 42} textAnchor="middle" style={{ fontSize: 13, fontFamily: 'var(--font-sans)' }}>
          right
        </text>
      </svg>
    </div>
  );
}

/** Wheel like the one in the 18Birdies score screen: four miss wedges around a green centre showing GIR %. */
export function GirWheel({ hit, count, long, left, right, short, noChance }: { hit: number; count: number; long: number; left: number; right: number; short: number; noChance: number }) {
  const S = 260;
  const c = S / 2;
  const R = 122;
  const total = long + left + right + short || 1;
  // Wedge angles: right (-45..45), bottom (45..135), left (135..225), top (225..315)
  const wedge = (a0: number, a1: number, v: number) => {
    const p0 = polar(c, c, R, a0);
    const p1 = polar(c, c, R, a1);
    const op = 0.12 + 0.6 * (v / total);
    return { d: `M${c},${c} L${p0.x},${p0.y} A${R},${R} 0 0 1 ${p1.x},${p1.y} Z`, op };
  };
  const deg = (d: number) => (d * Math.PI) / 180;
  const w = {
    right: wedge(deg(-45), deg(45), right),
    short: wedge(deg(45), deg(135), short),
    left: wedge(deg(135), deg(225), left),
    long: wedge(deg(225), deg(315), long),
  };
  const sharePct = (v: number) => `${Math.round((v / total) * 100)}%`;
  const txt = (x: number, y: number, name: string, v: number) => (
    <g>
      <text x={x} y={y - 2} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
        {name}
      </text>
      <text x={x} y={y + 16} textAnchor="middle" style={{ fill: 'var(--dim)', fontSize: 13 }}>
        {v} · {sharePct(v)}
      </text>
    </g>
  );
  return (
    <div style={{ maxWidth: 300, margin: '0 auto' }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" role="img" aria-label="Greens in regulation and where misses ended up">
        <circle cx={c} cy={c} r={R} fill="var(--card-2)" stroke="var(--line-2)" />
        {(['long', 'right', 'short', 'left'] as const).map((k) => (
          <path key={k} d={w[k].d} fill="#fb7185" fillOpacity={w[k].op} stroke="var(--card)" strokeWidth={3} />
        ))}
        {txt(c, 52, 'Long', long)}
        {txt(c + 82, c + 2, 'Right', right)}
        {txt(c, S - 60, 'Short', short)}
        {txt(c - 82, c + 2, 'Left', left)}
        <circle cx={c} cy={c} r={46} fill="#16a34a" stroke="var(--card)" strokeWidth={4} />
        <text x={c} y={c + 4} textAnchor="middle" style={{ fill: '#fff', fontSize: 26, fontWeight: 700 }}>
          {count ? Math.round((hit / count) * 100) : 0}%
        </text>
        <text x={c} y={c + 22} textAnchor="middle" style={{ fill: '#dcfce7', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
          on green
        </text>
      </svg>
      <div className="sub" style={{ textAlign: 'center', marginTop: 6 }}>
        No chance to hit green: <b className="num" style={{ color: 'var(--text)' }}>{noChance}</b> holes
      </div>
    </div>
  );
}
