import { DEFAULT_DEVICE, device, isDeviceId } from '../pos/devices';
import type { DeviceForm, DeviceId } from '../pos/devices';
import { ARCHIVED_EDITION, CURRENT_EDITION } from '../pos/edition';
import type { Edition } from '../pos/edition';
import type { VenueId } from '../pos/data/venues';

/**
 * Which device a prototype shows, where that choice lives, and how to reach the other app.
 *
 * The choice is kept in two places, read in this order:
 *
 * 1. **`?device=` in the URL** — so a link carries it. It sits in the query, not the hash,
 *    because both apps route on the hash.
 * 2. **Local storage**, one key per app — so a reload, or a link without one, opens on the
 *    device you last looked at.
 *
 * then the app's default: the Clover Mini for the tablet, the Quest handheld (the priority
 * device) for the phone. A device of the other form found in either place is ignored rather
 * than obeyed — the tablet app cannot render a handheld, and bouncing between apps on load is
 * worse than opening on the default. Choosing one from the picker is what switches apps.
 *
 * Pure functions over strings, so the unit tests can pin the rules without a browser.
 */

export const STORAGE_KEYS = {
  device: { tablet: 'birdie.prototype.device.tablet', handheld: 'birdie.prototype.device.handheld' },
  fit: 'birdie.prototype.fit',
  open: 'birdie.prototype.presenter-open',
} as const;

/** The device an app opens on. */
export function initialDevice(form: DeviceForm, search: string, stored: string | null): DeviceId {
  const fromUrl = new URLSearchParams(search).get('device');
  if (isDeviceId(fromUrl) && device(fromUrl).form === form) return fromUrl;
  if (isDeviceId(stored) && device(stored).form === form) return stored;
  return DEFAULT_DEVICE[form];
}

/** `?presenter=0` hides the device panel — for clean screenshots of the frame alone. */
export function presenterHidden(search: string): boolean {
  const v = new URLSearchParams(search).get('presenter');
  return v === '0' || v === 'false' || v === 'off' || v === 'hide';
}

/** The same URL with `?device=` set, its hash untouched. */
export function withDeviceParam(href: string, id: DeviceId): string {
  const url = new URL(href);
  url.searchParams.set('device', id);
  return url.toString();
}

/**
 * The club a page is showing: the hash's `?venue=` (the tablet's deep links carry it there),
 * then the query's (the phone's, and the redirects from the old per-club paths), then the
 * build's own.
 */
export function currentVenue(search: string, hash: string, fallback: VenueId, isVenue: (v: string) => v is VenueId): VenueId {
  const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  for (const q of [hashQuery, search.replace(/^\?/, '')]) {
    const v = new URLSearchParams(q).get('venue');
    if (v && isVenue(v)) return v;
  }
  return fallback;
}

/**
 * The edition the other app should open in. The archive stays the archive; anything current
 * becomes the other app's current edition — the tablet's is V1 → V2, which has no phone build,
 * so the phone's is Weston Edits (see `CURRENT_EDITION`).
 */
export function pairedEdition(edition: Edition, target: DeviceForm): Edition {
  if (edition === ARCHIVED_EDITION) return ARCHIVED_EDITION;
  return target === 'tablet' ? CURRENT_EDITION.tablet : CURRENT_EDITION.mobile;
}

/**
 * The other app, on the chosen device, at the same club and in the matching edition.
 *
 * - **Dev**, one server hosts both: the tablet at `/`, the phone at `/mobile/`. The edition
 *   rides along whenever the page named one, or when it is the archive (dev's default is the
 *   current Birdie, so the archive has to be asked for).
 * - **Built**, each app is its own directory and the current and archive builds are siblings
 *   in pairs (`/prototype/` ↔ `/mobile/`, `/archive/prototype/` ↔ `/archive/mobile/`), so the
 *   other app is always `../<dir>/` from this one and its edition is already baked in. An
 *   edition named in the URL still carries over, mapped.
 */
export function otherAppHref({
  target,
  deviceId,
  search,
  edition,
  venue,
  dev,
}: {
  target: DeviceForm;
  deviceId: DeviceId;
  /** The current page's `location.search`. */
  search: string;
  /** The edition the current page renders. */
  edition: Edition;
  venue: VenueId;
  dev: boolean;
}): string {
  const q = new URLSearchParams();
  const named = new URLSearchParams(search).has('edition');
  if (named || (dev && edition === ARCHIVED_EDITION)) q.set('edition', pairedEdition(edition, target));
  q.set('venue', venue);
  q.set('device', deviceId);
  const path = dev ? (target === 'tablet' ? '/' : '/mobile/') : target === 'tablet' ? '../prototype/' : '../mobile/';
  return `${path}?${q.toString()}`;
}
