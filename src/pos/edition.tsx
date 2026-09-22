import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

/**
 * Which edition of the POS is rendering.
 *
 * - `base`   — the POS as designed so far. Every existing prototype and story.
 * - `weston` — Weston's edits on top: golf first, order second. Clicking a tee time opens the
 *              reservation (a slide-over on the tablet) where players, holes, fees and
 *              transport are adjusted, and only "Check in & pay" sends it to the register.
 *              Published as its own 18-hole prototypes at `/weston-edits/` and
 *              `/weston-edits-mobile/`, and documented in Storybook's **Weston Edits**.
 *
 * An edition is a context, not a fork: components read `useEdition()` and branch where the
 * edits differ, so the same component serves both and one change can't drift into two
 * copies. Once Weston signs off, making `weston` the default is a one-line change here.
 */
export type Edition = 'base' | 'weston';

export const isEdition = (v: string): v is Edition => v === 'base' || v === 'weston';

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

/** True when Weston's edits are on. */
export const useWestonEdits = (): boolean => useEdition() === 'weston';
