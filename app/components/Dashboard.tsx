'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { solveAll } from '@/lib/pars';
import { applyMark, fmtDate, handicapSeries, usableRounds } from '@/lib/stats';
import { loadMarks, saveMarks, type Marks } from '@/lib/storage';
import type { GolfData } from '@/lib/types';
import { Courses } from './Courses';
import { Crew } from './Crew';
import { Game } from './Game';
import { Overview } from './Overview';
import { Patterns } from './Patterns';
import { Records } from './Records';
import { Rounds } from './Rounds';
import { Tour } from './Tour';

const TABS = ['Overview', 'Courses', 'Game', 'Patterns', 'Records', 'Tour', 'Rounds', 'Crew'] as const;
type Tab = (typeof TABS)[number];

export function Dashboard({
  data: parsed,
  onReplace,
  onClear,
  error,
}: {
  data: GolfData;
  onReplace: (f: File) => void;
  onClear: () => void;
  error: string | null;
}) {
  const [tab, setTab] = useState<Tab>('Overview');
  const [includeFlagged, setIncludeFlagged] = useState(false);
  const [marks, setMarks] = useState<Marks>({});
  useEffect(() => setMarks(loadMarks()), []);
  const input = useRef<HTMLInputElement>(null);

  // The parsed archive with the user's scramble/event decisions applied on top.
  const data = useMemo(() => ({ ...parsed, rounds: parsed.rounds.map((r) => applyMark(r, marks[r.id])) }), [parsed, marks]);
  const setMark = (id: string, m: 'event' | 'regular' | null) =>
    setMarks((prev) => {
      const next = { ...prev };
      if (m) next[id] = m;
      else delete next[id];
      saveMarks(next);
      return next;
    });
  const rounds = useMemo(() => usableRounds(data, includeFlagged), [data, includeFlagged]);
  const solves = useMemo(() => solveAll(data.rounds), [data]);
  const hcp = useMemo(() => handicapSeries(data.rounds), [data]);
  const flagged = data.rounds.filter((r) => r.flag);
  const first = data.rounds[0].date;
  const last = data.rounds[data.rounds.length - 1].date;

  return (
    <div className="shell">
      <div className="top">
        <div>
          <div className="brand">
            Golf <span>Command Center</span>
          </div>
          <div className="sub">
            {data.rounds.length} rounds, {fmtDate(first)} to {fmtDate(last)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => input.current?.click()}>
            Replace file
          </button>
          <button
            className="btn"
            onClick={() => {
              if (window.confirm('Remove your golf data from this browser? Your original file is not touched.')) onClear();
            }}
          >
            Clear data
          </button>
          <input
            ref={input}
            type="file"
            accept=".json,application/json"
            className="sr"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onReplace(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {error ? (
        <div className="err" role="alert" style={{ marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <div className="tabs" role="tablist" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className="tab"
            onClick={(e) => {
              setTab(t);
              e.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {flagged.length > 0 && tab !== 'Crew' && tab !== 'Rounds' ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="check">
            <input type="checkbox" checked={includeFlagged} onChange={(e) => setIncludeFlagged(e.target.checked)} />
            Include {flagged.length} rounds that are left out (scrambles and events, incomplete rounds, par-3 courses)
          </label>
          <button className="btn" onClick={() => setTab('Rounds')}>
            Review rounds
          </button>
        </div>
      ) : null}

      <div style={{ marginTop: 8 }}>
        {tab === 'Overview' && <Overview rounds={rounds} hcp={hcp} />}
        {tab === 'Courses' && <Courses rounds={rounds} solves={solves} />}
        {tab === 'Game' && <Game rounds={rounds} solves={solves} hcp={hcp} />}
        {tab === 'Patterns' && <Patterns rounds={rounds} />}
        {tab === 'Records' && <Records rounds={rounds} solves={solves} hcp={hcp} />}
        {tab === 'Tour' && <Tour rounds={rounds} />}
        {tab === 'Rounds' && <Rounds rounds={data.rounds} hcp={hcp} onMark={setMark} />}
        {tab === 'Crew' && <Crew data={data} />}
      </div>
    </div>
  );
}
