'use client';

import { holeEntries, type CourseSolve } from '@/lib/pars';
import { avg, byYear } from '@/lib/stats';
import type { Round } from '@/lib/types';
import { Card } from './ui';

export function Game({ rounds, solves }: { rounds: Round[]; solves: Map<string, CourseSolve> }) {
  if (rounds.length === 0) return <div className="empty">No rounds to show.</div>;
  const years = byYear(rounds);

  // Scoring by par type across every course where we could work out par.
  const byPar: Record<number, number[]> = { 3: [], 4: [], 5: [] };
  let courseCount = 0;
  for (const [id, s] of solves) {
    const mine = rounds.filter((r) => r.courseId === id);
    const e = holeEntries(s, mine);
    if (e.length) courseCount++;
    for (const x of e) byPar[x.par]?.push(x.strokes);
  }
  const parRows = [3, 4, 5].map((p) => ({ par: p, avg: avg(byPar[p]), n: byPar[p].length }));
  const holesTotal = parRows.reduce((a, r) => a + r.n, 0);

  return (
    <div className="stack">
      <Card
        title="Scoring by hole type"
        hint={
          holesTotal > 0
            ? `Your average score on par 3s, 4s and 5s, from ${holesTotal.toLocaleString()} holes at ${courseCount} courses where par could be worked out from your scorecards.`
            : 'Not enough rounds at one course to work out hole pars yet.'
        }
      >
        {holesTotal > 0 ? (
          <div className="grid g3s">
            {parRows.map((r) => {
              const d = r.avg === null ? 0 : r.avg - r.par;
              const color = d <= 0.05 ? 'var(--good)' : d > 0.3 ? 'var(--bad)' : 'var(--warn)';
              const max = 6;
              return (
                <div key={r.par} className="card" style={{ background: 'var(--card-2)' }}>
                  <div className="sub">Par {r.par}</div>
                  <div className="num" style={{ fontSize: 34, fontWeight: 700, color }}>
                    {r.avg === null ? '-' : r.avg.toFixed(2)}
                  </div>
                  <div className="sub num">
                    {r.avg === null ? '' : `${d >= 0 ? '+' : '-'}${Math.abs(d).toFixed(2)} vs par, ${r.n} holes`}
                  </div>
                  <div style={{ position: 'relative', height: 10, background: 'var(--card)', borderRadius: 5, marginTop: 12 }} aria-hidden>
                    <div style={{ width: `${((r.avg ?? 0) / max) * 100}%`, height: '100%', background: color, borderRadius: 5 }} />
                    <div style={{ position: 'absolute', left: `${(r.par / max) * 100}%`, top: -3, bottom: -3, width: 2, background: 'var(--text)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </Card>

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
