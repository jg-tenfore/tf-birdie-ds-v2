import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { withEdition } from '../../../edition-decorator';
import { MobileStory, mobileMeta } from '../../../pos-mobile/mobile-helpers';
import { STAFF_IDS, asManager, asServer, signedIn } from '../restaurant-scenarios';

/**
 * Prototypes / Mobile / Global Nav / Menu by role (V1 → V2, Nov 26)
 *
 * **How a server reaches the restaurant on the handheld.** The phone's navigation bar *is* its
 * menu, so it follows the decision Weston approved for the tablet's main menu on Oct 2 — *Menu by
 * role* (`ROLE_ACCESS` in `src/pos/data/nav.ts`): a role sees what it uses, and nothing it can't.
 * `barFor` in `src/pos/mobile/navigation.tsx` turns the grid into a bar of three to five
 * destinations, More always last.
 *
 * | Signed in as | Bar | The restaurant |
 * |---|---|---|
 * | Pro shop (Diego) | Tee Sheet · Register · People · More | not shown anywhere — *"you could be like pro shop and not see any of the restaurant"* |
 * | Manager (Avery) | Tee Sheet · Register · People · More | **More › Restaurant**: Tables, Tabs, Quick Order, Reservations, Orders & Tips, each a push |
 * | Server, bartender (Jordan, Marcus) | **Tables · Tabs · Quick Order · More** | on the bar; Reservations and Orders & Tips in More; no tee sheet |
 * | Host (Hannah) | **Tables · Reservations · More** | seating, not ordering |
 *
 * **Why the manager keeps the golf bar** rather than a five-tab bar with the restaurant on it:
 * every pro-shop flow and story the phone has was built on those four destinations, and the
 * manager is the role that uses the restaurant least from a handheld. Why not a Restaurant section
 * in More for everyone: a server would live two taps deep for a whole shift.
 *
 * **Switch operator** in More is the tablet's PIN sign-in (`signIn`), so the bar changes with the
 * person — the list stands in for the keypad on a prototype. Each destination keeps its own back
 * stack, so a manager's half-built order survives a trip into More › Tables.
 *
 * Weston Edits and the archive keep the golf bar whoever is signed in: all of this is `useV1V2()`.
 */
const meta = {
  title: 'Prototypes/Mobile/Global Nav/Menu by role',
  id: 'prototypes-mobile-global-nav-menu-by-role',
  decorators: [withEdition('current-mobile')],
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The bar's destinations, in order. */
const barLabels = (canvas: HTMLElement) =>
  within(within(canvas).getByRole('navigation', { name: 'Main' }))
    .getAllByRole('button')
    // The label is the button's last line; a destination's badge sits in the icon above it.
    .map((b) => b.lastElementChild?.textContent);

/**
 * **A server's bar: the restaurant.** Jordan Ellis opens on the floor. Tables, Tabs and Quick Order
 * are one tap from anywhere; there is no tee sheet, register or people search on the bar.
 */
export const AServersBar: Story = {
  render: () => <MobileStory initialState={asServer()} tab="tables" />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(barLabels(canvasElement)).toEqual(['Tables', 'Tabs', 'Quick Order', 'More']));
  },
};

/** **A host's bar: seating.** Tables and Reservations — the host seats parties, the server orders. */
export const AHostsBar: Story = {
  render: () => <MobileStory initialState={signedIn(STAFF_IDS.host)} tab="tables" />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(barLabels(canvasElement)).toEqual(['Tables', 'Reservations', 'More']));
  },
};

/**
 * **A manager keeps the golf bar, and finds the restaurant in More.** Avery may use everything, so
 * More lists all five restaurant destinations above the tee sheet's tools; each opens as a push
 * with a back arrow.
 */
export const AManagersMore: Story = {
  render: () => <MobileStory initialState={asManager()} tab="more" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(barLabels(canvasElement)).toEqual(['Tee Sheet', 'Register', 'People', 'More']));
    await expect(await c.findByText('Restaurant')).toBeTruthy();
    for (const row of ['Tables', 'Tabs', 'Quick Order', 'Reservations', 'Orders & Tips']) await expect(c.getByText(row)).toBeTruthy();
  },
};

/** **From More, the floor is a push**: a back arrow, and the golf bar's own stacks untouched. */
export const AManagerOpensTables: Story = {
  render: () => <MobileStory initialState={asManager()} tab="more" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByText('Tables'));
    await expect(await c.findByRole('button', { name: 'Back' })).toBeTruthy();
    await expect(await c.findByRole('button', { name: /^Table 1, / })).toBeTruthy();
  },
};

/** **Pro shop sees no restaurant at all** — not dimmed, not listed. More is the golf tools. */
export const ProShopSeesNoRestaurant: Story = {
  render: () => <MobileStory initialState={signedIn(STAFF_IDS.proShop)} tab="more" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText('Block time')).toBeTruthy();
    await expect(c.queryByText('Restaurant')).toBeNull();
    await expect(c.queryByText('Quick Order')).toBeNull();
  },
};

/**
 * **A server's More** has what is not on their bar — Reservations and Orders & Tips — and none of
 * the tee sheet's tools.
 */
export const AServersMore: Story = {
  render: () => <MobileStory initialState={asServer()} tab="more" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText('Orders & Tips')).toBeTruthy();
    await expect(c.getByText('Reservations')).toBeTruthy();
    await expect(c.queryByText('Block time')).toBeNull();
  },
};

/**
 * **Switching operator changes the bar.** The manager signs Jordan in from More; the bar becomes the
 * server's while More stays open — More is on every bar, so nobody is thrown off the page.
 */
export const SwitchingOperator: Story = {
  render: () => <MobileStory initialState={asManager()} tab="more" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByText('Switch operator'));
    await userEvent.click(await c.findByText('Jordan Ellis'));
    await waitFor(() => expect(barLabels(canvasElement)).toEqual(['Tables', 'Tabs', 'Quick Order', 'More']));
    await expect(c.getByText('Server')).toBeTruthy();
  },
};
