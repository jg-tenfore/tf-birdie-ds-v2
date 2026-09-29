import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Screen } from '../../pos/screen-helpers';
import { orderNumber } from '../../../pos/logic/reservation';
import { openParty, paidTwilight, registerWith, sheetWithPanel } from '../tablet-scenarios';
import type { Booking } from '../../../pos/types';

/**
 * Weston Edits / 21 · Notes & Order Number / Tablet
 *
 * **Two small things from the fifth call, both about showing what is already known.**
 *
 * ## 1. The note that could not be read
 *
 * The player row carried a yellow sticky-note button with the note text in a `Tooltip`. Weston,
 * looking at it on the tablet:
 *
 * > *"This hover state wouldn't really work for touchscreen, but I do like the hover. If you
 * > just click on it, it takes you to the note."*
 *
 * Exactly right, and worse than it sounds. On a tablet the tooltip never fires at all, so the
 * row announced that a note existed and gave no way whatsoever to read it — the operator had to
 * change tabs to find out whether it mattered. A button whose whole content is invisible on the
 * device it ships to.
 *
 * His instinct on prominence was to go the other way: *"I generally, you just always get
 * feedback, but it's like, show it as much as you can, as prominently as you can."*
 *
 * ## The wrinkle he spotted himself
 *
 * > *"So I don't know, because the group would be — yeah, like it'd be like both of these
 * > golfers."*
 *
 * A booking carries two kinds of note, and they are not interchangeable. `playerNotes[i]` is
 * about one golfer; `groupNote` is about the party. Rendering a group note on a seat says it
 * belongs to that person, which for "paying together, one card" is simply false.
 *
 * So they are split by kind:
 *
 * | Kind | Where | Why |
 * |---|---|---|
 * | **Group** | A banner above every row | It is about everyone, so it sits above everyone |
 * | **Per-golfer** | One truncated line on that row | It is about them, so it sits with them |
 *
 * Both tap through to the Notes tab for the full text. Nothing depends on hover any more.
 *
 * ## 2. The order number
 *
 * > *"When it's paid… we need to display the order number somewhere on here. And have it
 * > clickable. And it's just a way for them to like easily like go to that order and refund."*
 *
 * There was no order number anywhere in the app — not on the booking, not in the fixtures. It is
 * **derived** from the booking id rather than stored: a stored number would have to be written at
 * checkout and kept in step through refunds, rain checks and reopenings, and a second field that
 * can disagree with its booking is how round 3's bugs all started. Derived, it is the same every
 * time the panel opens, on every machine, which is also what makes screenshots reproducible.
 *
 * It appears in both places Weston floated — the footer beside **Paid in full**, where the eye
 * already is, and above the Financial tab's balance, where a refund actually starts. Tapping it
 * loads that paid order into the register, exactly as **Open in register** does.
 *
 * That route closes the panel, so it leaves a breadcrumb: the register shows **Back to
 * {name}**, which returns to the tee sheet with the reservation open. Without it the way back is
 * a fresh hunt for a tee time the operator was reading a second ago.
 *
 * `orderNumber` returns `null` until something has actually been paid — an unpaid tee time has
 * no order, and a number shown before one exists is a number someone will quote down the phone.
 */
const meta = {
  title: 'Weston Edits/21 · Notes & Order Number/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const GROUP_NOTE = 'Paying together on one card — do not split at the turn';
const PLAYER_NOTE = 'Left-handed rental clubs, and a cart with a lift';

/** The open party with a note about the whole group. */
const withGroupNote = (): Booking => ({ ...openParty(), groupNote: GROUP_NOTE });

/** The open party with a note about seat 2 only. */
const withPlayerNote = (): Booking => ({ ...openParty(), playerNotes: { 1: PLAYER_NOTE } });

/** Both at once — the case that proves they do not read as the same thing. */
const withBothNotes = (): Booking => ({
  ...openParty(),
  groupNote: GROUP_NOTE,
  playerNotes: { 1: PLAYER_NOTE },
});

// ─── Notes ──────────────────────────────────────────────────────────────────

/**
 * **A group note, as a banner.** Above the party-size row and every player row, because it is
 * about the party rather than any one of them. Tapping it opens the Notes tab.
 */
export const AGroupNote: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(withGroupNote())} />,
  play: async ({ canvasElement }) => {
    const banner = canvasElement.querySelector<HTMLElement>('[data-group-note]')!;
    await expect(banner).toBeTruthy();
    await expect(banner.textContent).toContain(GROUP_NOTE);
    // Above the rows, not inside one.
    const firstRow = canvasElement.querySelector('[data-player-row="0"]')!;
    await expect(banner.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expect(firstRow.contains(banner)).toBe(false);
  },
};

/**
 * **A note about one golfer, on their row.** One truncated line under the name — readable
 * without any interaction, which is the half the tooltip could never do on a tablet.
 *
 * The play test checks the note is on seat 2's row and nowhere else, since a note leaking onto
 * the wrong golfer is the failure that matters here.
 */
export const APlayerNote: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(withPlayerNote())} />,
  play: async ({ canvasElement }) => {
    const notes = [...canvasElement.querySelectorAll('[data-player-note]')];
    await expect(notes.length).toBe(1);
    await expect(notes[0]!.getAttribute('data-player-note')).toBe('1');
    await expect(notes[0]!.textContent).toContain(PLAYER_NOTE);
    // No group banner — this booking has no group note.
    await expect(canvasElement.querySelector('[data-group-note]')).toBeNull();
  },
};

/**
 * **Both kinds at once, telling themselves apart.** The banner says the party is paying
 * together; the line on seat 2 says that golfer needs left-handed clubs. Neither can be mistaken
 * for the other, which was the whole reason for splitting them.
 */
export const BothKindsTogether: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(withBothNotes())} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-group-note]')!.textContent).toContain(GROUP_NOTE);
    const row = canvasElement.querySelector('[data-player-row="1"]')!;
    await expect(row.querySelector('[data-player-note]')!.textContent).toContain(PLAYER_NOTE);
    // The group note is not repeated onto any row.
    for (const r of canvasElement.querySelectorAll('[data-player-row]')) {
      await expect(r.textContent).not.toContain(GROUP_NOTE);
    }
  },
};

/**
 * **Tapping a note goes to where it is written.** The behaviour Weston asked for — *"if you just
 * click on it, it takes you to the note"* — now reachable by touch rather than by hovering.
 */
export const TappingANoteOpensTheNotesTab: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(withBothNotes())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-group-note]')!);
    await waitFor(() => expect(canvas.getByRole('tab', { name: /Notes/ }).getAttribute('aria-selected')).toBe('true'));
  },
};

// ─── Order number ───────────────────────────────────────────────────────────

/**
 * **A paid reservation carries its order number.** In the footer beside **Paid in full**, and
 * again above the Financial tab's balance. Both were places Weston named; a refund starts in the
 * tab, but the footer is where the eye lands.
 */
export const APaidReservationShowsItsOrder: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(paidTwilight())} />,
  play: async ({ canvasElement }) => {
    const expected = orderNumber(paidTwilight())!;
    const link = canvasElement.querySelector<HTMLElement>('[data-order-number]')!;
    await expect(link).toBeTruthy();
    await expect(link.textContent).toContain(expected);
    await expect(expected).toMatch(/^#A-\d{5}$/);
  },
};

/**
 * **An unpaid reservation shows none.** There is no order until money has moved, so there is no
 * number to print — rather than a placeholder somebody reads out to a golfer on the phone.
 */
export const AnUnpaidReservationShowsNone: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
  play: async ({ canvasElement }) => {
    await expect(orderNumber(openParty())).toBeNull();
    await expect(canvasElement.querySelector('[data-order-number]')).toBeNull();
  },
};

/**
 * **The Financial tab carries it too.** Above the balance, where the refund and rain-check
 * controls are — the number and the action it belongs to on one screen.
 */
export const TheFinancialTabCarriesIt: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(paidTwilight(), 'financial')} />,
  play: async ({ canvasElement }) => {
    const link = canvasElement.querySelector<HTMLElement>('[data-order-number]')!;
    await expect(link.textContent).toContain(orderNumber(paidTwilight())!);
  },
};

/**
 * **The way back.** Arriving in the register by tapping an order number leaves a breadcrumb,
 * because that route closes the panel it came from. Tapping it returns to the tee sheet with the
 * reservation open.
 *
 * It appears **only** on that route — an order reached any other way does not grow a back button
 * pointing at a reservation nobody opened. `AnOrdinaryOrderHasNoWayBack` is the other half.
 */
export const BackToTheReservation: Story = {
  render: () => {
    const b = paidTwilight();
    return (
      <Screen edition="weston" initialState={{ ...registerWith(b), returnToBooking: b.id }} />
    );
  },
  play: async ({ canvasElement }) => {
    const back = canvasElement.querySelector<HTMLElement>('[data-return-to-reservation]')!;
    await expect(back).toBeTruthy();
    await expect(back.textContent).toContain(paidTwilight().name);
    await userEvent.click(back);
    // Back on the tee sheet with the panel open, and the breadcrumb spent.
    await waitFor(() => expect(canvasElement.querySelector('[data-player-row="0"]')).not.toBeNull());
    await expect(canvasElement.querySelector('[data-return-to-reservation]')).toBeNull();
  },
};

/**
 * **An ordinary order has no way back.** The register reached through Check in & pay, or by
 * ringing something up directly, shows no breadcrumb — there is no reservation the operator
 * came *from*, and a back button to somewhere you have not been is worse than none.
 */
export const AnOrdinaryOrderHasNoWayBack: Story = {
  render: () => <Screen edition="weston" initialState={registerWith(paidTwilight())} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-return-to-reservation]')).toBeNull();
  },
};
