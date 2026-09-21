import { describe, expect, it } from 'vitest';
import { creditMoney, deltaMoney, money, moneyShort } from './cart';

describe('money', () => {
  it('groups thousands', () => {
    expect(money(6632)).toBe('$6,632.00');
    expect(money(1234567.891)).toBe('$1,234,567.89');
    expect(money(18)).toBe('$18.00');
  });

  it('puts the minus before the dollar sign', () => {
    expect(money(-12.5)).toBe('−$12.50');
    expect(money(-1212.5)).toBe('−$1,212.50');
  });

  it('never shows a negative zero', () => {
    expect(money(-0)).toBe('$0.00');
    expect(money(-0.001)).toBe('$0.00');
  });

  it('rounds to the cent', () => {
    expect(money(10.005)).toBe('$10.01');
    expect(money(0.1 + 0.2)).toBe('$0.30');
  });
});

describe('moneyShort', () => {
  it('drops .00 on whole dollars only', () => {
    expect(moneyShort(45)).toBe('$45');
    expect(moneyShort(1200)).toBe('$1,200');
    expect(moneyShort(12.5)).toBe('$12.50');
  });
});

describe('deltaMoney', () => {
  it('always signs, and reads zero as Free', () => {
    expect(deltaMoney(20)).toBe('+$20.00');
    expect(deltaMoney(-3)).toBe('−$3.00');
    expect(deltaMoney(0)).toBe('Free');
    expect(deltaMoney(-0.001)).toBe('Free');
    expect(deltaMoney(1500)).toBe('+$1,500.00');
  });
});

describe('creditMoney', () => {
  it('uses a true minus and the magnitude', () => {
    expect(creditMoney(-10)).toBe('−$10.00');
    expect(creditMoney(10)).toBe('−$10.00');
  });
});
