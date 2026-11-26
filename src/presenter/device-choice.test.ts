import { describe, expect, it } from 'vitest';
import { isVenueId } from '../pos/data/venues';
import { currentVenue, initialDevice, otherAppHref, pairedEdition, presenterHidden, withDeviceParam } from './device-choice';

/**
 * The prototype's device picker keeps its choice in the URL and local storage and moves
 * between the two apps. These pin the rules a shared link depends on.
 */

describe('initialDevice', () => {
  it('reads ?device= first, then storage, then the app default', () => {
    expect(initialDevice('tablet', '?device=large-display', 'clover-mini')).toBe('large-display');
    expect(initialDevice('tablet', '', 'large-display')).toBe('large-display');
    expect(initialDevice('tablet', '', null)).toBe('clover-mini');
    expect(initialDevice('handheld', '', null)).toBe('quest-handheld');
  });

  it('ignores a device the app cannot render instead of bouncing to the other app', () => {
    expect(initialDevice('tablet', '?device=quest-handheld', null)).toBe('clover-mini');
    expect(initialDevice('handheld', '?device=clover-mini', 'large-display')).toBe('quest-handheld');
    expect(initialDevice('tablet', '?device=ipad', null)).toBe('clover-mini');
  });
});

describe('presenterHidden', () => {
  it('hides the panel for ?presenter=0 only', () => {
    expect(presenterHidden('?presenter=0')).toBe(true);
    expect(presenterHidden('?device=clover-mini&presenter=false')).toBe(true);
    expect(presenterHidden('?presenter=1')).toBe(false);
    expect(presenterHidden('')).toBe(false);
  });
});

describe('withDeviceParam', () => {
  it('sets the device in the query and keeps the hash', () => {
    expect(withDeviceParam('https://x.test/prototype/?venue=nine#/tee-sheet?res=p1', 'large-display')).toBe(
      'https://x.test/prototype/?venue=nine&device=large-display#/tee-sheet?res=p1',
    );
  });
});

describe('currentVenue', () => {
  it('prefers the hash, then the query, then the build', () => {
    expect(currentVenue('?venue=nine', '#/tee-sheet?venue=three-nines', 'eighteen', isVenueId)).toBe('three-nines');
    expect(currentVenue('?venue=nine', '#/tee-sheet', 'eighteen', isVenueId)).toBe('nine');
    expect(currentVenue('', '', 'eighteen', isVenueId)).toBe('eighteen');
    expect(currentVenue('?venue=moon', '', 'eighteen', isVenueId)).toBe('eighteen');
  });
});

describe('otherAppHref', () => {
  it('maps the current edition to the other app’s current, and keeps the archive', () => {
    expect(pairedEdition('v1v2', 'handheld')).toBe('v1v2');
    expect(pairedEdition('weston', 'tablet')).toBe('v1v2');
    expect(pairedEdition('weston', 'handheld')).toBe('v1v2');
    expect(pairedEdition('base', 'handheld')).toBe('base');
  });

  it('in dev, goes to the other path on the one server', () => {
    expect(
      otherAppHref({ target: 'handheld', deviceId: 'quest-handheld', search: '', edition: 'v1v2', venue: 'eighteen', dev: true }),
    ).toBe('/mobile/?venue=eighteen&device=quest-handheld');
    expect(
      otherAppHref({ target: 'tablet', deviceId: 'clover-mini', search: '?edition=base', edition: 'base', venue: 'nine', dev: true }),
    ).toBe('/?edition=base&venue=nine&device=clover-mini');
  });

  it('built, goes to the sibling build, which already has its edition', () => {
    expect(
      otherAppHref({ target: 'handheld', deviceId: 'clover-flex', search: '', edition: 'base', venue: 'three-nines', dev: false }),
    ).toBe('../mobile/?venue=three-nines&device=clover-flex');
    expect(
      otherAppHref({ target: 'tablet', deviceId: 'large-display', search: '?edition=weston', edition: 'weston', venue: 'eighteen', dev: false }),
    ).toBe('../prototype/?edition=v1v2&venue=eighteen&device=large-display');
  });
});
