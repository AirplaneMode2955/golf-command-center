import type { GolfData } from './types';

const KEY = 'golf-command-center:v1';

export function loadSaved(): GolfData | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GolfData;
    return data?.v === 1 && Array.isArray(data.rounds) ? data : null;
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
  } catch {
    /* storage unavailable, nothing to clear */
  }
}
