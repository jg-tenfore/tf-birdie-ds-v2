import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@mui/material';
import { IdMeBadge } from '../../../pos/components/IdMeBadge';
import { Stack } from '../../../pos/components/Stack';
import { idMeGroups, md3 } from '../../../theme/tokens';
import type { IdMeGroup } from '../../../pos/types';
import { Screen } from '../../pos/screen-helpers';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { adjustedParty, idMeParty, sheetWithCustomer, sheetWithPanel } from '../tablet-scenarios';

/**
 * Weston Edits / 3 · ID.me Badge / Tablet
 *
 * The smallest section here, and — until round 4 — the one with the largest unanswered question
 * behind it. **That question is now answered**, and the answer made the feature smaller rather
 * than bigger.
 *
 * ## What ID.me actually is
 *
 * Weston walked through it on the fourth call, and it is worth quoting at length because almost
 * every assumption in the previous three rounds was wrong:
 *
 * > *"The way ID.me works is it's just a membership that we mark as a verified membership —
 * > meaning they had to go get verified in order to purchase this membership, and live in a
 * > certain area to be verified. So when they have that membership, one thing we have is they
 * > pass back a document, which is their ID, so we get a picture of their ID that we have saved.
 * > In current Birdie it's a button right here that will populate if they have an ID that says
 * > ID.me. You click on it and all it does is show the picture of their ID. So it's a way to say,
 * > oh, let me see that picture — okay, yep, that's Justin, I can see he's in front of me, he's
 * > gonna get the correct rate."*
 *
 * > *"All the other rate stuff will be handled by the membership. When you set up the rate linked
 * > to the membership it'll automatically pull in there — junior membership, for example. So you
 * > don't have to worry about the rates or anything with ID.me. They don't sign up through
 * > Birdie. It's just displaying that picture."*
 *
 * Three consequences, all of which shrink the surface:
 *
 * 1. **There is no verify flow to build.** Verification happens at ID.me, before the golfer ever
 *    reaches the counter. The question open since round 1 is closed, and the answer is that the
 *    thing it was waiting on does not exist here.
 * 2. **ID.me does not price anything.** It is a membership, and the *membership* carries the
 *    rate. Nothing in the rate grid should ever key off the badge — see **11 · Rate Selector**.
 * 3. **The only problem to solve is showing the picture.** One button, one image, so a counter
 *    can check a face against the person standing in front of them.
 *
 * So the badge stays, and it has gained the button it was always missing: **View ID** on the
 * customer record, which opens the document ID.me returned. The prototype holds no document
 * images and never will, so the card is drawn from the record and labelled as a stand-in — what
 * is being designed is the moment, not the photograph.
 *
 * The badge follows the **player**, never the booking and never the name on the seat. It is
 * drawn from whoever `seatCustomer` resolves — a linked record, or for the booker the booking's
 * phone — so a verified guest sitting in an unverified booker's group carries it and the group
 * does not.
 *
 * ## The component
 *
 * `IdMeBadge` (`src/pos/components/IdMeBadge.tsx`). Two props, no state, no actions.
 *
 * | Prop | Type | Default | What it does |
 * |---|---|---|---|
 * | `group` | `IdMeGroup` — `military` · `veteran` · `first_responder` · `nurse` · `teacher` | — | Picks the label and colours from `idMeGroups` |
 * | `compact` | `boolean` | `false` | Row size: shield + **"ID.me"**. Full size reads **"ID.me · First responder"** |
 *
 * The resolution chain, all of it in `src/pos/logic/seat-customer.ts` and `data/golfers.ts`:
 *
 * `seatIdMe(booking, seat, roster)` → `idMeGroupOf(seatCustomer(...)?.id)` → `IDME_VERIFIED[id]`
 *
 * ## The data
 *
 * `IDME_VERIFIED` in `src/pos/data/golfers.ts` — a **side table keyed by golfer id**, rather than
 * a field on each record, so the ported roster stays diffable against its source. It has exactly
 * four entries:
 *
 * | Id | Customer | Group |
 * |---|---|---|
 * | `G001` | Thompson, Michael | `veteran` |
 * | `G006` | Farnsworth, Weston | `military` |
 * | `M005` | Kim, David | `first_responder` |
 * | `M008` | Walsh, Patricia | `nurse` |
 *
 * `teacher` exists in the token set and in the type, and no demo customer carries it — the
 * **All Groups** story is the only place it is drawn.
 *
 * That the table is small is not the reason badges are rare on the sheet. **Only 93 of the
 * 18-hole club's 845 sellable bookings have a booker who resolves to a record at all**, and 11
 * of those are verified. Every other story in this section links somebody onto a seat on
 * purpose, because that is the honest way to show the badge.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Colours | `idMeGroups` in `theme/tokens.ts` — #e0ecff on #1d4ed8 for **all five groups** |
 * | Why one colour | ID.me has to read as *identity*. Green and red already mean payment state (`payBadges`); the member dot already carries tier. A per-group palette would make five more things to learn |
 * | Compact | 11px `verified_user` glyph, 9.5/800 label, 0.625 × 1px padding, `radius.xl` pill |
 * | Full | 14px glyph, 11/800 label, 1 × 0.375 padding, same pill |
 * | Tooltip | "ID.me verified · First responder" |
 * | Screen reader | `aria-label="ID.me verified, First responder"` on the badge itself |
 *
 * ## Scope
 *
 * On the **terminal**, two render sites now:
 *
 * | Where | Size | What it does |
 * |---|---|---|
 * | Player row (`PlayerRows.tsx`) | compact | Beside the name, where the counter already looks for the member dot |
 * | Customer record (`CustomerModal.tsx`) | full | On the identity line under the name, beside **View ID** — the button Weston described |
 *
 * The record showing no badge was listed under **Still open** for two rounds. Round 4 settled
 * both where it belongs and what it should do when tapped, so it is built.
 *
 * The phone draws the badge in three places and does **not** yet have View ID; see the Mobile
 * page.
 *
 * ## The stories
 *
 * | Story | What it is for |
 * |---|---|
 * | **On The Player Row** | A verified **booker** — Farnsworth, Weston (military) — resolved by the booking's phone, not by the name on the chip |
 * | **On A Linked Guest** | Seat 2 linked to Kim, David (first responder). The badge follows the player, as does the rate: Kim is a member, so the seat prices on the membership row inside a guest booking |
 * | **In The Customer Tab** | **A stale name.** The Customer tab was removed in round 3; this renders the Players tab on the same verified booking. It is kept as a second row-level shot, not as a picture of a tab that exists |
 * | **On The Customer Record** | The full badge and the **View ID** button on the record itself |
 * | **The ID On File** | The document dialog open — the whole of what Weston asked for |
 * | **All Groups** | All five groups at both sizes, read from `idMeGroups`, so the page cannot drift from the tokens |
 *
 * ## Still open
 *
 * - ~~The verify flow.~~ **Closed in round 4.** There is no verify flow because there is nothing
 *   to verify here — ID.me does it before the golfer arrives, and Birdie only stores what came
 *   back. Two rounds of this section were spent waiting on a screen that does not exist.
 * - ~~The record shows no badge.~~ **Closed in round 4.** It shows the badge and the View ID
 *   button.
 * - **The document itself.** The dialog draws a stand-in card from the record. What the real one
 *   looks like — a full licence scan, a cropped portrait, front and back — nobody here has seen,
 *   and it changes how much room the dialog needs.
 * - **The phone has no View ID.** The badge is drawn in three places on mobile and none of them
 *   opens the document. Round 4 was a tablet conversation; this is the obvious follow-on.
 * - **Two `idMeGroupOf` functions exist.** The one everything calls reads the `IDME_VERIFIED`
 *   side table (`data/golfers.ts`); a second, in `data/customers.ts`, derives a group from the
 *   customer's own types (Military → military, Hero → first responder) and **nothing calls it**.
 *   Whichever one is meant to be true, the other should go.
 * - **Nothing is priced off the badge, and nothing should be.** Confirmed rather than assumed in
 *   round 4: *"all the other rate stuff will be handled by the membership."* The badge tells the
 *   counter who they are looking at; the membership tells the register what to charge.
 */
const meta = {
  title: 'Weston Edits/3 · ID.me Badge/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * On the player row: a verified booker (Farnsworth, Weston — military) shows the compact
 * badge beside their name, where the counter already looks for the member dot.
 */
export const OnThePlayerRow: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(idMeParty())} />,
};

/**
 * A verified customer linked onto a guest seat: seat 2 is Kim, David (first responder), so
 * the badge follows the *player*, not the booking — as does the rate: Kim is a member, so
 * the seat is on the member rate.
 */
export const OnALinkedGuest: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(adjustedParty())} />,
};

/** On the Players tab, where the badge sits beside the name. */
export const OnThePlayersTab: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(idMeParty(), 'players')} />,
};

/**
 * **On the customer record.** The full badge sits on the identity line under the name, beside
 * the membership chips — because in Birdie ID.me *is* a membership — and next to the button
 * that does the only thing it is there to do.
 */
export const OnTheCustomerRecord: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithCustomer(idMeParty(), 0)} />,
  play: async () => {
    const record = within(await screen.findByRole('dialog'));
    await expect(await record.findByRole('button', { name: 'View ID' })).toBeTruthy();
  },
};

/**
 * **The ID on file** — the whole feature, as Weston described it: *"you click on it and all it
 * does is show the picture of their ID… okay, yep, that's Justin, I can see he's in front of
 * me, he's gonna get the correct rate."*
 *
 * The card is drawn from the customer record and says so. The prototype has no document store
 * and will never hold a photograph of a real person; what this story is for is the *moment* —
 * name, date of birth and address at a size that reads across a counter, with the portrait
 * where the portrait goes.
 */
export const TheIdOnFile: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithCustomer(idMeParty(), 0)} />,
  play: async () => {
    const record = within(await screen.findByRole('dialog'));
    await userEvent.click(await record.findByRole('button', { name: 'View ID' }));
    // Only one `role="dialog"` is exposed even though two are on screen: MUI marks the
    // underlying modal `aria-hidden` when a second opens, so the query lands on the document.
    await waitFor(async () => expect(within(await screen.findByRole('dialog')).getByText('ID on file')).toBeTruthy());
    const doc = within(await screen.findByRole('dialog'));
    await expect(doc.getByText('Date of birth')).toBeTruthy();
    await expect(doc.getByText(/Passed back by ID\.me/)).toBeTruthy();
  },
};

/**
 * Every group, both sizes. One neutral blue family so ID.me reads as *identity* — not as
 * payment state (green/red) or membership tier (the dot colours).
 */
export const AllGroups: Story = {
  render: () => (
    <Box sx={{ p: 4, bgcolor: md3.surface, minHeight: '100vh' }}>
      <Stack gap={1.5}>
        {(Object.keys(idMeGroups) as IdMeGroup[]).map((g) => (
          <Stack key={g} direction="row" alignItems="center" gap={2}>
            <Typography sx={{ width: 140, fontSize: 13, color: md3.onSurfaceVariant }}>{g}</Typography>
            <IdMeBadge group={g} compact />
            <IdMeBadge group={g} />
          </Stack>
        ))}
      </Stack>
    </Box>
  ),
};
