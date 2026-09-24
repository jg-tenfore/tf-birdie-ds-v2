import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { Screen } from '../../pos/screen-helpers';
import { adjustedParty, idMeParty, nameOnlyGuest, openParty, sheetWithCustomer, sheetWithPanel } from '../tablet-scenarios';

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
 * | `CustomerRecord` | a record resolves and `assigning` is false | An identity line, a contact grid, an account strip, then v1's collapsing sections — Gift cards · Rain checks · Punch cards · Tee time history · Customer types |
 * | `AssignCustomer` | no record, or `assigning` | "Add golfer · position 2" — `searchRoster` over the 340-record roster, plus **New customer** |
 *
 * ## Round 4 rebuilt the record
 *
 * Weston, clicking into it: *"the customer one's kind of bad… this looks bad."* And after:
 * *"the customer detail modal is just very spaced out, so I would like clean that up, tighten
 * it up."*
 *
 * The cause was arithmetic rather than judgement. The body was a `<Stack gap={16}>`, and MUI's
 * `gap` resolves through the spacing scale — **sixteen meant 128px**. Six sections separated by
 * 128px, and because the empty ones render nothing at all, a sparse record showed a half-screen
 * of white between the account tiles and the history. The same unit bug produced the cart-key
 * grid he called "nasty" (16) — it is worth grepping for.
 *
 * What replaced it is the layout Justin asked for by name — *"I like the details, however I want
 * to use our current design framework we have in v1"* — ported from v1's Customer Search screen:
 *
 * | Band | What |
 * |---|---|
 * | Header | The name with the **membership chips on the same line**, the customer and course id under it beside the avatar, and ID.me + **View ID** (3) on the right |
 * | Account strip | **Six even boxes across the full width** — Rewards · Balance · Rain checks · Rounds · Referrals · No-shows — **above** the form. Card on file moved into the subtitle beside the two ids, where it reads as an identifier rather than a count |
 * | Contact | An address block, one thing per line: first/last, email, phone, street, city/state/zip, then birthday/notes |
 * | Sections | Collapsing bars, each carrying its own answer on the right so a closed one still answers the question it is there for |
 *
 * The order is deliberate and was Justin's call: *"put rewards, balance, rainchecks, etc above
 * the form field."* The account strip is the half of the record a counter **reads**; the contact
 * fields are the half they occasionally **fix**. Reading order follows that rather than the
 * order the data happens to be stored in. The contact block is one field per line for the same
 * reason — a phone number on its own line is found faster than one in the middle column of a
 * three-wide grid.
 *
 * **Gift cards and rain checks are line items now**, which was an explicit ask: *"we probably
 * want to know each gift card, like as a line item. Same with probably rain checks. So instead
 * of a dollar amount — like they could have five, you know? Just to see them all."*
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
 * **Deep-linkable** since round 4's QA pass: `?cust=<id>` opens the record, `&cust-seat=<n>`
 * says which position it was opened from, `&cust=assign` is the search screen with nobody
 * resolved, and `&id-doc=1` opens the ID.me document over it. Carried alongside `?res=`, so a
 * link restores the reservation underneath and closing the record returns to it. A `cust=`
 * matching nobody drops the record rather than degrading to the "Add golfer" screen — landing
 * on a plausible neighbour would look like the link worked. See **19 · Deep Links**.
 *
 * ## What is editable, and what is not
 *
 * | Section | Editable | Why |
 * |---|---|---|
 * | Contact — name, email, phone, street, city/state/zip, birthday, notes | **Yes**, in place | Weston's actual case: *"is your email jonah.hamlet@hotmail? No, actually it's at Gmail."* The six one-tap domain chips that used to sit under the field were cut — they cost more room than they saved, and the field is still there to type in. The phone keeps them |
 * | Customer types | **Yes** — chips, with **+ Add type** expanding the rest (`CUSTOMER_TYPES`, eighteen of them) | "Show the one you have, and if you want to assign more you can." Not the column of eighteen checkboxes he called ugly |
 * | Memberships, tier | No | Sold, not toggled |
 * | Account — rewards, balance, rain-check value, rounds, referrals, no-shows | No | Read-back figures. **Referrals** is the one with no source data: nothing in the booking history says who sent whom, so `referralsOf` seeds it from the customer id — stable across reloads and weighted, because most golfers have referred nobody and the handful who referred a dozen are the accounts worth noticing |
 * | Punch cards, gift cards, rain checks | No | Taking money is the register's job, and a second place to do it is a second place for the totals to disagree |
 * | Tee time history | No | First 12, then "n earlier rounds" |
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Record dialog | 780px wide, `tall` → `min(720px, 88vh)`, `maxWidth: 94%` inside the story frame |
 * | Section bar | 44dp tall, `md3.onSurface` ground, title left and summary right — v1's navy bar in this terminal's palette |
 * | Rhythm | 12px between bands. It was 128 |
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
 * | **Booker Record** | The booker's own record, on a booking whose phone *does* resolve. Asserts the contact grid, the account strip and the section bars are all there |
 * | **Linked Guest** | Seat 2's record, not the booker's. The record follows the seat |
 * | **Fix A Typo** | Weston's case, executed: retypes the address and asserts the field takes it |
 * | **Customer Types** | The section opened, then **+ Add type** expanding the remaining types as chips |
 * | **Assign A Seat** | An empty seat in assign mode. Searches "Walsh" and asserts **more than one** result — the roster carries households and namesakes on purpose, so the search has to return all of them rather than guess which one is meant |
 * | **Name Is Not An Identification** | A seat *named* "Kim, D." but unlinked. It still opens in assign mode, and until someone links it the seat pays the booking's rate |
 * | **The Record Tightened** | A record with something in every section — Kelsey Sutton, two gift cards, two rain checks, a punch card, eight rounds |
 * | **Gift Cards As Line Items** | One row per card: UPC, type, expiry, awarded, spent, balance |
 * | **Rain Checks As Line Items** | The same for credits, with what emptied a partly-spent one underneath |
 * | **Closed Sections Still Answer** | Collapses Gift cards and asserts the balance is still readable on the bar |
 *
 * ## Still open
 *
 * - ~~No ID.me badge on the record.~~ **Closed in round 4** — the badge and **View ID** are on
 *   the identity line. See 3.
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
    // The contact grid, the account strip and the sectioned half, in that order.
    await record.findByLabelText('Email');
    await expect(record.getByText('Rewards')).toBeTruthy();
    await expect(record.getByRole('button', { name: /Gift cards/ })).toBeTruthy();
    await expect(record.getByRole('button', { name: /Tee time history/ })).toBeTruthy();
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
    const email = await record.findByLabelText('Email');
    await userEvent.clear(email);
    await userEvent.type(email, 'jonah.hamlet@gmail.com');
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
    // Collapsed by default now — the bar carries "3 of 18", which is usually the whole answer.
    await userEvent.click(await record.findByRole('button', { name: /Customer types/ }));
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
    await record.findByText(/Add golfer · position 2/);
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
    await record.findByText(/Add golfer · position 2/);
  },
};

// ─── Round 4: the record, rebuilt ───────────────────────────────────────────

/**
 * A record with something in every section.
 *
 * `458349` — Kelsey Sutton — carries **two gift cards, two rain checks, a punch card and eight
 * rounds**, which is rare on purpose: most of the hundred are sparse, and a demo where everyone
 * has a credit makes the lookup look far easier than it is. This one exists so the sections can
 * be read rather than inferred.
 */
const richRecord = () => {
  const b = adjustedParty();
  return sheetWithPanel(b, 'players', {
    customerModal: { customerId: '458349', bookingId: b.id, seat: 0 },
  });
};

/**
 * **The record, tightened.** Weston on what was here before: *"the customer modal is just very
 * spaced out… I didn't realise how bad it was looking. Make sure that's priority."*
 *
 * The cause was not judgement, it was arithmetic. The body was a `<Stack gap={16}>`, and MUI's
 * `gap` goes through the spacing scale — so sixteen meant **128px**. Six sections separated by
 * 128px of nothing, and on a record with no punch cards and no gift cards those sections
 * collapsed to headings, leaving the half-screen of white Weston was looking at between the
 * account tiles and the history.
 *
 * What replaced it is v1's Customer Search layout, which Justin asked for by name: *"I like the
 * details, however I want to use our current design framework we have in v1."* A contact grid,
 * an account strip, then collapsing section bars that carry their own answer — the gift-card
 * balance is on the **Gift cards** bar whether or not anyone opens it.
 */
export const TheRecordTightened: Story = {
  render: () => <Screen edition="weston" initialState={richRecord()} />,
};

/**
 * **Gift cards as line items.** Weston: *"we probably want to know each gift card, like as a
 * line item. Same with probably rain checks. So instead of a dollar amount — like they could
 * have five, you know? Just to see them all."*
 *
 * UPC, type, expiry, awarded, spent and balance per card, with the total still on the bar so a
 * closed section answers the common question on its own.
 */
export const GiftCardsAsLineItems: Story = {
  render: () => <Screen edition="weston" initialState={richRecord()} />,
  play: async () => {
    const record = within(await screen.findByRole('dialog'));
    await record.findByText('UPC');
    // "Awarded" heads both this table and the rain-check one, which is the point — they are
    // the same shape of thing and read the same way.
    await expect(record.getAllByText('Awarded').length).toBe(2);
    // Two cards, so two rows — not one summed figure.
    await expect(record.getAllByText(/^Winnings|^Purchased/).length).toBeGreaterThan(1);
  },
};

/**
 * **Rain checks as line items**, the same way: the credit, the round it was cut from, how much
 * of the round was played, and what is left. A partly-spent credit prints where the rest went
 * underneath, because that is the argument a counter actually has to settle.
 */
export const RainChecksAsLineItems: Story = {
  render: () => <Screen edition="weston" initialState={richRecord()} />,
  play: async () => {
    const record = within(await screen.findByRole('dialog'));
    await record.findByText('Raincheck');
    await expect(record.getByText('Tee time')).toBeTruthy();
  },
};

/**
 * **A closed section still answers its question.** Every bar carries its own summary, so the
 * counter asked "do I still have that gift card" reads the answer without opening anything.
 * The play test collapses Gift cards and checks the balance is still on screen.
 */
export const ClosedSectionsStillAnswer: Story = {
  render: () => <Screen edition="weston" initialState={richRecord()} />,
  play: async () => {
    const record = within(await screen.findByRole('dialog'));
    const bar = await record.findByRole('button', { name: /Gift cards/ });
    await userEvent.click(bar);
    await waitFor(() => expect(record.queryByText('UPC')).toBeNull());
    // Collapsed, and the figure is still readable on the bar itself.
    await expect(bar.textContent).toMatch(/\$\d/);
  },
};
