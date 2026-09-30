import { modifierGroup, type AppliedModifier, type MenuItem, type ModifierGroup, type ModifierOption } from '../data/menu';

/**
 * Choosing modifiers for a dish (V1 → V2, Wave 2) — the dish dialog's rules, kept pure.
 *
 * ## What v1 did
 *
 * v1's item detail (`tf-birdie-ds-v1/app/src/screens/tab-item-detail.tsx`) drew every option as
 * a radio button and toggled it like a checkbox, across ten groups behind a scrolling tab strip.
 * TO GO, MEDIUM WELL and NO BUN could all sit on one burger, and so could RARE and WELL DONE;
 * staff tapped a second temperature expecting the first to clear, and it didn't. Its own comment
 * calls the mismatch "the reason staff tap an option twice".
 *
 * ## What this does
 *
 * A group says what it is (`select` in `data/menu.ts`) and a tap does what that says:
 *
 * - **`one`** — a choice. Tapping an option replaces the group's previous one. Tapping the chosen
 *   option again clears an *optional* choice (no protein on the salad after all) but not a
 *   *required* one: a steak with no temperature is not a thing to make possible by accident.
 * - **`many`** — a set. Each tap toggles one option and leaves the others alone.
 */

/** A group option as a line stores it — denormalised, so a ticket still reads right later. */
export function applied(group: ModifierGroup, option: ModifierOption): AppliedModifier {
  return { groupId: group.id, optionId: option.id, name: option.name, price: option.price ?? 0, alert: group.alert };
}

export const isChosen = (mods: AppliedModifier[], optionId: string): boolean => mods.some((m) => m.optionId === optionId);

/** Tap an option. Returns the new set; the input is not changed. */
export function chooseOption(mods: AppliedModifier[], group: ModifierGroup, option: ModifierOption): AppliedModifier[] {
  const chosen = isChosen(mods, option.id);
  if (group.select === 'many') {
    return chosen ? mods.filter((m) => m.optionId !== option.id) : [...mods, applied(group, option)];
  }
  const others = mods.filter((m) => m.groupId !== group.id);
  if (chosen) return group.required ? mods : others;
  return [...others, applied(group, option)];
}

/** The groups an item offers, in the order the dialog shows them. */
export function groupsOf(item: MenuItem): ModifierGroup[] {
  return (item.modifiers ?? []).map(modifierGroup).filter((g): g is ModifierGroup => Boolean(g));
}

/**
 * Modifiers in menu order — group by group as the item lists them, option by option as the group
 * lists them — rather than in the order they were tapped. A ticket reads "Medium · Fries · Bacon"
 * however the server got there, so the cook reads every burger the same way.
 */
export function ordered(item: MenuItem, mods: AppliedModifier[]): AppliedModifier[] {
  const groups = groupsOf(item);
  const rank = (m: AppliedModifier) => {
    const gi = groups.findIndex((g) => g.id === m.groupId);
    const oi = gi === -1 ? -1 : groups[gi].options.findIndex((o) => o.id === m.optionId);
    return (gi === -1 ? groups.length : gi) * 1000 + Math.max(0, oi);
  };
  return [...mods].sort((a, b) => rank(a) - rank(b));
}

/**
 * Allergies apart from everything else. A line draws the allergies as flags and the rest as a
 * sentence, because "Shellfish" between "Medium rare" and "Truffle butter" reads as an ingredient.
 */
export function splitAlerts(mods: AppliedModifier[]): { alerts: AppliedModifier[]; rest: AppliedModifier[] } {
  return { alerts: mods.filter((m) => m.alert), rest: mods.filter((m) => !m.alert) };
}

/** "Choose temperature and side" — what is stopping the dialog, in words. */
export function missingPrompt(missing: ModifierGroup[]): string {
  if (missing.length === 0) return '';
  const names = missing.map((g) => g.name.toLowerCase());
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `Choose ${list}`;
}
