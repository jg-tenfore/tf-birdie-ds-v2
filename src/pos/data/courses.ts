import type { Course, TeeSheetSettings, TimeSlot } from '../types';

/**
 * Course and time-grid configuration, ported verbatim from the prototype.
 *
 * This club runs three parallel nine-hole tracks. Each is a column group on the
 * tee sheet, `slots` wide — so the default grid is 3 courses × 4 players = 12
 * bookable cells per time row.
 */
export const COURSES: Course[] = [
  {id:'ponds',  name:'Ponds (to Woods)', holes:'9 HOLES', slots:4, visible:true, locked:false, note:'', indScroll:false},
  {id:'valley', name:'Front Valley',     holes:'9 HOLES', slots:4, visible:true, locked:false, note:'', indScroll:false},
  {id:'rolling',name:'Rolling',          holes:'9 HOLES', slots:4, visible:true, locked:false, note:'', indScroll:false},
];

/**
 * Default tee-sheet display settings.
 *
 * `intervalMins: 8` over a 6am–6pm window yields 91 time rows, which is what
 * makes the grid scroll. Changing the interval or the hour bounds rebuilds the
 * row set — see `generateTimes`.
 */
export const DEFAULT_TEE_SHEET_SETTINGS: TeeSheetSettings = {
  slots:          4,
  compactMode:    false,
  hideEmpty:      false,
  intervalMins:   8,
  gridStartHour:  6,
  gridEndHour:    18,
  autoScrollNow:  true,
  colorblindMode: false,
};

/**
 * Build the tee-sheet rows for a given settings object.
 *
 * The end hour includes its top-of-hour row, so a 6→18 window ends on a 6:00 PM
 * row rather than 5:52 PM.
 */
export function generateTimes(
  settings: Pick<
    TeeSheetSettings,
    'gridStartHour' | 'gridEndHour' | 'intervalMins'
  > = DEFAULT_TEE_SHEET_SETTINGS,
): TimeSlot[] {
  const t: TimeSlot[] = [];
  let h = settings.gridStartHour;
  let m = 0;
  const interval = settings.intervalMins;
  while (h < settings.gridEndHour || (h === settings.gridEndHour && m === 0)) {
    t.push({
      h,
      m,
      totalMin: h * 60 + m,
      label: `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`,
    });
    m += interval;
    if (m >= 60) {
      m -= 60;
      h++;
    }
  }
  return t;
}

/** The default row set: 6:00 AM – 6:00 PM at 8-minute intervals. */
export const TIMES: TimeSlot[] = generateTimes();

/**
 * Round pricing by booking status, used to build the cart when a tee time is
 * loaded from the sheet. `member` prices at zero and records the forgone revenue
 * as `memberDiscount`, so the receipt still shows the benefit that was applied.
 */
export const TEE_PRICES: Record<string, Record<string, number>> = {
  booked: {basePrice:100, cartFee:20, tax:3},
  member: {basePrice:0,   memberDiscount:-50, cartFee:20, tax:3},
  walkin: {basePrice:59,  cartFee:18, tax:2.5},
  checkedin: {basePrice:59, cartFee:18, tax:2.5},
  group:  {basePrice:120, cartFee:20, tax:4},
};

/**
 * Published rate card by time-of-day band, shown read-only in a course's Tee
 * Time Prices panel. `discount: 100` marks a fully-comped membership rate;
 * `rack: true` flags the non-resident rate that anchors the card.
 */
export const RATE_PRICING: Record<
  string,
  Array<{ rate: string; p18: number; p9: number; discount?: number; rack?: boolean }>
> = {
  early: [
    { rate:'Weekday Resident',           p18:46, p9:29 },
    { rate:'Weekday Senior Resident',    p18:43, p9:27 },
    { rate:'Weekday Junior',             p18:32, p9:17 },
    { rate:'Membership Weekday',         p18:0,  p9:0,  discount:100 },
    { rate:'Membership 7 Days',          p18:0,  p9:0,  discount:100 },
    { rate:'Junior Membership Weekday',  p18:0,  p9:0,  discount:100 },
    { rate:'Employee',                   p18:0,  p9:0 },
    { rate:'Family Full Membership',     p18:0,  p9:0,  discount:100 },
    { rate:'Family Weekday',             p18:0,  p9:0,  discount:100 },
    { rate:'Weekday Non Resident',       p18:54, p9:34, rack:true },
  ],
  peak: [
    { rate:'Weekday Resident',           p18:58, p9:36 },
    { rate:'Weekday Senior Resident',    p18:53, p9:33 },
    { rate:'Weekday Junior',             p18:38, p9:22 },
    { rate:'Membership Weekday',         p18:0,  p9:0,  discount:100 },
    { rate:'Membership 7 Days',          p18:0,  p9:0,  discount:100 },
    { rate:'Junior Membership Weekday',  p18:0,  p9:0,  discount:100 },
    { rate:'Employee',                   p18:0,  p9:0 },
    { rate:'Family Full Membership',     p18:0,  p9:0,  discount:100 },
    { rate:'Family Weekday',             p18:14, p9:8,  discount:50 },
    { rate:'Weekday Non Resident',       p18:72, p9:46, rack:true },
  ],
  twilight: [
    { rate:'Weekday Resident',           p18:34, p9:21 },
    { rate:'Weekday Senior Resident',    p18:32, p9:19 },
    { rate:'Weekday Junior',             p18:22, p9:12 },
    { rate:'Membership Weekday',         p18:0,  p9:0,  discount:100 },
    { rate:'Membership 7 Days',          p18:0,  p9:0,  discount:100 },
    { rate:'Junior Membership Weekday',  p18:0,  p9:0,  discount:100 },
    { rate:'Employee',                   p18:0,  p9:0 },
    { rate:'Family Full Membership',     p18:0,  p9:0,  discount:100 },
    { rate:'Family Weekday',             p18:0,  p9:0,  discount:100 },
    { rate:'Weekday Non Resident',       p18:42, p9:26, rack:true },
  ],
};

/** Format minutes-from-midnight as a 12-hour label: `428` → `'7:08 AM'`. */
export function formatTimeLabel(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

/** Parse a `'7:08 AM'` label back to minutes-from-midnight; null if unparseable. */
export function parseTimeLabel(s: string): number | null {
  const m = s.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mn = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + mn;
}

/** `YYYY-MM-DD` for a Date, in local time — the tee sheet is never UTC. */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
