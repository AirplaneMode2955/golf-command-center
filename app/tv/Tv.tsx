'use client';

import { useEffect, useMemo, useState } from 'react';
import { applyMark, byYear, fmtDate, fmtToPar, handicapSeries, handicapSummary, headline, usableRounds } from '@/lib/stats';
import { loadMarks, loadSaved } from '@/lib/storage';
import type { GolfData } from '@/lib/types';
import './tv.css';

const SCENE_MS = 12000;
const SCENES = ['handicap', 'last', 'best', 'years'] as const;

export default function Tv() {
  const [data, setData] = useState<GolfData | null>(null);
  const [ready, setReady] = useState(false);
  const [scene, setScene] = useState(0);

  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      const marks = loadMarks();
      setData({ ...saved, rounds: saved.rounds.map((r) => applyMark(r, marks[r.id])) });
    }
    setReady(true);
    const t = setInterval(() => setScene((s) => (s + 1) % SCENES.length), SCENE_MS);
    return () => clearInterval(t);
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const rounds = usableRounds(data, false);
    return { rounds, h: headline(rounds), hs: handicapSummary(handicapSeries(data.rounds)), years: byYear(rounds) };
  }, [data]);

  if (!ready) return null;
  if (!view || view.rounds.length === 0)
    return (
      <main className="gtv">
        <p className="gtv-label">No data in this browser</p>
        <p className="gtv-sub">Open the dashboard once on this device and upload your 18Birdies file, then come back to /tv.</p>
      </main>
    );

  const last = view.rounds[view.rounds.length - 1];
  const { h, hs, years } = view;
  const maxAvg = Math.max(...years.map((y) => y.avg18 ?? 0), 1);
  const minAvg = Math.min(...years.map((y) => y.avg18 ?? maxAvg));
  const name = SCENES[scene];

  return (
    <main className="gtv">
      <div className="gtv-scene" key={name}>
        {name === 'handicap' && (
          <section>
            <p className="gtv-label">Handicap index</p>
            <h1 className="gtv-hero">{hs ? hs.now.index.toFixed(1) : '–'}</h1>
            {hs && <p className="gtv-sub">Low {hs.low.index.toFixed(1)} · {h.total} rounds · {h.courses} courses</p>}
          </section>
        )}
        {name === 'last' && (
          <section>
            <p className="gtv-label">Last round</p>
            <h1 className="gtv-hero">{last.strokes}</h1>
            <p className="gtv-sub">{fmtToPar(last.toPar)} · {last.course} · {fmtDate(last.date)}</p>
          </section>
        )}
        {name === 'best' && (
          <section>
            <p className="gtv-label">Best 18</p>
            <h1 className="gtv-hero">{h.best ? h.best.strokes : '–'}</h1>
            <p className="gtv-sub">
              {h.best ? `${h.best.course} · ${fmtDate(h.best.date)}` : ''}
              {h.avgLast10 !== null && ` · Last 10 avg ${h.avgLast10.toFixed(1)}`}
            </p>
          </section>
        )}
        {name === 'years' && (
          <section>
            <p className="gtv-label">Average 18-hole score by year</p>
            <ul className="gtv-years">
              {years.filter((y) => y.avg18 !== null).slice(-6).map((y) => (
                <li key={y.year}>
                  <span>{y.year}</span>
                  <i style={{ width: `${30 + (((y.avg18 as number) - minAvg) / Math.max(maxAvg - minAvg, 1)) * 60}%` }} />
                  <b>{(y.avg18 as number).toFixed(1)}</b>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div className="gtv-dots">
        {SCENES.map((s, i) => (
          <i key={s} className={i === scene ? 'on' : ''} />
        ))}
      </div>
    </main>
  );
}
