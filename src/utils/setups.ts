import type { PlaybookEntry, Trade } from '../types';

/**
 * SINGLE SOURCE OF TRUTH for setup names.
 *
 * The set of setups the app knows about is:
 *     every setup defined in the Playbook  ∪  every setup used by at least one trade.
 * Statistics, the Trades filter, the drill-down, the trade form and Playbook renames all go
 * through the helpers below, so a name is always compared the same way everywhere.
 */

/** Comparison key: ignores case, leading/trailing spaces and repeated spaces. */
export const setupKey = (name?: string | null): string =>
  (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/** True when two setup names refer to the same setup (blank never matches anything). */
export const sameSetup = (a?: string | null, b?: string | null): boolean => {
  const k = setupKey(a);
  return k !== '' && k === setupKey(b);
};

const tidy = (name: string) => name.trim().replace(/\s+/g, ' ');

export interface SetupStat {
  /** Display name — the Playbook's spelling wins; otherwise the first spelling seen in trades. */
  name: string;
  key: string;
  inPlaybook: boolean;
  quality?: 'A+' | 'A';
  total: number;
  wins: number;
  losses: number;
  be: number;
  /** null when the setup has no trades yet (so it is never shown as a misleading 0%). */
  winRate: number | null;
}

export type SetupGroup = 'A+' | 'A' | 'ungraded' | 'other';
export const setupGroup = (s: Pick<SetupStat, 'inPlaybook' | 'quality'>): SetupGroup =>
  !s.inPlaybook ? 'other' : s.quality === 'A+' ? 'A+' : s.quality === 'A' ? 'A' : 'ungraded';

const GROUP_ORDER: Record<SetupGroup, number> = { 'A+': 0, A: 1, ungraded: 2, other: 3 };

export function getSetupStats(playbook: PlaybookEntry[], trades: Trade[]): SetupStat[] {
  const map = new Map<string, SetupStat>();
  const blank = (name: string, key: string, inPlaybook: boolean, quality?: 'A+' | 'A'): SetupStat =>
    ({ name, key, inPlaybook, quality, total: 0, wins: 0, losses: 0, be: 0, winRate: null });

  for (const p of playbook) {
    const key = setupKey(p.name);
    if (key && !map.has(key)) map.set(key, blank(tidy(p.name), key, true, p.quality));
  }
  for (const t of trades) {
    const key = setupKey(t.setup);
    if (!key) continue; // trades with no setup are not a setup
    let s = map.get(key);
    if (!s) { s = blank(tidy(t.setup as string), key, false); map.set(key, s); }
    s.total++;
    if (t.result === 'Win') s.wins++;
    else if (t.result === 'Loss') s.losses++;
    else s.be++;
  }
  for (const s of map.values()) s.winRate = s.total ? Math.round((s.wins / s.total) * 100) : null;

  return [...map.values()].sort(
    (a, b) => GROUP_ORDER[setupGroup(a)] - GROUP_ORDER[setupGroup(b)] || a.name.localeCompare(b.name)
  );
}
