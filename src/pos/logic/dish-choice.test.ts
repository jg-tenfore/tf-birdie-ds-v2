import { describe, expect, it } from 'vitest';
import { menuItem, modifierGroup, type ModifierGroup } from '../data/menu';
import { applied, chooseOption, groupsOf, isChosen, missingPrompt, ordered, splitAlerts } from './dish-choice';

const g = (id: string) => modifierGroup(id)!;
const o = (group: ModifierGroup, name: string) => group.options.find((x) => x.name === name)!;
const burger = menuItem('counter-clubhouse-cheeseburger')!;

describe('a single choice', () => {
  const temp = g('temperature');

  it('replaces the previous choice rather than adding to it', () => {
    let mods = chooseOption([], temp, o(temp, 'Rare'));
    mods = chooseOption(mods, temp, o(temp, 'Medium'));
    expect(mods.map((m) => m.name)).toEqual(['Medium']);
  });

  it('keeps a required choice when it is tapped again', () => {
    const mods = chooseOption([], temp, o(temp, 'Medium'));
    expect(chooseOption(mods, temp, o(temp, 'Medium'))).toEqual(mods);
  });

  it('clears an optional choice when it is tapped again', () => {
    const protein = g('salad-protein');
    const mods = chooseOption([], protein, o(protein, 'Shrimp'));
    expect(chooseOption(mods, protein, o(protein, 'Shrimp'))).toEqual([]);
  });

  it('leaves other groups alone', () => {
    const side = g('side');
    let mods = chooseOption([], side, o(side, 'Fries'));
    mods = chooseOption(mods, temp, o(temp, 'Rare'));
    mods = chooseOption(mods, temp, o(temp, 'Well done'));
    expect(mods.map((m) => m.name).sort()).toEqual(['Fries', 'Well done']);
  });
});

describe('a set', () => {
  const addons = g('burger-addons');

  it('toggles one option and keeps the rest', () => {
    let mods = chooseOption([], addons, o(addons, 'Bacon'));
    mods = chooseOption(mods, addons, o(addons, 'Avocado'));
    expect(mods.map((m) => m.name)).toEqual(['Bacon', 'Avocado']);
    mods = chooseOption(mods, addons, o(addons, 'Bacon'));
    expect(mods.map((m) => m.name)).toEqual(['Avocado']);
    expect(isChosen(mods, o(addons, 'Avocado').id)).toBe(true);
  });

  it('prices each option, and a free one at zero', () => {
    expect(applied(addons, o(addons, 'Bacon')).price).toBe(2);
    expect(applied(g('hold'), o(g('hold'), 'No onion')).price).toBe(0);
  });
});

describe('allergies', () => {
  it('are flagged on the line, and drawn apart from the rest', () => {
    const allergies = g('allergies');
    const temp = g('temperature');
    const mods = [applied(temp, o(temp, 'Medium')), applied(allergies, o(allergies, 'Shellfish'))];
    expect(mods[1].alert).toBe(true);
    const { alerts, rest } = splitAlerts(mods);
    expect(alerts.map((m) => m.name)).toEqual(['Shellfish']);
    expect(rest.map((m) => m.name)).toEqual(['Medium']);
  });
});

describe('order and prompts', () => {
  it('lists an item’s groups in the order the menu gives them', () => {
    expect(groupsOf(burger).map((x) => x.id)).toEqual(['temperature', 'side', 'burger-addons', 'hold', 'allergies']);
    expect(groupsOf(menuItem('counter-miller-lite')!)).toEqual([]);
  });

  it('puts modifiers in menu order whatever order they were tapped in', () => {
    const addons = g('burger-addons');
    const side = g('side');
    const temp = g('temperature');
    const tapped = [
      applied(addons, o(addons, 'Avocado')),
      applied(side, o(side, 'Fries')),
      applied(addons, o(addons, 'Bacon')),
      applied(temp, o(temp, 'Medium')),
    ];
    expect(ordered(burger, tapped).map((m) => m.name)).toEqual(['Medium', 'Fries', 'Bacon', 'Avocado']);
  });

  it('says what is missing in words', () => {
    expect(missingPrompt([])).toBe('');
    expect(missingPrompt([g('temperature')])).toBe('Choose temperature');
    expect(missingPrompt([g('temperature'), g('side')])).toBe('Choose temperature and side');
  });
});
