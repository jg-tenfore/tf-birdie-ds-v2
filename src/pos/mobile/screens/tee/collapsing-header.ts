import { useLayoutEffect, useRef, useState } from 'react';
import type { UIEvent } from 'react';
import { md3, mobile } from '../../../../theme/tokens';

/** The collapsed row's height: a 48dp touch target and 4px either side. */
export const COMPACT_DATE_BAR_H = mobile.touchTarget + 8;

/** How far the thumb has to travel against the current state before the header answers. */
const PEEK_SLOP = 12;

/** Short on purpose — the header is answering a thumb, not making an entrance. */
export const COLLAPSE_MS = 150;

/**
 * Where the tee sheet's header is.
 *
 *  - `top` — in the list's flow, scrolling away with it like any other content.
 *  - `collapsed` — scrolled off; the one-line `CompactDateBar` is docked over the list.
 *  - `peek` — the thumb went back up mid-list, so the full header is stuck to the top over the
 *    list until the thumb goes down again or the list is back at the top.
 */
export type HeaderMode = 'top' | 'collapsed' | 'peek';

/**
 * Weston Edits — the tee sheet header folds away on scroll.
 *
 * Weston, Oct 1: *"it'd be nice if like once you start scrolling, if you could collapse… at
 * least these like 3 lines"* — the date row, the week strip and the course chips held about a
 * third of the phone whatever you were doing. *"I'd keep the day so then you could just click
 * that and go to a different date if you need to, or click the arrows."*
 *
 * **Why the header scrolls instead of shrinking.** Shrinking a header that sits above the list
 * changes the list's height, so everything under the thumb jumps by the difference — the one
 * thing a scrolling list mustn't do. So the header lives *in* the list's flow: it leaves with the
 * first pixel of scroll, exactly under the finger, and when the list's top reaches the bottom of
 * where the compact row sits (`header height − COMPACT_DATE_BAR_H`), `CompactDateBar` docks over
 * it. Nothing ever changes size, so nothing jumps.
 *
 * **"It peeks back in."** Scrolling up mid-list — by `PEEK_SLOP`, so a wobble doesn't count —
 * makes the header `position: sticky` and slides it down over the list in `COLLAPSE_MS`; sticky
 * keeps its place in the flow, so that doesn't move the list either. Scrolling down again slides
 * it back up; reaching the top hands it back to the flow where it already is.
 *
 * Returns the mode, the ref for the header's wrapper (measured, so the dock point and the band
 * headers' sticky `top` follow the real height), the wrapper's `sx`, where the band headers
 * stick, and the scroll handler for `MobileScreen`'s `onBodyScroll`.
 */
export function useCollapsingHeader() {
  const [{ mode, from }, setModes] = useState<{ mode: HeaderMode; from: HeaderMode }>({ mode: 'top', from: 'top' });
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerH, setHeaderH] = useState(0);
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const current = useRef<HeaderMode>('top');
  const lastY = useRef(0);
  // Signed distance travelled in the current direction: + down, − up.
  const travel = useRef(0);

  const onScroll = (e: UIEvent<HTMLElement>) => {
    const y = e.currentTarget.scrollTop;
    const dy = y - lastY.current;
    lastY.current = y;
    if (!dy) return;
    travel.current = Math.sign(dy) === Math.sign(travel.current) ? travel.current + dy : dy;

    const dock = headerH - COMPACT_DATE_BAR_H;
    const was = current.current;
    let next = was;
    if (y <= 0) next = 'top';
    else if (was === 'top') next = y > dock ? 'collapsed' : 'top';
    else if (was === 'collapsed') next = y <= dock ? 'top' : travel.current <= -PEEK_SLOP ? 'peek' : 'collapsed';
    else next = y > dock && travel.current >= PEEK_SLOP ? 'collapsed' : 'peek';

    if (next !== was) {
      current.current = next;
      setModes({ mode: next, from: was });
    }
  };

  // Only peek ↔ collapsed animates. Leaving or rejoining the flow (`top`) happens where the
  // header already is — off screen, or exactly in place — so a transition there would be a flash.
  const animates = mode !== 'top' && from !== 'top';
  const headerSx = {
    position: mode === 'top' ? 'relative' : 'sticky',
    top: 0,
    zIndex: 3,
    transform: mode === 'collapsed' ? 'translateY(-100%)' : 'none',
    transition: animates ? `transform ${COLLAPSE_MS}ms ${mobile.motion.easing}` : 'none',
    // The frame is scaled to fit the page, so the list's clip and the stuck header can round to
    // different device pixels and leave a hairline of list showing above it. Paint over it.
    boxShadow: mode === 'peek' ? `0 -2px 0 ${md3.surface}` : 'none',
  } as const;
  /** Where the list's sticky band headers stick: under whatever is covering the top. */
  const stickyTop = mode === 'peek' ? headerH : COMPACT_DATE_BAR_H;

  return { mode, headerRef, headerSx, stickyTop, onScroll, transitionMs: COLLAPSE_MS };
}
