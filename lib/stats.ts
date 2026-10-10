import type { Direction, GolfData, Round } from './types';

export const avg = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function usableRounds(data: GolfData, includeFlagged: boolean): Round[] {
  return includeFlagged ? data.rounds : data.rounds.filter((r) => !r.flag);
}

/** To-par scaled to an 18 hole round so 9 and 18 hole rounds can share a chart. */
export const toPar18 = (r: Round) => (r.toPar * 18) / r.holes;

export function rolling(points: { x: number; y: number }[], window: number) {
  return points.map((p, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1).map((q) => q.y);
    return { x: p.x, y: sum(slice) / slice.length };
  });
}

export type CourseRow = {
  id: string;
  name: string;
  rounds: number;
  last: string;
  par18: number | null;
  avg18: number | null;
  best18: number | null;
  avgToPar18: number | null;
  rounds18: Round[];
};

export function courses(rounds: Round[]): CourseRow[] {
  const by = new Map<string, Round[]>();
  for (const r of rounds) by.set(r.courseId, [...(by.get(r.courseId) ?? []), r]);
  return [...by.entries()]
    .map(([id, rs]) => {
      const r18 = rs.filter((r) => r.holes === 18);
      const pars = r18.map((r) => r.par);
      return {
        id,
        name: rs[0].course,
        rounds: rs.length,
        last: rs[rs.length - 1].date,
        par18: pars.length ? pars.sort((a, b) => a - b)[Math.floor(pars.length / 2)] : null,
        avg18: avg(r18.map((r) => r.strokes)),
        best18: r18.length ? Math.min(...r18.map((r) => r.strokes)) : null,
        avgToPar18: avg(r18.map((r) => r.toPar)),
        rounds18: r18,
      };
    })
    .sort((a, b) => b.rounds - a.rounds || a.name.localeCompare(b.name));
}

/** Average strokes per hole across 18 hole rounds. Nine hole rounds are skipped because the file does not say which nine. */
export function holeAverages(rounds18: Round[]): { hole: number; avg: number }[] {
  return Array.from({ length: 18 }, (_, i) => ({ hole: i + 1, avg: avg(rounds18.map((r) => r.holeStrokes[i])) ?? 0 }));
}

export type Mix = { eagles: number; birdies: number; pars: number; bogeys: number; doubles: number; holes: number };

export function scoringMix(rounds: Round[]): Mix {
  const m: Mix = { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, holes: 0 };
  for (const r of rounds) {
    m.eagles += r.eagles;
    m.birdies += r.birdies;
    m.pars += r.pars;
    m.bogeys += r.bogeys;
    m.doubles += r.doubles;
  }
  m.holes = m.eagles + m.birdies + m.pars + m.bogeys + m.doubles;
  return m;
}

export function addDirection(rounds: Round[], key: 'fairways' | 'greens'): Direction & { rounds: number } {
  const t = { hit: 0, left: 0, right: 0, short: 0, long: 0, count: 0, noChance: 0, rounds: 0 };
  for (const r of rounds) {
    const d = r[key];
    if (d.count <= 0) continue;
    t.hit += d.hit;
    t.left += d.left;
    t.right += d.right;
    t.short += d.short;
    t.long += d.long;
    t.count += d.count;
    t.noChance += d.noChance;
    t.rounds += 1;
  }
  return t;
}

export type YearRow = { year: number; rounds: number; avg18: number | null; best18: number | null };

export function byYear(rounds: Round[]): YearRow[] {
  const years = [...new Set(rounds.map((r) => r.year))].sort((a, b) => a - b);
  return years.map((year) => {
    const rs = rounds.filter((r) => r.year === year);
    const r18 = rs.filter((r) => r.holes === 18);
    return {
      year,
      rounds: rs.length,
      avg18: avg(r18.map((r) => r.strokes)),
      best18: r18.length ? Math.min(...r18.map((r) => r.strokes)) : null,
    };
  });
}

export function headline(rounds: Round[]) {
  const r18 = rounds.filter((r) => r.holes === 18);
  const last10 = r18.slice(-10);
  const best = r18.reduce<Round | null>((b, r) => (b === null || r.strokes < b.strokes ? r : b), null);
  return {
    total: rounds.length,
    count18: r18.length,
    count9: rounds.length - r18.length,
    courses: new Set(rounds.map((r) => r.courseId)).size,
    best,
    avgLast10: avg(last10.map((r) => r.strokes)),
    avgAll18: avg(r18.map((r) => r.strokes)),
    first: rounds[0]?.date ?? null,
    last: rounds[rounds.length - 1]?.date ?? null,
  };
}

export const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

export function fmtToPar(v: number): string {
  const r = Math.round(v * 10) / 10;
  return r === 0 ? 'E' : r > 0 ? `+${r}` : `${r}`;
}

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Hole results as a rate, and as a count per 18 holes. */
export function perEighteen(mix: Mix) {
  const f = (v: number) => (mix.holes > 0 ? (v / mix.holes) * 18 : 0);
  return { eagles: f(mix.eagles), birdies: f(mix.birdies), pars: f(mix.pars), bogeys: f(mix.bogeys), doubles: f(mix.doubles) };
}

export function inYear(rounds: Round[], year: number | null): Round[] {
  return year === null ? rounds : rounds.filter((r) => r.year === year);
}

export type HcpPoint = { ts: number; date: string; year: number; index: number };

/**
 * Handicap index after each round, the World Handicap System way: the average of the lowest differentials among your
 * last 20 rounds (8 of 20, fewer when you have fewer rounds). 18Birdies only stores each round's differential, not the
 * index, so this rebuilds it. It uses every round that has a differential, 9-hole rounds included.
 */
export function handicapSeries(all: Round[]): HcpPoint[] {
  const ds = all.filter((r) => r.diff !== null).sort((a, b) => a.ts - b.ts);
  const out: HcpPoint[] = [];
  for (let i = 0; i < ds.length; i++) {
    const win = ds.slice(Math.max(0, i - 19), i + 1).map((r) => r.diff as number);
    const n = win.length;
    if (n < 3) continue;
    const k = n >= 20 ? 8 : n === 19 ? 7 : n >= 17 ? 6 : n >= 15 ? 5 : n >= 12 ? 4 : n >= 9 ? 3 : n >= 6 ? 2 : 1;
    const adj = n === 3 ? -2 : n === 4 || n === 6 ? -1 : 0;
    const lowest = [...win].sort((a, b) => a - b).slice(0, k);
    const index = Math.round(((sum(lowest) / k) + adj) * 10) / 10;
    out.push({ ts: ds[i].ts, date: ds[i].date, year: ds[i].year, index });
  }
  return out;
}

export function handicapSummary(series: HcpPoint[]) {
  if (series.length === 0) return null;
  const now = series[series.length - 1];
  const low = series.reduce((b, p) => (p.index < b.index ? p : b));
  const high = series.reduce((b, p) => (p.index > b.index ? p : b));
  return { now, low, high };
}

export function indexAtYearEnd(series: HcpPoint[], year: number): number | null {
  const inYr = series.filter((p) => p.year <= year);
  return inYr.length ? inYr[inYr.length - 1].index : null;
}
