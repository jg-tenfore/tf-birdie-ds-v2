import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  DEMO_BOOKINGS,
  Screen,
  memberBooking,
  paidFoursome,
  screenParams,
  withLoadedBooking,
  withWalkInOrder,
} from '../screen-helpers';

/**
 * POS Screens / 1 · Register & Order
 *
 * The register is the left panel plus the catalog. The left panel is the constant —
 * it persists across both views, because an operator moves between the tee sheet and
 * the order constantly and losing the order in between would be the costliest thing
 * this design could do.
 */
const meta = {
  title: 'POS Screens/1 · Register & Order',
  parameters: screenParams,
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * The register at rest. The left panel offers the two ways an order starts —
 * walk-in or reservation — and the catalog waits for a category.
 */
export const EmptyRegister: Story = {
  render: () => <Screen initialState={{ bookings: DEMO_BOOKINGS }} />,
};

/**
 * A category open. Items inherit a 13%-alpha wash of the category colour, which ties
 * the grid back to the button that opened it — staff navigate this by hue and
 * position rather than by reading labels.
 */
export const CategoryAndItems: Story = {
  render: () => (
    <Screen initialState={{ bookings: DEMO_BOOKINGS, currentCategory: 'GOLF BALLS' }} />
  ),
};

/**
 * Rate tiles, with the hole-count lock in effect.
 *
 * A round already on the order fixes 9 or 18 holes, so conflicting rates grey out —
 * mixing hole counts on one tee time becomes impossible rather than merely discouraged.
 */
export const RateTilesLocked: Story = {
  render: () => <Screen initialState={withWalkInOrder({ currentCategory: 'CHECK IN' })} />,
};

/**
 * A walk-in mid-build: three players on an 18-hole guest rate, a tee time attached,
 * two named from the CRM, one still an unnamed seat, plus a retail line.
 *
 * Note the per-player pricing — each seat gets its own block showing why it costs what
 * it costs. Player 2 carries a military discount, so the foursome is not four
 * identical charges.
 */
export const WalkInOrder: Story = {
  render: () => <Screen initialState={withWalkInOrder()} />,
};

/**
 * A tee-sheet booking loaded into the register.
 *
 * The cart is built from the booking: transport comes off the reservation rather than
 * being chosen at the counter, and the summary card at the top links back to the full
 * booking record.
 */
export const LoadedTeeTime: Story = {
  render: () => <Screen initialState={withLoadedBooking(paidFoursome())} />,
};

/**
 * A member check-in. The green fee resolves to zero through a Member Rate override,
 * while the cart fee still applies — a comped round still pays for its cart.
 */
export const MemberCheckIn: Story = {
  render: () => <Screen initialState={withLoadedBooking(memberBooking())} />,
};

/**
 * The modifier picker for one player, grouped by what each modifier does to the price.
 * That grouping is the pricing precedence: overrides replace the fee, transport adds
 * to it, discounts reduce it. Only one override and one transport can be active.
 */
export const PerPlayerModifiers: Story = {
  render: () => (
    <Screen
      initialState={withWalkInOrder({
        modal: { kind: 'playerModifier', itemIdx: 0, playerIdx: 1 },
      })}
    />
  ),
};

/** An ad-hoc line for something the catalog doesn't carry. */
export const OpenItem: Story = {
  render: () => (
    <Screen initialState={withWalkInOrder({ modal: { kind: 'openItem' } })} />
  ),
};
