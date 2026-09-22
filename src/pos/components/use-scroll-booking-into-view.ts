import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { SxProps, Theme } from '@mui/material';
import { reservationPanel } from '../../theme/tokens';
import { usePos } from '../state/PosProvider';

/** Breathing room kept between the booking and the edge it was scrolled to. */
const MARGIN = 16;

/**
 * The tee sheet beside the reservation panel (Weston Edits): while the panel is open as a
 * slide-over, the grid or list narrows to the room left of it rather than running under it.
 * A right margin the panel's width, animated with the panel's own slide — so every column
 * tightens, no chip is hidden under the panel, and there is nothing to scroll sideways to.
 * Nothing changes without a panel (the base edition has none) or when it opens as a dialog.
 * Put `data-panel-squeeze` on the element that takes it, so the scroll below can wait for it.
 */
export function usePanelSqueeze(): SxProps<Theme> {
  const { state } = usePos();
  const open = Boolean(state.reservationPanel) && state.reservationPanel?.presentation !== 'modal';
  return {
    mr: open ? `${reservationPanel.width}px` : 0,
    transition: `margin-right ${reservationPanel.motion}`,
  };
}

/**
 * Keep the booking the reservation panel is showing in view beside it (Weston Edits).
 *
 * A tee time opened from search, the day summary, a walk-in — or simply lower on the sheet
 * — can be off screen. When the panel's booking changes, this scrolls `scrollRef` just
 * enough that the booking's element (`[data-booking-id]`) sits inside the visible area,
 * below the sheet's sticky header (`[data-sticky-header]`): an out-of-view booking is
 * centred vertically. Smoothly — and not at all when the booking is already fully visible,
 * so clicking a tee time on screen never makes the sheet jump. The sheet narrows beside the
 * panel (`usePanelSqueeze`), so there's no sideways scroll to manage; the horizontal nudge
 * only matters if something is ever wider than the sheet.
 *
 * Measured from the DOM rather than computed from rows, because band separators, notes,
 * price banners and hidden empty rows all change where a row actually is. Measured again
 * when the narrowing finishes, because list cards can reflow as the list tightens.
 */
export function useScrollBookingIntoView(
  scrollRef: RefObject<HTMLElement | null>,
  bookingId: string | null | undefined,
): void {
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || !bookingId) return;
    const reveal = () => {
      const el = scroller.querySelector<HTMLElement>(`[data-booking-id="${CSS.escape(bookingId)}"]`);
      if (!el) return;
      const sr = scroller.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      const header = scroller.querySelector<HTMLElement>('[data-sticky-header]')?.offsetHeight ?? 0;

      const top = sr.top + header;
      const bottom = sr.top + scroller.clientHeight;
      let dy = 0;
      // Out of view (even partly): centre it in what's visible.
      if (er.top < top || er.bottom > bottom) dy = er.top + er.height / 2 - (top + bottom) / 2;

      const right = sr.left + scroller.clientWidth;
      let dx = 0;
      if (er.right > right) dx = er.right - right + MARGIN;
      else if (er.left < sr.left) dx = er.left - sr.left - MARGIN;

      if (Math.abs(dy) > 1 || Math.abs(dx) > 1) scroller.scrollBy({ top: dy, left: dx, behavior: 'smooth' });
    };
    // A frame for layout to settle, then once more when the sheet has finished narrowing.
    const raf = requestAnimationFrame(reveal);
    const squeezed = scroller.closest<HTMLElement>('[data-panel-squeeze]') ?? scroller;
    const onNarrowed = (e: TransitionEvent) => {
      if (e.target === squeezed && e.propertyName === 'margin-right') reveal();
    };
    squeezed.addEventListener('transitionend', onNarrowed);
    return () => {
      cancelAnimationFrame(raf);
      squeezed.removeEventListener('transitionend', onNarrowed);
    };
  }, [scrollRef, bookingId]);
}
