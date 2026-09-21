import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { shifts } from '../../../../theme/tokens';
import type { MemberTypeKey } from '../../../../theme/tokens';
import { findMemberByPhone } from '../../../data/golfers';
import { usePos } from '../../../state/PosProvider';
import type { Booking, Course, Golfer } from '../../../types';

/**
 * Pure helpers and hooks for the Tee Sheet destination. Components live in `parts.tsx`;
 * this file holds no JSX so React fast refresh keeps working on both.
 */

// ─── Pure helpers ───────────────────────────────────────────────────────────

/** A booking's player name by seat: the booker for seat 0, then named guests. */
export function playerName(b: Booking, i: number): string {
  if (i === 0) return b.guests?.[0]?.name || b.name;
  return b.guests?.[i]?.name || `Guest ${i + 1}`;
}

/** `'Harrison, T.'` → `'HT'`. */
export function initials(name: string): string {
  return name
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** `'2026-05-21'` → a local Date. */
export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const dayLabel = (d: Date, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) =>
  d.toLocaleDateString('en-US', opts);

/** A course name short enough for a chip: `'Ponds (to Woods)'` → `'Ponds'`. */
export function shortCourse(c: Course | undefined): string {
  if (!c) return '';
  const tail = c.name.split(' · ').pop() ?? c.name;
  return tail.replace(/\s*\(.*\)\s*/, '').trim();
}

/** Which time band a minute falls in — the tee sheet's section headers. */
export function bandOf(timeMin: number): 'early' | 'peak' | 'twilight' {
  const h = Math.floor(timeMin / 60);
  return h < 10 ? 'early' : h < 14 ? 'peak' : 'twilight';
}

export const isSlotHolder = (b: Booking) => b.pay === 'block' || b.pay === 'event' || b.status === 'block';

/** Money still owed: unpaid, not-no-show players × rate. */
export const balanceOf = (b: Booking) =>
  (b.playerStates ?? []).filter((p) => !p.paid && !p.noShow).length * b.price;

export const checkedInCount = (b: Booking) =>
  (b.playerStates ?? []).filter((p) => p.step >= 0 && !p.noShow).length;

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * The membership tier of a booking's seat, from the guest record or the CRM by phone.
 * Pass `useGolferRoster()` so customers created this session resolve too.
 */
export function seatMemberType(b: Booking, i: number, roster?: readonly Golfer[]): MemberTypeKey | null {
  const g = b.guests?.[i];
  if (g?.memberType) return g.memberType;
  if (i === 0) return findMemberByPhone(b.phone, roster)?.memberType ?? null;
  return null;
}

/**
 * The round's steps. Defined once in `data/config.ts` and shared with the terminal's
 * Booking Detail rail, so a player reads the same on both — re-exported here because the
 * tee screens import their helpers from one place.
 */
export { ROUND_STEPS, roundStepOf } from '../../../data/config';

// ─── Long press ─────────────────────────────────────────────────────────────

/**
 * Long-press (and right-click, for the desktop Storybook) on a touch target.
 *
 * Returns handlers to spread on the element plus a guard for its `onClick`, so the tap
 * that ends a long press doesn't also fire the tap action.
 */
export function useLongPress(onLongPress: () => void, ms = 480) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const clear = () => {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  return {
    handlers: {
      onPointerDown: (e: ReactPointerEvent) => {
        if (e.button !== 0) return;
        fired.current = false;
        clear();
        timer.current = window.setTimeout(() => {
          fired.current = true;
          onLongPress();
        }, ms);
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      onContextMenu: (e: { preventDefault: () => void }) => {
        e.preventDefault();
        clear();
        fired.current = true;
        onLongPress();
      },
    },
    /** Wrap the tap handler: swallows the click that ends a long press. */
    tap: (fn: () => void) => () => {
      if (fired.current) {
        fired.current = false;
        return;
      }
      fn();
    },
  };
}

// ─── Data access ────────────────────────────────────────────────────────────

/** Look a booking up by id from live state — screens re-render as it's patched. */
export function useBooking(id: string) {
  const { state } = usePos();
  const booking = state.bookings.find((b) => b.id === id);
  const course = booking ? state.courses.find((c) => c.id === booking.course) : undefined;
  return { booking, course };
}

/** Band header config: label, hours and tint, from the `shifts` tokens. */
export function bandMeta(band: 'early' | 'peak' | 'twilight') {
  const s = shifts[band];
  const fmt = (h: number) => `${h > 12 ? h - 12 : h} ${h < 12 ? 'AM' : 'PM'}`;
  return { label: s.label, hours: `${fmt(s.startH)} – ${fmt(s.endH)}`, bg: s.bg, icon: s.icon, iconColor: s.iconColor };
}
