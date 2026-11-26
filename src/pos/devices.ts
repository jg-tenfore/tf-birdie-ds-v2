import { mobile, shell } from '../theme/tokens';

/**
 * The hardware Birdie runs on, as the prototype and Storybook simulate it.
 *
 * Only the **aspect ratio** of each device matters here. The design keeps its own density on
 * every one of them — dense 12–14px controls on a counter terminal, MD3 touch sizing on a
 * handheld — so a device is simulated as a CSS viewport at the size the browser on that
 * hardware actually lays out at: the terminals at 1×, the handhelds at 2× (an XHDPI Android
 * handheld renders a 720px-wide panel as a 360px-wide CSS viewport).
 *
 * The two **design canvases** are the frames every screen was drawn on before devices
 * existed — 1366×840 for the tablet, 402×797 for the phone. They stay in the list so a story
 * or a screenshot can still be compared against the size it was designed at, and they are
 * what renders when nothing chooses a device (see `device-context.tsx`).
 *
 * Nothing in here imports React, so the unit tests and the site build can read it too.
 */

/** Which app a device runs: the counter-terminal tablet POS, or the phone app on a handheld. */
export type DeviceForm = 'tablet' | 'handheld';

/** How the device dropdowns group the list. */
export type DeviceGroup = 'terminal' | 'handheld' | 'canvas';

export const DEVICE_GROUP_LABELS: Record<DeviceGroup, string> = {
  terminal: 'Counter terminals',
  handheld: 'Handhelds',
  canvas: 'Design canvases',
};

export interface Size {
  width: number;
  height: number;
}

export interface DeviceProfile {
  id: DeviceId;
  /** The full name, as the dropdowns show it. */
  label: string;
  /** A short name for tight places — a toolbar title, a screenshot caption. */
  shortLabel: string;
  form: DeviceForm;
  group: DeviceGroup;
  /** Diagonal screen size, e.g. `8″`. Null for a design canvas, which is not hardware. */
  diagonal: string | null;
  /** The panel's native resolution in device pixels. Null for a design canvas. */
  physical: Size | null;
  /** The CSS viewport the app lays out at — what the frame is sized to. */
  viewport: Size;
  /** Device pixels per CSS pixel: `physical / viewport`. 1 for a canvas. */
  pixelRatio: number;
  /** The aspect ratio, reduced and written the way people say it (`16:10`, `9:20`). */
  aspect: string;
  /** One line about the device: what it is, where it sits, why it is in the list. */
  note: string;
}

export const DEVICE_IDS = [
  'clover-mini',
  'large-display',
  'tablet-canvas',
  'quest-handheld',
  'clover-flex',
  'phone-canvas',
] as const;

export type DeviceId = (typeof DEVICE_IDS)[number];

export const isDeviceId = (v: unknown): v is DeviceId =>
  typeof v === 'string' && (DEVICE_IDS as readonly string[]).includes(v);

/** In dropdown order: terminals, handhelds, then the two canvases. */
export const DEVICES: readonly DeviceProfile[] = [
  {
    id: 'clover-mini',
    label: 'Clover Mini · 8″',
    shortLabel: 'Clover Mini',
    form: 'tablet',
    group: 'terminal',
    diagonal: '8″',
    physical: { width: 1280, height: 800 },
    viewport: { width: 1280, height: 800 },
    pixelRatio: 1,
    aspect: '16:10',
    note: 'The counter terminal most clubs run. The tablet prototype opens on it.',
  },
  {
    id: 'large-display',
    label: 'Large display · 21.5″',
    shortLabel: 'Large display',
    form: 'tablet',
    group: 'terminal',
    diagonal: '21.5″',
    physical: { width: 1920, height: 1080 },
    viewport: { width: 1920, height: 1080 },
    pixelRatio: 1,
    aspect: '16:9',
    note: 'The outlier: an all-in-one counter display. The extra room goes to more tee-sheet rows, more register tiles and wider panels — not bigger controls.',
  },
  {
    id: 'quest-handheld',
    label: 'Quest handheld · 6.5″',
    shortLabel: 'Quest handheld',
    form: 'handheld',
    group: 'handheld',
    diagonal: '6.5″',
    physical: { width: 720, height: 1600 },
    viewport: { width: 360, height: 800 },
    pixelRatio: 2,
    aspect: '9:20',
    note: 'The priority device: the handheld staff carry on the course and at the counter. The phone prototype opens on it.',
  },
  {
    id: 'clover-flex',
    label: 'Clover Flex · 5.99″',
    shortLabel: 'Clover Flex',
    form: 'handheld',
    group: 'handheld',
    diagonal: '5.99″',
    physical: { width: 720, height: 1440 },
    viewport: { width: 360, height: 720 },
    pixelRatio: 2,
    aspect: '1:2',
    note: 'The card-reader handheld. The shortest screen Birdie runs on — 80px less height than the Quest.',
  },
  {
    id: 'tablet-canvas',
    label: 'Design canvas · tablet 1366×840',
    shortLabel: 'Tablet canvas',
    form: 'tablet',
    group: 'canvas',
    diagonal: null,
    physical: null,
    viewport: { width: shell.width, height: shell.height },
    pixelRatio: 1,
    aspect: '≈ 1.63:1',
    note: 'The frame the tablet screens were designed on. Every tablet story renders here unless a device is chosen.',
  },
  {
    id: 'phone-canvas',
    label: 'Design canvas · phone 402×797',
    shortLabel: 'Phone canvas',
    form: 'handheld',
    group: 'canvas',
    diagonal: null,
    physical: null,
    viewport: { width: mobile.frame.width, height: mobile.frame.height },
    pixelRatio: 1,
    aspect: '≈ 1:1.98',
    note: 'The frame the phone screens were designed on. Every phone story renders here unless a device is chosen.',
  },
];

const BY_ID = new Map(DEVICES.map((d) => [d.id, d]));

export const device = (id: DeviceId): DeviceProfile => BY_ID.get(id)!;

/** What each app opens on when nothing in the URL or local storage says otherwise. */
export const DEFAULT_DEVICE: Record<DeviceForm, DeviceId> = {
  tablet: 'clover-mini',
  handheld: 'quest-handheld',
};

/** The design canvas per form — what renders with no device chosen. */
export const CANVAS_DEVICE: Record<DeviceForm, DeviceId> = {
  tablet: 'tablet-canvas',
  handheld: 'phone-canvas',
};

/** The devices in dropdown order, grouped. Empty groups are dropped. */
export function groupedDevices(): Array<{ group: DeviceGroup; label: string; devices: DeviceProfile[] }> {
  return (Object.keys(DEVICE_GROUP_LABELS) as DeviceGroup[])
    .map((group) => ({
      group,
      label: DEVICE_GROUP_LABELS[group],
      devices: DEVICES.filter((d) => d.group === group),
    }))
    .filter((g) => g.devices.length > 0);
}

/** `1280×800`. */
export const formatSize = ({ width, height }: Size): string => `${width}×${height}`;

/**
 * The scale that fits a frame inside a box, never above 1: a device blown up past its real
 * size stops showing the type sizes and touch targets under review.
 */
export function fitScale(frame: Size, box: Size, margin = 0): number {
  const w = box.width - margin * 2;
  const h = box.height - margin * 2;
  if (w <= 0 || h <= 0) return 1;
  // A box that holds the frame at 1:1 renders it at 1:1, even when the margin would not fit
  // as well — a window sized exactly to the device shows the device edge to edge.
  if (box.width >= frame.width && box.height >= frame.height) return 1;
  return Math.min(1, w / frame.width, h / frame.height);
}

/**
 * Layout breakpoints a frame can be measured against, so components size by the room the
 * device gives them rather than by which device it is. `wide` is the large display: room for
 * more columns, more tiles and a wider panel; `compact` is anything shorter or narrower than
 * the design canvas, where fixed blocks have to give a little.
 */
export const frameClass = (size: Size): { wide: boolean; compact: boolean } => ({
  wide: size.width >= 1600,
  compact: size.width < shell.width || size.height < shell.height,
});
