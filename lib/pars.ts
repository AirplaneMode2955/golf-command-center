import type { Round } from './types';

/**
 * The 18Birdies archive has no par per hole. It does record, for every round, how many eagles, birdies, pars,
 * bogeys and doubles you made, plus your strokes on each hole. Those only agree with one set of pars, so with
 * enough rounds at a course we can solve for the par of each hole.
 */

export type Layout = {
  pars: number[];
  holes: 9 | 18;
  /** Rounds whose five result counts match the solved pars exactly. */
  matched: number;
  rounds: number;
  /** matched / rounds. Close to 1 means the solve is trustworthy. */
  confidence: number;
};

export type CourseSolve = {
  layout: Layout;
  /** Round id -> hole offset (0 = front nine / holes 1-9, 9 = back nine) for rounds we could place on the layout. */
  offsets: Map<string, number>;
};

const MIN_ROUNDS = 5;
const MIN_CONFIDENCE = 0.7;

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distance between a round's recorded result counts and the counts these pars would give. 0 means they agree. */
function mismatch(pars: number[], r: Round): number {
  let e = 0, b = 0, p = 0, g = 0, d = 0;
  for (let i = 0; i < pars.length; i++) {
    const diff = r.holeStrokes[i] - pars[i];
    if (diff <= -2) e++;
    else if (diff === -1) b++;
    else if (diff === 0) p++;
    else if (diff === 1) g++;
    else d++;
  }
  return Math.abs(e - r.eagles) + Math.abs(b - r.birdies) + Math.abs(p - r.pars) + Math.abs(g - r.bogeys) + Math.abs(d - r.doubles);
}

function solve(rounds: Round[], n: 9 | 18): Layout | null {
  const pool = rounds.filter((r) => r.holes === n && !r.flag);
  if (pool.length < MIN_ROUNDS) return null;

  // A course can play to a few different pars; solve for the most common one.
  const counts = new Map<number, number>();
  for (const r of pool) counts.set(r.par, (counts.get(r.par) ?? 0) + 1);
  const target = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const use = pool.filter((r) => r.par === target);
  if (use.length < MIN_ROUNDS) return null;

  const cost = (pars: number[]) => {
    let c = 0;
    for (const r of use) c += mismatch(pars, r);
    return c + Math.abs(pars.reduce((a, b) => a + b, 0) - target) * use.length * 2;
  };

  const rand = mulberry(target * 7919 + use.length * 31 + n);
  let best: number[] | null = null;
  let bestCost = Infinity;

  for (let start = 0; start < 24; start++) {
    // Seed from each hole's typical score, with noise on later restarts.
    let pars = Array.from({ length: n }, (_, i) => {
      const xs = use.map((r) => r.holeStrokes[i]).sort((a, b) => a - b);
      const med = xs[Math.floor(xs.length / 2)];
      const jitter = start === 0 ? 0 : rand() < 0.3 ? (rand() < 0.5 ? -1 : 1) : 0;
      return Math.min(5, Math.max(3, med + jitter));
    });
    let cur = cost(pars);
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < n; i++) {
        for (const v of [3, 4, 5]) {
          if (v === pars[i]) continue;
          const next = pars.slice();
          next[i] = v;
          const c = cost(next);
          if (c < cur) [pars, cur, improved] = [next, c, true];
        }
      }
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (pars[i] === pars[j]) continue;
          const next = pars.slice();
          [next[i], next[j]] = [pars[j], pars[i]];
          const c = cost(next);
          if (c < cur) [pars, cur, improved] = [next, c, true];
        }
      }
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j || pars[i] >= 5 || pars[j] <= 3) continue;
          const next = pars.slice();
          next[i]++;
          next[j]--;
          const c = cost(next);
          if (c < cur) [pars, cur, improved] = [next, c, true];
        }
      }
    }
    if (cur < bestCost) [best, bestCost] = [pars, cur];
    if (bestCost === 0) break;
  }
  if (!best) return null;

  const matched = use.filter((r) => mismatch(best as number[], r) === 0).length;
  const confidence = matched / use.length;
  if (confidence < MIN_CONFIDENCE) return null;
  return { pars: best, holes: n, matched, rounds: use.length, confidence };
}

/** Work out a course's hole pars from your rounds there, and place 9 hole rounds on the front or back nine. */
export function solveCourse(rounds: Round[]): CourseSolve | null {
  const offsets = new Map<string, number>();
  const valid = rounds.filter((r) => !r.flag);

  const full = solve(valid, 18);
  if (full) {
    for (const r of valid) {
      if (r.holes === 18) offsets.set(r.id, 0);
      else if (r.holes === 9) {
        const front = mismatch(full.pars.slice(0, 9), r) === 0;
        const back = mismatch(full.pars.slice(9), r) === 0;
        if (front && !back) offsets.set(r.id, 0);
        else if (back && !front) offsets.set(r.id, 9);
      }
    }
    return { layout: full, offsets };
  }

  const nine = solve(valid, 9);
  if (nine) {
    for (const r of valid) if (r.holes === 9 && mismatch(nine.pars, r) === 0) offsets.set(r.id, 0);
    return { layout: nine, offsets };
  }
  return null;
}

export function solveAll(rounds: Round[]): Map<string, CourseSolve> {
  const by = new Map<string, Round[]>();
  for (const r of rounds) by.set(r.courseId, [...(by.get(r.courseId) ?? []), r]);
  const out = new Map<string, CourseSolve>();
  for (const [id, rs] of by) {
    const s = solveCourse(rs);
    if (s) out.set(id, s);
  }
  return out;
}

export type HoleStat = { hole: number; par: number; avg: number; n: number };

/** Every hole you played at a course with its solved par. Includes 9 hole rounds that fit one of the nines. */
export function holeEntries(solve: CourseSolve, rounds: Round[]): { hole: number; par: number; strokes: number }[] {
  const out: { hole: number; par: number; strokes: number }[] = [];
  for (const r of rounds) {
    const off = solve.offsets.get(r.id);
    if (off === undefined || r.flag) continue;
    r.holeStrokes.forEach((strokes, i) => {
      const idx = off + i;
      out.push({ hole: idx + 1, par: solve.layout.pars[idx], strokes });
    });
  }
  return out;
}

export function holeStats(solve: CourseSolve, rounds: Round[]): HoleStat[] {
  const entries = holeEntries(solve, rounds);
  return solve.layout.pars.map((par, i) => {
    const xs = entries.filter((e) => e.hole === i + 1).map((e) => e.strokes);
    return { hole: i + 1, par, avg: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0, n: xs.length };
  });
}
