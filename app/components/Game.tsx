'use client';

import { useMemo } from 'react';
import { shotsLost } from '@/lib/insights';
import { holeEntries, type CourseSolve } from '@/lib/pars';
import { avg, byYear } from '@/lib/stats';
import type { Round } from '@/lib/types';
import { Diverging } from './charts';
import { Card, Stat } from './ui';

export function Game({ rounds, solves }: { rounds: Round[]; solves: Map<string, CourseSolve> }) {
  const sl = useMemo(() => shotsLost(rounds, solves), [rounds, solves]);
  if (rounds.length === 0) return <div className="empty">No rounds to show.</div>;
  const years = byYear(rounds);
  const leak = sl && sl.byPar.length ? sl.byPar.reduce((m, p) => (p.over > m.over ? p : m)) : null;
  const sgn = (v: number) => `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toFixed(1)}`;

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

      {sl ? (
        <>
          <div className="grid g2">
            <Card
              title="Where your strokes over par come from"
              hint={`Strokes per 18 holes, from ${sl.holes.toLocaleString()} holes at ${sl.courses} courses where par could be worked out. Green gains strokes, red loses them.`}
            >
              <Diverging
                label="Strokes gained and lost per 18 holes by result"
                center={0}
                min={0}
                showN={false}
                highlightBest={false}
                fmt={sgn}
                rows={[
                  { label: 'Birdies or better', value: sl.gained, n: 99 },
                  { label: 'Bogeys', value: sl.bogeys, n: 99 },
                  { label: 'Double or worse', value: sl.doubles, n: 99 },
                  { label: 'Net to par', value: sl.net, n: 99 },
                ]}
              />
            </Card>
            <Card title="By hole type" hint="Strokes over par per 18 holes, and how many of each hole you play per round.">
              <Diverging
                label="Strokes over par per 18 holes by hole type"
                center={0}
                min={0}
                showN={false}
                highlightBest={false}
                fmt={sgn}
                rows={sl.byPar.map((p) => ({ label: `Par ${p.par}s (${p.holesPer18.toFixed(1)}/round)`, value: p.over, n: 99 }))}
              />
            </Card>
          </div>

          <div className="grid g2">
            <Stat
              label="Cost of your blow-up holes"
              value={`-${sl.blowups.toFixed(1)}`}
              note={`You make ${sl.doublesCount.toFixed(1)} double bogeys or worse per 18 holes. Turn each into a bogey and you save ${sl.blowups.toFixed(1)} strokes a round.`}
            />
            {leak ? (
              <Stat
                label="Your biggest leak"
                value={`Par ${leak.par}s`}
                note={`They cost you ${leak.over.toFixed(1)} strokes per 18 holes (${leak.perHole > 0 ? '+' : ''}${leak.perHole.toFixed(2)} a hole, ${leak.holesPer18.toFixed(1)} of them a round).`}
              />
            ) : null}
          </div>

          <div className="grid g2">
            <Card title="Holes that cost you most" hint="Average strokes over par per round. Holes with 10 or more rounds only.">
              <HoleList items={sl.worst} />
            </Card>
            <Card title="Holes you play best" hint="Average strokes against par. Negative means you beat par on average.">
              <HoleList items={sl.best} />
            </Card>
          </div>
        </>
      ) : null}

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

function HoleList({ items }: { items: { courseId: string; course: string; hole: number; par: number; avg: number; over: number; n: number }[] }) {
  if (items.length === 0) return <div className="empty">Needs 10 or more rounds on a hole.</div>;
  return (
    <div className="rows">
      {items.map((h) => (
        <div className="row" key={`${h.courseId}-${h.hole}`}>
          <div className="grow">
            <div>
              {h.course}, hole {h.hole}
            </div>
            <div className="dim">
              Par {h.par}, averages {h.avg.toFixed(2)} over {h.n} rounds
            </div>
          </div>
          <div className="end num" style={{ color: h.over > 0.3 ? 'var(--bad)' : h.over <= 0.05 ? 'var(--good)' : 'var(--warn)', fontWeight: 600 }}>
            {h.over > 0 ? '+' : h.over < 0 ? '-' : ''}
            {Math.abs(h.over).toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}
