import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_WESTON_OPTIONS } from './pos-store';
import type { PosState, WestonOptions } from './pos-store';

/**
 * The seam that lets Storybook's toolbar drive `state.weston`.
 *
 * Weston's third round ended with four questions he explicitly declined to answer from a
 * description — "I can be convinced either way", "I'd want to see it" — so all four shipped
 * as variants rather than decisions: how wide the reservation panel runs, how tall a player
 * row is, whether transport is icons or a named rate, and whether the rate grid is holding a
 * sane catalog or a 26-rate one. `WestonOptions` in `pos-store.ts` is where they live.
 *
 * Each of them already has its own story showing the alternatives side by side. What was
 * missing is the thing a reviewer actually wants: flipping one *while looking at some other
 * screen*, to see whether the wider panel helps the day he was worried about rather than the
 * one the comparison story chose. That is a Storybook toolbar global — and a global is only
 * a value in a context until something threads it into app state. This is that thread.
 *
 * ### Why a context and not a prop
 *
 * A story declares a screen by handing `Screen` / `MobileStory` an `initialState`. Sixty of
 * them do. Routing a toolbar value through that path would mean editing every story, and
 * every story written after this one would have to remember. A context read by `PosProvider`
 * — the one place every surface's state is built, terminal and phone alike — costs one line
 * at the root and none anywhere else.
 *
 * ### Why it is inert in the app
 *
 * Nothing outside `.storybook/preview.tsx` mounts the provider, so `useWestonDefaults()`
 * returns `null` in both published prototypes and `seedWestonDefaults` hands the overrides
 * straight back. The hosted build behaves exactly as it did before this file existed, which
 * matters: a variant switch is a review instrument, and none of them are linkable — a
 * prototype URL never carries one.
 */

/**
 * Toolbar-chosen defaults for the variant switches, or `null` when nothing is driving them.
 *
 * `Partial` rather than a full `WestonOptions` so a caller can steer one switch and leave the
 * rest at whatever `DEFAULT_WESTON_OPTIONS` says, without restating the other three.
 */
const WestonDefaultsContext = createContext<Partial<WestonOptions> | null>(null);

export function WestonDefaultsProvider({
  value,
  children,
}: {
  value: Partial<WestonOptions> | null;
  children: ReactNode;
}) {
  return <WestonDefaultsContext.Provider value={value}>{children}</WestonDefaultsContext.Provider>;
}

/** The toolbar's variant defaults, or `null` outside Storybook. */
export function useWestonDefaults(): Partial<WestonOptions> | null {
  return useContext(WestonDefaultsContext);
}

/**
 * Fold the toolbar's choices into a story's `initialState`, **underneath** anything the story
 * said itself.
 *
 * The precedence is the whole point of this function, so it is worth stating plainly. From
 * weakest to strongest:
 *
 * 1. `DEFAULT_WESTON_OPTIONS` — what the prototype ships.
 * 2. The toolbar globals — the reviewer's current position on the four open questions.
 * 3. `overrides.weston` — a story that has an opinion about a switch and must keep it.
 *
 * Step 3 exists because several Weston Edits stories are *about* a variant: "10 · Panel Size"
 * shows 640, 820 and cover on one page, and a toolbar set to `cover` must not quietly collapse
 * all three into the same screenshot. Those stories pin the width on the panel itself
 * (`reservationPanel.width`), which `ReservationPanel` reads ahead of `state.weston.panelWidth`
 * — so they are already immune and need no change here. This third layer covers the other
 * shape of pin, a story that sets `state.weston` outright, and keeps the rule the same for
 * both: what a story says about itself always wins over what the toolbar says about the
 * session.
 *
 * Note that `WestonOptions` has no optional fields, so a story that sets `weston` at all has
 * had to name all four — and takes all four. That is deliberate rather than a limitation: a
 * story that declares the whole variant set is declaring the screen it wants photographed, and
 * leaving one switch open to the toolbar would make that screenshot depend on who took it. A
 * story that wants to pin one switch and let the toolbar keep the rest pins the *component*
 * instead, the way the panel-size stories do.
 */
export function seedWestonDefaults(
  overrides: Partial<PosState>,
  defaults: Partial<WestonOptions> | null,
): Partial<PosState> {
  if (!defaults) return overrides;
  return {
    ...overrides,
    weston: { ...DEFAULT_WESTON_OPTIONS, ...defaults, ...overrides.weston },
  };
}

/**
 * A stable string for a set of toolbar choices, used as a React `key`.
 *
 * Storybook re-renders a story when a global changes; it does not remount it. `PosProvider`
 * builds its state once in `useReducer`'s initialiser, so a re-render alone would leave the
 * old width on screen and the toolbar would look broken. Keying the story's subtree on this
 * makes flipping a switch rebuild the state — which is also the honest behaviour: these are
 * initial-state variants, not live settings, and half-changing one would show a screen the
 * app can never actually be in.
 */
export function westonDefaultsKey(defaults: Partial<WestonOptions> | null): string {
  if (!defaults) return 'weston:none';
  const merged = { ...DEFAULT_WESTON_OPTIONS, ...defaults };
  return `weston:${merged.panelWidth}/${merged.rowDensity}/${merged.transportStyle}/${merged.rateCatalog}`;
}
