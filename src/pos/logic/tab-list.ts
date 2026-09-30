import { allTables, type Room } from '../data/floor';
import { staffById, type StaffMember } from '../data/staff';
import { tabTotal, tableLabel, unsent, type Tab } from './restaurant';

/**
 * The open-tabs list (V1 → V2, Wave 2): what a row says, and how rows sort and group. Pure, so
 * the screen and the tests agree on what "the table waiting longest" means.
 *
 * ## What v1 did
 *
 * v1's list (`tf-birdie-ds-v1/app/src/screens/tabs.tsx`) had no sort, no grouping and no status.
 * The tab's own name sat on the left at 20px; the server, the order number and the time were a
 * 12px block far to the right; and every row led with the same antler logo, so the first column
 * carried no information at all. A server looking for "my table that asked for the check" read
 * every row.
 *
 * ## What a row carries here
 *
 * The things a server scans for, each in its own column: the table, the name, the guests, the
 * server, how long it has been open, the total — and the two states that need somebody to do
 * something: **check requested**, and **dishes the kitchen does not have yet**.
 */

export interface TabRow {
  tab: Tab;
  /** "Table 10", "P2", or "No table" for a bar or league tab. */
  table: string;
  /** The room the table is in — what "group by room" groups on. */
  room: string;
  server: string;
  minutesOpen: number;
  total: number;
  /** Dishes still to go to the kitchen. */
  unsentCount: number;
  /** Dish lines of any state — zero means the table has ordered nothing yet. */
  lineCount: number;
}

export const NO_TABLE = 'No table';

/** `"11:35 AM"` → minutes from midnight. `null` for anything that is not a clock reading. */
export function clockMin(clock: string): number | null {
  const m = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(clock.trim());
  if (!m) return null;
  const h = Number(m[1]) % 12;
  return (m[3].toUpperCase() === 'PM' ? h + 12 : h) * 60 + Number(m[2]);
}

/** "25 min", "1 hr 10 min", "2 hr". */
export function formatOpenFor(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/** One row per open tab, measured against the demo's clock. */
export function tabRows(tabs: Tab[], floor: Room[], nowMin: number, roster?: readonly StaffMember[], taxRate?: number): TabRow[] {
  const tables = allTables(floor);
  return tabs
    .filter((t) => t.status === 'open')
    .map((tab) => {
      const at = tab.tableId ? tables.find((x) => x.table.id === tab.tableId) : undefined;
      const opened = clockMin(tab.openedAt);
      return {
        tab,
        table: at ? tableLabel(at.table) : NO_TABLE,
        room: at?.room.name ?? NO_TABLE,
        server: staffById(tab.serverId, roster)?.name ?? 'Unassigned',
        minutesOpen: opened == null ? 0 : Math.max(0, nowMin - opened),
        total: tabTotal(tab, taxRate),
        unsentCount: unsent(tab.lines).length,
        lineCount: tab.lines.filter((l) => l.dish).length,
      };
    });
}

export type TabSortKey = 'table' | 'name' | 'guests' | 'server' | 'opened' | 'status' | 'total';
export type SortDir = 'asc' | 'desc';

/**
 * The direction a column sorts in when first tapped — the useful end first. The biggest check,
 * the largest party and the table that needs something come to the top; the table open longest
 * does too, which for `opened` is ascending.
 */
export const FIRST_DIR: Record<TabSortKey, SortDir> = {
  table: 'asc',
  name: 'asc',
  guests: 'desc',
  server: 'asc',
  opened: 'asc',
  status: 'desc',
  total: 'desc',
};

/**
 * How much a tab needs someone: the check asked for outranks food not yet fired, which outranks
 * a table that has ordered nothing, which outranks one that is simply eating.
 */
export function attention(r: TabRow): number {
  if (r.tab.checkRequested) return 3;
  if (r.unsentCount > 0) return 2;
  if (r.lineCount === 0) return 1;
  return 0;
}

const byText = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });

/**
 * Sort rows. Ties fall back to the tab open longest, so the order never depends on the order the
 * store happens to hold tabs in. Tabs with no table sort after every table, in either direction —
 * "No table" is not a table name that belongs between "P2" and "Table 1".
 */
export function sortTabRows(rows: TabRow[], key: TabSortKey, dir: SortDir): TabRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  const cmp = (a: TabRow, b: TabRow): number => {
    switch (key) {
      case 'table': {
        const an = a.table === NO_TABLE;
        const bn = b.table === NO_TABLE;
        if (an !== bn) return an ? 1 : -1;
        return sign * byText(a.table, b.table);
      }
      case 'name':
        return sign * byText(a.tab.name, b.tab.name);
      case 'guests':
        return sign * (a.tab.guests - b.tab.guests);
      case 'server':
        return sign * byText(a.server, b.server);
      // Oldest first is ascending by *time opened*, i.e. descending by minutes open.
      case 'opened':
        return sign * (b.minutesOpen - a.minutesOpen);
      case 'status':
        return sign * (attention(a) - attention(b));
      case 'total':
        return sign * (a.total - b.total);
    }
  };
  return [...rows].sort((a, b) => cmp(a, b) || b.minutesOpen - a.minutesOpen || byText(a.tab.id, b.tab.id));
}

export type TabGrouping = 'none' | 'server' | 'room';

export interface TabGroup {
  key: string;
  /** Empty when ungrouped — the list draws no header then. */
  label: string;
  rows: TabRow[];
  total: number;
}

/**
 * Group already-sorted rows. Groups keep the order their first row appears in, so grouping by
 * server after sorting by total puts the server with the biggest check first — the sort still
 * means something inside the grouping.
 */
export function groupTabRows(rows: TabRow[], by: TabGrouping): TabGroup[] {
  if (by === 'none') return [{ key: 'all', label: '', rows, total: sumTotal(rows) }];
  const groups = new Map<string, TabRow[]>();
  for (const r of rows) {
    const k = by === 'server' ? r.server : r.room;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return [...groups].map(([k, rs]) => ({ key: k, label: k, rows: rs, total: sumTotal(rs) }));
}

const sumTotal = (rows: TabRow[]) => Math.round(rows.reduce((s, r) => s + r.total, 0) * 100) / 100;

/** The search box: a tab's name, its table, or its server. v1's filter matched name and server only. */
export function matchesQuery(r: TabRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [r.tab.name, r.table, r.server].some((s) => s.toLowerCase().includes(q));
}

/**
 * The fewest guests a tab can be set to: the highest seat that has a plate on it. Stepping below
 * it would move that plate to "shared" without anyone choosing to — `bySeat` puts a seat past the
 * guest count with the shared plates — and the kitchen's ticket would no longer say whose it is.
 */
export function minGuests(tab: Pick<Tab, 'lines'>): number {
  return Math.max(1, ...tab.lines.map((l) => l.dish?.seat ?? 0));
}
