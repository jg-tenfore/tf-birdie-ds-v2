import { formatTimeLabel } from '../data/courses';
import type { PosState } from '../state/pos-store';
import type { Booking } from '../types';

/**
 * What an action wrote to the tee sheet.
 *
 * Derived by comparing two states rather than described by hand, so a story can state its
 * outcome without the risk of the prose and the reducer drifting apart — the thing that
 * makes a showcase quietly wrong.
 *
 * Only tee-sheet data is reported. View state (which day, which band, which pane is open)
 * changes constantly and is not an output.
 */

export type ChangeKind = 'added' | 'removed' | 'changed' | 'annotation' | 'course' | 'setting';

export interface Change {
  kind: ChangeKind;
  /** One line, e.g. `Added Harrison, T. — 4P on Ponds at 8:00 AM`. */
  label: string;
  /** Field-level detail for a modified booking. */
  detail?: string;
}

/** The fields worth naming when a booking changes; anything else is noise in a summary. */
const WATCHED: Array<[keyof Booking, string]> = [
  ['pay', 'payment'],
  ['status', 'status'],
  ['players', 'players'],
  ['course', 'course'],
  ['timeMin', 'time'],
  ['slot', 'slot'],
  ['price', 'price'],
  ['name', 'name'],
  ['cart', 'transport'],
  ['note', 'note'],
  ['holes', 'holes'],
];

const where = (b: Booking, courseName: (id: string) => string) =>
  `${courseName(b.course)} at ${formatTimeLabel(b.timeMin)}`;

const describe = (b: Booking, courseName: (id: string) => string) =>
  `${b.name} — ${b.players}P on ${where(b, courseName)}`;

/** How many players in a booking have been checked in past the first step. */
const checkedIn = (b: Booking) => (b.playerStates ?? []).filter((p) => p.step >= 0).length;

/** How many have paid. */
const paidCount = (b: Booking) => (b.playerStates ?? []).filter((p) => p.paid).length;

export function diffTeeSheet(before: PosState, after: PosState): Change[] {
  const changes: Change[] = [];
  const courseName = (id: string) =>
    after.courses.find((c) => c.id === id)?.name ?? before.courses.find((c) => c.id === id)?.name ?? id;

  const was = new Map(before.bookings.map((b) => [b.id, b]));
  const now = new Map(after.bookings.map((b) => [b.id, b]));

  // Bookings are grouped so a league writing six rows reads as one line rather than six.
  const added = after.bookings.filter((b) => !was.has(b.id));
  const removed = before.bookings.filter((b) => !now.has(b.id));

  const byGroup = (list: Booking[]) => {
    const groups = new Map<string, Booking[]>();
    for (const b of list) groups.set(b.groupId ?? b.id, [...(groups.get(b.groupId ?? b.id) ?? []), b]);
    return groups;
  };

  for (const [, group] of byGroup(added)) {
    changes.push(
      group.length === 1
        ? { kind: 'added', label: `Added ${describe(group[0], courseName)}` }
        : {
            kind: 'added',
            label: `Added ${group.length} tee times — ${group[0].name}`,
            detail: `${formatTimeLabel(Math.min(...group.map((b) => b.timeMin)))}–${formatTimeLabel(
              Math.max(...group.map((b) => b.timeMin)),
            )} across ${new Set(group.map((b) => b.course)).size} course(s)`,
          },
    );
  }

  for (const [, group] of byGroup(removed)) {
    changes.push(
      group.length === 1
        ? { kind: 'removed', label: `Removed ${describe(group[0], courseName)}` }
        : { kind: 'removed', label: `Removed ${group.length} tee times — ${group[0].name}` },
    );
  }

  for (const b of after.bookings) {
    const old = was.get(b.id);
    if (!old || old === b) continue;
    const fields = WATCHED.filter(([k]) => old[k] !== b[k]).map(
      ([k, label]) => `${label} ${String(old[k] ?? '—')} → ${String(b[k] ?? '—')}`,
    );
    // Per-player state is a nested array, so it never shows up in a field comparison even
    // though checking a group in is the most common action on the sheet.
    if (checkedIn(old) !== checkedIn(b))
      fields.push(`checked in ${checkedIn(old)}/${old.players} → ${checkedIn(b)}/${b.players}`);
    if (paidCount(old) !== paidCount(b))
      fields.push(`paid ${paidCount(old)}/${old.players} → ${paidCount(b)}/${b.players}`);
    if (!fields.length) continue;
    changes.push({
      kind: 'changed',
      label: `${b.name} on ${where(b, courseName)}`,
      detail: fields.join(' · '),
    });
  }

  // ─── Annotations ───
  for (const [key, note] of Object.entries(after.timeNotes)) {
    if (before.timeNotes[key] !== note)
      changes.push({ kind: 'annotation', label: `Note on ${key.split('_')[1] ? formatTimeLabel(Number(key.split('_')[1])) : key}`, detail: note.text });
  }
  for (const key of Object.keys(before.timeNotes))
    if (!after.timeNotes[key])
      changes.push({ kind: 'annotation', label: `Note cleared on ${formatTimeLabel(Number(key.split('_')[1]))}` });

  for (const [key, price] of Object.entries(after.timePrices)) {
    if (before.timePrices[key] !== price)
      changes.push({
        kind: 'annotation',
        label: `Price override on ${formatTimeLabel(Number(key.split('_')[1]))}`,
        detail: price.label ? `${price.label}` : undefined,
      });
  }
  for (const key of Object.keys(before.timePrices))
    if (!after.timePrices[key])
      changes.push({ kind: 'annotation', label: `Price override cleared on ${formatTimeLabel(Number(key.split('_')[1]))}` });

  // ─── Course state ───
  for (const c of after.courses) {
    const old = before.courses.find((x) => x.id === c.id);
    if (!old) continue;
    if (old.locked !== c.locked) changes.push({ kind: 'course', label: `${c.name} ${c.locked ? 'locked' : 'unlocked'}` });
    if (old.visible !== c.visible) changes.push({ kind: 'course', label: `${c.name} ${c.visible ? 'shown' : 'hidden'}` });
    if (old.note !== c.note)
      changes.push({ kind: 'course', label: `${c.name} note`, detail: c.note ?? 'cleared' });
  }

  // ─── Settings ───
  for (const k of Object.keys(after.settings) as Array<keyof PosState['settings']>) {
    if (before.settings[k] !== after.settings[k])
      changes.push({
        kind: 'setting',
        label: `${String(k)}: ${String(before.settings[k])} → ${String(after.settings[k])}`,
      });
  }

  return changes;
}
