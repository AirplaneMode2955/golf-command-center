'use client';

import type { GolfData } from '@/lib/types';
import { Card, Stat } from './ui';

export function Crew({ data }: { data: GolfData }) {
  const names = [...data.friends].sort((a, b) => a.localeCompare(b));
  return (
    <div className="stack">
      <div className="grid g2">
        <Stat label="Friends on 18Birdies" value={names.length} />
        <Stat label="Courses played with the app" value={new Set(data.rounds.map((r) => r.courseId)).size} />
      </div>
      <Card title="Your friends" hint="18Birdies lists your friends in the archive but not which rounds you played together, so there are no head-to-head numbers yet.">
        {names.length === 0 ? (
          <div className="empty">No friends in this archive.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {names.map((f, i) => (
              <span className="pill" key={`${f}-${i}`}>
                {f}
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
