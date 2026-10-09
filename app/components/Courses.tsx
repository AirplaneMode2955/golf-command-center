'use client';

import { useMemo, useState } from 'react';
import { holeStats, type CourseSolve } from '@/lib/pars';
import { avg, courses, fmtDate, fmtToPar } from '@/lib/stats';
import type { Round } from '@/lib/types';
import { Card, Stat } from './ui';

/** Green at or under par, amber a little over, red clearly over. */
function tone(diff: number) {
  if (diff <= 0.05) return { color: 'var(--good)', bg: 'rgba(74,222,128,0.10)', edge: true };
  if (diff > 0.3) return { color: 'var(--bad)', bg: 'rgba(251,113,133,0.10)', edge: true };
  return { color: 'var(--warn)', bg: 'transparent', edge: false };
}

export function Courses({ rounds, solves }: { rounds: Round[]; solves: Map<string, CourseSolve> }) {
  const list = useMemo(() => courses(rounds), [rounds]);
  const [picked, setPicked] = useState<string | null>(null);
  if (list.length === 0) return <div className="empty">No rounds to show.</div>;

  const cur = list.find((c) => c.id === picked) ?? list[0];
  const mine = rounds.filter((r) => r.courseId === cur.id);
  const solve = solves.get(cur.id) ?? null;
  const holes = solve ? holeStats(solve, mine) : null;
  const placed = solve ? mine.filter((r) => solve.offsets.has(r.id)).length : 0;
  const front = holes ? holes.slice(0, 9) : [];
  const back = holes ? holes.slice(9) : [];

  // Without par we can still show plain averages, but only for 18 hole rounds.
  const plain =
    !solve && cur.rounds18.length >= 3
      ? Array.from({ length: 18 }, (_, i) => ({ hole: i + 1, avg: avg(cur.rounds18.map((r) => r.holeStrokes[i])) ?? 0 }))
      : null;

  const cell = (h: { hole: number; par: number; avg: number; n: number }) => {
    if (h.n === 0) {
      return (
        <div key={h.hole} className="hole">
          <span>
            {h.hole} · Par {h.par}
          </span>
          <b className="num" style={{ color: 'var(--dim-2)' }}>
            -
          </b>
        </div>
      );
    }
    const d = h.avg - h.par;
    const t = tone(d);
    return (
      <div key={h.hole} className="hole" style={{ background: t.bg, borderColor: t.edge ? t.color : undefined }} title={`${h.n} rounds`}>
        <span>
          {h.hole} · Par {h.par}
        </span>
        <b className="num" style={{ color: t.color }}>
          {h.avg.toFixed(2)}
        </b>
        <span className="num" style={{ color: t.color }}>
          {d > 0 ? '+' : d < 0 ? '-' : ''}
          {Math.abs(d).toFixed(2)}
        </span>
      </div>
    );
  };

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

        <Card
          title="Hole by hole"
          hint="Your average strokes on each hole, and how far that is from par. Green is par or better, amber is up to 0.3 over, red is more than 0.3 over."
        >
          {holes ? (
            <>
              <div className="holes">{front.map(cell)}</div>
              {back.length > 0 ? (
                <div className="holes" style={{ marginTop: 6 }}>
                  {back.map(cell)}
                </div>
              ) : null}
              <div className="sub" style={{ marginTop: 10 }}>
                Pars are worked out from your scorecards ({Math.round((solve as CourseSolve).layout.confidence * 100)}% of your rounds here agree with them), so they
                may differ from the course&apos;s printed card. {placed} of {mine.length} rounds are included
                {(solve as CourseSolve).layout.holes === 18 ? ', with 9-hole rounds placed on the front or back nine where they fit' : ''}.
              </div>
            </>
          ) : plain ? (
            <>
              <div className="holes">
                {plain.map((h) => (
                  <div key={h.hole} className="hole">
                    <span>{h.hole}</span>
                    <b className="num">{h.avg.toFixed(2)}</b>
                  </div>
                ))}
              </div>
              <div className="sub" style={{ marginTop: 10 }}>
                No colors here: the archive has no par per hole, and there aren&apos;t enough rounds of the same length at this course (5 or more) to work it out.
              </div>
            </>
          ) : (
            <div className="empty">Needs 5 or more rounds of the same length at a course to work out par for each hole. Nine-hole rounds are matched to the front or back nine once a course&apos;s pars are known.</div>
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
