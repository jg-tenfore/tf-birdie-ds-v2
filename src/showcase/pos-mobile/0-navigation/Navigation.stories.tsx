import type { Meta, StoryObj } from '@storybook/react-vite';
import { DEMO_BOOKINGS, MobileStory, mobileMeta, withWalkInOrder } from '../mobile-helpers';

/**
 * Mobile Screens / 0 · Navigation
 *
 * The phone app, live. Four destinations on an MD3 navigation bar — Tee Sheet, Register,
 * People, More — and everything else one level down: pushed pages with a back arrow,
 * full-screen dialogs with a ✕, and two no-exit takeovers for taking payment.
 *
 * The numbered sections that follow each pin one screen; these stories let you walk
 * between them.
 */
const meta = {
  title: 'Mobile Screens/0 · Navigation',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Click-through prototype from the Tee Sheet, the app's home destination. */
export const Interactive: Story = {
  render: () => <MobileStory initialState={{ bookings: DEMO_BOOKINGS }} tab="tee" />,
};

/**
 * An order already in progress. The Register destination carries a badge with the line
 * count, so leaving a half-built order to check the sheet never loses track of it.
 */
export const OrderInProgress: Story = {
  render: () => <MobileStory initialState={withWalkInOrder()} tab="tee" />,
};
