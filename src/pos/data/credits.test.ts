import { describe, expect, it } from 'vitest';
import { CREDIT_BOOKS, creditBookOf, creditBooksOf, giftCardTypeLine, isUsablePunchCard, punchCardItems, punchCardStatus } from './credits';
import { roster } from './roster';

const card = (remaining: number, expires: string) => ({ name: '10-Round Punch Card', total: 10, remaining, expires });
const today = new Date(2026, 4, 21);

describe("punch cards, by Buck's statuses", () => {
  it('reads Active, Expiring soon, Exhausted and Expired as Buck computes them', () => {
    expect(punchCardStatus(card(4, '12/31/2026'), today)).toBe('Active');
    expect(punchCardStatus(card(4, '06/10/2026'), today)).toBe('Expiring soon');
    expect(punchCardStatus(card(0, '12/31/2026'), today)).toBe('Exhausted');
    // Expired outranks exhausted, as in Buck's report.
    expect(punchCardStatus(card(0, '03/16/2026'), today)).toBe('Expired');
  });

  it('only lets an Active or Expiring soon card pay a round', () => {
    expect(isUsablePunchCard(card(4, '06/10/2026'), today)).toBe(true);
    expect(isUsablePunchCard(card(4, '03/16/2026'), today)).toBe(false);
  });

  it('is one Buck item: a green fee, in rounds', () => {
    expect(punchCardItems(card(6, '12/31/2026'))).toEqual([
      { kind: 'green-fee', label: 'Green Fee', target: 'Any green fee', unit: 'rounds', awarded: 10, used: 4, remaining: 6 },
    ]);
  });
});

describe('credit books', () => {
  it('names the book that paid every Winnings card, and none for a bought one', () => {
    const winnings = roster.flatMap((c) => c.giftCards).filter((g) => g.type === 'Winnings');
    expect(winnings.length).toBeGreaterThan(0);
    for (const g of winnings) expect(CREDIT_BOOKS).toContain(creditBookOf(g));
    expect(creditBookOf({ id: '1', type: 'Purchased' })).toBeUndefined();
    expect(giftCardTypeLine({ id: '1', type: 'Purchased' })).toBe('Purchased');
  });

  it("lists a customer's books from the cards they were paid, deterministically", () => {
    const holder = roster.find((c) => c.giftCards.some((g) => g.type === 'Winnings'))!;
    expect(creditBooksOf(holder).length).toBeGreaterThan(0);
    expect(creditBooksOf(holder)).toEqual(creditBooksOf(holder));
  });
});
