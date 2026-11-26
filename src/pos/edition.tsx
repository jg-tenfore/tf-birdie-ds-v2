import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { VenueId } from './data/venues';

/**
 * Which edition of the POS is rendering.
 *
 * - `base`   — the POS as designed so far. Every existing prototype and story.
 * - `weston` — Weston's edits on top: golf first, order second. Clicking a tee time opens the
 *              reservation (a slide-over on the tablet) where players, holes, fees and
 *              transport are adjusted, and only "Check in & pay" sends it to the register.
 *              Published as its own 18-hole prototypes at `/weston-edits/` and
 *              `/weston-edits-mobile/`, and documented in Storybook's **Weston Edits**.
 * - `v1v2`   — **V1 → V2**: Weston's edits, plus the rest of the application migrated from
 *              v1 — every destination the shipping app's nav reaches, rebuilt rather than
 *              reproduced. The current Birdie on both surfaces: the tablet at `/prototype/`,
 *              and since Nov 26 the handheld at `/mobile/`, where it adds the restaurant.
 *
 * ## Why `v1v2` is a superset rather than a sibling
 *
 * It inherits Weston's edits instead of forking from `base`, so everything rounds 1–5 settled —
 * the 820 panel, the main nav, notes, the rate selector, the customer record — is already
 * there, and a future Weston round lands once and reaches both. `useWestonEdits()` is true for
 * it for exactly that reason: no Weston behaviour has to be copied or re-gated. What only V1 → V2
 * has is gated on `useV1V2()`.
 *
 * An edition is a context, not a fork: components read `useEdition()` and branch where the
 * edits differ, so the same component serves both and one change can't drift into two
 * copies. Once Weston signs off, making `weston` the default is a one-line change here.
 */
export type Edition = 'base' | 'weston' | 'v1v2';

export const isEdition = (v: string): v is Edition => v === 'base' || v === 'weston' || v === 'v1v2';

/**
 * The **current** Birdie, per surface (decided Nov 26, 2026).
 *
 * Weston Edits is the version the team works from, and V1 → V2 is Weston's edits *plus* every
 * other nav destination, so the current edition is `v1v2` on **both** surfaces. `base` — the
 * original port of the HTML prototype — is archived: still rendered, but only under Storybook's
 * Archive and the prototype's archive builds.
 *
 * The phone was `weston` until the handheld restaurant arrived (Nov 26). Moving it to `v1v2` was
 * checked rather than assumed: the phone's screens branch only on `useWestonEdits()`, which is true
 * in both, and all 181 phone prototype screens were rendered under each edition on the Quest and
 * compared pixel for pixel — none differed beyond what also differs between two renders of the same
 * edition. What `v1v2` adds on the phone is gated on `useV1V2()`: the restaurant (Tables, Tabs,
 * Quick Order, Reservations, Orders & Tips), the role-aware navigation bar and the operator in More.
 */
export const CURRENT_EDITION = { tablet: 'v1v2', mobile: 'v1v2' } as const satisfies Record<
  'tablet' | 'mobile',
  Edition
>;

/** The edition the archive pins: the original port, before Weston's rounds. */
export const ARCHIVED_EDITION: Edition = 'base';

/**
 * The club the current Birdie is shown at: the 18-hole course, where Weston's rounds were
 * reviewed. The archive keeps the original three nines. Read by the prototype's entry when
 * neither the URL nor the build names a club, so `npm run dev` opens like `/prototype/` does.
 */
export const CURRENT_VENUE: VenueId = 'eighteen';

/**
 * An edition chosen at page load, ahead of `VITE_EDITION` — set from `?edition=` in
 * `main.tsx`, so one dev server can show both editions. Mirrors `setVenueOverride`.
 */
export function setEditionOverride(e: Edition): void {
  (globalThis as { __BIRDIE_EDITION__?: Edition }).__BIRDIE_EDITION__ = e;
}

/** The edition this build (or page load) is for. Defaults to `base`. */
export function buildEdition(): Edition {
  const override = (globalThis as { __BIRDIE_EDITION__?: string }).__BIRDIE_EDITION__;
  if (override && isEdition(override)) return override;
  const fromEnv = import.meta.env?.VITE_EDITION as string | undefined;
  return fromEnv && isEdition(fromEnv) ? fromEnv : 'base';
}

const EditionContext = createContext<Edition | null>(null);

export function EditionProvider({ edition, children }: { edition?: Edition; children: ReactNode }) {
  return (
    <EditionContext.Provider value={edition ?? buildEdition()}>{children}</EditionContext.Provider>
  );
}

/** The current edition. Outside a provider, the build's own. */
export function useEdition(): Edition {
  return useContext(EditionContext) ?? buildEdition();
}

/**
 * True when Weston's edits are on — in his own edition, and in V1 → V2, which is built on it.
 *
 * Deliberately inclusive. V1 → V2 is Weston Edits *plus* the migrated destinations, so every
 * existing Weston branch has to hold there too; checking `=== 'weston'` here would quietly drop
 * rounds 1–5 out of the new prototype.
 */
export const useWestonEdits = (): boolean => {
  const e = useEdition();
  return e === 'weston' || e === 'v1v2';
};

/** True only in V1 → V2 — for the destinations and behaviour Weston Edits does not have. */
export const useV1V2 = (): boolean => useEdition() === 'v1v2';
