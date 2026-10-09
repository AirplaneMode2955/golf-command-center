'use client';

import { useState } from 'react';
import { TOUR } from '@/lib/tour';
import { addDirection, avg, inYear, perEighteen, pct, scoringMix } from '@/lib/stats';
import type { Round } from '@/lib/types';
import { Card } from './ui';

type Metric = {
  key: string;
  label: string;
  unit: string;
  you: number | null;
  tour: number;
  star: number;
  lo: number;
  hi: number;
  lowerIsBetter: boolean;
  digits: number;
  note?: string;
};

function Track({ m }: { m: Metric }) {
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - m.lo) / (m.hi - m.lo)) * 100))}%`;
  const dot = (v: number, color: string, size: number) => (
    <span
      style={{ position: 'absolute', left: pos(v), top: '50%', width: size, height: size, borderRadius: '50%', background: color, transform: 'translate(-50%, -50%)', border: '2px solid var(--card)' }}
    />
  );
  return (
    <div style={{ position: 'relative', height: 26, margin: '8px 0' }} aria-hidden>
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 6, background: 'var(--card-2)', borderRadius: 3, transform: 'translateY(-50%)' }} />
      {dot(m.star, '#fbbf24', 14)}
      {dot(m.tour, '#7dd3fc', 14)}
      {m.you !== null ? dot(m.you, '#4ade80', 20) : null}
    </div>
  );
}

export function Tour({ rounds }: { rounds: Round[] }) {
  const years = [...new Set(rounds.map((r) => r.year))].sort((a, b) => b - a).filter((y) => rounds.filter((r) => r.year === y).length >= 3);
  const [year, setYear] = useState<number | null>(null);
  const rs = inYear(rounds, year);
  if (rounds.length === 0) return <div className="empty">No rounds to show.</div>;

  const mix = scoringMix(rs);
  const per = perEighteen(mix);
  const fw = addDirection(rs, 'fairways');
  const gir = addDirection(rs, 'greens');
  const r18 = rs.filter((r) => r.holes === 18);
  const roundPar = avg(r18.map((r) => r.par));

  const metrics: Metric[] = [
    {
      key: 'score',
      label: 'Scoring average (18 holes)',
      unit: '',
      you: r18.length >= 3 ? (avg(r18.map((r) => r.strokes)) as number) : null,
      tour: TOUR.top50.scoring,
      star: TOUR.scheffler.scoring,
      lo: 66,
      hi: 92,
      lowerIsBetter: true,
      digits: 1,
      note: roundPar ? `Your courses play to an average par of ${roundPar.toFixed(0)}. Tour courses are usually par 70 to 72.` : undefined,
    },
    {
      key: 'fw',
      label: 'Fairways hit',
      unit: '%',
      you: fw.count > 0 ? pct(fw.hit, fw.count) : null,
      tour: TOUR.top50.fairways,
      star: TOUR.scheffler.fairways,
      lo: 35,
      hi: 75,
      lowerIsBetter: false,
      digits: 1,
    },
    {
      key: 'gir',
      label: 'Greens in regulation',
      unit: '%',
      you: gir.count > 0 ? pct(gir.hit, gir.count) : null,
      tour: TOUR.top50.greens,
      star: TOUR.scheffler.greens,
      lo: 35,
      hi: 80,
      lowerIsBetter: false,
      digits: 1,
    },
    {
      key: 'birdies',
      label: 'Birdies per 18 holes',
      unit: '',
      you: mix.holes > 0 ? per.birdies : null,
      tour: TOUR.top50.birdies,
      star: TOUR.scheffler.birdies,
      lo: 0,
      hi: 6,
      lowerIsBetter: false,
      digits: 1,
    },
  ];

  const sign = (d: number, digits: number) => `${d > 0 ? '+' : d < 0 ? '-' : ''}${Math.abs(d).toFixed(digits)}`;

  return (
    <div className="stack">
      <Card title="You vs the PGA Tour" hint={`Compared with the ${TOUR.season} Tour season. Pick a period to see how your game changed.`}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Period">
          {[null, ...years].map((y) => (
            <button key={y ?? 'all'} className="btn" aria-pressed={year === y} style={year === y ? { background: 'var(--accent)', color: '#04130a', borderColor: 'var(--accent)', fontWeight: 600 } : undefined} onClick={() => setYear(y)}>
              {y ?? 'All time'}
            </button>
          ))}
        </div>
        <div className="legend" style={{ marginTop: 14 }}>
          <span><i style={{ background: '#4ade80' }} />You</span>
          <span><i style={{ background: '#7dd3fc' }} />Tour top 50 average</span>
          <span><i style={{ background: '#fbbf24' }} />{TOUR.scheffler.name}</span>
        </div>
      </Card>

      <div className="grid g2">
        {metrics.map((m) => {
          const diff = m.you === null ? null : m.you - m.tour;
          const better = diff === null ? null : m.lowerIsBetter ? diff <= 0 : diff >= 0;
          const f = (v: number) => `${v.toFixed(m.digits)}${m.unit}`;
          return (
            <Card key={m.key} title={m.label}>
              {m.you === null ? (
                <div className="empty">Not enough data in this period.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                    <span className="num" style={{ fontSize: 34, fontWeight: 700 }}>{f(m.you)}</span>
                    <span className="num" style={{ color: better ? 'var(--good)' : 'var(--bad)', fontWeight: 600 }}>
                      {sign(diff as number, m.digits)}{m.unit} vs Tour
                    </span>
                  </div>
                  <Track m={m} />
                  <div className="sub num" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <span>Tour {f(m.tour)}</span>
                    <span>{TOUR.scheffler.name.split(' ')[1]} {f(m.star)}</span>
                  </div>
                  {m.note ? <div className="sub" style={{ marginTop: 8 }}>{m.note}</div> : null}
                </>
              )}
            </Card>
          );
        })}
      </div>

      <Card title="About these numbers">
        <div className="sub" style={{ lineHeight: 1.6 }}>
          The Tour figures are the rounds-weighted average of the top 50 earners in {TOUR.season} (4,124 rounds), plus Scottie Scheffler on his own. That is a high bar: the
          whole field scores a little worse than its top 50. Fairways and greens are counted the same way for you, on the holes your app tracked. Your birdies are scaled to 18 holes.
        </div>
        <a className="linkbtn" href={TOUR.sourceUrl} target="_blank" rel="noreferrer">
          Source: ESPN PGA Tour player stats, {TOUR.season}
        </a>
      </Card>
    </div>
  );
}
