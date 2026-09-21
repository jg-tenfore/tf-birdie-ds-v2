import { useMemo, useState } from 'react';
import { memberTypes } from '../../../../theme/tokens';
import type { MemberTypeKey } from '../../../../theme/tokens';
import { normalizePhone } from '../../../data/golfers';
import { TIMES } from '../../../data/courses';
import { useGolferRoster } from '../../../state/PosProvider';
import type { Booking, Golfer } from '../../../types';

/** Non-component helpers for the People and More screens (kept apart for fast refresh). */

// ─── Golfer names ───────────────────────────────────────────────────────────

/**
 * `'Thompson, Michael'` → `'Michael Thompson'`.
 *
 * Lists keep the stored surname-first form — they're sorted and sectioned by surname, and
 * it's how the tee sheet chips read. A detail header is about one person, so it uses the
 * natural order.
 */
export function displayName(name: string): string {
  const [last, first] = name.split(',').map((s) => s.trim());
  return first ? `${first} ${last}` : last;
}

/** Two-letter initials, first name first: `'Thompson, Michael'` → `'MT'`. */
export function initials(name: string): string {
  const [last = '', first = ''] = name.split(',').map((s) => s.trim());
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || '?';
}

/** Tier label without the trailing "Member": `'Annual Member'` → `'Annual'`. */
export const tierShort = (k: MemberTypeKey) => memberTypes[k].label.replace(' Member', '');

/** A golfer's line of supporting text: tier and phone. */
export const golferSupporting = (g: Golfer) =>
  `${g.memberType ? memberTypes[g.memberType].label : 'Guest'} · ${g.phone}`;

/**
 * Bookings that belong to a golfer. Phone is the reliable key; the abbreviated chip name
 * (`'Reed, M.'`) is the fallback, matching how the tee sheet resolves member dots.
 */
export function bookingsFor(golfer: Golfer, bookings: Booking[]): Booking[] {
  const phone = normalizePhone(golfer.phone);
  const [last = '', first = ''] = golfer.name.toLowerCase().split(',').map((s) => s.trim());
  return bookings.filter((b) => {
    if (b.pay === 'block' || b.pay === 'event') return false;
    if (phone && normalizePhone(b.phone) === phone) return true;
    const [bl = '', bf = ''] = b.name.toLowerCase().split(',').map((s) => s.trim());
    return bl === last && Boolean(bf) && first.startsWith(bf.replace('.', ''));
  });
}

export type GolferFilter = 'all' | 'members' | 'guests' | MemberTypeKey;

/**
 * Search + chip state for a golfer list, and the filtered, surname-sorted result. Searches
 * the session roster, so a customer created a minute ago is findable.
 */
export function useGolferSearch(initialFilter: GolferFilter = 'all') {
  const roster = useGolferRoster();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<GolferFilter>(initialFilter);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = normalizePhone(q);
    let pool = roster;
    if (filter === 'members') pool = pool.filter((g) => g.memberType);
    else if (filter === 'guests') pool = pool.filter((g) => !g.memberType);
    else if (filter !== 'all') pool = pool.filter((g) => g.memberType === filter);
    if (q)
      pool = pool.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          displayName(g.name).toLowerCase().includes(q) ||
          (digits.length >= 3 && normalizePhone(g.phone).includes(digits)),
      );
    return [...pool].sort((a, b) => a.name.localeCompare(b.name));
  }, [query, filter, roster]);

  return { query, setQuery, filter, setFilter, results };
}

/** Every tee-sheet row from `fromMin` on, as picker options. */
export const timeOptions = (fromMin = 0) =>
  TIMES.filter((t) => t.totalMin >= fromMin).map((t) => ({ label: t.label, value: t.totalMin }));

/** `'Thu, May 21'` — the day an operation applies to. */
export const shortDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/** Parse a money field: blank → null (keep the published rate), otherwise a number. */
export const moneyOrNull = (v: string): number | null => (v.trim() === '' ? null : Number(v) || 0);
