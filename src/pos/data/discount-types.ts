import type { CartItem } from '../types';
import { spendCategoryOf } from './spend';

/**
 * Discount types, as TF Buck defines them (Buck › Products › Discount Types, Nov 26).
 *
 * Buck keeps a named list — "Senior 22%", "Shift Drink 100% on alcohol", "Manager's Discount 20%,
 * needs approval" — each limited to accounting categories. The counter used to offer bare
 * percentages (10, 25, 50, Comp) on a plate, which left a $0 steak with no reason behind it. Now the
 * dish's Discount row offers Buck's types, **only the ones that apply to that line**, so the reason
 * is the name and the name is what Buck reports on.
 *
 * Names, kinds, values, approvals and categories are Buck's (`tf-buck-ds-v1/src/components/
 * application/products-oct-27/data.ts`), verbatim. Fixed data.
 *
 * ## What the counter can apply today
 *
 * A dish discount is a percentage (`discountPct`). So **percent** types apply; Buck's **amount**
 * ("Dollar Off") and **cost plus** ("Cost Plus", "Employee Merch Discount") types need a dollar
 * discount and a product cost the register does not have, and are listed as *not yet* in
 * `buck-sources.ts` rather than faked.
 */

/** Buck's accounting categories (Products › List › Category). */
export type AccountingCategory =
  | 'Alcohol'
  | 'Club Repair'
  | 'Driving Range'
  | 'Equipment'
  | 'Food and Beverage'
  | 'Lessons'
  | 'Merchandise'
  | 'Rentals'
  | 'Tee Fees';

export const ACCOUNTING_CATEGORIES: AccountingCategory[] = [
  'Alcohol',
  'Club Repair',
  'Driving Range',
  'Equipment',
  'Food and Beverage',
  'Lessons',
  'Merchandise',
  'Rentals',
  'Tee Fees',
];

export type DiscountKind = 'percent' | 'costPlus' | 'amount';

export interface DiscountType {
  id: number;
  description: string;
  kind: DiscountKind;
  value: number;
  /** Needs a manager to apply. */
  approval: boolean;
  categories: AccountingCategory[];
}

const ALL = [...ACCOUNTING_CATEGORIES];

export const DISCOUNT_TYPES: DiscountType[] = [
  { id: 1, description: '10% Everything', kind: 'percent', value: 10, approval: false, categories: ALL },
  { id: 2, description: '20% off F&B', kind: 'percent', value: 20, approval: false, categories: ['Alcohol', 'Food and Beverage'] },
  { id: 3, description: 'BOGO Lunch', kind: 'percent', value: 100, approval: false, categories: ['Food and Beverage'] },
  { id: 4, description: 'Cost Plus', kind: 'costPlus', value: 10, approval: true, categories: ['Equipment', 'Merchandise'] },
  { id: 5, description: 'Dollar Off', kind: 'amount', value: 1, approval: false, categories: ALL },
  { id: 6, description: 'Employee Merch Discount', kind: 'costPlus', value: 15, approval: false, categories: ['Merchandise', 'Equipment'] },
  { id: 7, description: 'Food Only Discount', kind: 'percent', value: 50, approval: false, categories: ['Food and Beverage'] },
  { id: 8, description: 'League Pass', kind: 'percent', value: 20, approval: false, categories: ['Tee Fees'] },
  { id: 9, description: "Manager's Discount", kind: 'percent', value: 20, approval: true, categories: ALL },
  { id: 10, description: 'Memberships', kind: 'amount', value: 25, approval: false, categories: ['Tee Fees'] },
  { id: 11, description: 'Military', kind: 'percent', value: 25, approval: true, categories: ALL },
  { id: 12, description: 'Senior', kind: 'percent', value: 22, approval: false, categories: ['Tee Fees', 'Food and Beverage'] },
  { id: 13, description: 'Shift Drink', kind: 'percent', value: 100, approval: false, categories: ['Alcohol'] },
];

export const discountTypeById = (id: number | undefined): DiscountType | undefined => DISCOUNT_TYPES.find((d) => d.id === id);

/** The Buck accounting category a register line reports under, from Birdie's spend category. */
export function accountingCategoryOf(line: CartItem): AccountingCategory | null {
  const spend = spendCategoryOf(line);
  if (spend === 'fnb') return 'Food and Beverage';
  if (spend === 'alcohol') return 'Alcohol';
  if (spend === 'tee') return 'Tee Fees';
  if (spend === 'merchandise') return 'Merchandise';
  return null;
}

/** How a discount reads on a line: "Senior · 22% off", "Shift Drink · comped". */
export function discountLabel(d: Pick<DiscountType, 'description' | 'value'>): string {
  return `${d.description} · ${d.value === 100 ? 'comped' : `${d.value}% off`}`;
}

/**
 * The discount types a line can take at the counter: percent types whose categories include the
 * line's. `needsManager` marks the ones Buck flags for approval when the person signed in is not a
 * manager — offered, so staff see it exists, but not applicable until a manager signs in.
 */
export function discountTypesFor(line: CartItem, isManager: boolean): { type: DiscountType; needsManager: boolean }[] {
  const category = accountingCategoryOf(line);
  if (!category) return [];
  return DISCOUNT_TYPES.filter((d) => d.kind === 'percent' && d.categories.includes(category)).map((type) => ({
    type,
    needsManager: type.approval && !isManager,
  }));
}
