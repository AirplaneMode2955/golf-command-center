'use client';

import { useMemo } from 'react';
import { records } from '@/lib/insights';
import type { CourseSolve } from '@/lib/pars';
import type { Round } from '@/lib/types';
import { Card } from './ui';

export function Records({ rounds, solves }: { rounds: Round[]; solves: Map<string, CourseSolve> }) {
  const groups = useMemo(() => records(rounds, solves), [rounds, solves]);
  if (groups.length === 0) return <div className="empty">No rounds to show.</div>;

  return (
    <div className="stack">
      {groups.map((g) => (
        <Card key={g.title} title={g.title} hint={g.hint}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
            {g.items.map((r) => (
              <div key={r.key} className="card" style={{ background: 'var(--card-2)' }}>
                <div className="sub">{r.label}</div>
                <div className="num" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.2, marginTop: 2 }}>
                  {r.value}
                </div>
                {r.sub ? (
                  <div className="sub" style={{ marginTop: 2 }}>
                    {r.sub}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
