'use client';

import { addDirection, byYear, pct, scoringMix } from '@/lib/stats';
import type { Round } from '@/lib/types';
import { Card } from './ui';

const MIX = [
  { key: 'eagles', label: 'Eagle or better', color: '#fde047' },
  { key: 'birdies', label: 'Birdie', color: '#4ade80' },
  { key: 'pars', label: 'Par', color: '#7dd3fc' },
  { key: 'bogeys', label: 'Bogey', color: '#fb923c' },
  { key: 'doubles', label: 'Double or worse', color: '#fb7185' },
] as const;

function Cross({ title, what, d, hitLabel, topLabel, bottomLabel }: {
  title: string;
  what: string;
  d: ReturnType<typeof addDirection>;
  hitLabel: string;
  topLabel: string;
  bottomLabel: string;
}) {
  if (d.count === 0) return <Card title={title}><div className="empty">No data tracked.</div></Card>;
  const misses = d.count - d.hit;
  const dirs = d.left + d.right + d.short + d.long;
  const p = (v: number) => `${pct(v, dirs).toFixed(0)}%`;
  return (
    <Card
      title={title}
      hint={`${what} Hit ${d.hit.toLocaleString()} of ${d.count.toLocaleString()} holes over ${d.rounds} rounds. The app recorded a miss direction for ${dirs.toLocaleString()} of ${misses.toLocaleString()} misses, and the split below is of those.`}
    >
      <div className="cross" role="group" aria-label={`${title} outcomes`}>
        <div style={{ visibility: 'hidden' }} />
        <div><b className="num">{p(d.long)}</b><span>{topLabel}</span></div>
        <div style={{ visibility: 'hidden' }} />
        <div><b className="num">{p(d.left)}</b><span>Left</span></div>
        <div className="mid"><b className="num" style={{ color: 'var(--accent)' }}>{pct(d.hit, d.count).toFixed(0)}%</b><span>{hitLabel}</span></div>
        <div><b className="num">{p(d.right)}</b><span>Right</span></div>
        <div style={{ visibility: 'hidden' }} />
        <div><b className="num">{p(d.short)}</b><span>{bottomLabel}</span></div>
        <div style={{ visibility: 'hidden' }} />
      </div>
    </Card>
  );
}

export function Game({ rounds }: { rounds: Round[] }) {
  if (rounds.length === 0) return <div className="empty">No rounds to show.</div>;
  const mix = scoringMix(rounds);
  const fw = addDirection(rounds, 'fairways');
  const gir = addDirection(rounds, 'greens');
  const years = byYear(rounds);

  return (
    <div className="stack">
      <Card title="Hole results" hint={`Every hole you have scored, ${mix.holes.toLocaleString()} in total.`}>
        <div className="mixbar" role="img" aria-label="Share of holes by result">
          {MIX.map((m) => (
            <div key={m.key} style={{ width: `${pct(mix[m.key], mix.holes)}%`, background: m.color }} title={`${m.label}: ${mix[m.key]}`} />
          ))}
        </div>
        <div className="legend">
          {MIX.map((m) => (
            <span key={m.key}>
              <i style={{ background: m.color }} />
              {m.label} <b className="num" style={{ color: 'var(--text)' }}>{pct(mix[m.key], mix.holes).toFixed(1)}%</b>
            </span>
          ))}
        </div>
      </Card>

      <div className="grid g2">
        <Cross title="Fairways" what="Where your tee shots end up." d={fw} hitLabel="Hit" topLabel="Long" bottomLabel="Short" />
        <Cross title="Greens in regulation" what="Where your approaches end up." d={gir} hitLabel="On green" topLabel="Long" bottomLabel="Short" />
      </div>

      <Card title="By year">
        <div className="rows">
          <div className="row dim" style={{ minHeight: 36 }}>
            <span className="grow">Year</span>
            <span className="end num" style={{ width: 64 }}>Rounds</span>
            <span className="end num" style={{ width: 64 }}>Avg 18</span>
            <span className="end num" style={{ width: 64 }}>Best 18</span>
            <span className="end num" style={{ width: 56 }}>Hcp</span>
          </div>
          {[...years].reverse().map((y) => (
            <div className="row" key={y.year}>
              <span className="grow num">{y.year}</span>
              <span className="end num" style={{ width: 64 }}>{y.rounds}</span>
              <span className="end num" style={{ width: 64 }}>{y.avg18 !== null ? y.avg18.toFixed(1) : '-'}</span>
              <span className="end num" style={{ width: 64 }}>{y.best18 ?? '-'}</span>
              <span className="end num" style={{ width: 56 }}>{y.hcp ?? '-'}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
