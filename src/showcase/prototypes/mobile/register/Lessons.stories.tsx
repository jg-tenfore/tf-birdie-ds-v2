import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { withEdition } from '../../../edition-decorator';
import { MobileStory, mobileMeta } from '../../../pos-mobile/mobile-helpers';
import { HOLDERS, golfer } from '../../tablet/pro-shop/checkout-kit';

/**
 * Register on the handheld — **a lesson is rung up with its instructor** (Nov 26 decision).
 *
 * The phone's form of the tablet's picker: tapping a lesson asks who it is with, in a bottom sheet.
 * With a customer on the order, each instructor shows that customer's credits of this length with
 * them, because a lesson credit pays only its own instructor's lessons (Buck's packs are bought per
 * instructor). The order line then says who the lesson is with.
 */
const meta = {
  title: 'Prototypes/Mobile/Register/Lessons with their instructor',
  id: 'prototypes-mobile-register-lessons-with-their-instructor',
  decorators: [withEdition('current-mobile')],
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * **Who is it with?** Priya is on the order and holds three 30-minute credits with Jordan Pike, so his
 * row says so. Picking him adds the lesson with his name on it.
 */
export const PickTheInstructor: Story = {
  render: () => (
    <MobileStory initialState={{ selectedGolfer: golfer(HOLDERS.priya) }} tab="register" stack={[{ name: 'category', category: 'SERVICES' }]} />
  ),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(await within(canvasElement).findByText('Lesson 30 Min'));
    const sheet = await waitFor(() => {
      const el = canvasElement.ownerDocument.querySelector<HTMLElement>('[data-instructor-sheet]');
      if (!el) throw new Error('waiting for the sheet');
      return el;
    });
    await expect(sheet.querySelector('[data-instructor-option="jordan-pike"] [data-instructor-credits]')!.textContent).toBe('3 credits');
    await expect(sheet.querySelector('[data-instructor-option="sam-ortega"] [data-instructor-credits]')).toBeNull();
    await userEvent.click(sheet.querySelector<HTMLElement>('[data-instructor-option="jordan-pike"]')!);
    await page.findByText('Added · Lesson 30 Min · Jordan Pike');
  },
};
