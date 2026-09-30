import { describe, expect, it } from 'vitest';
import { LOW_STOCK, STOCK_ITEMS } from '../data/stock';
import { countSummary, stockBadge, stockLevel } from './stock-levels';

describe('stock levels', () => {
  it('flags low at LOW_STOCK and below, and out at zero', () => {
    expect(stockLevel(0)).toBe('out');
    expect(stockLevel(1)).toBe('low');
    expect(stockLevel(LOW_STOCK)).toBe('low');
    expect(stockLevel(LOW_STOCK + 1)).toBe('ok');
  });

  it('badges a register tile only when it is worth saying', () => {
    expect(stockBadge(0)).toBe('Out');
    expect(stockBadge(3)).toBe('3 left');
    expect(stockBadge(12)).toBeNull();
  });
});

describe('what a count found', () => {
  const [a, b, c] = STOCK_ITEMS.filter((i) => i.category === 'GOLF BALLS');

  it('sums counted lines only — an uncounted line is not zero on the shelf', () => {
    const s = countSummary({
      lines: [
        { name: a.name, expected: 10, counted: 8 },
        { name: b.name, expected: 4, counted: 5 },
        { name: c.name, expected: 6, counted: null },
      ],
    });
    expect(s).toEqual({
      lines: 3,
      counted: 2,
      units: -1,
      value: Math.round((-2 * a.price + b.price) * 100) / 100,
      differing: 2,
    });
  });
});
