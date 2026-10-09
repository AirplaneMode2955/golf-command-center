'use client';

import { useEffect, useRef, useState } from 'react';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setW(Math.max(260, Math.floor(el.clientWidth)));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export type Pt = { x: number; y: number; hollow?: boolean; tip?: string };
export type Series = { points: Pt[]; kind: 'dots' | 'line'; color: string };

function niceTicks(min: number, max: number, target = 7): number[] {
  const span = Math.max(max - min, 1e-9);
  const raw = span / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/** Time on x, any number on y. Dots for individual rounds, a line for a smoothed trend. */
export function TimeChart({
  series,
  height = 240,
  fmtY = (v: number) => String(v),
  label,
}: {
  series: Series[];
  height?: number;
  fmtY?: (v: number) => string;
  label: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return <div className="empty">Not enough data yet.</div>;

  const m = { l: 44, r: 8, t: 8, b: 24 };
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const pad = (Math.max(...ys) - Math.min(...ys) || 1) * 0.08;
  const ticks = niceTicks(Math.min(...ys) - pad, Math.max(...ys) + pad);
  const y0 = Math.min(ticks[0], Math.min(...ys) - pad);
  const y1 = Math.max(ticks[ticks.length - 1], Math.max(...ys) + pad);
  const iw = w - m.l - m.r;
  const ih = height - m.t - m.b;
  const X = (v: number) => m.l + (x1 === x0 ? iw / 2 : ((v - x0) / (x1 - x0)) * iw);
  const Y = (v: number) => m.t + ih - ((v - y0) / (y1 - y0 || 1)) * ih;

  const yearTicks: { x: number; label: string }[] = [];
  for (let y = new Date(x0).getFullYear() + 1; y <= new Date(x1).getFullYear(); y++) {
    yearTicks.push({ x: new Date(y, 0, 1).getTime(), label: String(y) });
  }
  const thin = iw / Math.max(yearTicks.length, 1) < 44 ? 2 : 1;

  return (
    <div className="chart" ref={ref}>
      <svg width={w} height={height} role="img" aria-label={label}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={w - m.r} y1={Y(t)} y2={Y(t)} stroke="rgba(255,255,255,0.07)" />
            <text x={m.l - 8} y={Y(t) + 4} textAnchor="end">
              {fmtY(t)}
            </text>
          </g>
        ))}
        {yearTicks.map((t, i) =>
          i % thin === 0 ? (
            <text key={t.label} x={X(t.x)} y={height - 6} textAnchor="middle">
              {t.label}
            </text>
          ) : null,
        )}
        {series.map((s, si) =>
          s.kind === 'line' ? (
            <path
              key={si}
              d={s.points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('')}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : (
            s.points.map((p, i) => (
              <circle
                key={`${si}-${i}`}
                cx={X(p.x)}
                cy={Y(p.y)}
                r={3.5}
                fill={p.hollow ? 'none' : s.color}
                stroke={s.color}
                strokeWidth={1.5}
                opacity={0.75}
              >
                {p.tip ? <title>{p.tip}</title> : null}
              </circle>
            ))
          ),
        )}
      </svg>
    </div>
  );
}

/** Simple vertical bars with a value above each. */
export function Bars({
  items,
  height = 160,
  color = 'var(--accent)',
  label,
}: {
  items: { label: string; value: number }[];
  height?: number;
  color?: string;
  label: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div role="img" aria-label={label} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height }}>
      {items.map((i) => (
        <div key={i.label} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
          <span className="num" style={{ fontSize: 14, color: 'var(--dim)' }}>
            {i.value}
          </span>
          <div style={{ width: '100%', maxWidth: 48, height: `${(i.value / max) * 78}%`, minHeight: 2, background: color, borderRadius: '6px 6px 0 0' }} />
          <span className="num" style={{ fontSize: 13, color: 'var(--dim)', marginTop: 4 }}>
            {i.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Bars that grow left (better) or right (worse) from your overall average. `value` is the bucket's average,
 * `center` is your overall average, and lower values are better. Small samples are faded and tagged.
 */
export function Diverging({
  rows,
  center,
  min,
  fmt,
  label,
  showN = true,
  highlightBest = true,
}: {
  rows: { label: string; value: number | null; n: number }[];
  center: number;
  min: number;
  fmt: (v: number) => string;
  label: string;
  showN?: boolean;
  highlightBest?: boolean;
}) {
  const solid = rows.filter((r) => r.value !== null && r.n >= min);
  const best = solid.length ? Math.min(...solid.map((r) => r.value as number)) : null;
  const span = Math.max(1, ...rows.filter((r) => r.value !== null).map((r) => Math.abs((r.value as number) - center)));
  return (
    <div role="img" aria-label={label}>
      {rows.map((r) => {
        const d = r.value === null ? 0 : r.value - center;
        const faint = r.value === null || r.n < min;
        const isBest = highlightBest && r.value !== null && r.value === best;
        const color = d <= 0 ? 'var(--good)' : 'var(--bad)';
        return (
          <div key={r.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(78px, 112px) 1fr 96px', alignItems: 'center', gap: 10, minHeight: 36, opacity: faint ? 0.45 : 1 }}>
            <span style={{ fontSize: 14, fontWeight: isBest ? 700 : 400, color: isBest ? 'var(--text)' : 'var(--dim)' }}>{r.label}</span>
            <div style={{ position: 'relative', height: 14 }} aria-hidden>
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--line-2)' }} />
              {r.value !== null ? (
                <div
                  style={{
                    position: 'absolute',
                    top: 2,
                    bottom: 2,
                    borderRadius: 4,
                    background: color,
                    width: `${(Math.abs(d) / span) * 50}%`,
                    left: d <= 0 ? `${50 - (Math.abs(d) / span) * 50}%` : '50%',
                  }}
                />
              ) : null}
            </div>
            <span className="num" style={{ fontSize: 14, textAlign: 'right' }}>
              {r.value === null ? '-' : fmt(r.value)}
              {showN ? <span style={{ color: 'var(--dim-2)', fontSize: 12 }}> n={r.n}</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
