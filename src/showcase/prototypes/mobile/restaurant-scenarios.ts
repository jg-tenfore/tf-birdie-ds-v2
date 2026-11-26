import type { PosState } from '../../../pos/state/pos-store';

/**
 * Who is signed in, for the handheld restaurant's stories (V1 → V2). The staff are the seed roster
 * (`data/staff.ts`); the bar each sees is `barFor` in `src/pos/mobile/navigation.tsx`.
 *
 * The restaurant's demo day is `data/restaurant-seed.ts`: lunch at the demo's noon, with
 *
 * | Tab | Table | | Server |
 * |---|---|---|---|
 * | `T-1001` | Table 1 · Kim | four seats, all sent, two Miller Lites on seat 4 | Jordan |
 * | `T-1002` | Table 5 | half sent: the mains in, dessert and a glass of wine not | Priya |
 * | `T-1003` | Table 10 · Farnsworth | eight, all sent, check requested | Jordan |
 * | `T-1004` | P2 | just sat, nothing ordered | Priya |
 * | `T-1005` | B3 · Okonkwo | a bar stool | Marcus |
 * | `T-1006` | Men's league | no table | Marcus |
 *
 * and Table 3 held for Delgado's 12:30. Nothing here is random, so every screenshot repeats.
 */
export const STAFF_IDS = {
  /** Avery Robertson — sees everything; the golf bar, the restaurant in More. */
  manager: 's-1',
  /** Jordan Ellis — Tables · Tabs · Quick Order · More. Carries Table 1 and Table 10. */
  server: 's-2',
  /** Priya Nair — a second server, carrying Table 5 and P2. */
  server2: 's-3',
  /** Hannah Cole — Tables · Reservations · More. */
  host: 's-5',
  /** Diego Ramos — the golf bar, and no restaurant at all. */
  proShop: 's-6',
} as const;

/** The POS with someone signed in. The club is the build's, so a story works at all three. */
export const signedIn = (operatorId: string, extra: Partial<PosState> = {}): Partial<PosState> => ({ operatorId, ...extra });

export const asServer = (extra: Partial<PosState> = {}) => signedIn(STAFF_IDS.server, extra);
export const asHost = (extra: Partial<PosState> = {}) => signedIn(STAFF_IDS.host, extra);
export const asManager = (extra: Partial<PosState> = {}) => signedIn(STAFF_IDS.manager, extra);
