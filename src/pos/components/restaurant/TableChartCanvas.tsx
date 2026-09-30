import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Box } from '@mui/material';
import { md3 } from '../../../theme/tokens';
import { FLOOR_GRID, FLOOR_H, FLOOR_W, type FloorElement, type Room } from '../../data/floor';
import {
  HANDLES,
  centerOf,
  handlesFor,
  moveElement,
  resizeElement,
  rotationFromPointer,
  withRotation,
  type Handle,
} from '../../logic/floor-editor';
import type { TableStatus } from '../../logic/restaurant';
import { FloorElementView } from './FloorPlan';

/**
 * Table Chart's canvas: the room on its grid, and the hands-on part of editing it (V1 → V2).
 *
 * ## One renderer
 *
 * Every element is drawn by `FloorElementView` — the same component the live Tables floor uses —
 * so a table mid-drag here is pixel for pixel what a server will see. v1's founding bug was the
 * editor and the live floor drawing separately; this file adds only what an editor needs on top:
 * the grid, the selection's handles, and the gestures.
 *
 * ## Gestures
 *
 * Pointer events, so a finger and a mouse are the same code. A gesture starts on a pointerdown —
 * on an element (move), a handle (resize) or the rotate knob — and follows the pointer on the
 * window, so a finger that slides off the element keeps dragging it. Each move is computed from
 * where the gesture began, never incrementally, so snapping cannot accumulate drift. The parent
 * records one undo step per gesture, not one per pointermove.
 *
 * Pointer pixels become floor units by measuring the floor's on-screen rectangle at the start of
 * each gesture. That is what makes a drag land correctly when the whole terminal is scaled down in
 * a Storybook tablet preset: the rectangle already includes every transform above it.
 *
 * Tapping an element selects it; tapping the empty floor clears the selection. Which element was
 * tapped is read from the DOM (`[data-floor-element]`), so it honours rotation and stacking exactly
 * as drawn.
 *
 * ## Handles
 *
 * v1's handles were 12px squares with 12px hit areas. Here a handle's visible dot is still small —
 * it should not cover the table — but its hit area is 44px, pushed outward from the element so
 * the body stays draggable. Which handles appear depends on the element's size: see `handlesFor`.
 * Rotation is new in V1 → V2 (v1 could not rotate); the knob sits on a stalk above the top edge,
 * turns with the element, and snaps to 15°.
 */

/** A fingertip. */
const HIT = 44;
/** How far a handle's hit area is pushed outward from the element's edge. */
const OUTSET = 12;
const DOT = 12;
/** The rotate knob's distance above the top edge — clear of the top edge handle's hit area. */
const STALK = 56;
const PAD = 16;

/** Regions under everything, then barriers and labels, tables on top — `FloorPlan`'s order. */
const ORDER = { region: 0, barrier: 1, label: 2, table: 3 } as const;

type Compute = (dx: number, dy: number, at: { x: number; y: number }) => FloorElement;

export function TableChartCanvas({
  room,
  selectedId,
  onSelect,
  onBegin,
  onLive,
  onEnd,
  statusOf,
  badgeOf,
}: {
  room: Room;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** A gesture started: the parent notes the working copy as it was. */
  onBegin: () => void;
  /** The element as the gesture currently has it. */
  onLive: (el: FloorElement) => void;
  /** The gesture ended: the parent records one undo step, if anything changed. */
  onEnd: () => void;
  statusOf?: (el: FloorElement) => TableStatus | undefined;
  badgeOf?: (el: FloorElement) => ReactNode;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const floor = useRef<HTMLDivElement>(null);
  const scale = useLayoutScale(outer);
  const stop = useRef<(() => void) | null>(null);

  // A gesture still running when the canvas goes away (a room switch mid-drag) is ended cleanly.
  useEffect(() => () => stop.current?.(), []);

  const begin = (e: React.PointerEvent, compute: Compute) => {
    const rect = floor.current?.getBoundingClientRect();
    // No `preventDefault`: the press should still move focus, so a half-typed number in the
    // inspector blurs and settles. `touch-action: none` on the floor is what stops scrolling.
    if (!rect || !rect.width) return;
    stop.current?.();
    const k = FLOOR_W / rect.width;
    const sx = e.clientX;
    const sy = e.clientY;
    onBegin();
    const move = (ev: PointerEvent) =>
      onLive(compute((ev.clientX - sx) * k, (ev.clientY - sy) * k, { x: (ev.clientX - rect.left) * k, y: (ev.clientY - rect.top) * k }));
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      stop.current = null;
      onEnd();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    stop.current = end;
  };

  const onFloorDown = (e: React.PointerEvent) => {
    const hit = (e.target as HTMLElement).closest<HTMLElement>('[data-floor-element]');
    const el = hit ? room.elements.find((x) => x.id === hit.dataset.floorElement) : undefined;
    if (!el) {
      onSelect(null);
      return;
    }
    onSelect(el.id);
    begin(e, (dx, dy) => moveElement(el, dx, dy));
  };

  const selected = room.elements.find((e) => e.id === selectedId);
  const elements = [...room.elements].sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  const px = (n: number) => n * scale;

  return (
    <Box
      ref={outer}
      sx={{ flex: 1, minWidth: 0, minHeight: 0, p: `${PAD}px`, bgcolor: md3.surfaceContainer, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    >
      {scale > 0 && (
        <Box
          ref={floor}
          data-floor-canvas={room.id}
          data-floor-scale={scale}
          onPointerDown={onFloorDown}
          sx={{
            position: 'relative',
            width: px(FLOOR_W),
            height: px(FLOOR_H),
            flexShrink: 0,
            bgcolor: '#fff',
            borderRadius: '4px',
            boxShadow: `0 0 0 1px ${md3.outlineVariant}`,
            backgroundImage: `linear-gradient(to right, ${md3.outlineVariant}66 1px, transparent 1px), linear-gradient(to bottom, ${md3.outlineVariant}66 1px, transparent 1px)`,
            backgroundSize: `${px(FLOOR_GRID)}px ${px(FLOOR_GRID)}px`,
            // The canvas owns every touch on it: no scrolling, no pinch-zoom, no text selection.
            touchAction: 'none',
            userSelect: 'none',
            '& [data-floor-element]': { cursor: 'grab' },
          }}
        >
          {elements.map((el) => (
            <FloorElementView
              key={el.id}
              el={el}
              scale={scale}
              status={statusOf?.(el)}
              selected={el.id === selectedId}
              badge={badgeOf?.(el)}
            />
          ))}
          {selected && (
            <SelectionHandles
              el={selected}
              scale={scale}
              onResize={(e, handle) => {
                e.stopPropagation();
                begin(e, (dx, dy) => resizeElement(selected, handle, dx, dy));
              }}
              onRotate={(e) => {
                e.stopPropagation();
                const c = centerOf(selected);
                begin(e, (_dx, _dy, at) => withRotation(selected, rotationFromPointer(c, at)));
              }}
            />
          )}
        </Box>
      )}
    </Box>
  );
}

const HANDLE_NAMES: Record<Handle, string> = {
  nw: 'top-left corner',
  n: 'top edge',
  ne: 'top-right corner',
  e: 'right edge',
  se: 'bottom-right corner',
  s: 'bottom edge',
  sw: 'bottom-left corner',
  w: 'left edge',
};

/**
 * The handles, in a box laid exactly over the selected element and turned with it, so every
 * handle sits on the corner or edge it moves however the element is rotated.
 */
function SelectionHandles({
  el,
  scale,
  onResize,
  onRotate,
}: {
  el: FloorElement;
  scale: number;
  onResize: (e: React.PointerEvent, handle: Handle) => void;
  onRotate: (e: React.PointerEvent) => void;
}) {
  const w = el.w * scale;
  const h = el.h * scale;
  const shown = handlesFor(el, w, h);
  const knob = { touchAction: 'none', pointerEvents: 'auto', position: 'absolute', width: HIT, height: HIT } as const;

  return (
    <Box
      data-floor-selection={el.id}
      sx={{
        position: 'absolute',
        left: el.x * scale,
        top: el.y * scale,
        width: w,
        height: h,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        transformOrigin: 'center center',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {HANDLES.filter((hd) => shown.includes(hd.key)).map((hd) => {
        const ox = (hd.fx - 0.5) * 2 * OUTSET;
        const oy = (hd.fy - 0.5) * 2 * OUTSET;
        return (
          <Box
            key={hd.key}
            role="button"
            aria-label={`Resize from the ${HANDLE_NAMES[hd.key]}`}
            data-floor-handle={hd.key}
            onPointerDown={(e) => onResize(e, hd.key)}
            sx={{ ...knob, left: hd.fx * w - HIT / 2 + ox, top: hd.fy * h - HIT / 2 + oy }}
          >
            <Box
              sx={{
                position: 'absolute',
                left: HIT / 2 - ox - DOT / 2,
                top: HIT / 2 - oy - DOT / 2,
                width: DOT,
                height: DOT,
                borderRadius: '3px',
                bgcolor: md3.primary,
                // A white ring, so a handle stays visible on a dark barrier or a seated table.
                boxShadow: '0 0 0 2px #fff, 0 1px 3px rgba(0,0,0,.3)',
              }}
            />
          </Box>
        );
      })}

      {/* The rotate knob, on a stalk above the top edge. */}
      <Box sx={{ position: 'absolute', left: w / 2 - 1, top: -STALK, width: 2, height: STALK, bgcolor: md3.primary, opacity: 0.6 }} />
      <Box
        role="button"
        aria-label="Rotate"
        data-floor-rotate
        onPointerDown={onRotate}
        sx={{ ...knob, left: w / 2 - HIT / 2, top: -STALK - HIT / 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            bgcolor: '#fff',
            border: `2px solid ${md3.primary}`,
            boxShadow: '0 1px 3px rgba(0,0,0,.3)',
          }}
        />
      </Box>
    </Box>
  );
}

/**
 * The scale that fits the floor into the canvas, from the canvas's **layout** size.
 *
 * Deliberately not `useFitScale` from `floor-style.ts`: that measures `getBoundingClientRect()`,
 * which is the size *after* every transform above it — so inside `Screen`'s scaled-down tablet
 * frame it returns an already-scaled number, and the floor, laid out in that frame's own pixels,
 * is scaled twice. `clientWidth` is untransformed.
 */
function useLayoutScale(ref: RefObject<HTMLElement | null>): number {
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth - PAD * 2;
      const h = el.clientHeight - PAD * 2;
      if (w > 0 && h > 0) setScale(Math.min(w / FLOOR_W, h / FLOOR_H));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return scale;
}
