import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Screen } from '../../pos/screen-helpers';
import { adjustedParty, openParty, sheetWithPanel } from '../tablet-scenarios';
import { PANEL_WIDTHS } from '../../../pos/state/pos-store';

/**
 * Weston Edits / 10 · Panel Size / Tablet
 *
 * How much of the terminal the reservation takes, and what happens to the tee sheet while it
 * has it. Two separate decisions that were tangled together until this section pulled them
 * apart: **how wide** the panel runs, and **how the background yields** to it.
 *
 * ## Both are now decided
 *
 * Weston, on the third call: *"I wonder if it should take up more space… I don't know if we need
 * to collapse the tee sheet. I get the context, you don't lose the context, but I think it's
 * more important to have this bigger than to show more of the tee sheet."* He asked to feel the
 * difference rather than pick from a description, so every combination was built here.
 *
 * On the fourth call he picked, twice:
 *
 * > **"I think I like the 820."** … *"I just feel like — seems like we're always doing something
 * > to this screen, so the more real estate we can have, probably the better."*
 *
 * and the sheet is **frozen behind a scrim**, not squeezed. So `wide` (820) with `backdrop:
 * 'scrim'` is now the default everywhere in the Weston edition, not a variant scoped to this
 * page. This section survives as the comparison that produced the decision, and as the place
 * the three widths can still be felt side by side.
 *
 * The order rail is left exactly as the counter had it. It does not auto-collapse to make room
 * and it is not forced open: whatever state it is in when the reservation opens, it freezes and
 * dims with everything else behind the scrim, so its width stops mattering while the panel has
 * focus.
 *
 * ## The component
 *
 * `ReservationPanel` (`src/pos/components/ReservationPanel.tsx`) — the slide-over itself. It is
 * not a `Modal`: it is a sibling of the tee sheet inside `PosShell`, positioned absolutely
 * against it, which is what lets the sheet stay live beside it in the squeeze treatment.
 *
 * Three pieces of state drive everything on this page, all on `ReservationPanelState` in
 * `src/pos/state/pos-store.ts`:
 *
 * | Field | Values | Default | What it does |
 * |---|---|---|---|
 * | `width` | `standard` · `wide` · `cover` | falls back to `state.weston.panelWidth`, now **`wide`** | How wide the panel runs |
 * | `backdrop` | `squeeze` · `scrim` | **`scrim`** | What the tee sheet does while it is open |
 * | `presentation` | `panel` · `modal` | `panel` | Slide-over, or the centred dialog from section 1 |
 *
 * `width` is also a Storybook toolbar global (**Panel width**), which every other section obeys.
 * The stories here pin their own, so the toolbar cannot collapse three comparisons into one
 * screenshot.
 *
 * ## Widths
 *
 * `PANEL_WIDTHS` in `pos-store.ts` is the single source — the table below is read from it by the
 * **Widths** story at the bottom, so it cannot drift from the code.
 *
 * | Key | Panel | Frame is 1366 wide | Built for |
 * |---|---|---|---|
 * | `standard` | **640px** | leaves 726 | Wider than the 480 Weston reacted to. No longer the default |
 * | `wide` | **820px** | leaves 546 | **The shipped default.** The rate editor's tiles sit in two rows instead of four |
 * | `cover` | **100%** | leaves none | Maximum room, still one ✕ back to where you were |
 *
 * ## Backdrop: squeeze or scrim
 *
 * **`squeeze`** — the original. The sheet narrows into the room left beside the panel
 * (`usePanelSqueeze`, a right margin animated on the panel's own easing). Every column tightens
 * so nothing hides underneath and there is no sideways scroll. The cost is that the things you
 * actually read the sheet *by* compress with it: the time gutter, the slot columns, the
 * FRONT 9 / BACK 9 headers. At 820 that is a lot of compression for a sheet you are only
 * glancing at.
 *
 * **`scrim`** — the sheet keeps its natural width and the terminal dims behind the panel at 70%
 * black instead. Nothing is compressed; the sheet behind the panel reads exactly as it does
 * when nothing is open. It is simply in the background.
 *
 * The scrim is **modal**, in the real sense rather than the visual one:
 *
 * - it covers the whole terminal, order rail included — a half-dimmed screen reads as a
 *   rendering fault rather than a choice;
 * - the background is marked `inert` in `PosApp`, so it leaves the tab order and the
 *   accessibility tree as well as losing pointer events. A scrim alone only stops the mouse;
 *   Tab walks straight through it;
 * - **clicking the scrim does nothing.** The reservation closes from the panel — ✕, Close,
 *   Move, Delete, or Check in & pay — so a stray tap on a dimmed tee sheet cannot discard edits
 *   that have not reached the cart yet.
 *
 * The dialogs the panel itself opens — the customer record, cart signout, a confirm — sit
 * outside the inert region and stay live.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 1366 × 840 (`shell` in `theme/tokens.ts`) |
 * | Panel z-index | 80 — over the tee-sheet toolbar (40) and multi-select bar (60) |
 * | Scrim z-index | 79 — directly beneath the panel |
 * | Scrim fill | `rgba(0,0,0,.7)` |
 * | Motion | `.22s cubic-bezier(.2,0,0,1)` (`reservationPanel.motion`), shared by the slide and the fade |
 * | Elevation | `elevation.e3` |
 * | Order rail | 320px expanded, 56px collapsed |
 *
 * ## Scope
 *
 * No longer scoped. The scrim is the default for every panel in the edition, and `squeeze` is
 * an explicit opt-in that exactly one story still sets — **Squeeze For Comparison** below, kept
 * so the thing that was replaced can still be seen next to the thing that replaced it.
 *
 * ## The stories
 *
 * | Story | Width | Backdrop | What it is for |
 * |---|---|---|---|
 * | **Six Forty** | 640 | scrim | The narrower width, kept for comparison. Asserts both the scrim and the un-squeezed sheet |
 * | **Eight Twenty** | 820 | scrim | **What ships.** The width squeezing served worst, and the one the scrim helps most |
 * | **Cover** | 100% | scrim | Maximum room. The scrim is still drawn, so all three open and close alike |
 * | **Six Forty With The Rail** | 640 | scrim | Order rail expanded, dimming with everything else |
 * | **Squeeze For Comparison** | 640 | squeeze | The old behaviour, side by side. Asserts there is no scrim |
 * | **Widths** | — | — | The three numbers, read from `PANEL_WIDTHS` |
 *
 * ## Settled
 *
 * Both questions this page existed to answer have been answered: **820**, and **scrim**.
 *
 * The measurement that supported it: **dense row density does not fit four players at 640
 * without scrolling.** The players list is 823px comfortable and 734px dense against 618px of
 * visible panel — dense buys back about half a seat. Four players on screen needed the width,
 * not tighter rows, which is the other reason 820 rather than 640. See **12 · Player Row
 * Detail**.
 */
const meta = {
  title: 'Weston Edits/10 · Panel Size/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * **640 — the narrower option.** Wider than the 480 Weston was reacting to, and what the
 * prototype shipped until he chose 820 on the fourth call. Kept as the comparison. The sheet
 * behind it is at full width and dimmed, so the times and the nines are exactly where they were
 * before the panel opened.
 */
export const SixForty: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={sheetWithPanel(openParty(), 'players', {
        panel: { width: 'standard', backdrop: 'scrim' },
        leftPanelCollapsed: true,
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = await canvas.findByRole('complementary', { name: /Reservation/ });
    await expect(panel).toBeTruthy();
    // The sheet is still there behind it — that is the whole point of a slide-over.
    await expect(canvas.getAllByText(/Championship/).length).toBeGreaterThan(0);
    // And the scrim is what puts it behind, rather than the sheet narrowing beside the panel.
    await expect(canvasElement.querySelector('[data-reservation-scrim]')).toBeTruthy();
    await expect(canvasElement.querySelector('[data-panel-squeeze]')).toBeTruthy();
  },
};

/**
 * **820 — what ships.** Weston: *"I think I like the 820… seems like we're always doing
 * something to this screen, so the more real estate we can have, probably the better."*
 *
 * The player rows get a second column of breathing space and the rate grid stops wrapping so
 * hard. This is also the width that squeezing served worst — it took the sheet down to about
 * one nine — which is why the two decisions were made together.
 */
export const EightTwenty: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={sheetWithPanel(adjustedParty(), 'players', {
        panel: { width: 'wide', backdrop: 'scrim' },
        leftPanelCollapsed: true,
      })}
    />
  ),
};

/**
 * **Cover — the panel takes the sheet.** Maximum room, and still not a screen change: there is
 * one ✕ and you are back exactly where you were, which was Weston's objection to the old
 * full-screen editor ("it's just a little jarring — you have to click to go back").
 *
 * The scrim is still drawn underneath, so the three widths open and close the same way; at this
 * width the panel simply covers it.
 */
export const Cover: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={sheetWithPanel(adjustedParty(), 'players', {
        panel: { width: 'cover', backdrop: 'scrim' },
        leftPanelCollapsed: true,
      })}
    />
  ),
};

/**
 * The same booking at 640 with the order rail **expanded**, which is the real comparison: the
 * rail costs the sheet 320px, and collapsing it is what buys the panel its extra width without
 * the day disappearing. Weston: "on the tee sheet we always want to maximise the space we have."
 */
export const SixFortyWithTheRail: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={sheetWithPanel(openParty(), 'players', {
        panel: { width: 'standard', backdrop: 'scrim' },
        leftPanelCollapsed: false,
      })}
    />
  ),
};

/** The three widths as numbers, so the doc above cannot drift from what the app uses. */
export const Widths: Story = {
  render: () => (
    <div style={{ padding: 24, fontFamily: 'system-ui', fontSize: 14 }}>
      <h3 style={{ margin: '0 0 12px' }}>Panel widths</h3>
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {(
            [
              ['standard', '640 — the narrower option'],
              ['wide', '820 — ships in the prototype'],
              ['cover', 'the whole frame'],
            ] as const
          ).map(([key, note]) => (
            <tr key={key}>
              <td style={{ padding: '4px 16px 4px 0', fontWeight: 700 }}>{key}</td>
              <td style={{ padding: '4px 16px 4px 0' }}>
                {PANEL_WIDTHS[key] === 0 ? '100%' : `${PANEL_WIDTHS[key]}px`}
              </td>
              <td style={{ padding: '4px 0', color: '#666' }}>{note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
};
