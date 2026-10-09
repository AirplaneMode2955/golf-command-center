'use client';

import { useMemo } from 'react';
import { MIN_BUCKET, patterns } from '@/lib/insights';
import { fmtToPar } from '@/lib/stats';
import type { Round } from '@/lib/types';
import { Diverging } from './charts';
import { Card } from './ui';

export function Patterns({ rounds }: { rounds: Round[] }) {
  const p = useMemo(() => patterns(rounds), [rounds]);
  if (rounds.length < 10 || p.overall === null) return <div className="empty">Needs at least 10 rounds to find patterns.</div>;

  return (
    <div className="stack">
      <Card title="What stands out" hint={`Your average is ${fmtToPar(p.overall)} per 18 holes. Only groups with ${MIN_BUCKET} or more rounds count here.`}>
        {p.insights.length ? (
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
            {p.insights.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : (
          <div className="empty">Nothing clearly stands out. Your scoring is steady across days, months and times.</div>
        )}
      </Card>

      <div className="grid g2">
        {p.groups.map((g) => (
          <Card key={g.key} title={g.title} hint={`${g.hint} Green is better than your average, red is worse. Faded rows have fewer than ${MIN_BUCKET} rounds.`}>
            <Diverging
              label={`${g.title}: score to par compared with your average`}
              rows={g.buckets.map((b) => ({ label: b.label, value: b.avg, n: b.n }))}
              center={p.overall as number}
              min={MIN_BUCKET}
              fmt={fmtToPar}
            />
          </Card>
        ))}
      </div>

      <div className="sub" style={{ padding: '0 4px' }}>
        Scores are to par, scaled to 18 holes, so 9-hole rounds count double. Times use this device&apos;s time zone. With a few dozen rounds per group,
        differences of a stroke or less are mostly noise.
      </div>
    </div>
  );
}
