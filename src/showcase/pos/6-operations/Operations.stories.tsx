import type { Meta, StoryObj } from '@storybook/react-vite';
import { Screen, onTeeSheet, screenParams } from '../screen-helpers';

/**
 * POS Screens / 6 · Operations
 *
 * Everything reachable from the tee sheet's time gutter, plus per-course configuration.
 *
 * These dialogs share a shape: pick a target (one row or a span), pick which courses,
 * see what it would overwrite, apply. The conflict preview is the important part — every
 * one of these can silently destroy real bookings, so each shows the damage first.
 */
const meta = {
  title: 'POS Screens/6 · Operations',
  parameters: screenParams,
} satisfies Meta;

export default meta;
type Story = StoryObj;

const AT = 9 * 60 + 12; // 9:12 AM — mid-morning, so the row has real bookings on it

/** The time-row menu: block, note, price, league, move, and bulk row actions. */
export const TimeRowMenu: Story = {
  render: () => (
    <Screen
      initialState={onTeeSheet({ contextMenu: { kind: 'timeLabel', timeMin: AT, x: 120, y: 260 } })}
    />
  ),
};

/**
 * Block a slot. A block is stored as a booking spanning the course's full slot width,
 * which is why blocking a row removes what was booked in it — so the conflict count is
 * stated plainly before applying.
 */
export const BlockTime: Story = {
  render: () => <Screen initialState={onTeeSheet({ modal: { kind: 'blockTime', timeMin: AT } })} />,
};

/** Annotate a row — frost delay, lightning hold, shotgun start — in one of five colours. */
export const TimeNote: Story = {
  render: () => <Screen initialState={onTeeSheet({ modal: { kind: 'timeNote', timeMin: AT } })} />,
};

/**
 * Override pricing for a row or span. Four independent fields, because this club prices a
 * round and its transport separately — blank means "keep the published rate", not "free".
 */
export const PriceOverride: Story = {
  render: () => <Screen initialState={onTeeSheet({ modal: { kind: 'timePrice', timeMin: AT } })} />,
};

/**
 * A nine-hole league fills consecutive rows on one course. The summary states capacity
 * against the requested player count before anything is written.
 */
export const LeagueNineHole: Story = {
  render: () => <Screen initialState={onTeeSheet({ modal: { kind: 'league', timeMin: AT } })} />,
};

/**
 * An eighteen-hole league is the interesting case: groups tee off on a front nine and
 * cross over to a *different* nine after a duration, so it consumes staggered slots on
 * two courses. Switch Format to 18 holes to see the plan recompute.
 */
export const LeagueEighteenHole: Story = {
  render: () => (
    <Screen initialState={onTeeSheet({ modal: { kind: 'league', timeMin: 8 * 60 } })} />
  ),
};

/**
 * Move players between rows. When the destination is partly occupied, placement decides
 * whether the movers take the slots before or after the existing party — slot order is
 * starting order.
 */
export const MovePlayers: Story = {
  render: () => (
    <Screen initialState={onTeeSheet({ modal: { kind: 'movePlayers', timeMin: AT } })} />
  ),
};

/** A course's bookable window, interval, and players per tee time. */
export const CourseTimeSettings: Story = {
  render: () => (
    <Screen initialState={onTeeSheet({ modal: { kind: 'courseTimeSettings', courseId: 'ponds' } })} />
  ),
};

/**
 * The published rate card by time-of-day band, read-only. Row-level overrides set from the
 * sheet take precedence over these and appear as a green banner on the affected times.
 */
export const RateCard: Story = {
  render: () => (
    <Screen initialState={onTeeSheet({ modal: { kind: 'courseRates', courseId: 'ponds' } })} />
  ),
};

/** Cross-day search — results span the whole schedule, so selecting one jumps the date. */
export const FindTeeTime: Story = {
  render: () => <Screen initialState={onTeeSheet({ modal: { kind: 'teeSheetSearch' } })} />,
};

/** A destructive confirmation. The action is a plain string key, so state stays serializable. */
export const DestructiveConfirm: Story = {
  render: () => (
    <Screen
      initialState={onTeeSheet({
        modal: {
          kind: 'confirm',
          title: 'Clear 9:12 AM?',
          body: '6 tee times across all courses will be removed and the slots released.',
          confirmLabel: 'Clear time',
          onConfirm: `clearTime:${AT}`,
        },
      })}
    />
  ),
};
