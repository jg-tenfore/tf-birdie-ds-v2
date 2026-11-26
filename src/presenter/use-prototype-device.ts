import { useCallback, useEffect, useState } from 'react';
import { buildVenue, isVenueId } from '../pos/data/venues';
import { device } from '../pos/devices';
import type { DeviceForm, DeviceId, Size } from '../pos/devices';
import { buildEdition } from '../pos/edition';
import { STORAGE_KEYS, currentVenue, initialDevice, otherAppHref, presenterHidden, withDeviceParam } from './device-choice';

/**
 * The device state behind a prototype's presenter panel — see `device-choice.ts` for where the
 * choice is read from and written to.
 */

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be refused (private windows); the URL still carries the choice.
  }
}

export function usePrototypeDevice(form: DeviceForm) {
  const [deviceId, setDeviceId] = useState<DeviceId>(() =>
    initialDevice(form, window.location.search, stored(STORAGE_KEYS.device[form])),
  );
  const [fit, setFitState] = useState(() => stored(STORAGE_KEYS.fit) !== '0');
  const [hidden] = useState(() => presenterHidden(window.location.search));

  // The URL always names the device on screen, so the address bar is a link to exactly this.
  // `replaceState` keeps the hash (both apps route on it) and adds no history entry.
  useEffect(() => {
    const next = withDeviceParam(window.location.href, deviceId);
    if (next !== window.location.href) window.history.replaceState(window.history.state, '', next);
    store(STORAGE_KEYS.device[form], deviceId);
  }, [deviceId, form]);

  const setFit = useCallback((v: boolean) => {
    setFitState(v);
    store(STORAGE_KEYS.fit, v ? '1' : '0');
  }, []);

  /** A device of the other form: the other app, on that device, same club and edition. */
  const switchApp = useCallback(
    (id: DeviceId) => {
      const target = device(id).form;
      if (target === form) {
        setDeviceId(id);
        return;
      }
      store(STORAGE_KEYS.device[target], id);
      window.location.href = otherAppHref({
        target,
        deviceId: id,
        search: window.location.search,
        edition: buildEdition(),
        venue: currentVenue(window.location.search, window.location.hash, buildVenue(), isVenueId),
        dev: import.meta.env.DEV,
      });
    },
    [form],
  );

  return { deviceId, setDevice: setDeviceId, switchApp, fit, setFit, hidden };
}

/** The window's inner size, kept current. */
export function useWindowSize(): Size {
  const read = (): Size => ({ width: window.innerWidth, height: window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const onResize = () => setSize(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}
