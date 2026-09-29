import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Screen, atVenue } from '../../pos/screen-helpers';
import { NAV_GROUPS } from '../../../pos/data/nav';
import { openParty, sheetWithPanel } from '../tablet-scenarios';

/**
 * Weston Edits / 20 · Main Nav / Tablet
 *
 * **The main navigation, and the hamburger that finally means one thing.**
 *
 * ## The problem
 *
 * Weston, fifth call, looking at the collapsed order rail:
 *
 * > *"We still need a main nav… I actually don't hate this to be the main nav. But it can't
 * > expand the nav and do the cart. So I don't know how we do that."*
 *
 * He had found a real structural knot rather than a styling preference. The 56px strip was the
 * **order rail collapsed**, and its hamburger expanded that rail — so its one expansion was
 * already spent. Making the same strip the main nav would have given one control two different
 * expansions, and no arrangement of icons fixes that.
 *
 * ## The fix: split the gestures, not the strip
 *
 * | Tap target | Does |
 * |---|---|
 * | **Hamburger** — on the strip *and* on the expanded rail's header | Opens this navigation |
 * | **The strip's body** — the empty space below the hamburger | Expands the order rail |
 * | **"No items added yet"** — the rail's empty state | Collapses the rail |
 *
 * The hamburger means *menu* everywhere, which is what it looks like it means. Expanding became
 * a large, dumb target — most of the strip's height — and collapsing moved onto the empty state,
 * which was Weston's own instruction: the thing telling you the rail is pointless right now is
 * the thing that puts it away.
 *
 * Walk-in and Reserve tee time came off the strip in the same pass ("I wouldn't have these 2
 * options there"). They are on the expanded rail, one tap away — see 13 · Order Rail.
 *
 * ## Why a full-screen sheet
 *
 * The layout follows the reference Justin supplied — sectioned tiles on a light canvas, facility
 * top left, account actions top right. Nineteen destinations as a vertical list is a scroll; as a
 * four-column grid it is one screen, and a counter hunting for "Table Chart" reads it at a
 * glance. The contents are v1's `navGroups` verbatim, so the two prototypes cannot drift on what
 * the product contains.
 *
 * It is built like the day summary: a sibling positioned against the shell, **not** an MUI
 * `Modal`. A portal would escape the black terminal frame and put the whole app inside an
 * `aria-hidden` subtree — both mistakes were made and reverted in round 4.
 *
 * ## Why most of it is dimmed
 *
 * Four destinations exist here. Weston chose dimming over placeholder screens, and it is the
 * honest call: a nav that opens fourteen "not built yet" pages teaches people to distrust it.
 *
 * | Live | Reached by |
 * |---|---|
 * | **Tee Sheet** | `setView('tee')` |
 * | **Pro Shop** | `setView('pos')` — the register |
 * | **Customer Search** | the golfer-search dialog |
 * | **Settings** | the tee sheet's settings panel |
 *
 * A dimmed tile is `disabled`, not merely faded, so the keyboard skips it and a screen reader
 * says "not built yet" rather than offering a button that does nothing. `live` in
 * `pos/data/nav.ts` is the only switch — a destination becomes real by being wired, and
 * `nav.test.ts` fails if that list drifts from what actually opens.
 */
const meta = {
  title: 'Weston Edits/20 · Main Nav/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const LIVE = ['Pro Shop', 'Tee Sheet', 'Customer Search', 'Settings'];

/**
 * **The navigation, open.** Three groups on one screen: Pro Shop, Restaurant, and the unheaded
 * block the shipping app ends with. Facility and build top left — the two things a support call
 * opens by asking for — with Switch user and Log Out top right rather than as tiles, since a
 * grid is for going somewhere and neither of those is a destination.
 *
 * The play test counts what is live against what is dimmed, so a tile silently going live shows
 * up here.
 */
export const TheNavigation: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { navOpen: true })} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const nav = canvasElement.querySelector('[data-nav-overlay]')!;
    await expect(nav).toBeTruthy();

    const tiles = [...nav.querySelectorAll<HTMLButtonElement>('[data-nav-key]')];
    await expect(tiles.length).toBe(NAV_GROUPS.flatMap((g) => g.items).length);

    const live = tiles.filter((t) => !t.disabled).map((t) => t.textContent?.trim());
    await expect(live.sort()).toEqual([...LIVE].sort());
    await expect(tiles.filter((t) => t.disabled).length).toBe(tiles.length - LIVE.length);

    // Account actions live in the header, not the grid.
    await expect(canvas.getByRole('button', { name: 'Switch user' })).toBeTruthy();
    await expect(canvas.getByRole('button', { name: 'Log Out' })).toBeTruthy();
  },
};

/**
 * **The hamburger opens it, from the collapsed strip.** The gesture Weston could not see a way
 * to, working: the strip's hamburger goes to the nav rather than expanding the rail.
 */
export const OpenedFromTheStrip: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen')} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelector('[data-nav-overlay]')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Open navigation' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-nav-overlay]')).not.toBeNull());
  },
};

/**
 * **A dimmed destination cannot be reached.** Table Chart has no screen, so its tile is disabled
 * rather than opening something apologetic. The play test clicks it and checks the nav is still
 * sitting there — nothing happened, which is the whole point.
 */
export const ADimmedDestinationDoesNothing: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { navOpen: true })} />,
  play: async ({ canvasElement }) => {
    const tile = canvasElement.querySelector<HTMLButtonElement>('[data-nav-key="tablechart"]')!;
    await expect(tile.disabled).toBe(true);
    await expect(tile.getAttribute('aria-label')).toBe('Table Chart — not built yet');
    await userEvent.click(tile, { pointerEventsCheck: 0 });
    await expect(canvasElement.querySelector('[data-nav-overlay]')).not.toBeNull();
  },
};

/**
 * **A live destination goes there and closes.** Pro Shop hands over to the register. The nav is
 * gone afterwards rather than hanging over the screen it just navigated to.
 */
export const ALiveDestinationNavigates: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { navOpen: true })} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(canvasElement.querySelector<HTMLButtonElement>('[data-nav-key="proshop"]')!);
    await waitFor(() => expect(canvasElement.querySelector('[data-nav-overlay]')).toBeNull());
    // The register: the order rail is expanded rather than collapsed to its strip.
    await waitFor(() => expect(canvasElement.querySelector('[data-order-rail="collapsed"]')).toBeNull());
  },
};

/**
 * **Escape closes it.** The overlay is not an MUI `Modal`, so it has to bring its own Escape
 * handler — the same thing the day summary learned in round 4 when it stopped being a `Drawer`.
 */
export const EscapeCloses: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { navOpen: true })} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-nav-overlay]')).not.toBeNull();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvasElement.querySelector('[data-nav-overlay]')).toBeNull());
  },
};

/**
 * **It outranks the reservation panel.** Opened over a party, the nav covers everything —
 * navigating away is the one action that should not have to wait for whatever is on screen to be
 * dismissed first. It sits above the panel and the customer record both.
 */
export const OverTheReservationPanel: Story = {
  render: () => (
    <Screen edition="weston" initialState={{ ...sheetWithPanel(openParty()), navOpen: true }} />
  ),
  play: async ({ canvasElement }) => {
    const nav = canvasElement.querySelector<HTMLElement>('[data-nav-overlay]')!;
    const panel = canvasElement.querySelector<HTMLElement>('[data-player-row="0"]');
    await expect(nav).toBeTruthy();
    // The panel is still mounted underneath; the nav is simply on top of it.
    await expect(panel).not.toBeNull();
    await expect(Number(getComputedStyle(nav).zIndex)).toBeGreaterThan(100);
  },
};
