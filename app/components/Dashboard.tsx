'use client';

import { useMemo, useRef, useState } from 'react';
import { solveAll } from '@/lib/pars';
import { fmtDate, usableRounds } from '@/lib/stats';
import type { GolfData } from '@/lib/types';
import { Courses } from './Courses';
import { Crew } from './Crew';
import { Game } from './Game';
import { Overview } from './Overview';
import { Tour } from './Tour';

const TABS = ['Overview', 'Courses', 'Game', 'Tour', 'Crew'] as const;
type Tab = (typeof TABS)[number];

export function Dashboard({
  data,
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
  const input = useRef<HTMLInputElement>(null);

  const rounds = useMemo(() => usableRounds(data, includeFlagged), [data, includeFlagged]);
  const solves = useMemo(() => solveAll(data.rounds), [data]);
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
          <button key={t} role="tab" aria-selected={tab === t} className="tab" onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {flagged.length > 0 && tab !== 'Crew' ? (
        <label className="check">
          <input type="checkbox" checked={includeFlagged} onChange={(e) => setIncludeFlagged(e.target.checked)} />
          Include {flagged.length} rounds that look incomplete (missing scores or impossible totals)
        </label>
      ) : null}

      <div style={{ marginTop: 8 }}>
        {tab === 'Overview' && <Overview rounds={rounds} />}
        {tab === 'Courses' && <Courses rounds={rounds} solves={solves} />}
        {tab === 'Game' && <Game rounds={rounds} solves={solves} />}
        {tab === 'Tour' && <Tour rounds={rounds} />}
        {tab === 'Crew' && <Crew data={data} />}
      </div>
    </div>
  );
}
