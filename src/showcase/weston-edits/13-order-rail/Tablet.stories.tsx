import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { playerName } from '../../../pos/logic/reservation';
import { Screen, atVenue } from '../../pos/screen-helpers';
import { openParty, sheetWithOrder, sheetWithPanel } from '../tablet-scenarios';

/**
 * Weston Edits / 13 · Order Rail / Tablet
 *
 * The 320px order rail down the left of the terminal, and what happens to it on the tee sheet.
 *
 * Weston's objection was about space, not about the rail: "this takes up a lot of space if
 * there's nothing in it… on the tee sheet we always want to maximise the space we have." An
 * order rail that is empty for most of the morning is a third of a nine's worth of columns
 * spent on a heading and a Pay button.
 *
 * Three decisions came out of it.
 *
 * **One button, two jobs, never both at once.** The control at the top-left is the back arrow
 * while there is something on the order, and it *clears* it — behind a confirm, because
 * clearing is destructive and there is no undo. The moment the order is empty there is nothing
 * to clear, so the same button becomes a hamburger and *collapses the rail*. The control only
 * ever offers the thing that is actually available, and the rail can only be put away when
 * hiding it costs nothing.
 *
 * **Collapsed is a strip, not nothing.** Taking the rail to zero would take Walk-in and Reserve
 * with it, and those are the two things staff reach for most — they cannot live behind a panel
 * that is gone. So 56px stay, carrying the hamburger, both quick actions and a badge with
 * whatever is on the order. The tee sheet gets the other 264px.
 *
 * **Collapsing is the operator's call; coming back is not.** Anything landing on the order
 * re-expands the rail on the spot, because an order nobody can see is one nobody checks before
 * charging it.
 *
 * All of it lives in `LeftPanel.tsx` (`RailStrip` is the collapsed form); the state is
 * `leftPanelCollapsed`.
 */
const meta = {
  title: 'Weston Edits/13 · Order Rail/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The collapsed rail, when it is there. */
const strip = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLElement>('[data-order-rail="collapsed"]');

// ─── Expanded ───────────────────────────────────────────────────────────────

/**
 * **Empty, and so collapsible.** The rail beside the tee sheet with nothing on the order: a
 * golfer chip nobody has filled, the quick actions, "Select a category", and a Pay button with
 * nothing to pay. This is the state Weston was looking at — 320px of tee sheet spent on a form
 * that has not started.
 *
 * Because there is nothing to clear, the top-left control is a **hamburger**, and it collapses
 * the rail. The play test clicks it and checks the 56px strip takes over.
 */
export const EmptyAndSoCollapsible: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { leftPanelCollapsed: false })} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(strip(canvasElement)).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Collapse the order rail' }));
    await waitFor(() => expect(strip(canvasElement)).not.toBeNull());
    await expect(strip(canvasElement)!.offsetWidth).toBe(56);
  },
};

/**
 * **With a party's golf on it, the same button clears.** Check in & pay has built the order —
 * three green fees and the tax line — so the control is a **back arrow**, and because it is
 * destructive it asks first: "4 items will be removed. This cannot be undone."
 *
 * Note what is *not* offered here: there is no way to collapse the rail while an order is
 * live. That is the point of folding both jobs into one button — the rail cannot be hidden
 * with money on it.
 *
 * The play test clicks the arrow, checks the confirm appears, cancels, and checks the order
 * survived.
 */
export const ItemsOnTheOrderClear: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithOrder(openParty())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Clear order' }));
    const dialog = within(await screen.findByRole('dialog'));
    await expect(dialog.getByText('Clear this order?')).toBeTruthy();
    await expect(dialog.getByText(/cannot be undone/)).toBeTruthy();
    // Guarded, so backing out changes nothing.
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Clear order' })).toBeTruthy());
  },
};

/**
 * **Clearing hands the button back.** Confirming empties the order — and with nothing left on
 * it, the same control turns into the hamburger, so the rail can now be put away. The two jobs
 * hand over at exactly the moment the space becomes free to take.
 *
 * The play test confirms the clear and checks the button has become "Collapse the order rail".
 */
export const ClearedBackToTheHamburger: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithOrder(openParty())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Clear order' }));
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Clear order' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Collapse the order rail' })).toBeTruthy());
  },
};

// ─── Collapsed ──────────────────────────────────────────────────────────────

/**
 * **The 56px strip.** What "collapsed" actually means: the hamburger to bring the rail back,
 * **Walk-in** and **Reserve tee time** still one tap from the tee sheet, and at the foot a cart
 * glyph with a badge counting what is on the order. Tapping the badge — or the hamburger — puts
 * the rail back.
 *
 * The badge exists because a hidden order is the one real risk in collapsing at all. The count
 * says there is something to come back to, and the rail is one tap away from saying what.
 *
 * The two quick actions are defined once and rendered in both states (`QUICK_ACTIONS`). They
 * used to be written twice, which is how the collapsed Walk-in ended up opening a different
 * dialog from the expanded one, and the collapsed Reserve ended up on an icon name that does
 * not exist — see 8 · Bug Fixes.
 *
 * The play test checks the strip's width and everything on it.
 */
export const TheCollapsedStrip: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithOrder(openParty(), { leftPanelCollapsed: true })} />,
  play: async ({ canvasElement }) => {
    const el = strip(canvasElement)!;
    await expect(el.offsetWidth).toBe(56);
    const rail = within(el);
    await expect(rail.getByRole('button', { name: 'Expand the order rail' })).toBeTruthy();
    await expect(rail.getByRole('button', { name: 'Walk-in' })).toBeTruthy();
    await expect(rail.getByRole('button', { name: 'Reserve tee time' })).toBeTruthy();
    // The badge says there is an order to come back to.
    await expect(rail.getByRole('button', { name: /^Order · \d+ items$/ })).toBeTruthy();
  },
};

/**
 * **The strip with nothing on the order.** The same 56px with the badge quiet: the cart glyph
 * greys back, the tooltip reads "Order is empty", and the two quick actions are still where
 * they were. This is the state the tee sheet spends most of the morning in, and it is the whole
 * return on the trade — 264px of columns back, for a rail that was showing nothing.
 */
export const TheCollapsedStripEmpty: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen')} />,
  play: async ({ canvasElement }) => {
    const rail = within(strip(canvasElement)!);
    await expect(rail.getByRole('button', { name: 'Order is empty' })).toBeTruthy();
  },
};

/**
 * **Adding something brings the rail back.** The counter is on the tee sheet with the rail
 * collapsed and a reservation open. Adding one player to the order — Weston's split-the-bill
 * path, "you hit add to cart for each player, and then you hit save" — re-expands the rail
 * without being asked.
 *
 * This is the half of the trade that makes collapsing safe. Hiding an empty rail costs nothing;
 * hiding a live one risks charging an order nobody looked at. So the operator decides when it
 * goes away, and the order decides when it comes back.
 *
 * The play test clicks Add on the booker's row and checks the strip has given way to the rail,
 * with that player's golf on it.
 */
export const AddingSomethingReExpands: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
  play: async ({ canvasElement }) => {
    const b = openParty();
    await expect(strip(canvasElement)).not.toBeNull();
    const row = within(canvasElement.querySelector<HTMLElement>('[data-player-row="0"]')!);
    await userEvent.click(row.getByRole('button', { name: `Add ${playerName(b, 0)} to the order` }));
    await waitFor(() => expect(strip(canvasElement)).toBeNull());
    // Expanded, with an order on it — so the button is the clear, not the collapse.
    await expect(within(canvasElement).getByRole('button', { name: 'Clear order' })).toBeTruthy();
  },
};
