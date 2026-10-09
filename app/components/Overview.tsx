'use client';

import { addDirection, byYear, fmtDate, fmtToPar, headline, perEighteen, pct, rolling, scoringMix, toPar18 } from '@/lib/stats';
import type { Round } from '@/lib/types';
import { Bars, TimeChart } from './charts';
import { Card, Stat } from './ui';
import { Donut, FairwayGauge, GirWheel, RESULT_COLORS, Ring } from './visuals';

const RESULTS = [
  { key: 'eagles', label: 'Eagle+' },
  { key: 'birdies', label: 'Birdie' },
  { key: 'pars', label: 'Par' },
  { key: 'bogeys', label: 'Bogey' },
  { key: 'doubles', label: 'Double+' },
] as const;

export function Overview({ rounds }: { rounds: Round[] }) {
  if (rounds.length === 0) return <div className="empty">No rounds to show.</div>;
  const h = headline(rounds);
  const years = byYear(rounds);
  const mix = scoringMix(rounds);
  const per = perEighteen(mix);
  const fw = addDirection(rounds, 'fairways');
  const gir = addDirection(rounds, 'greens');
  const fwOther = fw.short + fw.long;

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
        <Stat label="Best 18 holes" value={h.best ? h.best.strokes : 'n/a'} note={h.best ? `${h.best.course}, ${fmtDate(h.best.date)}` : undefined} />
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

      <Card title="Your game, per round" hint={`What an average 18 holes looks like for you, from ${mix.holes.toLocaleString()} holes.`}>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
          <Donut
            label="Share of holes by result"
            parts={RESULTS.map((r) => ({ value: mix[r.key], color: RESULT_COLORS[r.key], label: r.label }))}
          >
            <div className="num" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>
              {pct(mix.birdies + mix.eagles, mix.holes).toFixed(0)}%
            </div>
            <div style={{ color: 'var(--dim)', fontSize: 14 }}>birdie or better</div>
          </Donut>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <div className="rows">
              {RESULTS.map((r) => (
                <div className="row" key={r.key} style={{ minHeight: 44 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: RESULT_COLORS[r.key], flex: '0 0 auto' }} />
                  <span className="grow">{r.label}</span>
                  <span className="end num" style={{ width: 60 }}>
                    {per[r.key].toFixed(1)}
                  </span>
                  <span className="end num dim" style={{ width: 56 }}>
                    {pct(mix[r.key], mix.holes).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
            <div className="sub" style={{ marginTop: 6 }}>
              Left column is per 18 holes, right is share of all holes.
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginTop: 22 }}>
          <Ring pct={pct(mix.birdies + mix.eagles, mix.holes)} value={per.birdies.toFixed(1)} caption="Birdies" sub="per round" color={RESULT_COLORS.birdies} />
          <Ring pct={pct(mix.pars, mix.holes)} value={per.pars.toFixed(1)} caption="Pars" sub="per round" color={RESULT_COLORS.pars} />
          <Ring pct={pct(gir.hit, gir.count)} value={`${pct(gir.hit, gir.count).toFixed(0)}%`} caption="Greens" sub={`${((gir.hit / Math.max(gir.count, 1)) * 18).toFixed(1)} of 18`} color="#a78bfa" />
          <Ring pct={pct(fw.hit, fw.count)} value={`${pct(fw.hit, fw.count).toFixed(0)}%`} caption="Fairways" sub="of tracked" color="#fbbf24" />
        </div>
      </Card>

      <div className="grid g2">
        <Card title="Fairways hit" hint={`Tee shots on ${fw.count.toLocaleString()} holes over ${fw.rounds} rounds.`}>
          {fw.count > 0 ? <FairwayGauge left={fw.left} hit={fw.hit} right={fw.right} other={fwOther} count={fw.count} /> : <div className="empty">No fairway data tracked.</div>}
        </Card>
        <Card
          title="Greens in regulation"
          hint={`${gir.hit.toLocaleString()} of ${gir.count.toLocaleString()} holes. The wedges show where recorded misses ended up (${(gir.left + gir.right + gir.short + gir.long).toLocaleString()} of ${(gir.count - gir.hit).toLocaleString()} misses had a direction logged).`}
        >
          {gir.count > 0 ? (
            <GirWheel hit={gir.hit} count={gir.count} long={gir.long} left={gir.left} right={gir.right} short={gir.short} noChance={gir.noChance} />
          ) : (
            <div className="empty">No green data tracked.</div>
          )}
        </Card>
      </div>

      <div className="grid g2">
        <Card title="Handicap" hint="Your handicap as recorded after each round.">
          <TimeChart label="Handicap over time" series={[{ points: hcp, kind: 'line', color: 'var(--warn)' }]} fmtY={(v) => v.toFixed(0)} height={200} />
        </Card>
        <Card title="Rounds per year">
          <Bars label="Rounds per year" items={years.map((y) => ({ label: String(y.year), value: y.rounds }))} />
        </Card>
      </div>

      <Card title="Recent rounds" hint="Result counts are eagle+, birdies, pars, bogeys and double+.">
        <div className="rows">
          {[...rounds]
            .reverse()
            .slice(0, 10)
            .map((r) => (
              <div className="row" key={r.id} style={{ flexWrap: 'wrap' }}>
                <div className="grow" style={{ flex: '1 1 180px' }}>
                  <div>{r.course}</div>
                  <div className="dim">
                    {fmtDate(r.date)}, {r.holes} holes
                  </div>
                </div>
                <div className="num" style={{ display: 'flex', gap: 10, fontSize: 15 }} aria-label="Hole results">
                  {RESULTS.map((x) => (
                    <span key={x.key} style={{ color: r[x.key] > 0 ? RESULT_COLORS[x.key] : 'var(--dim-2)', minWidth: 14, textAlign: 'center' }} title={x.label}>
                      {r[x.key]}
                    </span>
                  ))}
                </div>
                <div className="end num" style={{ minWidth: 72 }}>
                  <b>{r.strokes}</b> <span className="dim">{fmtToPar(r.toPar)}</span>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}
