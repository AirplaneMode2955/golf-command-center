import type { GolfData } from './types';

const MARKS_KEY = 'golf-command-center:marks';
const KEY = 'golf-command-center:v1'; // same key; the payload carries its own version

export function loadSaved(): GolfData | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GolfData;
    return data?.v === 5 && Array.isArray(data.rounds) ? data : null;
  } catch {
    return null;
  }
}

export function save(data: GolfData): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSaved(): void {
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(MARKS_KEY);
  } catch {
    /* storage unavailable, nothing to clear */
  }
}

/** Round id -> what the user decided: "event" (scramble or tournament, leave out) or "regular" (count it). */
export type Marks = Record<string, 'event' | 'regular'>;

export function loadMarks(): Marks {
  try {
    const raw = window.localStorage.getItem(MARKS_KEY);
    const m = raw ? (JSON.parse(raw) as Marks) : {};
    return m && typeof m === 'object' ? m : {};
  } catch {
    return {};
  }
}

export function saveMarks(m: Marks): void {
  try {
    window.localStorage.setItem(MARKS_KEY, JSON.stringify(m));
  } catch {
    /* storage unavailable; the mark lasts until the page is closed */
  }
}
