import { staffById } from '../data/staff';
import type { PaymentRecord } from './restaurant';

/**
 * The arithmetic of Orders & Tips (V1 → V2, Wave 2). Pure, so the screen and its tests agree.
 */

/** Only a card tip can be changed after the fact — a cash tip is already in someone's pocket. */
export const tipAdjustable = (p: PaymentRecord): boolean => p.method === 'card' && p.kind !== 'refund';

/** Tip as a share of what the tip was on, to one decimal. Zero on a zero sale rather than NaN. */
export const tipPercent = (p: Pick<PaymentRecord, 'amount' | 'tip'>): number =>
  p.amount > 0 ? Math.round((p.tip / p.amount) * 1000) / 10 : 0;

/** A tip suggested as a percentage of the amount, to the cent. */
export const tipAt = (amount: number, pct: number): number => Math.round(amount * pct) / 100;

/**
 * A tip bigger than half the sale is almost always a slipped digit — $80 typed for $8.00 — not a
 * generous table. It is allowed, because it happens, but the dialog has to ask first. The same
 * idea as Wave 1's payout and gift-card caps: a keypad slip should cost a confirm, not money.
 */
export const TIP_CONFIRM_SHARE = 0.5;
export const tipNeedsConfirm = (amount: number, tip: number): boolean => amount > 0 && tip > amount * TIP_CONFIRM_SHARE;

export interface DayTotals {
  payments: number;
  sales: number;
  tips: number;
  card: number;
  cash: number;
  /**
   * Average tip %, over payments that **were tipped**. Averaging over every payment lets a morning
   * of pro-shop sales — where nobody tips on a box of balls — drag a restaurant's 19% down to 14.
   */
  averageTipPct: number;
  adjusted: number;
}

/**
 * The totals band. Always a number: v1's band printed its seven labels with no values at all until
 * the day had activity, so a quiet morning read as broken rather than empty.
 */
export function dayTotals(ps: PaymentRecord[]): DayTotals {
  const sum = (f: (p: PaymentRecord) => number) => Math.round(ps.reduce((s, p) => s + f(p), 0) * 100) / 100;
  const tipped = ps.filter((p) => p.amount > 0 && p.tip > 0);
  return {
    // A refund is money going back, not a payment — it nets out of sales but is not counted.
    payments: ps.filter((p) => p.kind !== 'refund').length,
    sales: sum((p) => p.amount),
    tips: sum((p) => p.tip),
    card: sum((p) => (p.method === 'card' ? p.amount + p.tip : 0)),
    cash: sum((p) => (p.method === 'cash' ? p.amount + p.tip : 0)),
    averageTipPct: tipped.length
      ? Math.round((tipped.reduce((s, p) => s + p.tip / p.amount, 0) / tipped.length) * 1000) / 10
      : 0,
    adjusted: ps.filter((p) => p.tipAdjustedAt).length,
  };
}

export interface StaffTips {
  staffId: string;
  name: string;
  payments: number;
  tips: number;
  cardTips: number;
  cashTips: number;
}

/**
 * Tips by the person who took them — what v1's "Tip out" button was for. Highest first, and a
 * staff member with no tipped payments is left out rather than shown at $0.00.
 */
export function tipsByStaff(ps: PaymentRecord[]): StaffTips[] {
  const by = new Map<string, StaffTips>();
  for (const p of ps) {
    const s = by.get(p.staffId) ?? {
      staffId: p.staffId,
      name: staffById(p.staffId)?.short ?? p.staffId,
      payments: 0,
      tips: 0,
      cardTips: 0,
      cashTips: 0,
    };
    s.payments += 1;
    s.tips = Math.round((s.tips + p.tip) * 100) / 100;
    if (p.method === 'card') s.cardTips = Math.round((s.cardTips + p.tip) * 100) / 100;
    if (p.method === 'cash') s.cashTips = Math.round((s.cashTips + p.tip) * 100) / 100;
    by.set(p.staffId, s);
  }
  return [...by.values()].filter((s) => s.tips > 0).sort((a, b) => b.tips - a.tips);
}
