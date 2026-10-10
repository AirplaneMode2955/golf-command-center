'use client';

import { useMemo, useState } from 'react';
import { FLAG_TEAM } from '@/lib/flags';
import { reviewCandidates } from '@/lib/insights';
import { fmtDate, fmtToPar, type HcpPoint } from '@/lib/stats';
import type { Round } from '@/lib/types';
import { Card } from './ui';

type Mark = 'event' | 'regular' | null;
type Filter = 'all' | 'out' | 'mine';

function status(r: Round): { text: string; warn: boolean } {
  if (r.mark === 'event') return { text: 'Scramble or event (you marked)', warn: true };
  if (r.flag === FLAG_TEAM) return { text: 'Looks like a scramble', warn: true };
  if (r.flag) return { text: `Left out: ${r.flag.toLowerCase()}`, warn: true };
  if (r.mark === 'regular') return { text: 'Counted (you confirmed)', warn: false };
  return { text: 'Counted', warn: false };
}

/** The one action that makes sense for a round, or null when it is left out for a reason the user cannot override. */
function action(r: Round): { label: string; mark: Mark } | null {
  if (r.mark === 'event') return { label: 'Count it', mark: null };
  if (r.flag === FLAG_TEAM) return { label: 'Count it', mark: 'regular' };
  if (r.flag) return null;
  return { label: 'Mark as scramble or event', mark: 'event' };
}

function RoundRow({ r, onMark }: { r: Round; onMark: (id: string, m: Mark) => void }) {
  const s = status(r);
  const a = action(r);
  return (
    <div className="row" style={{ flexWrap: 'wrap', rowGap: 4 }}>
      <div className="grow" style={{ flex: '1 1 200px', whiteSpace: 'normal' }}>
        <div>{r.course}</div>
        <div className="dim">
          {fmtDate(r.date)}, {r.holes} holes
        </div>
      </div>
      <div className="num" style={{ minWidth: 76, textAlign: 'right' }}>
        <b>{r.strokes || '-'}</b> <span className="dim">{r.strokes ? fmtToPar(r.toPar) : ''}</span>
      </div>
      <span className={`pill${s.warn ? ' warn' : ''}`}>{s.text}</span>
      {a ? (
        <button className="btn" onClick={() => onMark(r.id, a.mark)}>
          {a.label}
        </button>
      ) : null}
    </div>
  );
}

export function Rounds({ rounds, hcp, onMark }: { rounds: Round[]; hcp: HcpPoint[]; onMark: (id: string, m: Mark) => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(40);

  const newest = useMemo(() => [...rounds].reverse(), [rounds]);
  const team = useMemo(() => newest.filter((r) => r.flag === FLAG_TEAM), [newest]);
  const review = useMemo(() => reviewCandidates(rounds, hcp), [rounds, hcp]);
  const eventCount = rounds.filter((r) => r.mark === 'event').length;
  const out = rounds.filter((r) => r.flag).length;

  const list = newest.filter((r) => {
    if (filter === 'out' && !r.flag) return false;
    if (filter === 'mine' && !r.mark) return false;
    return q.trim() === '' || r.course.toLowerCase().includes(q.trim().toLowerCase());
  });

  const chip = (f: Filter, label: string) => (
    <button
      key={f}
      className="btn"
      aria-pressed={filter === f}
      style={filter === f ? { background: 'var(--accent)', color: '#04130a', borderColor: 'var(--accent)', fontWeight: 600 } : undefined}
      onClick={() => {
        setFilter(f);
        setShown(40);
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="stack">
      <Card
        title="Scrambles, tournaments and other events"
        hint="18Birdies does not say what format a round was, so the app cannot tell on its own. Mark any scramble or event here and it is left out of every number, your handicap index and the Tour comparison."
      >
        <div className="sub">
          {eventCount} marked by you, {out} left out in total. Your choices are saved in this browser and survive loading a new archive.
        </div>
      </Card>

      {team.length > 0 ? (
        <Card title="Left out automatically: scores too low for a normal round" hint={`${FLAG_TEAM}. A normal round is never this far under par. If one of these was really a solo round, count it.`}>
          <div className="rows">
            {team.map((r) => (
              <RoundRow key={r.id} r={r} onMark={onMark} />
            ))}
          </div>
        </Card>
      ) : null}

      {review.length > 0 ? (
        <Card title="Unusually good rounds" hint="These beat your handicap index at the time by 5 or more strokes. Many are real hot rounds, but scrambles can look like this. Mark any that were not solo.">
          <div className="rows">
            {review.map((c) => (
              <div key={c.round.id}>
                <RoundRow r={c.round} onMark={onMark} />
                <div className="sub" style={{ margin: '-2px 4px 8px' }}>
                  {c.margin.toFixed(1)} better than your {c.indexBefore} index at the time.
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card title="All rounds">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          {chip('all', 'All')}
          {chip('out', 'Left out')}
          {chip('mine', 'Marked by you')}
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShown(40);
            }}
            placeholder="Search course"
            aria-label="Search by course"
            style={{ flex: '1 1 160px', minHeight: 44, padding: '0 12px', borderRadius: 10, border: '1px solid var(--line-2)', background: 'var(--card-2)' }}
          />
        </div>
        {list.length === 0 ? (
          <div className="empty">No rounds match.</div>
        ) : (
          <div className="rows">
            {list.slice(0, shown).map((r) => (
              <RoundRow key={r.id} r={r} onMark={onMark} />
            ))}
          </div>
        )}
        {list.length > shown ? (
          <button className="btn" style={{ marginTop: 12 }} onClick={() => setShown((n) => n + 40)}>
            Show more ({list.length - shown} left)
          </button>
        ) : null}
      </Card>
    </div>
  );
}
