import type { MemberTypeKey } from '../../theme/tokens';
import { DEMO_TODAY } from '../data/bookings';
import type { Golfer } from '../types';

/**
 * Creating a customer record — shared by the terminal's New Customer dialog and the phone's
 * New customer screen, so a person made on either lands in `addedGolfers` in the same shape.
 */

/**
 * The stored name, surname first like the roster: `('Ava', 'Reed')` → `'Reed, Ava'`.
 * Either half may be blank; a lone first name is stored as-is.
 */
export function customerName(first: string, last: string): string {
  const f = first.trim();
  const l = last.trim();
  if (!l) return f;
  return f ? `${l}, ${f}` : l;
}

/**
 * The next session customer id: `N001`, `N002`, … counted from how many have been added.
 *
 * Deterministic (no clock, no randomness) so a replayed session produces the same ids. Skips
 * forward past any id already in `taken`, which only matters when a story seeds
 * `addedGolfers` with ids of its own.
 */
export function nextCustomerId(added: readonly Golfer[], taken: readonly Golfer[] = added): string {
  const ids = new Set(taken.map((g) => g.id));
  for (const g of added) ids.add(g.id);
  let n = added.length + 1;
  const id = (k: number) => `N${String(k).padStart(3, '0')}`;
  while (ids.has(id(n))) n++;
  return id(n);
}

export interface NewCustomerFields {
  first: string;
  last: string;
  phone: string;
  email: string;
  memberType: MemberTypeKey | null;
  hcp: string;
  notes: string;
}

/** `YYYY-MM` of the demo day — a member created today joined this month. */
const joinedThisMonth = (): string => {
  const d = DEMO_TODAY();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** A complete `Golfer` from the form fields. Members join in the (pinned) demo month. */
export function buildCustomer(id: string, f: NewCustomerFields): Golfer {
  return {
    id,
    name: customerName(f.first, f.last),
    phone: f.phone.trim() || '—',
    email: f.email.trim(),
    type: f.memberType ? 'Member' : 'Guest',
    memberType: f.memberType,
    hcp: parseInt(f.hcp, 10) || 0,
    joined: f.memberType ? joinedThisMonth() : null,
    notes: f.notes,
  };
}
