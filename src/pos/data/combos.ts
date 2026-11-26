import { ALL_ITEMS } from './catalog';

/**
 * The register's combos (V1 → V2).
 *
 * ## What v1 shipped
 *
 * v1's list was, in its own words, "deliberately the operator's real one — test rows, $0.00
 * rows and a $100,000 typo included": `test1` at $0, a `Sandhill Test` at $2,074, a
 * `Triaxiom Combo` at $100,000, and only one of sixteen bundles with its contents written
 * down. That was the right call for a replica — it showed that combo maintenance is where this
 * data goes wrong — and the wrong one for a prototype people are meant to judge the design on.
 * A grid of test rows teaches nobody what a combo is for.
 *
 * ## What these are
 *
 * Six bundles a golf course actually rings, each built from items already in `CATALOG`, so a
 * component's list price is the catalog's and cannot drift from what the tile charges. Every
 * one is priced **below** the sum of its parts — the saving is the whole point of a combo, and
 * a combo that costs the same as its pieces is just a shortcut. The saving shows on the tile
 * and on the order line (`comboSavings`).
 *
 * Fixed data: no clock, no randomness, so every story and screenshot shows the same six.
 *
 * ## Buck's combos (Nov 26)
 *
 * Buck › Products › Combos gives each combo a title, a description and a **department** — Pro Shop,
 * Restaurant or Bev Carts — over a list of products with quantities. Birdie's combos now carry the
 * department, and two take Buck's titles where they are the same bundle: the turn's hot dog, chips
 * and drink is Buck's **Turn Special** (Restaurant), and the six beers is Buck's **6 Pack Combo** —
 * three domestic and three craft, as Buck mixes a lager and an IPA. The rest are Birdie's own, and
 * `buck-sources.ts` says so.
 */

/** Buck's combo departments (Products › Combos › Department). */
export type ComboDepartment = 'Pro Shop' | 'Restaurant' | 'Bev Carts';

export interface ComboComponentDef {
  /** A `CATALOG` item name — resolved to its list price by `comboComponents`. */
  item: string;
  qty: number;
}

export interface Combo {
  id: string;
  name: string;
  /** What the combo charges, in dollars. */
  price: number;
  components: ComboComponentDef[];
  /** One line for the tile — who it is for. Buck's "Description". */
  desc: string;
  /** Where it is sold, as Buck files it. */
  department: ComboDepartment;
}

export const COMBOS: Combo[] = [
  {
    id: 'combo-range-beer',
    name: 'Range & a Cold One',
    price: 17.5,
    desc: 'Large bucket and a craft beer',
    department: 'Pro Shop',
    components: [
      { item: 'Range Bucket Large', qty: 1 },
      { item: 'Beer Craft', qty: 1 },
    ],
  },
  {
    id: 'combo-sleeve-glove',
    name: 'Sleeve & Glove',
    price: 29,
    desc: 'Pro V1 sleeve and a men’s glove',
    department: 'Pro Shop',
    components: [
      { item: 'Titleist Pro V1 Sleeve', qty: 1 },
      { item: 'Golf Glove Mens', qty: 1 },
    ],
  },
  {
    id: 'combo-turn-dog',
    name: 'Turn Special',
    price: 8,
    desc: 'Hot dog, chips and a drink at the turn',
    department: 'Restaurant',
    components: [
      { item: 'Hot Dog', qty: 1 },
      { item: 'Chips', qty: 1 },
      { item: 'Soda', qty: 1 },
    ],
  },
  {
    id: 'combo-burger-lunch',
    name: 'Clubhouse Burger Lunch',
    price: 11,
    desc: 'Burger, chips and an iced tea',
    department: 'Restaurant',
    components: [
      { item: 'Hamburger', qty: 1 },
      { item: 'Chips', qty: 1 },
      { item: 'Iced Tea', qty: 1 },
    ],
  },
  {
    id: 'combo-cart-bucket',
    name: '6 Pack Combo',
    price: 30,
    desc: 'Three domestic and three craft beers on ice for the cart',
    department: 'Bev Carts',
    components: [
      { item: 'Beer Domestic', qty: 3 },
      { item: 'Beer Craft', qty: 3 },
    ],
  },
  {
    id: 'combo-first-tee',
    name: 'First Tee Starter',
    price: 39,
    desc: 'TruFeel box, tees, marker and a divot tool',
    department: 'Pro Shop',
    components: [
      { item: 'Titleist TruFeel Box', qty: 1 },
      { item: 'Tee Pack 50ct', qty: 1 },
      { item: 'Ball Marker', qty: 1 },
      { item: 'Divot Tool', qty: 1 },
    ],
  },
];

/** The catalog category the combos appear under in the register. */
export const COMBOS_CATEGORY = 'COMBOS';

/** A combo by id. */
export const comboById = (id: string): Combo | undefined => COMBOS.find((c) => c.id === id);

/** Catalog list price of an item by name, or `undefined` if the catalog has no such item. */
export const catalogPrice = (name: string): number | undefined => ALL_ITEMS.find((i) => i.n === name)?.p;
