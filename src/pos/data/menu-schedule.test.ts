import { describe, expect, it } from 'vitest';
import { demoNow } from './bookings';
import { MENUS } from './menu';
import { SCHEDULED_MENUS, isMenuRunning, menuWindow, menusInOrder, notRunningReason, openingMenu, scheduledMenu } from './menu-schedule';

const at = (iso: string) => new Date(iso);

describe("Buck's menus by day and time", () => {
  it('runs the 19th Hole Menu and Lunch at the demo clock (Thursday noon), and nothing else', () => {
    expect(menusInOrder(demoNow()).filter((m) => isMenuRunning(m, demoNow())).map((m) => m.id)).toEqual(['nineteenth-hole-menu', 'lunch']);
  });

  it('opens each screen on the running menu of its own kind', () => {
    expect(openingMenu('counter', demoNow()).title).toBe('19th Hole Menu');
    expect(openingMenu('nineteenth', demoNow()).title).toBe('Lunch');
    expect(openingMenu('nineteenth', at('2026-05-21T18:00:00')).title).toBe('Dinner');
  });

  it('treats the end time as exclusive and keeps to its days and dates', () => {
    const turn = scheduledMenu('turn-stand')!;
    expect(isMenuRunning(turn, at('2026-05-21T15:00:00'))).toBe(true);
    expect(isMenuRunning(turn, at('2026-05-21T18:00:00'))).toBe(false);
    expect(isMenuRunning(turn, at('2026-05-23T16:00:00'))).toBe(false);
    const happy = scheduledMenu('happy-hour')!;
    expect(isMenuRunning(happy, at('2026-11-02T17:00:00'))).toBe(true);
    expect(isMenuRunning(happy, at('2026-05-21T17:00:00'))).toBe(false);
  });

  it('says why a menu is not running, in a server’s words', () => {
    expect(notRunningReason(scheduledMenu('dinner')!, demoNow())).toBe('Starts at 5:00 PM');
    expect(notRunningReason(scheduledMenu('happy-hour')!, demoNow())).toBe('Not until Nov 1');
    expect(notRunningReason(scheduledMenu('turn-stand')!, at('2026-05-23T16:00:00'))).toBe('Mon–Fri only');
    expect(menuWindow(scheduledMenu('happy-hour')!)).toBe('Mon–Fri · 4:20 PM – 6:30 PM · Nov 1 – Dec 31');
  });

  it('only shows categories its set has', () => {
    for (const m of SCHEDULED_MENUS) {
      const cats = MENUS.find((x) => x.id === m.set)!.categories;
      expect(m.categories.length).toBeGreaterThan(0);
      for (const c of m.categories) expect(cats).toContain(c);
    }
  });
});
