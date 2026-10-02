import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { COMPACT_DATE_BAR_H } from '../../../pos/mobile/screens/tee/collapsing-header';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { at18 } from '../mobile-scenarios';

/**
 * Weston Edits / 9 · Date Navigation / Mobile
 *
 * Weston's second round: *"If I'm on the tee sheet and I want to go to, let's say, June —
 * there's no way to select the month, so I just have to click."* On the base phone the date
 * row's ‹ › moved one day a tap and the date opened a "Go to date" list of the demo's
 * eleven days — no month, no paging, no calendar — so June was a dozen taps away.
 *
 * The Weston edition replaces that with two MD3 patterns:
 *
 * - a **week strip** under the date row — the week you're in, one tap per day, swipe for
 *   the next or previous week (the date row's ‹ › now page a week too);
 * - a **calendar sheet** from the date — a month grid with ‹ › by month, a month/year
 *   header that opens a year → month chooser, and **Today**.
 *
 * Any date within twelve months of today now has a tee sheet: days outside the demo's
 * eleven are generated on first visit — the same every time — and beyond a year the
 * calendar greys dates out. The tablet keeps its own controls but gets the same generated
 * days (see **Tablet**); the base phone is unchanged.
 *
 * **Oct 1 — the header folds away on scroll.** With the strip, the date row and the course chips
 * pinned, about a third of the phone was header however far down the day you were. Weston:
 * *"it'd be nice if like once you start scrolling, if you could collapse… at least these like 3
 * lines… I'd keep the day so then you could just click that and go to a different date if you
 * need to, or click the arrows."* So the header now scrolls away with the list and one
 * **compact date row** — ‹ Today · Thu, May 21 › and search — docks in its place; scrolling back
 * up peeks the full header back in (V1 → V2 Migration / 100126 / 10 was the proposal).
 *
 * ## The component
 *
 * `src/pos/mobile/screens/tee/DateNavigation.tsx` exports both halves; `TeeSheetScreen` renders
 * the strip under the top app bar and opens the sheet from the date chip.
 *
 * | Piece | What it is | How it opens |
 * |---|---|---|
 * | `WeekStrip` | Seven days, Sunday first, under the date row | Weston edition; folds away with the header on scroll |
 * | `CalendarSheet` | The MD3 date picker as a **bottom sheet**, confined to the phone frame | The date chip (`aria-label="Choose date"`), or the `teeSheet` route's `calendar` param so a story can open it declaratively |
 * | `useDayCounts` | Tee times per date, for the dots | `state.bookings`, falling back to `unfilledDemoDay` for dates not yet visited |
 * | `useDemoDayFill(weston)` | Fills the viewed date on arrival | A layout effect in `TeeSheetScreen`, shared with the tablet |
 * | `useCollapsingHeader` (`collapsing-header.ts`) | The header's `top` → `collapsed` → `peek` state, from the list's scroll | `TeeSheetScreen` passes its `onScroll` to `MobileScreen`'s `onBodyScroll` |
 * | `CompactDateBar` | ‹ date chip › and search, docked over the list once the header has scrolled off | `mode !== 'top'`; hidden (`aria-hidden`, `inert`) while the header peeks over it |
 *
 * | Route param | Values | Default | What it does |
 * |---|---|---|---|
 * | `calendar.month` | `YYYY-MM` | the viewed date's month | Which month the sheet opens on |
 * | `calendar.view` | `days` · `years` · `months` | `days` | Which of the three panes is showing |
 *
 * The sheet is **not** a route of its own — it is a parameter on `teeSheet`, so it never enters
 * the back stack and Back leaves the tee sheet rather than closing a picker.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 402 × 797 (`mobile.frame` in `src/theme/tokens.ts`) |
 * | Week strip cell | 64 high, `minWidth: mobile.touchTarget` (**48**), radius 16 |
 * | Day circle | 36px — filled `md3.primary` when selected, 1px outline when today |
 * | Dot | 4px, opacity **0.4** under 45% of a full day, **0.7** under 75%, **1** above — "full" is what today carries |
 * | Swipe | 40px of horizontal travel, and more horizontal than vertical, pages a week and swallows the tap; `touchAction: 'pan-y'` so vertical scrolling still works |
 * | Week animation | Slides in from the side it came from, `mobile.motion.push` (**300ms**) on `mobile.motion.easing` |
 * | Date row ‹ › | Move a **week** in this edition (`Previous week` / `Next week`), a day in the base one |
 * | Calendar cell | `mobile.touchTarget` (48) tall, a 40px circle inside, dot 4px at the bottom |
 * | Calendar grid | Always **42 cells / six rows**, so paging months doesn't resize the sheet |
 * | Year & month chooser | 48-high pills, radius 24, three per row, over a `32 + 6 × 48` minimum so the sheet doesn't jump between panes |
 * | Range | `demoRange()` — `DEMO_TODAY()` ± **12** months. Out-of-range days drop to `opacity: 0.38` and disable; ‹ › stop at the edge |
 * | Today | `DEMO_TODAY()` — **Thu, May 21 2026**; the demo clock is 12:00 PM (`demoNow()`) |
 * | Every date picked | Passed through `clampToDemoRange` before it reaches `setDate` |
 * | Header on scroll | In the list's flow, so it leaves under the finger; the compact row docks when the list has scrolled `header height − 56`, and nothing above the list ever changes size, so nothing jumps |
 * | Compact row | `COMPACT_DATE_BAR_H` (**56**) — 48dp ‹ › and search, the same date chip as the full row. ‹ › step a **day** (`Previous day` / `Next day`) |
 * | Peek | **12px** of upward scroll mid-list; the header goes `sticky` and slides down in **150ms** on `mobile.motion.easing`. 12px back down slides it away again; reaching the top hands it back to the flow |
 * | Band headers | Stick under whatever covers the top: 56 under the compact row, the header's height while it peeks |
 *
 * ## Scope
 *
 * **Weston edition, phone.** The base phone keeps the "Go to date" list of the demo's eleven
 * days and day-at-a-time arrows — **BeforeWestonEdits** is that. The generated days and the
 * `demoRange` rules are shared with the tablet.
 *
 * ## The stories
 *
 * | Story | Starts on | What it is for |
 * |---|---|---|
 * | **WeekStrip** | Thu, May 21 (the demo day) | The strip itself: the viewed day filled, today outlined, dots scaled by how busy each day is |
 * | **CalendarSheet** | the demo day, sheet open | The month grid as it opens — dots, today's outline, ‹ › by month |
 * | **JumpToJune** | the demo day | Weston's case in three taps: open, next month, pick the 12th. The test then checks the day is populated |
 * | **YearChooser** | the demo day, sheet open on `view: 'years'` | The year → month pane, for jumps further than a few months |
 * | **TodayButton** | Fri, Jun 12, sheet open | The one-tap way home; the test asserts the chip reads `Today · Thu, May 21` afterwards |
 * | **OutOfRange** | Tue, May 18 2027, sheet open | The far edge of `demoRange()`, greyed |
 * | **BeforeWestonEdits** | the demo day, base edition | The "Go to date" list it replaces |
 * | **HeaderFoldsOnScroll** | the demo day | Scroll down and the header gives way to the compact row without moving the list; a little scroll up peeks it back; the top restores it |
 * | **CompactRowStepsADay** | the demo day, scrolled | The compact row's › steps one day, and its date opens the calendar sheet |
 * | **ClearedDayStaysEmpty** | Fri, Jun 12 with `generatedDates: ['2026-06-12']` and no June bookings | A cleared generated day stays cleared: the test steps to Jun 13 (which fills on arrival), comes back, and asserts 0 golfers and `0 tee times` on the strip |
 *
 * ## Where the phone differs from the tablet, and why
 *
 * **The phone is where round 2 came from**, so it gets new controls; the tablet gets only new
 * data. Its calendar was already a month grid with dots, and Weston did not complain about it.
 *
 * **A week strip, not just a calendar.** Most date movement at a counter is a day or two either
 * way. The strip makes that one tap and frees the arrows to take the bigger step — which is why
 * ‹ › move a **week** here and a day on the base phone.
 *
 * **A bottom sheet, not a popover.** The tablet anchors its calendar under the date button. The
 * phone has nothing to anchor to and a thumb at the bottom of the frame, so the picker rises
 * from there, sized to the 402px frame rather than to a desktop dialog.
 *
 * **Everything opens on the demo day.** `state.currentDate` starts at `DEMO_TODAY()`, so the
 * phone always lands on Thu, May 21 2026 — the day with the full authored slate — and every
 * jump from there is deliberate.
 *
 * ## Still open
 *
 * **Generated days are session state.** They live in `state.bookings` after the first visit and
 * vanish on reload, and `generatedDates` resets when the club changes — so a day cleared at one
 * club refills after switching away and back.
 *
 * **The strip has no month context.** It shows weekday letters and day numbers; the month lives
 * in the chip above it. Swiping across a month boundary is legible but not announced, beyond
 * the strip's `Week of …` group label.
 *
 * **Twelve months is an assumption**, not something Weston asked for. It covers a real booking
 * horizon; whether the sheet should simply keep generating is undecided.
 *
 * **The compact row drops Filters and Day summary.** Search stays (Justin said on the call he'd
 * bring it back); the other two are one small scroll up away, in the peeking header.
 */
const meta = {
  title: 'Weston Edits/9 · Date Navigation/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * **What changed:** a seven-day week strip under the date row — weekday letter and day,
 * the viewed day filled, today outlined, a dot on days with tee times (fainter on quieter
 * days). Tap a day to view it; swipe, or the date row's ‹ ›, to move a week.
 *
 * **Why:** Weston stepped a day at a time to get anywhere. Day-by-day is now a single tap
 * within the week, so the arrows take the bigger step.
 */
export const WeekStrip: Story = {
  render: () => <MobileStory edition="weston" initialState={at18()} tab="tee" />,
};

/**
 * **What changed:** tapping the date opens a calendar bottom sheet (inside the phone frame)
 * instead of the "Go to date" list: the month, the viewed date filled, today outlined, a dot
 * on every day with tee times, ‹ › by month. Picking a day views it and closes the sheet.
 *
 * **Why:** the list only offered the demo's eleven days, with no month or way to page.
 */
export const CalendarSheet: Story = {
  render: () => <MobileStory edition="weston" initialState={at18()} tab="tee" stack={[{ name: 'teeSheet', calendar: {} }]} />,
};

/**
 * **What changed:** June is three taps away — open the calendar, ‹ › to June, pick a day —
 * and the day has a tee sheet: generated for any date the demo didn't author, the same
 * bookings every visit, weekends busier and far-off days lighter.
 *
 * **Why:** Weston's exact case — "I want to go to, let's say, June".
 */
export const JumpToJune: Story = {
  render: () => <MobileStory edition="weston" initialState={at18()} tab="tee" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByLabelText('Choose date'));
    await userEvent.click(await c.findByLabelText('Next month'));
    await c.findByRole('grid', { name: 'June 2026' });
    await userEvent.click(await c.findByLabelText(/^Friday, June 12, 2026/));
    await waitFor(() => expect(c.getByLabelText('Choose date')).toHaveTextContent('Fri, Jun 12'));
    await waitFor(() => expect(c.getByText(/golfers ·/).textContent).not.toMatch(/^0 golfers/));
  },
};

/**
 * **What changed:** the calendar's month/year header opens a year → month chooser, for jumps
 * further than a few months — pick the year, then the month. Months beyond the demo's range
 * are greyed.
 *
 * **Why:** paging month by month is fine for June, not for next spring.
 */
export const YearChooser: Story = {
  render: () => (
    <MobileStory edition="weston" initialState={at18()} tab="tee" stack={[{ name: 'teeSheet', calendar: { view: 'years' } }]} />
  ),
};

/**
 * **What changed:** the calendar's **Today** returns to the demo's today (Thu, May 21) from
 * wherever you are. This story starts on Fri, Jun 12 with the calendar open, and taps it.
 *
 * **Why:** a far jump needs a one-tap way home.
 */
export const TodayButton: Story = {
  render: () => (
    <MobileStory
      edition="weston"
      initialState={at18(undefined, { currentDate: new Date(2026, 5, 12) })}
      tab="tee"
      stack={[{ name: 'teeSheet', calendar: {} }]}
    />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: /^Today/ }));
    await waitFor(() => expect(c.getByLabelText('Choose date')).toHaveTextContent('Today · Thu, May 21'));
  },
};

/**
 * **What changed:** the demo covers twelve months either side of today. Past the end
 * (May 21, 2027) days are greyed and can't be picked, and ‹ › stop at the range's edge.
 *
 * **Why:** a tee sheet that goes on forever would be generating data nobody asked for — a
 * year each way covers every real booking horizon.
 */
export const OutOfRange: Story = {
  render: () => (
    <MobileStory
      edition="weston"
      initialState={at18(undefined, { currentDate: new Date(2027, 4, 18) })}
      tab="tee"
      stack={[{ name: 'teeSheet', calendar: {} }]}
    />
  ),
};

/**
 * **Before Weston Edits (base edition, for comparison):** the date opens the "Go to date"
 * list — the demo's eleven days with their tee-time counts, and nothing else.
 */
export const BeforeWestonEdits: Story = {
  render: () => <MobileStory edition="base" initialState={at18()} tab="tee" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByLabelText('Choose date'));
    await c.findByText('Go to date');
    // The base header stays pinned above the list: no folding header, no compact row.
    await expect(c.queryByTestId('tee-sheet-header')).toBeNull();
    await expect(c.queryByTestId('compact-date-bar')).toBeNull();
  },
};

/** The tee sheet's scrolling list — the folding header's parent. */
const listOf = async (c: ReturnType<typeof within>) => (await c.findByTestId('tee-sheet-header')).parentElement!;

/** Scroll the list to `y` and let the scroll event land. */
const scrollTo = async (list: HTMLElement, y: number) => {
  list.scrollTop = y;
  await waitFor(() => expect(list.scrollTop).toBe(y));
};

/**
 * **What changed (Oct 1):** scroll the tee sheet and the app bar, date row, week strip and course
 * chips go with it; once they're off the top, one compact row docks there — **‹ Today · Thu,
 * May 21 ›** and search. Scroll back up a little anywhere in the day and the full header peeks
 * back in over the list; scroll down and it slides away again. Back at the top, it's simply
 * where it always was.
 *
 * **Why:** Weston — *"once you start scrolling, if you could collapse… at least these like 3
 * lines… I'd keep the day so then you could just click that."* The pinned header held a third of
 * the phone.
 *
 * The play test checks the list moves exactly as far as it scrolled (nothing above it changed
 * size), the compact row and the hidden header at each step, and the band header sticking under
 * the compact row.
 */
export const HeaderFoldsOnScroll: Story = {
  render: () => <MobileStory edition="weston" initialState={at18()} tab="tee" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const list = await listOf(c);
    const header = c.getByTestId('tee-sheet-header');
    const firstTime = c.getByRole('button', { name: '6:00 AM actions' });
    const before = firstTime.getBoundingClientRect().top;
    await expect(header).toHaveAttribute('data-mode', 'top');
    await expect(c.queryByTestId('compact-date-bar')).toBeNull();

    // Down: the header scrolls off and the compact row docks — and the list moved 400px, no more.
    await scrollTo(list, 400);
    const bar = await c.findByTestId('compact-date-bar');
    await expect(bar).toHaveTextContent('Today · Thu, May 21');
    await expect(header).toHaveAttribute('data-mode', 'collapsed');
    await expect(header).toHaveAttribute('aria-hidden', 'true');
    await expect(Math.round(before - firstTime.getBoundingClientRect().top)).toBe(400);
    await expect(c.getByRole('button', { name: 'Choose date' })).toBe(within(bar).getByRole('button', { name: 'Choose date' }));
    await expect(within(bar).getByRole('button', { name: 'Search bookings' })).toBeTruthy();
    // The band header sticks under the compact row, not under the header that has gone.
    const band = c.getByText('Early Morning').parentElement!;
    await waitFor(() => expect(getComputedStyle(band).top).toBe(`${COMPACT_DATE_BAR_H}px`));

    // A little way up: the full header peeks back in over the list, the compact row under it.
    await scrollTo(list, 380);
    await waitFor(() => expect(header).toHaveAttribute('data-mode', 'peek'));
    await expect(header).not.toHaveAttribute('aria-hidden');
    await expect(c.getByTestId('compact-date-bar')).toHaveAttribute('aria-hidden', 'true');
    await expect(c.getByRole('button', { name: 'Next week' })).toBeTruthy();
    await expect(c.getByRole('group', { name: /^Week of/ })).toBeTruthy();

    // Down again: it slides away.
    await scrollTo(list, 420);
    await waitFor(() => expect(header).toHaveAttribute('data-mode', 'collapsed'));

    // Back to the top: the full header, in place, and no compact row.
    await scrollTo(list, 0);
    await waitFor(() => expect(header).toHaveAttribute('data-mode', 'top'));
    await expect(c.queryByTestId('compact-date-bar')).toBeNull();
    await expect(firstTime.getBoundingClientRect().top).toBe(before);
  },
};

/**
 * **What changed (Oct 1):** the compact row's ‹ › step a **day** — the week strip they page in
 * the full header is folded away — and its date opens the same calendar sheet as the full
 * row's. This story scrolls, taps ›, and opens the calendar from the compact row.
 *
 * **Why:** Weston's *"click that and go to a different date… or click the arrows."*
 */
export const CompactRowStepsADay: Story = {
  render: () => <MobileStory edition="weston" initialState={at18()} tab="tee" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await scrollTo(await listOf(c), 400);
    const bar = within(await c.findByTestId('compact-date-bar'));
    await userEvent.click(bar.getByRole('button', { name: 'Next day' }));
    await waitFor(() => expect(bar.getByRole('button', { name: 'Choose date' })).toHaveTextContent('Fri, May 22'));
    await userEvent.click(bar.getByRole('button', { name: 'Previous day' }));
    await waitFor(() => expect(bar.getByRole('button', { name: 'Choose date' })).toHaveTextContent('Today · Thu, May 21'));
    await userEvent.click(bar.getByRole('button', { name: 'Choose date' }));
    await c.findByText('Select date');
    await c.findByRole('grid', { name: 'May 2026' });
  },
};

/**
 * **What changed:** a generated day is generated once. Delete every booking on it and it
 * stays empty for the session — leave for another day and come back, and it's still clear
 * rather than refilled with a fresh copy. (Edits on a generated day stick the same way.)
 * This story starts on Fri, Jun 12 after its generated bookings were all deleted, steps to
 * Sat, Jun 13 (a day generated on arrival) and back.
 *
 * **Why:** a day that quietly refills after you cleared it would undo the operator's work.
 * The rule lives in the reducer (`generatedDates`), so the tablet behaves the same.
 */
export const ClearedDayStaysEmpty: Story = {
  render: () => (
    <MobileStory
      edition="weston"
      // June 12 was filled, then every booking on it deleted: no June bookings in state,
      // and the date recorded as generated.
      initialState={at18(undefined, { currentDate: new Date(2026, 5, 12), generatedDates: ['2026-06-12'] })}
      tab="tee"
    />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const summary = () => c.getByText(/golfers? ·/).textContent ?? '';
    await waitFor(() => expect(summary()).toMatch(/^0 golfers/));
    await userEvent.click(await c.findByRole('button', { name: /^Saturday, June 13/ }));
    await waitFor(() => expect(c.getByLabelText('Choose date')).toHaveTextContent('Sat, Jun 13'));
    await waitFor(() => expect(summary()).not.toMatch(/^0 golfers/));
    await userEvent.click(await c.findByRole('button', { name: /^Friday, June 12/ }));
    await waitFor(() => expect(c.getByLabelText('Choose date')).toHaveTextContent('Fri, Jun 12'));
    await expect(summary()).toMatch(/^0 golfers/);
    await expect(c.getByRole('button', { name: /^Friday, June 12/ })).toHaveAccessibleName(/0 tee times$/);
  },
};
