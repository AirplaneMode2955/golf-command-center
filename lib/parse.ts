import type { Direction, GolfData, Round } from './types';

type RawStats = Partial<Record<string, number>>;
type RawRound = {
  id?: string;
  timestamp?: number;
  clubId?: { id?: string };
  score?: number;
  strokes?: number;
  holeStrokes?: number[];
  stats?: RawStats;
  roundHandicap?: string | number | null;
};
type RawArchive = {
  myData?: RawArchive;
  activityData?: { rounds?: RawRound[] };
  clubData?: { playedClubs?: { clubId?: string; name?: string }[] };
  friendData?: { friends?: { name?: string }[] };
};

const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

const pad = (v: number) => String(v).padStart(2, '0');

function direction(s: RawStats, hit: string, prefix: string, count: string): Direction {
  return {
    hit: n(s[hit]),
    left: n(s[`${prefix}Lefts`]),
    right: n(s[`${prefix}Rights`]),
    short: n(s[`${prefix}Shorts`]),
    long: n(s[`${prefix}Longs`]),
    count: n(s[count]),
    noChance: n(s[`${prefix}NoChances`]),
  };
}

function flagFor(holes: number, strokes: number, par: number, holeStrokes: number[]): string | null {
  if (holes !== 9 && holes !== 18) return 'Not a 9 or 18 hole round';
  if (holeStrokes.some((h) => !(h > 0))) return 'Missing hole scores';
  if (holeStrokes.reduce((a, b) => a + b, 0) !== strokes) return 'Totals do not add up';
  if (strokes < holes * 3.3) return 'Score looks too low to be a full round';
  if (par < holes * 3.6) return 'Par-3 or short course';
  return null;
}

function toRound(r: RawRound, clubs: Map<string, string>): Round | null {
  if (!r || typeof r.timestamp !== 'number' || !Array.isArray(r.holeStrokes)) return null;
  const d = new Date(r.timestamp);
  const s = r.stats ?? {};
  const strokes = n(r.strokes);
  const toPar = n(r.score);
  const hcp = r.roundHandicap == null ? NaN : Number(r.roundHandicap);
  const courseId = r.clubId?.id ?? 'unknown';
  return {
    id: r.id ?? `${r.timestamp}`,
    ts: r.timestamp,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    year: d.getFullYear(),
    courseId,
    course: clubs.get(courseId) ?? 'Unknown course',
    holes: r.holeStrokes.length,
    strokes,
    toPar,
    par: strokes - toPar,
    holeStrokes: r.holeStrokes,
    handicap: Number.isFinite(hcp) ? hcp : null,
    eagles: n(s.aces) + n(s.doubleEagleOrBetter) + n(s.eagles),
    birdies: n(s.birdies),
    pars: n(s.pars),
    bogeys: n(s.bogeys),
    doubles: n(s.doubleBogeyOrWorse),
    fairways: direction(s, 'fairwayMiddles', 'fairway', 'fairwayHoleCount'),
    greens: direction(s, 'gir', 'gir', 'girHoleCount'),
    flag: flagFor(r.holeStrokes.length, strokes, strokes - toPar, r.holeStrokes),
  };
}

/** Turn a raw 18Birdies account archive into the trimmed model. Throws a friendly Error if it is not one. */
export function parseArchive(json: unknown): GolfData {
  const root = ((json as RawArchive)?.myData ?? json) as RawArchive;
  const raw = root?.activityData?.rounds;
  if (!Array.isArray(raw)) {
    throw new Error("This doesn't look like an 18Birdies account archive. Expected a file with your rounds in it.");
  }

  const clubs = new Map<string, string>();
  for (const c of root.clubData?.playedClubs ?? []) if (c.clubId && c.name) clubs.set(c.clubId, c.name);

  const rounds = raw
    .map((r) => toRound(r, clubs))
    .filter((r): r is Round => r !== null)
    .sort((a, b) => a.ts - b.ts);
  if (rounds.length === 0) throw new Error('No rounds found in that file.');

  const friends = (root.friendData?.friends ?? [])
    .map((f) => f.name)
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0);

  return { v: 3, importedAt: Date.now(), rounds, friends };
}
