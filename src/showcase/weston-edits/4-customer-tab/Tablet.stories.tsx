import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Screen } from '../../pos/screen-helpers';
import { adjustedParty, idMeParty, nameOnlyGuest, openParty, sheetWithCustomer } from '../tablet-scenarios';

/**
 * Weston Edits / 4 · Customer Profile / Tablet
 *
 * **The Customer tab is gone.** Round 1 put a customer profile inside the reservation as a
 * fifth tab; round 3 took it back out. Weston: *"I don't think it needs to be a tab on the
 * reservation, I wonder if it's its own thing… if I click on Michael Thompson, does something
 * else open?"*
 *
 * The argument is structural rather than visual. A customer record is not a property of a tee
 * time — the same person is on four other bookings this month, and the questions staff actually
 * get asked ("do I still have that gift card", "I didn't no-show") are about the person, not the
 * round. A tab says otherwise. So the reservation drops to **four tabs — Players · Financial ·
 * Notes · Activity** — and tapping the player's **name** opens their record over everything.
 * Closing it puts you back on the reservation exactly as you left it.
 *
 * The problem it solves, in his words: *"they're like, hey, is your email jonah.hamlet@hotmail?
 * No, actually it's at Gmail. If I want to fix that, currently I go all the way to customer
 * lookup."* Now it is one tap from the seat.
 *
 * A seat with nobody in it opens the **same surface in assign mode**: search the roster, or
 * create somebody. That is how Guest 3 becomes a person — and linking is the only thing that
 * makes that person price the round. A matching name never does.
 *
 * ## The component
 *
 * `CustomerModal` (`src/pos/components/CustomerModal.tsx`) picks one of two bodies from the same
 * state, both inside `ModalFrame`:
 *
 * | Body | When | What it is |
 * |---|---|---|
 * | `CustomerRecord` | a record resolves and `assigning` is false | Contact · Membership & types · Account · Punch cards · Gift cards · Rain checks · Tee time history |
 * | `AssignCustomer` | no record, or `assigning` | "Who is in seat 2?" — `searchRoster` over the 340-record roster, plus **New customer** |
 *
 * It is rendered by `PosApp` as a sibling of the reservation panel, **outside** the region a
 * scrimmed panel marks `inert` — so it stays live over a modal panel, and closing it returns to
 * a panel that never moved.
 *
 * ## The state
 *
 * `CustomerModalState` in `src/pos/state/pos-store.ts`. Opened from `PlayerRow`'s name button,
 * which passes all four.
 *
 * | Field | Type | Default | What it does |
 * |---|---|---|---|
 * | `customerId` | `string \| null` | — | The record to show. `null` is an empty seat |
 * | `bookingId` | `string?` | — | Which reservation the seat belongs to. Absent when opened from elsewhere, e.g. a chip's menu |
 * | `seat` | `number?` | — | Which chair. Titles the assign view and tells `assignPlayer` which seat it is filling |
 * | `assigning` | `boolean?` | `false` | Forces search-and-assign even when a record resolved — how a *named but unlinked* seat opens |
 *
 * Edits are saved into `state.customerEdits`, an overlay over the committed roster rather than a
 * mutation of it, read back through `liveCustomer` / `liveRoster`. That matters beyond this
 * modal: the player row prices through the same overlay, so a customer type added here changes
 * what the seat pays. A record that shows one thing while the row charges another is the bug
 * class this whole round kept running into.
 *
 * **Not deep-linkable.** `?res=` carries the reservation; the record has no query of its own.
 *
 * ## What is editable, and what is not
 *
 * | Section | Editable | Why |
 * |---|---|---|
 * | Contact — email, phone, notes | **Yes**, in place, with six one-tap domain chips (`EMAIL_DOMAINS`) | Weston's actual case. Nobody should type a whole address on glass to fix `@hotmail` → `@gmail` |
 * | Customer types | **Yes** — chips, with **+ Add type** expanding the rest (`CUSTOMER_TYPES`, eighteen of them) | "Show the one you have, and if you want to assign more you can." Not the column of eighteen checkboxes he called ugly |
 * | Memberships, tier | No | Sold, not toggled |
 * | Account — rewards, balance, rain-check value, rounds, no-shows, card on file | No | Read-back figures |
 * | Punch cards, gift cards, rain checks | No | Taking money is the register's job, and a second place to do it is a second place for the totals to disagree |
 * | Tee time history | No | First 8, then "n earlier rounds" |
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Record dialog | 720px wide, `tall` → `min(720px, 88vh)`, `maxWidth: 94%` inside the story frame |
 * | Assign dialog | 560px wide, same height rule |
 * | Search | Two characters minimum; matches name, phone, email or customer id; **6 results** on the terminal |
 * | Stat tiles | `md3.surfaceContainer`, 84px minimum, value turns `md3.error` on a balance owed or a no-show count |
 * | Rain-check lines | Say what emptied a partly-spent credit — "$26.00 awarded · $13.00 spent on …" — because that is the argument the counter actually has to settle |
 * | Save | `patchCustomer` → toast → close. Persists for the session and resets on reload |
 *
 * ## Scope
 *
 * Weston edition, 18-hole club. The record resolves a seat by **linked record, or the booker's
 * phone — never the name**, so most seats open in assign mode: only **93 of the club's 845
 * sellable bookings** have a booker who resolves at all. That is the rule this round exists to
 * enforce rather than a hole in the fixtures, and **Name Is Not An Identification** is it as a
 * story.
 *
 * ## The stories
 *
 * | Story | What it is for |
 * |---|---|
 * | **Booker Record** | The booker's own record, on a booking whose phone *does* resolve. Asserts Contact, Account and Tee time history are all there |
 * | **Linked Guest** | Seat 2's record, not the booker's. The record follows the seat |
 * | **Fix A Typo** | Weston's case, executed: taps **@gmail.com** and asserts the field now ends in it |
 * | **Customer Types** | **+ Add type** expanding the remaining types as chips |
 * | **Assign A Seat** | An empty seat in assign mode. Searches "Walsh" and asserts **more than one** result — the roster carries households and namesakes on purpose, so the search has to return all of them rather than guess which one is meant |
 * | **Name Is Not An Identification** | A seat *named* "Kim, D." but unlinked. It still opens in assign mode, and until someone links it the seat pays the booking's rate |
 *
 * ## Still open
 *
 * - **No ID.me badge on the record** (3). The seat shows it; the person's own record does not.
 * - **No "suggested profile" here.** `seatSuggestion` can already offer "Kim, D. → Kim, David ·
 *   Link", and the assign view does not use it — a named seat starts from an empty search box
 *   rather than from the obvious candidate.
 * - **New customer** hands off to the separate `newCustomer` modal rather than creating inline,
 *   so the create path leaves this surface.
 * - **`CustomerTab.tsx` is still in the tree and rendered by nothing.** Dead since the tab went.
 */
const meta = {
  title: 'Weston Edits/4 · Customer Profile/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The booker's record, opened from their name: membership, account, credits and history. */
export const BookerRecord: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithCustomer(idMeParty(), 0)} />,
  play: async () => {
    const record = within(await screen.findByRole('dialog'));
    await record.findByText('Contact');
    await expect(record.getByText('Account')).toBeTruthy();
    await expect(record.getByText('Tee time history')).toBeTruthy();
  },
};

/** A guest seat linked to a real customer — their record, not the booker's. */
export const LinkedGuest: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithCustomer(adjustedParty(), 1)} />,
};

/**
 * Fixing the thing Weston actually described: the email is wrong, and the one-tap domain chips
 * fix it without typing the whole address on glass.
 */
export const FixATypo: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithCustomer(idMeParty(), 0)} />,
  play: async () => {
    const record = within(await screen.findByRole('dialog'));
    await record.findByText('Contact');
    await userEvent.click(record.getByRole('button', { name: '@gmail.com' }));
    await expect(await record.findByDisplayValue(/@gmail\.com$/)).toBeTruthy();
  },
};

/**
 * Customer types as chips with an expander — "show the one you have, and if you want to assign
 * more you can" — rather than eighteen checkboxes in a column.
 */
export const CustomerTypes: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithCustomer(idMeParty(), 0)} />,
  play: async () => {
    const record = within(await screen.findByRole('dialog'));
    await userEvent.click(await record.findByRole('button', { name: '+ Add type' }));
    await expect(await record.findByRole('button', { name: 'Diamond' })).toBeTruthy();
  },
};

/**
 * An empty seat: no record, so the surface opens in assign mode. The play test searches the
 * roster and links somebody, which is what makes that person price the round.
 */
export const AssignASeat: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithCustomer(openParty(), 1)} />,
  play: async () => {
    const record = within(await screen.findByRole('dialog'));
    await record.findByText(/Who is in seat 2\?/);
    await userEvent.type(record.getByPlaceholderText('Search customers'), 'Walsh');
    // Three Walshes — the roster has households and namesakes on purpose, so the search has to
    // return all of them rather than guess which one is meant.
    await expect((await record.findAllByText(/Walsh/)).length).toBeGreaterThan(1);
  },
};

/**
 * A seat *named* like a customer but not linked. The record opens in assign mode, because a
 * name is not an identification — and until someone links it, the seat pays the booking's rate.
 */
export const NameIsNotAnIdentification: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithCustomer(nameOnlyGuest(), 1)} />,
  play: async () => {
    const record = within(await screen.findByRole('dialog'));
    await record.findByText(/Who is in seat 2\?/);
  },
};
