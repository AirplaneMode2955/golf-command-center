/** Cleaned, privacy-trimmed model. Nothing from the account block (email, phone, birth year) is kept. */

export type Direction = { hit: number; left: number; right: number; short: number; long: number; count: number; noChance: number };

export type Round = {
  id: string;
  ts: number;
  date: string; // YYYY-MM-DD, local
  year: number;
  courseId: string;
  course: string;
  holes: number;
  strokes: number;
  toPar: number;
  par: number;
  holeStrokes: number[];
  handicap: number | null;
  eagles: number; // eagle or better
  birdies: number;
  pars: number;
  bogeys: number;
  doubles: number; // double bogey or worse
  fairways: Direction;
  greens: Direction;
  /** Why this round is excluded from stats by default, or null if it looks fine. */
  flag: string | null;
};

export type GolfData = {
  v: 2;
  importedAt: number;
  rounds: Round[];
  friends: string[];
};
