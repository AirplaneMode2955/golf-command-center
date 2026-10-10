import { placedRounds, type CourseSolve } from './pars';
import { avg, byYear, courses, fmtDate, fmtToPar, handicapSummary, toPar18, type HcpPoint } from './stats';
import type { Round } from './types';

/* ------------------------------------------------------------------ */
/* 1. Where you lose shots                                             */
/* ------------------------------------------------------------------ */

export type HoleLoss = { courseId: string; course: string; hole: number; par: number; avg: number; over: number; n: number };

export type ShotsLost = {
  holes: number;
  courses: number;
  /** All figures below are strokes per 18 holes, from holes where par could be worked out. */
  net: number;
  gained: number;
  bogeys: number;
  doubles: number;
  /** Strokes beyond a bogey on your double-or-worse holes. Turn them into bogeys and this is what you save. */
  blowups: number;
  doublesCount: number;
  byPar: { par: number; holesPer18: number; over: number; perHole: number; n: number }[];
  worst: HoleLoss[];
  best: HoleLoss[];
};

const MIN_HOLE_ROUNDS = 10;

export function shotsLost(rounds: Round[], solves: Map<string, CourseSolve>): ShotsLost | null {
  let N = 0;
  let gain = 0;
  let bog = 0;
  let dbl = 0;
  let blow = 0;
  let dblCount = 0;
  const par = new Map<number, { n: number; over: number }>();
  const holes = new Map<string, { courseId: string; course: string; hole: number; par: number; sum: number; n: number }>();
  let courseCount = 0;

  for (const [id, solve] of solves) {
    const mine = rounds.filter((r) => r.courseId === id);
    const placed = placedRounds(solve, mine);
    if (placed.length === 0) continue;
    courseCount++;
    const name = mine[0].course;
    for (const p of placed) {
      for (const h of p.holes) {
        const d = h.strokes - h.par;
        N++;
        if (d < 0) gain += d;
        else if (d === 1) bog += 1;
        else if (d >= 2) {
          dbl += d;
          blow += d - 1;
          dblCount++;
        }
        const pp = par.get(h.par) ?? { n: 0, over: 0 };
        pp.n++;
        pp.over += d;
        par.set(h.par, pp);
        const key = `${id}:${h.hole}`;
        const hh = holes.get(key) ?? { courseId: id, course: name, hole: h.hole, par: h.par, sum: 0, n: 0 };
        hh.sum += h.strokes;
        hh.n++;
        holes.set(key, hh);
      }
    }
  }
  if (N === 0) return null;
  const per = (v: number) => (v / N) * 18;
  const ranked: HoleLoss[] = [...holes.values()]
    .filter((h) => h.n >= MIN_HOLE_ROUNDS)
    .map((h) => ({ courseId: h.courseId, course: h.course, hole: h.hole, par: h.par, avg: h.sum / h.n, over: h.sum / h.n - h.par, n: h.n }));
  return {
    holes: N,
    courses: courseCount,
    net: per(gain + bog + dbl),
    gained: per(gain),
    bogeys: per(bog),
    doubles: per(dbl),
    blowups: per(blow),
    doublesCount: per(dblCount),
    byPar: [3, 4, 5]
      .filter((p) => par.has(p))
      .map((p) => {
        const x = par.get(p) as { n: number; over: number };
        return { par: p, holesPer18: per(x.n), over: per(x.over), perHole: x.over / x.n, n: x.n };
      }),
    worst: [...ranked].sort((a, b) => b.over - a.over).slice(0, 5),
    best: [...ranked].sort((a, b) => a.over - b.over).slice(0, 5),
  };
}

/* ------------------------------------------------------------------ */
/* 2. Records and streaks                                              */
/* ------------------------------------------------------------------ */

export type Rec = { key: string; label: string; value: string; sub?: string };
export type RecordGroup = { title: string; hint?: string; items: Rec[] };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86400000;

function longestRun<T>(items: T[], ok: (x: T) => boolean): { len: number; start: number; end: number } {
  let best = { len: 0, start: 0, end: 0 };
  let cur = 0;
  for (let i = 0; i < items.length; i++) {
    if (ok(items[i])) {
      cur++;
      if (cur > best.len) best = { len: cur, start: i - cur + 1, end: i };
    } else cur = 0;
  }
  return best;
}

export function records(rounds: Round[], solves: Map<string, CourseSolve>, hcp: HcpPoint[]): RecordGroup[] {
  if (rounds.length === 0) return [];
  const r18 = rounds.filter((r) => r.holes === 18);
  const groups: RecordGroup[] = [];

  /* Best rounds */
  const best: Rec[] = [];
  const b18 = r18.reduce<Round | null>((b, r) => (b === null || r.strokes < b.strokes ? r : b), null);
  if (b18) best.push({ key: 'b18', label: 'Best 18 holes', value: String(b18.strokes), sub: `${fmtToPar(b18.toPar)}, ${b18.course}, ${fmtDate(b18.date)}` });

  let b9: { strokes: number; r: Round; where: string; toPar: number | null } | null = null;
  for (const r of rounds) {
    const cands =
      r.holes === 9
        ? [{ strokes: r.strokes, where: '9-hole round', toPar: r.toPar as number | null }]
        : r.holes === 18
          ? [
              { strokes: r.holeStrokes.slice(0, 9).reduce((a, b) => a + b, 0), where: 'front nine', toPar: null },
              { strokes: r.holeStrokes.slice(9).reduce((a, b) => a + b, 0), where: 'back nine', toPar: null },
            ]
          : [];
    for (const c of cands) if (b9 === null || c.strokes < b9.strokes) b9 = { ...c, r };
  }
  if (b9) best.push({ key: 'b9', label: 'Best 9 holes', value: String(b9.strokes), sub: `${b9.toPar !== null ? fmtToPar(b9.toPar) + ', ' : ''}${b9.r.course}, ${fmtDate(b9.r.date)} (${b9.where})` });

  const mostBirdies = rounds.reduce<Round | null>((b, r) => (b === null || r.birdies + r.eagles > b.birdies + b.eagles ? r : b), null);
  if (mostBirdies && mostBirdies.birdies + mostBirdies.eagles > 0) {
    const n = mostBirdies.birdies + mostBirdies.eagles;
    best.push({ key: 'birdies', label: 'Most birdies in a round', value: String(n), sub: `${mostBirdies.course}, ${fmtDate(mostBirdies.date)}, ${mostBirdies.holes} holes` });
  }
  const eagleRounds = rounds.filter((r) => r.eagles > 0);
  if (eagleRounds.length) {
    const total = eagleRounds.reduce((a, r) => a + r.eagles, 0);
    const last = eagleRounds[eagleRounds.length - 1];
    best.push({ key: 'eagles', label: 'Eagles or better', value: String(total), sub: `Latest ${fmtDate(last.date)} at ${last.course}` });
  }
  groups.push({ title: 'Best rounds', items: best });

  /* Breaking scores */
  const thresholds = [90, 80, 75, 70];
  const breaking: Rec[] = thresholds.map((t) => ({ key: `u${t}`, label: `Rounds under ${t}`, value: String(r18.filter((r) => r.strokes < t).length), sub: '18 holes' }));
  groups.push({ title: 'Breaking scores', items: breaking });

  /* Streaks */
  const streaks: Rec[] = [];
  const sorted18 = [...r18].sort((a, b) => a.ts - b.ts);
  const run80 = longestRun(sorted18, (r) => r.strokes < 80);
  if (run80.len > 0) {
    streaks.push({
      key: 'run80',
      label: 'Rounds under 80 in a row',
      value: String(run80.len),
      sub: run80.len > 1 ? `${fmtDate(sorted18[run80.start].date)} to ${fmtDate(sorted18[run80.end].date)}` : fmtDate(sorted18[run80.start].date),
    });
  }
  // Hole streaks need a solved par, so they only cover courses where that worked.
  let parRun = { len: 0, round: null as Round | null, start: 0 };
  let birdieRun = { len: 0, round: null as Round | null, start: 0 };
  for (const [id, solve] of solves) {
    for (const p of placedRounds(solve, rounds.filter((r) => r.courseId === id))) {
      const a = longestRun(p.holes, (h) => h.strokes <= h.par);
      if (a.len > parRun.len) parRun = { len: a.len, round: p.round, start: p.holes[a.start].hole };
      const b = longestRun(p.holes, (h) => h.strokes < h.par);
      if (b.len > birdieRun.len) birdieRun = { len: b.len, round: p.round, start: p.holes[b.start].hole };
    }
  }
  if (parRun.round) {
    streaks.push({ key: 'parRun', label: 'Par or better in a row', value: String(parRun.len), sub: `From hole ${parRun.start}, ${parRun.round.course}, ${fmtDate(parRun.round.date)}` });
  }
  if (birdieRun.round) {
    streaks.push({ key: 'birdieRun', label: 'Birdies in a row', value: String(birdieRun.len), sub: `From hole ${birdieRun.start}, ${birdieRun.round.course}, ${fmtDate(birdieRun.round.date)}` });
  }
  if (streaks.length) {
    groups.push({
      title: 'Streaks',
      hint: parRun.round ? 'Hole streaks cover courses where par could be worked out from your scorecards.' : undefined,
      items: streaks,
    });
  }

  /* Habits */
  const habits: Rec[] = [];
  const years = byYear(rounds);
  const busyYear = [...years].sort((a, b) => b.rounds - a.rounds)[0];
  if (busyYear) habits.push({ key: 'year', label: 'Busiest year', value: String(busyYear.year), sub: `${busyYear.rounds} rounds` });

  const byMonth = new Map<string, number>();
  for (const r of rounds) byMonth.set(`${r.year}-${new Date(r.ts).getMonth()}`, (byMonth.get(`${r.year}-${new Date(r.ts).getMonth()}`) ?? 0) + 1);
  const busyMonth = [...byMonth.entries()].sort((a, b) => b[1] - a[1])[0];
  if (busyMonth) {
    const [y, m] = busyMonth[0].split('-').map(Number);
    habits.push({ key: 'month', label: 'Busiest month', value: `${MONTHS[m]} ${y}`, sub: `${busyMonth[1]} rounds` });
  }

  const byDay = new Map<string, { holes: number; rounds: number }>();
  for (const r of rounds) {
    const d = byDay.get(r.date) ?? { holes: 0, rounds: 0 };
    d.holes += r.holes;
    d.rounds++;
    byDay.set(r.date, d);
  }
  const bigDay = [...byDay.entries()].sort((a, b) => b[1].holes - a[1].holes)[0];
  if (bigDay) habits.push({ key: 'day', label: 'Most holes in a day', value: String(bigDay[1].holes), sub: `${fmtDate(bigDay[0])}, ${bigDay[1].rounds} rounds` });

  let gap = { days: 0, from: '', to: '' };
  for (let i = 1; i < rounds.length; i++) {
    const days = Math.round((rounds[i].ts - rounds[i - 1].ts) / DAY_MS);
    if (days > gap.days) gap = { days, from: rounds[i - 1].date, to: rounds[i].date };
  }
  if (gap.days > 0) habits.push({ key: 'gap', label: 'Longest break', value: `${gap.days} days`, sub: `${fmtDate(gap.from)} to ${fmtDate(gap.to)}` });

  const top = courses(rounds)[0];
  if (top) habits.push({ key: 'home', label: 'Most played course', value: String(top.rounds), sub: top.name });

  const hs = handicapSummary(hcp);
  if (hs) {
    habits.push({ key: 'hcp', label: 'Lowest handicap index', value: String(hs.low.index), sub: `${fmtDate(hs.low.date)} (high was ${hs.high.index} in ${hs.high.year})` });
  }
  groups.push({ title: 'Habits', items: habits });

  return groups;
}

/* ------------------------------------------------------------------ */
/* Rounds worth a second look                                          */
/* ------------------------------------------------------------------ */

export type Candidate = { round: Round; indexBefore: number; margin: number };

/**
 * Rounds that beat your handicap index at the time by 5 or more strokes. Plenty are real hot rounds, but scrambles and
 * best-ball events show up here too, and the archive does not say which format a round was, so the user decides.
 */
export function reviewCandidates(rounds: Round[], series: HcpPoint[]): Candidate[] {
  const out: Candidate[] = [];
  for (const r of rounds) {
    if (r.flag || r.mark || r.diff === null) continue;
    let before: number | null = null;
    for (const p of series) {
      if (p.ts < r.ts) before = p.index;
      else break;
    }
    if (before === null) continue;
    const margin = before - r.diff;
    if (margin >= 5) out.push({ round: r, indexBefore: before, margin });
  }
  return out.sort((a, b) => b.margin - a.margin).slice(0, 8);
}

/* ------------------------------------------------------------------ */
/* 3. When you play best                                               */
/* ------------------------------------------------------------------ */

export type Bucket = { label: string; n: number; avg: number | null };
export type PatternGroup = { key: string; title: string; hint: string; buckets: Bucket[] };
export type Patterns = { overall: number | null; groups: PatternGroup[]; insights: string[] };

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MIN_BUCKET = 8;

function bucketize(items: { v: number; k: number }[], labels: string[]): Bucket[] {
  return labels.map((label, i) => {
    const xs = items.filter((x) => x.k === i).map((x) => x.v);
    return { label, n: xs.length, avg: xs.length ? (avg(xs) as number) : null };
  });
}

export function patterns(rounds: Round[]): Patterns {
  const sorted = [...rounds].sort((a, b) => a.ts - b.ts);
  const vals = sorted.map((r) => toPar18(r));
  const overall = avg(vals);

  const dow: { v: number; k: number }[] = [];
  const month: { v: number; k: number }[] = [];
  const time: { v: number; k: number }[] = [];
  const rest: { v: number; k: number }[] = [];

  sorted.forEach((r, i) => {
    const d = new Date(r.ts);
    const v = vals[i];
    dow.push({ v, k: (d.getDay() + 6) % 7 });
    month.push({ v, k: d.getMonth() });
    const h = d.getHours();
    time.push({ v, k: h < 8 ? 0 : h < 11 ? 1 : h < 14 ? 2 : h < 17 ? 3 : 4 });
    if (i > 0) {
      const days = (r.ts - sorted[i - 1].ts) / DAY_MS;
      rest.push({ v, k: days < 0.5 ? 0 : days < 4 ? 1 : days < 8 ? 2 : days < 15 ? 3 : days < 31 ? 4 : 5 });
    }
  });

  const groups: PatternGroup[] = [
    { key: 'dow', title: 'Day of the week', hint: 'Average score to par per 18 holes.', buckets: bucketize(dow, DOW) },
    { key: 'month', title: 'Month', hint: 'Average score to par per 18 holes.', buckets: bucketize(month, MONTHS) },
    {
      key: 'time',
      title: 'Time of day',
      hint: 'Based on the time each round was recorded.',
      buckets: bucketize(time, ['Before 8am', '8 to 11am', '11am to 2pm', '2 to 5pm', 'After 5pm']),
    },
    {
      key: 'rest',
      title: 'Time since your last round',
      hint: 'How rest, or rust, shows up in your score.',
      buckets: bucketize(rest, ['Same day', '1 to 3 days', '4 to 7 days', '8 to 14 days', '15 to 30 days', '31+ days']),
    },
  ];

  const insights: string[] = [];
  if (overall !== null) {
    const f = (v: number) => fmtToPar(v);
    const solid = (g: PatternGroup) => g.buckets.filter((b) => b.avg !== null && b.n >= MIN_BUCKET) as (Bucket & { avg: number })[];
    const dowS = solid(groups[0]);
    if (dowS.length >= 2) {
      const b = dowS.reduce((m, x) => (x.avg < m.avg ? x : m));
      if (overall - b.avg >= 0.75) insights.push(`Best day: ${b.label}, ${f(b.avg)} per 18 against ${f(overall)} overall (${b.n} rounds).`);
      const w = dowS.reduce((m, x) => (x.avg > m.avg ? x : m));
      if (w.avg - overall >= 0.75) insights.push(`Toughest day: ${w.label}, ${f(w.avg)} per 18 (${w.n} rounds).`);
    }
    const timeS = solid(groups[2]);
    if (timeS.length >= 2) {
      const b = timeS.reduce((m, x) => (x.avg < m.avg ? x : m));
      if (overall - b.avg >= 0.75) insights.push(`Best time: ${b.label.toLowerCase()}, ${f(b.avg)} per 18 (${b.n} rounds).`);
    }
    const monthS = solid(groups[1]);
    if (monthS.length >= 2) {
      const b = monthS.reduce((m, x) => (x.avg < m.avg ? x : m));
      if (overall - b.avg >= 0.75) insights.push(`Best month: ${b.label}, ${f(b.avg)} per 18 (${b.n} rounds).`);
    }
    const restB = groups[3].buckets;
    const rust = restB[5];
    const fresh = restB.slice(1, 4).filter((b) => b.avg !== null && b.n >= 3);
    if (rust.avg !== null && rust.n >= 5 && fresh.length) {
      const freshAvg = avg(fresh.flatMap((b) => Array(b.n).fill(b.avg as number))) as number;
      const diff = rust.avg - freshAvg;
      if (Math.abs(diff) >= 0.75) insights.push(`After 31 or more days off you score ${Math.abs(diff).toFixed(1)} strokes ${diff > 0 ? 'worse' : 'better'} per 18 than when you play every week or so (${rust.n} rounds).`);
    }
  }
  return { overall, groups, insights };
}
