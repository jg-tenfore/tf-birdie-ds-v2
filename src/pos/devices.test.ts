import { describe, expect, it } from 'vitest';
import { mobile, shell } from '../theme/tokens';
import {
  CANVAS_DEVICE,
  DEFAULT_DEVICE,
  DEVICES,
  DEVICE_IDS,
  device,
  fitScale,
  frameClass,
  groupedDevices,
  isDeviceId,
} from './devices';

/**
 * The device list is the contract between the prototype's picker, Storybook's Device toolbar
 * and the site build. These guard the arithmetic a typo would quietly break: a viewport that
 * isn't the panel divided by its pixel ratio simulates a device nobody owns.
 */

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

describe('device profiles', () => {
  it('lists every id exactly once', () => {
    expect(DEVICES.map((d) => d.id).sort()).toEqual([...DEVICE_IDS].sort());
    expect(isDeviceId('clover-mini')).toBe(true);
    expect(isDeviceId('ipad')).toBe(false);
    expect(isDeviceId(undefined)).toBe(false);
  });

  it('simulates hardware as its panel divided by its pixel ratio', () => {
    for (const d of DEVICES.filter((p) => p.physical)) {
      expect(d.viewport.width * d.pixelRatio, d.id).toBe(d.physical!.width);
      expect(d.viewport.height * d.pixelRatio, d.id).toBe(d.physical!.height);
    }
  });

  it('names each hardware aspect ratio correctly, the way people say it (16:10, not 8:5)', () => {
    for (const d of DEVICES.filter((p) => p.physical)) {
      const { width, height } = d.physical!;
      const [a, b] = d.aspect.split(':').map(Number);
      expect(width * b, d.id).toBe(height * a);
      // Never more reduced than the conventional name: at most a factor of two from lowest terms.
      expect(gcd(a, b), d.id).toBeLessThanOrEqual(2);
    }
  });

  it('keeps the terminals landscape and the handhelds portrait', () => {
    for (const d of DEVICES) {
      if (d.form === 'tablet') expect(d.viewport.width, d.id).toBeGreaterThan(d.viewport.height);
      else expect(d.viewport.height, d.id).toBeGreaterThan(d.viewport.width);
    }
  });

  it('keeps the design canvases at the frames the screens were drawn on', () => {
    expect(device(CANVAS_DEVICE.tablet).viewport).toEqual({ width: shell.width, height: shell.height });
    expect(device(CANVAS_DEVICE.handheld).viewport).toEqual(mobile.frame);
  });

  it('opens the tablet on the Clover Mini and the phone on the Quest, the priority device', () => {
    expect(DEFAULT_DEVICE).toEqual({ tablet: 'clover-mini', handheld: 'quest-handheld' });
  });

  it('groups terminals, then handhelds, then canvases', () => {
    expect(groupedDevices().map((g) => g.label)).toEqual(['Counter terminals', 'Handhelds', 'Design canvases']);
  });
});

describe('fitScale', () => {
  const mini = { width: 1280, height: 800 };
  it('never scales up', () => {
    expect(fitScale(mini, { width: 2560, height: 1600 }, 16)).toBe(1);
  });
  it('shows a device edge to edge in a window exactly its size', () => {
    expect(fitScale(mini, { width: 1280, height: 800 }, 16)).toBe(1);
  });
  it('scales down by the tighter side, inside the margin', () => {
    expect(fitScale({ width: 1920, height: 1080 }, { width: 1456, height: 900 }, 16)).toBeCloseTo((1456 - 32) / 1920);
    expect(fitScale({ width: 1920, height: 1080 }, { width: 2400, height: 900 }, 16)).toBeCloseTo((900 - 32) / 1080);
  });
});

describe('frameClass', () => {
  it('reads the large display as wide and the Clover Mini as compact', () => {
    expect(frameClass(device('large-display').viewport)).toEqual({ wide: true, compact: false });
    expect(frameClass(device('clover-mini').viewport)).toEqual({ wide: false, compact: true });
    expect(frameClass(device('tablet-canvas').viewport)).toEqual({ wide: false, compact: false });
  });
});
