'use client';

import { byYear, fmtDate, fmtToPar, headline, rolling, toPar18 } from '@/lib/stats';
import type { Round } from '@/lib/types';
import { Bars, TimeChart } from './charts';
import { Card, Stat } from './ui';

export function Overview({ rounds }: { rounds: Round[] }) {
  if (rounds.length === 0) return <div className="empty">No rounds to show.</div>;
  const h = headline(rounds);
  const years = byYear(rounds);

  const dots = rounds.map((r) => ({
    x: r.ts,
    y: toPar18(r),
    hollow: r.holes !== 18,
    tip: `${fmtDate(r.date)}  ${r.course}  ${r.strokes} (${fmtToPar(r.toPar)}) ${r.holes} holes`,
  }));
  const trend = rolling(dots, 10);
  const hcp = rounds.filter((r) => r.handicap !== null).map((r) => ({ x: r.ts, y: r.handicap as number }));

  return (
    <div className="stack">
      <div className="grid g4">
        <Stat label="Rounds" value={h.total} note={`${h.count18} of 18 holes, ${h.count9} of 9, ${h.courses} courses`} />
        <Stat
          label="Handicap now"
          value={h.handicapNow ?? 'n/a'}
          note={h.handicapLow !== null ? `Low ${h.handicapLow} on ${fmtDate(h.handicapLowDate as string)}` : undefined}
        />
        <Stat
          label="Best 18 holes"
          value={h.best ? h.best.strokes : 'n/a'}
          note={h.best ? `${h.best.course}, ${fmtDate(h.best.date)}` : undefined}
        />
        <Stat
          label="Last 10 average"
          value={h.avgLast10 !== null ? h.avgLast10.toFixed(1) : 'n/a'}
          note={h.avgAll18 !== null ? `All-time ${h.avgAll18.toFixed(1)}` : undefined}
        />
      </div>

      <Card title="Scoring trend" hint="Each dot is a round, scaled to 18 holes (hollow dots are 9-hole rounds). The line is a 10-round average. Lower is better.">
        <TimeChart
          label="Score to par over time"
          series={[
            { points: dots, kind: 'dots', color: 'var(--blue)' },
            { points: trend, kind: 'line', color: 'var(--accent)' },
          ]}
          fmtY={fmtToPar}
        />
      </Card>

      <div className="grid g2">
        <Card title="Handicap" hint="Your handicap as recorded after each round.">
          <TimeChart label="Handicap over time" series={[{ points: hcp, kind: 'line', color: 'var(--warn)' }]} fmtY={(v) => v.toFixed(0)} height={200} />
        </Card>
        <Card title="Rounds per year">
          <Bars label="Rounds per year" items={years.map((y) => ({ label: String(y.year), value: y.rounds }))} />
        </Card>
      </div>

      <Card title="Recent rounds">
        <div className="rows">
          {[...rounds]
            .reverse()
            .slice(0, 10)
            .map((r) => (
              <div className="row" key={r.id}>
                <div className="grow">
                  <div>{r.course}</div>
                  <div className="dim">
                    {fmtDate(r.date)}, {r.holes} holes
                  </div>
                </div>
                <div className="end num">
                  <b>{r.strokes}</b> <span className="dim">{fmtToPar(r.toPar)}</span>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}
