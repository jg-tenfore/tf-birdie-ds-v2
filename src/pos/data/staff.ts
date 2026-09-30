/**
 * The people who work the terminal (V1 → V2).
 *
 * Wave 2 needs a server on every tab and every tip, and Wave 3's PIN sign-in, Time Clock and Shift
 * all need an operator. Until sign-in exists, `state.operatorId` defaults to the first entry, so
 * everything is attributed to someone real rather than to `null` — which is what Wave 1's drawer
 * events had to settle for.
 *
 * Authored for V1 → V2. v1 identified staff only by names printed on tickets ("Kyler Brooksby").
 */

export type StaffRole = 'server' | 'bartender' | 'host' | 'pro-shop' | 'manager';

export interface StaffMember {
  id: string;
  name: string;
  /** How a ticket or a tip line prints them. */
  short: string;
  role: StaffRole;
  /**
   * The four digits they sign in with (V1 → V2, Wave 3). A prototype's PINs, printed on the sign-in
   * screen so anyone reviewing can get in — not a security model. v1 accepted any four digits and
   * picked the operator from them; here each person has their own.
   */
  pin: string;
}

export const STAFF: StaffMember[] = [
  { id: 's-1', name: 'Avery Robertson', short: 'Avery R.', role: 'manager', pin: '1111' },
  { id: 's-2', name: 'Jordan Ellis', short: 'Jordan E.', role: 'server', pin: '2222' },
  { id: 's-3', name: 'Priya Nair', short: 'Priya N.', role: 'server', pin: '3333' },
  { id: 's-4', name: 'Marcus Webb', short: 'Marcus W.', role: 'bartender', pin: '4444' },
  { id: 's-5', name: 'Hannah Cole', short: 'Hannah C.', role: 'host', pin: '5555' },
  { id: 's-6', name: 'Diego Ramos', short: 'Diego R.', role: 'pro-shop', pin: '6666' },
];

export const staffById = (id: string | null | undefined): StaffMember | undefined => STAFF.find((s) => s.id === id);

/** Who can carry a tab — the tab's server picker offers these. */
export const SERVERS = STAFF.filter((s) => s.role === 'server' || s.role === 'bartender' || s.role === 'manager');

export const staffByPin = (pin: string): StaffMember | undefined => STAFF.find((s) => s.pin === pin);

