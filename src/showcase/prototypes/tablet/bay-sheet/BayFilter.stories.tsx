import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { CURRENT_EDITION } from '../../../../pos/edition';
import { resourcesOf, seedResourceDay } from '../../../../pos/data/resources';
import { withEdition } from '../../../edition-decorator';
import { Screen, TODAY_STR } from '../../../pos/screen-helpers';
import { at, sheetWith } from '../../../v1-v2/resource-scenarios';

/**
 * Bay Sheet — **switching bays off and on** (Nov 26).
 *
 * A row of chips under the toolbar, one per bay, the way Buck's bay sheet filters its bays. Every
 * chip starts **on** (tonal, with a check). Tap one to switch that bay's column off (outlined, with
 * an eye struck through); tap it again to bring it back. **All 10** puts every bay back.
 *
 * - The columns left share the width, so two bays on a Clover Mini are two wide columns.
 * - Each chip carries the bay's bookings for the day, and while anything is off the toolbar says how
 *   many bookings the hidden bays hold — switching a bay off hides its column, never its bookings.
 * - The choice is the store's (`hiddenResources`), so it survives a trip to the register, and it
 *   rides in the deep link: `#/bays?hide=bay-3,palmer`.
 * - The court sheet is the same component and has the same row (last story).
 */
const meta = {
  title: 'Prototypes/Tablet/Bay Sheet/Switching bays off',
  id: 'prototypes-tablet-bay-sheet-switching-bays-off',
  parameters: { layout: 'fullscreen' },
  decorators: [withEdition('current-tablet')],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const KIND = 'bay' as const;
const BAYS = resourcesOf(KIND);
const day = () => seedResourceDay(KIND, TODAY_STR, at(12));
const q = (root: ParentNode, sel: string) => root.querySelector<HTMLElement>(sel);
const columns = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-resource-column]')].map((c) => c.dataset.resourceColumn);
const chip = (el: HTMLElement, id: string) => q(el, `[data-resource-toggle="${id}"]`)!;

/** **Every bay on** — the sheet as it opens: ten chips, each with its bookings for the day, and ten columns. */
export const EveryBayOn: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={sheetWith(KIND, day())} />,
  play: async ({ canvasElement }) => {
    const toggles = canvasElement.querySelectorAll<HTMLElement>('[data-resource-toggle]');
    await expect(toggles.length).toBe(BAYS.length);
    for (const t of toggles) await expect(t.getAttribute('aria-pressed')).toBe('true');
    await expect(q(canvasElement, '[data-resource-show-all]')!.getAttribute('aria-pressed')).toBe('true');
    await expect(columns(canvasElement).length).toBe(BAYS.length);
    // Nothing off, nothing to say.
    await expect(q(canvasElement, '[data-resource-filter-summary]')).toBeNull();
  },
};

/**
 * **Switch two off, then one back.** Bay 3 and Palmer go; the eight left widen, and the toolbar says
 * how many bookings went out of sight with them. Palmer comes back in its own place, not at the end.
 */
export const SwitchTwoOff: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={sheetWith(KIND, day())} />,
  play: async ({ canvasElement }) => {
    const onBay3 = day().filter((b) => b.resourceId === 'bay-3').length;
    const onPalmer = day().filter((b) => b.resourceId === 'palmer').length;

    await userEvent.click(chip(canvasElement, 'bay-3'));
    await userEvent.click(chip(canvasElement, 'palmer'));
    await waitFor(() => expect(columns(canvasElement).length).toBe(BAYS.length - 2));
    await expect(columns(canvasElement)).not.toContain('bay-3');
    await expect(chip(canvasElement, 'palmer').getAttribute('aria-pressed')).toBe('false');
    await expect(q(canvasElement, '[data-resource-show-all]')!.getAttribute('aria-pressed')).toBe('false');
    await expect(q(canvasElement, '[data-resource-filter-summary]')!.textContent).toBe(
      `Showing 8 of 10 bays · ${onBay3 + onPalmer} bookings hidden`,
    );
    // The summary counts only what's on screen.
    await expect(q(canvasElement, '[data-resource-summary]')!.textContent).toMatch(
      new RegExp(`^${day().length - onBay3 - onPalmer} booked`),
    );

    await userEvent.click(chip(canvasElement, 'palmer'));
    await waitFor(() => expect(columns(canvasElement).length).toBe(BAYS.length - 1));
    const order = columns(canvasElement);
    await expect(order.indexOf('palmer')).toBe(order.indexOf('nicklaus') + 1);
  },
};

/**
 * **Just the porch sims** — eight bays off, from a deep link (`#/bays?hide=…`). Two columns share
 * the whole width, and All 10 brings the rest back.
 */
export const JustThePorchSims: Story = {
  render: () => (
    <Screen
      edition={CURRENT_EDITION.tablet}
      initialState={sheetWith(KIND, day(), {
        hiddenResources: BAYS.filter((b) => !b.id.endsWith('porch')).map((b) => b.id),
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(columns(canvasElement)).toEqual(['east-porch', 'west-porch']);
    // Two columns share the width rather than sitting at their minimum beside a gap.
    const col = q(canvasElement, '[data-resource-column="east-porch"]')!;
    await expect(col.getBoundingClientRect().width).toBeGreaterThan(400);
    await userEvent.click(q(canvasElement, '[data-resource-show-all]')!);
    await waitFor(() => expect(columns(canvasElement).length).toBe(BAYS.length));
    await expect(q(canvasElement, '[data-resource-filter-summary]')).toBeNull();
  },
};

/** **Every bay off** — the sheet says so, and offers the one way back. */
export const EveryBayOff: Story = {
  render: () => (
    <Screen
      edition={CURRENT_EDITION.tablet}
      initialState={sheetWith(KIND, day(), { hiddenResources: BAYS.map((b) => b.id) })}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(columns(canvasElement).length).toBe(0);
    const empty = q(canvasElement, '[data-resource-all-off]')!;
    await expect(empty.textContent).toContain('Every bay is switched off');
    await userEvent.click([...empty.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent === 'Show all bays')!);
    await waitFor(() => expect(columns(canvasElement).length).toBe(BAYS.length));
  },
};

/**
 * **The court sheet has it too** — the same component. The pool goes off; switching courts doesn't
 * touch the bay sheet's choice, and the other way round.
 */
export const CourtSheetToo: Story = {
  render: () => (
    <Screen
      edition={CURRENT_EDITION.tablet}
      initialState={sheetWith('court', seedResourceDay('court', TODAY_STR, at(12)), { hiddenResources: ['bay-3'] })}
    />
  ),
  play: async ({ canvasElement }) => {
    const courts = resourcesOf('court');
    await expect(canvasElement.querySelectorAll('[data-resource-toggle]').length).toBe(courts.length);
    // A bay switched off on the bay sheet is not a court switched off here.
    await expect(columns(canvasElement).length).toBe(courts.length);
    await userEvent.click(chip(canvasElement, 'pool-1'));
    await waitFor(() => expect(columns(canvasElement)).not.toContain('pool-1'));
    await expect(q(canvasElement, '[data-resource-filter-summary]')!.textContent).toMatch(/^Showing 5 of 6 courts/);
  },
};
