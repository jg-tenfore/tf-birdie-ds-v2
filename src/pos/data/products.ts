/**
 * Buck's per-product settings for the register's catalog (Nov 26, "checkout that's right").
 *
 * Buck › Products › List gives every product a **Tax** and a **Tax 2** type, a **Cost**, and options —
 * among them **Price override** ("Staff can change the price at the point of sale")
 * (`tf-buck-ds-v1/src/components/application/products-oct-27/data.ts`). The register still sells
 * Birdie's ported catalog, so most of its products carry none of their own: their tax comes from
 * Buck's per-kind Tax Rates by what they are (`logic/pricing.ts`). The few below carry their own,
 * the way a Buck product does — a cost where the shop knows one (so a cost-plus discount can be
 * offered), the price-override option, and a tax type when it is not the kind's.
 *
 * Costs are invented and fixed. A product not listed has no known cost, and a cost-plus discount is
 * not offered on it — never faked from the price.
 */
export interface ProductSettings {
  /** Buck's Tax type id (`buck-club.ts` TAX_TYPES), when the product has its own. */
  tax?: string;
  /** Buck's Tax 2 type id; `null` is "No second tax". */
  tax2?: string | null;
  /** What one costs the shop. */
  cost?: number;
  /** Buck's "Price override" option: staff may change the price at the register. */
  priceOverride?: boolean;
}

export const PRODUCT_SETTINGS: Record<string, ProductSettings> = {
  // Apparel and accessories: a cost from the shop's invoices, and the price can be overridden.
  'Golf Polo Course Logo': { cost: 27.5, priceOverride: true },
  'Golf Polo Brand': { cost: 34, priceOverride: true },
  'Ladies Golf Shirt': { cost: 29, priceOverride: true },
  'Golf Shorts': { cost: 22, priceOverride: true },
  'Golf Hat Structured': { cost: 12, priceOverride: true },
  Visor: { cost: 9, priceOverride: true },
  Windbreaker: { cost: 38, priceOverride: true },
  'Rain Jacket': { cost: 46, priceOverride: true },
  'Golf Belt': { cost: 14, priceOverride: true },
  'Golf Glove Mens': { cost: 7.5, priceOverride: true },
  'Golf Glove Ladies': { cost: 7, priceOverride: true },
  'Towel Course Logo': { cost: 9, priceOverride: true },
  Headcover: { cost: 11, priceOverride: true },
  'Titleist Pro V1 Box': { cost: 38 },
  'Titleist Pro V1 Sleeve': { cost: 12.5 },
  // Instruction is sold tax exempt here — the product's own tax type, not the kind's.
  'Lesson 30 Min': { tax: 'exempt', tax2: null },
  'Lesson 60 Min': { tax: 'exempt', tax2: null },
};

export const productSettings = (name: string): ProductSettings | undefined => PRODUCT_SETTINGS[name];
