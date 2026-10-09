'use client';

import { useMemo, useState } from 'react';
import { avg, courses, fmtDate, fmtToPar, holeAverages } from '@/lib/stats';
import type { Round } from '@/lib/types';
import { Card, Stat } from './ui';

export function Courses({ rounds }: { rounds: Round[] }) {
  const list = useMemo(() => courses(rounds), [rounds]);
  const [picked, setPicked] = useState<string | null>(null);
  if (list.length === 0) return <div className="empty">No rounds to show.</div>;

  const cur = list.find((c) => c.id === picked) ?? list[0];
  const mine = rounds.filter((r) => r.courseId === cur.id);
  const holes = cur.rounds18.length >= 3 ? holeAverages(cur.rounds18) : null;
  const mean = holes ? (avg(holes.map((h) => h.avg)) as number) : 0;

  return (
    <div className="grid split">
      <Card title={`${list.length} courses`} hint="Most played first.">
        <div className="rows" style={{ maxHeight: 560, overflowY: 'auto' }}>
          {list.map((c) => (
            <button key={c.id} className="row" aria-pressed={c.id === cur.id} onClick={() => setPicked(c.id)}>
              <span className="grow">{c.name}</span>
              <span className="end num dim">{c.rounds}</span>
            </button>
          ))}
        </div>
      </Card>

      <div className="stack">
        <Card title={cur.name} hint={`Last played ${fmtDate(cur.last)}`}>
          <div className="grid g3s">
            <Stat label="Rounds" value={cur.rounds} />
            <Stat label="Average (18)" value={cur.avg18 !== null ? cur.avg18.toFixed(1) : 'n/a'} note={cur.avgToPar18 !== null ? `${fmtToPar(cur.avgToPar18)} to par` : undefined} />
            <Stat label="Best (18)" value={cur.best18 ?? 'n/a'} />
          </div>
        </Card>

        <Card title="Hole by hole" hint="Your average strokes per hole. Green is easier than your usual hole here, red is harder.">
          {holes ? (
            <div className="holes">
              {holes.map((h) => {
                const d = h.avg - mean;
                const color = d > 0.15 ? 'var(--bad)' : d < -0.15 ? 'var(--good)' : 'var(--dim)';
                const bg = d > 0.15 ? 'rgba(251,113,133,0.10)' : d < -0.15 ? 'rgba(74,222,128,0.10)' : 'transparent';
                return (
                  <div key={h.hole} className="hole" style={{ background: bg, borderColor: bg === 'transparent' ? undefined : color }}>
                    <span>{h.hole}</span>
                    <b className="num" style={{ color }}>
                      {h.avg.toFixed(1)}
                    </b>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">Needs at least 3 full 18-hole rounds here. Nine-hole rounds are skipped because the archive doesn&apos;t say which nine.</div>
          )}
        </Card>

        <Card title="Your rounds here">
          <div className="rows">
            {[...mine]
              .reverse()
              .slice(0, 8)
              .map((r) => (
                <div className="row" key={r.id}>
                  <div className="grow">
                    {fmtDate(r.date)} <span className="dim">{r.holes} holes</span>
                  </div>
                  <div className="end num">
                    <b>{r.strokes}</b> <span className="dim">{fmtToPar(r.toPar)}</span>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
