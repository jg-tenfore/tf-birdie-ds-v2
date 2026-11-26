import { describe, expect, it } from 'vitest';
import { menuItem } from './menu';
import { dishLine } from '../logic/restaurant';
import { DISCOUNT_TYPES, discountLabel, discountTypesFor } from './discount-types';

const line = (id: string) => dishLine(menuItem(id)!, [], { lineId: 'L-1' });
const names = (id: string, manager = true) => discountTypesFor(line(id), manager).map((t) => t.type.description);

describe("Buck's discount types at the counter", () => {
  it('offers a beer the alcohol types and a steak the food ones — never the other’s', () => {
    expect(names('counter-miller-lite')).toEqual(['10% Everything', '20% off F&B', "Manager's Discount", 'Military', 'Shift Drink']);
    expect(names('nineteenth-filet-mignon-8oz')).toContain('Senior');
    expect(names('nineteenth-filet-mignon-8oz')).not.toContain('Shift Drink');
  });

  it('never offers the amount or cost-plus types, which need what the register does not have', () => {
    const offered = new Set(names('nineteenth-filet-mignon-8oz'));
    for (const d of DISCOUNT_TYPES.filter((x) => x.kind !== 'percent')) expect(offered.has(d.description)).toBe(false);
  });

  it('marks the approval types for anyone but a manager', () => {
    const server = discountTypesFor(line('counter-miller-lite'), false);
    expect(server.filter((t) => t.needsManager).map((t) => t.type.description)).toEqual(["Manager's Discount", 'Military']);
    expect(discountTypesFor(line('counter-miller-lite'), true).some((t) => t.needsManager)).toBe(false);
  });

  it('reads as the reason on the line', () => {
    expect(discountLabel(DISCOUNT_TYPES.find((d) => d.description === 'Senior')!)).toBe('Senior · 22% off');
    expect(discountLabel(DISCOUNT_TYPES.find((d) => d.description === 'Shift Drink')!)).toBe('Shift Drink · comped');
  });
});
