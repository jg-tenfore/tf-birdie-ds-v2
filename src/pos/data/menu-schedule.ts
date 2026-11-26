import { MENUS, type MenuId } from './menu';

/**
 * The restaurant's menus **by day and time**, as TF Buck schedules them (Nov 26).
 *
 * ## Buck's model
 *
 * Buck › Products › Menus (`tf-buck-ds-v1/src/components/application/products-oct-27/data.ts`)
 * gives every menu a title, an optional date range, a start and end time, and the days it runs:
 * *Dinner* 5–9 PM every day, *Happy Hour* 4:20–6:30 PM weekdays in November and December, the
 * *19th Hole Menu* all day, the *Turn Stand* weekday afternoons, a *Member-Guest Weekend* menu for
 * two days. A register shows what is running **now**.
 *
 * ## How Birdie maps onto it
 *
 * Birdie already has two menu *sets* — the counter's grill and bar, and the 19th Hole dining room
 * (`MENUS` in `menu.ts`). A Buck menu here is a window onto one of them: its categories, on its
 * days, at its hours. So a dish has one price and one id whichever menu rang it, and the kitchen,
 * the tab and the bill never need to know which menu was showing.
 *
 * Buck's five titles and windows are kept as Buck has them. **Lunch is Birdie's addition** — Buck's
 * sample has no dining-room menu before 5 PM, and the demo's clock reads noon, so without it the
 * dining room would open on a menu that is not running. It is flagged in `buck-sources.ts`.
 *
 * ## Which one a screen opens on
 *
 * The menus running at the demo's clock (`demoNow()`, Thursday 12:00 PM): the *19th Hole Menu*
 * and *Lunch*. Quick Order prefers the counter's set, a table's tab the dining room's, so each
 * opens on the running menu of its own kind (`openingMenu`). Every other menu is one tap away and
 * says when it runs — the counter sometimes rings an item off a menu that is not up yet.
 */

export type Weekday = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
export const WEEKDAYS: Weekday[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_MON_FRI: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export interface ScheduledMenu {
  id: string;
  /** Buck's menu number (Products › Menus › #). Lunch has none: it is not in Buck. */
  buckId?: number;
  title: string;
  /** The Birdie menu set it sells from. */
  set: MenuId;
  /** The set's categories it shows, in the set's order. */
  categories: string[];
  /** `YYYY-MM-DD`, inclusive. Absent: no date limit. */
  startDate?: string;
  endDate?: string;
  /** `HH:MM`, 24-hour, as Buck stores them. The end is exclusive. */
  startTime: string;
  endTime: string;
  days: Weekday[];
}

const set = (id: MenuId) => MENUS.find((m) => m.id === id)!.categories;
const only = (id: MenuId, keep: string[]) => set(id).filter((c) => keep.includes(c));

export const SCHEDULED_MENUS: ScheduledMenu[] = [
  { id: 'nineteenth-hole-menu', buckId: 4, title: '19th Hole Menu', set: 'counter', categories: set('counter'), startTime: '08:00', endTime: '21:00', days: WEEKDAYS },
  {
    id: 'lunch',
    title: 'Lunch',
    set: 'nineteenth',
    categories: only('nineteenth', ['Starters', 'Salads', 'Steaks', 'Sides', 'Sauces', 'Desserts']),
    startTime: '11:00',
    endTime: '16:00',
    days: WEEKDAYS,
  },
  { id: 'dinner', buckId: 3, title: 'Dinner', set: 'nineteenth', categories: set('nineteenth'), startTime: '17:00', endTime: '21:00', days: WEEKDAYS },
  {
    id: 'turn-stand',
    buckId: 37,
    title: 'Turn Stand',
    set: 'counter',
    categories: only('counter', ['Grill', 'Snacks', 'Drinks', 'Beer']),
    startTime: '15:00',
    endTime: '18:00',
    days: WEEKDAYS_MON_FRI,
  },
  {
    id: 'happy-hour',
    buckId: 6,
    title: 'Happy Hour',
    set: 'counter',
    categories: only('counter', ['Beer', 'Wine']),
    startDate: '2026-11-01',
    endDate: '2026-12-31',
    startTime: '16:20',
    endTime: '18:30',
    days: WEEKDAYS_MON_FRI,
  },
  {
    id: 'member-guest-weekend',
    buckId: 92,
    title: 'Member-Guest Weekend',
    set: 'counter',
    categories: only('counter', ['Grill', 'Burgers', 'Drinks', 'Beer', 'Wine']),
    startDate: '2026-11-14',
    endDate: '2026-11-15',
    startTime: '07:00',
    endTime: '19:00',
    days: ['Sat', 'Sun'],
  },
];

export const scheduledMenu = (id: string): ScheduledMenu | undefined => SCHEDULED_MENUS.find((m) => m.id === id);

const minutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Whether a menu is running at `at`: on one of its days, inside its dates, between its times. */
export function isMenuRunning(m: ScheduledMenu, at: Date): boolean {
  if (!m.days.includes(WEEKDAYS[at.getDay()])) return false;
  const day = ymd(at);
  if (m.startDate && day < m.startDate) return false;
  if (m.endDate && day > m.endDate) return false;
  const now = at.getHours() * 60 + at.getMinutes();
  return now >= minutes(m.startTime) && now < minutes(m.endTime);
}

/** "17:00" → "5:00 PM", as Buck's list prints a time. */
export function time12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

const dayRange = (days: Weekday[]): string => {
  if (days.length === 7) return 'Daily';
  if (days.join() === WEEKDAYS_MON_FRI.join()) return 'Mon–Fri';
  return days.join(', ');
};

const shortDate = (d: string): string =>
  new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** "Mon–Fri · 4:20 PM – 6:30 PM · Nov 1 – Dec 31" — when a menu runs, in one line. */
export function menuWindow(m: ScheduledMenu): string {
  const parts = [dayRange(m.days), `${time12(m.startTime)} – ${time12(m.endTime)}`];
  if (m.startDate && m.endDate) parts.push(m.startDate === m.endDate ? shortDate(m.startDate) : `${shortDate(m.startDate)} – ${shortDate(m.endDate)}`);
  return parts.join(' · ');
}

/**
 * Why a menu is not running at `at`, in the words a server needs: "Starts at 5:00 PM", "Mon–Fri
 * only", "Not until Nov 1". `null` when it is running.
 */
export function notRunningReason(m: ScheduledMenu, at: Date): string | null {
  if (isMenuRunning(m, at)) return null;
  const day = ymd(at);
  if (m.startDate && day < m.startDate) return `Not until ${shortDate(m.startDate)}`;
  if (m.endDate && day > m.endDate) return `Ended ${shortDate(m.endDate)}`;
  if (!m.days.includes(WEEKDAYS[at.getDay()])) return `${dayRange(m.days)} only`;
  const now = at.getHours() * 60 + at.getMinutes();
  return now < minutes(m.startTime) ? `Starts at ${time12(m.startTime)}` : `Closed at ${time12(m.endTime)}`;
}

/** The menus running at `at`, then the rest — the order a switcher lists them in. */
export function menusInOrder(at: Date): ScheduledMenu[] {
  const running = SCHEDULED_MENUS.filter((m) => isMenuRunning(m, at));
  return [...running, ...SCHEDULED_MENUS.filter((m) => !running.includes(m))];
}

/**
 * The menu a screen opens on: the first running menu of the set it prefers, else any running menu,
 * else the first of its set — so a screen always opens on *something*, and on what is running when
 * anything is.
 */
export function openingMenu(prefer: MenuId, at: Date): ScheduledMenu {
  const running = SCHEDULED_MENUS.filter((m) => isMenuRunning(m, at));
  return running.find((m) => m.set === prefer) ?? running[0] ?? SCHEDULED_MENUS.find((m) => m.set === prefer)!;
}
