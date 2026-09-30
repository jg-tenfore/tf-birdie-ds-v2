/**
 * The restaurant's menus (V1 → V2, Wave 2).
 *
 * ## Two menus, one catalog
 *
 * v1 carried two: a **counter** menu (`tf-birdie-ds-v1/src/data/food-catalog.ts`) for Quick Order,
 * and the **19th Hole** dining-room menu (`steakhouse-menu.ts`) for table service. Here they are
 * two menu sets in one catalog, so any tab can sell from either — a table can order a beer off the
 * counter menu, and the counter can ring up a side of creamed spinach to go.
 *
 * Names, prices and descriptions are v1's, which v1 records as written for its prototype. Two
 * changes: v1's two counter "Combos" are gone, because V1 → V2 already has combos (Wave 1, the
 * register); and the Burgers category, one item in v1, is filled out.
 *
 * ## No v1 photography
 *
 * v1's menu photos are not ours to publish. The dining-room images are, by v1's own note, Del
 * Frisco's photography taken from Uber Eats; the counter images carry no metadata and delivery-CDN
 * filenames. So menu tiles here are text, and real photography is something to drop in later.
 *
 * ## Modifiers say what they are
 *
 * v1's modifier options looked like radio buttons and behaved like checkboxes: TO GO, MEDIUM WELL
 * and NO BUN could all sit on one burger, and staff tapped an option twice expecting the first to
 * clear. Here every group declares `select: 'one'` or `select: 'many'`, and renders as what it is —
 * a steak has exactly one temperature, and any number of add-ons. v1's group names were the
 * operator's own, misspellings included ("Alergies"); v2 is not a replica, so they are corrected.
 */

export type MenuId = 'counter' | 'nineteenth';

export const MENUS: { id: MenuId; name: string; categories: string[] }[] = [
  { id: 'counter', name: 'Counter', categories: ['Grill', 'Burgers', 'Sandwiches', 'Snacks', 'Drinks', 'Beer', 'Wine'] },
  {
    id: 'nineteenth',
    name: '19th Hole',
    categories: ['Starters', 'Salads', 'Steaks', 'Chops & Seafood', 'Sides', 'Sauces', 'Desserts'],
  },
];

export interface ModifierOption {
  id: string;
  name: string;
  /** Added to the line's unit price. Absent means free — "no bun" changes the plate, not the bill. */
  price?: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  /** `one` is a choice (a temperature); `many` is a set (add-ons). The UI renders each as such. */
  select: 'one' | 'many';
  /** A required `one` group must be answered before the line can go to the kitchen. */
  required?: boolean;
  /** Shown to the kitchen as a warning, not just a line of text. */
  alert?: boolean;
  options: ModifierOption[];
}

const opts = (group: string, list: [string, number?][]): ModifierOption[] =>
  list.map(([name, price]) => ({ id: `${group}:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name, price }));

export const MODIFIER_GROUPS: ModifierGroup[] = [
  {
    id: 'temperature',
    name: 'Temperature',
    select: 'one',
    required: true,
    options: opts('temperature', [['Rare'], ['Medium rare'], ['Medium'], ['Medium well'], ['Well done']]),
  },
  {
    id: 'side',
    name: 'Side',
    select: 'one',
    required: true,
    options: opts('side', [['Fries'], ['Sweet potato fries', 1.5], ['Side salad'], ['Chips'], ['Onion rings', 2]]),
  },
  {
    id: 'burger-addons',
    name: 'Add-ons',
    select: 'many',
    options: opts('burger-addons', [
      ['Bacon', 2],
      ['Extra cheese', 1],
      ['Fried egg', 1.5],
      ['Avocado', 2],
      ['Brisket', 4],
      ['Extra patty', 5],
      ['Pretzel bun', 1],
    ]),
  },
  {
    id: 'sandwich-addons',
    name: 'Add-ons',
    select: 'many',
    options: opts('sandwich-addons', [['Bacon', 2], ['Extra cheese', 1], ['Avocado', 2], ['Make it a wrap']]),
  },
  {
    id: 'steak-addons',
    name: 'Enhancements',
    select: 'many',
    options: opts('steak-addons', [
      ['Oscar style', 14],
      ['Blue cheese crust', 6],
      ['Truffle butter', 5],
      ['Grilled shrimp', 12],
    ]),
  },
  {
    id: 'salad-protein',
    name: 'Add protein',
    select: 'one',
    options: opts('salad-protein', [['Grilled chicken', 7], ['Shrimp', 10], ['Salmon', 12], ['Steak', 14]]),
  },
  {
    id: 'hold',
    name: 'Hold',
    select: 'many',
    options: opts('hold', [['No onion'], ['No tomato'], ['No cheese'], ['No bun'], ['No mayo'], ['Lettuce wrap']]),
  },
  {
    id: 'allergies',
    name: 'Allergies',
    select: 'many',
    alert: true,
    options: opts('allergies', [['Gluten'], ['Dairy'], ['Tree nut'], ['Peanut'], ['Shellfish'], ['Egg'], ['Soy']]),
  },
];

export const modifierGroup = (id: string): ModifierGroup | undefined => MODIFIER_GROUPS.find((g) => g.id === id);

export interface MenuItem {
  id: string;
  menu: MenuId;
  category: string;
  name: string;
  price: number;
  description: string;
  /** Modifier group ids, in the order the dialog shows them. */
  modifiers?: string[];
}

export const MENU_ITEMS: MenuItem[] = [
  { id: 'counter-chili-dog', menu: 'counter', category: 'Grill', name: 'Chili Dog', price: 7.5, description: 'All-beef frank, house chili, steamed bun.', modifiers: ['hold', 'allergies'] },
  { id: 'counter-chicken-tenders', menu: 'counter', category: 'Grill', name: 'Chicken Tenders', price: 12.5, description: 'Four hand-breaded tenders with a dipping sauce.', modifiers: ['hold', 'allergies'] },
  { id: 'counter-lobster-roll-fries', menu: 'counter', category: 'Grill', name: 'Lobster Roll & Fries', price: 26, description: 'Buttered split-top roll, lobster salad, fries.', modifiers: ['hold', 'allergies'] },
  { id: 'counter-lobster-roll-basket', menu: 'counter', category: 'Grill', name: 'Lobster Roll Basket', price: 26, description: 'Lobster roll with a side of fries.', modifiers: ['hold', 'allergies'] },
  { id: 'counter-basket-of-fries', menu: 'counter', category: 'Grill', name: 'Basket of Fries', price: 6, description: 'Shoestring fries, sea salt.', modifiers: ['hold', 'allergies'] },
  { id: 'counter-clubhouse-cheeseburger', menu: 'counter', category: 'Burgers', name: 'Clubhouse Cheeseburger', price: 13, description: 'Quarter-pound patty, American cheese, lettuce and tomato.', modifiers: ['temperature', 'side', 'burger-addons', 'hold', 'allergies'] },
  { id: 'counter-turn-burger', menu: 'counter', category: 'Burgers', name: 'Turn Burger', price: 12, description: 'Single patty, American cheese, pickles, griddled bun.', modifiers: ['temperature', 'side', 'burger-addons', 'hold', 'allergies'] },
  { id: 'counter-bacon-bbq-burger', menu: 'counter', category: 'Burgers', name: 'Bacon BBQ Burger', price: 15, description: 'Cheddar, thick-cut bacon, crispy onions, smoky BBQ sauce.', modifiers: ['temperature', 'side', 'burger-addons', 'hold', 'allergies'] },
  { id: 'counter-double-smash-burger', menu: 'counter', category: 'Burgers', name: 'Double Smash Burger', price: 16, description: 'Two smashed patties, American cheese, house sauce.', modifiers: ['temperature', 'side', 'burger-addons', 'hold', 'allergies'] },
  { id: 'counter-veggie-burger', menu: 'counter', category: 'Burgers', name: 'Black Bean Veggie Burger', price: 12, description: 'House black bean patty, avocado, pico, chipotle mayo.', modifiers: ['temperature', 'side', 'burger-addons', 'hold', 'allergies'] },
  { id: 'counter-nashville-hot-chicken-sandwich', menu: 'counter', category: 'Sandwiches', name: 'Nashville Hot Chicken Sandwich', price: 14.5, description: 'Spiced fried chicken, pickles, brioche bun.', modifiers: ['side', 'sandwich-addons', 'hold', 'allergies'] },
  { id: 'counter-tuna-sub', menu: 'counter', category: 'Sandwiches', name: 'Tuna Sub', price: 12, description: 'Albacore tuna salad, lettuce, tomato, red onion.', modifiers: ['side', 'sandwich-addons', 'hold', 'allergies'] },
  { id: 'counter-crispy-chicken-sandwich', menu: 'counter', category: 'Sandwiches', name: 'Crispy Chicken Sandwich', price: 13.5, description: 'Breaded breast, lettuce, mayo, toasted bun.', modifiers: ['side', 'sandwich-addons', 'hold', 'allergies'] },
  { id: 'counter-meatball-marinara', menu: 'counter', category: 'Sandwiches', name: 'Meatball Marinara', price: 12.5, description: 'Meatballs, marinara and provolone on a toasted roll.', modifiers: ['side', 'sandwich-addons', 'hold', 'allergies'] },
  { id: 'counter-roast-beef-cheddar', menu: 'counter', category: 'Sandwiches', name: 'Roast Beef & Cheddar', price: 13, description: 'Shaved roast beef, cheddar, onion bun.', modifiers: ['side', 'sandwich-addons', 'hold', 'allergies'] },
  { id: 'counter-grilled-chicken-sandwich', menu: 'counter', category: 'Sandwiches', name: 'Grilled Chicken Sandwich', price: 13.5, description: 'Marinated breast, slaw, brioche bun.', modifiers: ['side', 'sandwich-addons', 'hold', 'allergies'] },
  { id: 'counter-ham-swiss-sub', menu: 'counter', category: 'Sandwiches', name: 'Ham & Swiss Sub', price: 12, description: 'Black forest ham, swiss, lettuce, tomato.', modifiers: ['side', 'sandwich-addons', 'hold', 'allergies'] },
  { id: 'counter-southwest-chicken-wrap', menu: 'counter', category: 'Sandwiches', name: 'Southwest Chicken Wrap', price: 12, description: 'Grilled chicken, peppers, black beans, chipotle.', modifiers: ['side', 'sandwich-addons', 'hold', 'allergies'] },
  { id: 'counter-clubhouse-blt', menu: 'counter', category: 'Sandwiches', name: 'Clubhouse BLT', price: 11.5, description: 'Thick-cut bacon, lettuce, tomato, mayo.', modifiers: ['side', 'sandwich-addons', 'hold', 'allergies'] },
  { id: 'counter-3-musketeers', menu: 'counter', category: 'Snacks', name: '3 Musketeers', price: 3, description: 'Whipped chocolate nougat bar.' },
  { id: 'counter-snickers', menu: 'counter', category: 'Snacks', name: 'Snickers', price: 3, description: 'Peanuts, caramel and nougat in milk chocolate.' },
  { id: 'counter-hershey-s-almond', menu: 'counter', category: 'Snacks', name: 'Hershey\'s Almond', price: 3, description: 'Milk chocolate with whole almonds.' },
  { id: 'counter-peanut-m-m-s', menu: 'counter', category: 'Snacks', name: 'Peanut M&M\'s', price: 3.25, description: 'Single-serve peanut chocolate candies.' },
  { id: 'counter-snickers-sharing', menu: 'counter', category: 'Snacks', name: 'Snickers — Sharing', price: 4.5, description: 'Two-bar sharing size.' },
  { id: 'counter-milk-chocolate-m-m-s', menu: 'counter', category: 'Snacks', name: 'Milk Chocolate M&M\'s', price: 3.25, description: 'Single-serve milk chocolate candies.' },
  { id: 'counter-milk-chocolate-m-m-s-sharing', menu: 'counter', category: 'Snacks', name: 'Milk Chocolate M&M\'s — Sharing', price: 5.5, description: '10 oz sharing bag.' },
  { id: 'counter-peanut-m-m-s-sharing', menu: 'counter', category: 'Snacks', name: 'Peanut M&M\'s — Sharing', price: 5.5, description: '10 oz sharing bag.' },
  { id: 'counter-kit-kat', menu: 'counter', category: 'Snacks', name: 'Kit Kat', price: 3, description: 'Crisp wafers in milk chocolate.' },
  { id: 'counter-nestl-crunch', menu: 'counter', category: 'Snacks', name: 'Nestlé Crunch', price: 3, description: 'Milk chocolate with crisped rice.' },
  { id: 'counter-kit-kat-king-size', menu: 'counter', category: 'Snacks', name: 'Kit Kat — King Size', price: 4, description: 'Four-finger king size bar.' },
  { id: 'counter-bottled-water', menu: 'counter', category: 'Drinks', name: 'Bottled Water', price: 3, description: 'Chilled still water, 20 oz.' },
  { id: 'counter-bottled-coke', menu: 'counter', category: 'Drinks', name: 'Bottled Coke', price: 3.5, description: 'Coca-Cola, 20 oz bottle.' },
  { id: 'counter-dasani-water', menu: 'counter', category: 'Drinks', name: 'Dasani Water', price: 3, description: 'Purified water, 20 oz bottle.' },
  { id: 'counter-coca-cola', menu: 'counter', category: 'Drinks', name: 'Coca-Cola', price: 3, description: 'Classic Coke, 12 oz can.' },
  { id: 'counter-miller-lite', menu: 'counter', category: 'Beer', name: 'Miller Lite', price: 7, description: 'Domestic light lager, 12 oz can.' },
  { id: 'counter-sapporo-premium', menu: 'counter', category: 'Beer', name: 'Sapporo Premium', price: 9, description: 'Japanese rice lager, tall can.' },
  { id: 'counter-redd-s-wicked', menu: 'counter', category: 'Beer', name: 'Redd\'s Wicked', price: 8, description: 'Hard fruit ale, 8% ABV.' },
  { id: 'counter-corona-extra', menu: 'counter', category: 'Beer', name: 'Corona Extra', price: 8, description: 'Mexican lager, served with lime.' },
  { id: 'counter-yes-way-ros', menu: 'counter', category: 'Wine', name: 'Yes Way Rosé', price: 12, description: 'Provençal-style rosé, by the glass.' },
  { id: 'counter-19-crimes-red', menu: 'counter', category: 'Wine', name: '19 Crimes Red', price: 13, description: 'Australian red blend, by the glass.' },
  { id: 'counter-josh-cabernet-sauvignon', menu: 'counter', category: 'Wine', name: 'Josh Cabernet Sauvignon', price: 14, description: 'California cabernet, by the glass.' },
  { id: 'counter-decoy-cabernet-sauvignon', menu: 'counter', category: 'Wine', name: 'Decoy Cabernet Sauvignon', price: 16, description: 'Duckhorn\'s Decoy cabernet, by the glass.' },
  { id: 'counter-stella-rosa-moscato', menu: 'counter', category: 'Wine', name: 'Stella Rosa Moscato', price: 12, description: 'Semi-sweet Italian moscato, by the glass.' },
  { id: 'nineteenth-crispy-calamari', menu: 'nineteenth', category: 'Starters', name: 'Crispy Calamari', price: 18, description: 'Flash-fried calamari, sweet peppers, lemon aioli.', modifiers: ['allergies'] },
  { id: 'nineteenth-ahi-tuna-tartare', menu: 'nineteenth', category: 'Starters', name: 'Ahi Tuna Tartare', price: 24, description: 'Hand-cut ahi, avocado, citrus soy, crisp wontons.', modifiers: ['allergies'] },
  { id: 'nineteenth-chili-glazed-shrimp', menu: 'nineteenth', category: 'Starters', name: 'Chili-Glazed Shrimp', price: 21, description: 'Crispy shrimp, sweet chili glaze, sesame slaw.', modifiers: ['allergies'] },
  { id: 'nineteenth-shrimp-cocktail', menu: 'nineteenth', category: 'Starters', name: 'Shrimp Cocktail', price: 26, description: 'Five chilled jumbo shrimp, horseradish cocktail sauce.', modifiers: ['allergies'] },
  { id: 'nineteenth-jumbo-lump-crab-cake', menu: 'nineteenth', category: 'Starters', name: 'Jumbo Lump Crab Cake', price: 27, description: 'All lump crab, almost no filler, roasted pepper cream.', modifiers: ['allergies'] },
  { id: 'nineteenth-crispy-rice-tuna-bites', menu: 'nineteenth', category: 'Starters', name: 'Crispy Rice Tuna Bites', price: 22, description: 'Seared tuna over crisped sushi rice, spicy aioli.', modifiers: ['allergies'] },
  { id: 'nineteenth-steakhouse-roll', menu: 'nineteenth', category: 'Starters', name: 'Steakhouse Roll', price: 23, description: 'Seared filet, avocado and chive, chipotle drizzle.', modifiers: ['allergies'] },
  { id: 'nineteenth-honey-butter-rolls', menu: 'nineteenth', category: 'Starters', name: 'Honey Butter Rolls', price: 9, description: 'Pull-apart brioche rolls, warm honey butter.', modifiers: ['allergies'] },
  { id: 'nineteenth-herb-crusted-lamb-chops', menu: 'nineteenth', category: 'Starters', name: 'Herb-Crusted Lamb Chops', price: 29, description: 'Three chops, salsa verde, charred scallion.', modifiers: ['allergies'] },
  { id: 'nineteenth-caesar-salad', menu: 'nineteenth', category: 'Salads', name: 'Caesar Salad', price: 15, description: 'Whole romaine hearts, parmesan, garlic croutons.', modifiers: ['salad-protein', 'allergies'] },
  { id: 'nineteenth-iceberg-wedge', menu: 'nineteenth', category: 'Salads', name: 'Iceberg Wedge', price: 16, description: 'Blue cheese, heirloom tomato, smoked bacon.', modifiers: ['salad-protein', 'allergies'] },
  { id: 'nineteenth-burrata-and-tomato', menu: 'nineteenth', category: 'Salads', name: 'Burrata & Heirloom Tomato', price: 19, description: 'Creamy burrata, aged balsamic, basil oil.', modifiers: ['salad-protein', 'allergies'] },
  { id: 'nineteenth-chopped-bacon-salad', menu: 'nineteenth', category: 'Salads', name: 'Chopped Salad with Thick-Cut Bacon', price: 18, description: 'Slab bacon, watermelon radish, buttermilk dressing.', modifiers: ['salad-protein', 'allergies'] },
  { id: 'nineteenth-filet-mignon-8oz', menu: 'nineteenth', category: 'Steaks', name: 'Filet Mignon 8 oz', price: 62, description: 'Center-cut prime tenderloin, seared and rested.', modifiers: ['temperature', 'steak-addons', 'allergies'] },
  { id: 'nineteenth-petite-filet-6oz', menu: 'nineteenth', category: 'Steaks', name: 'Petite Filet 6 oz', price: 52, description: 'The smaller cut of the same prime tenderloin.', modifiers: ['temperature', 'steak-addons', 'allergies'] },
  { id: 'nineteenth-ny-strip-16oz', menu: 'nineteenth', category: 'Steaks', name: 'New York Strip 16 oz', price: 68, description: 'Prime strip loin, heavy crust, deeply marbled.', modifiers: ['temperature', 'steak-addons', 'allergies'] },
  { id: 'nineteenth-ribeye-16oz', menu: 'nineteenth', category: 'Steaks', name: 'Ribeye 16 oz', price: 72, description: 'Prime ribeye, the richest cut on the board.', modifiers: ['temperature', 'steak-addons', 'allergies'] },
  { id: 'nineteenth-tomahawk-ribeye', menu: 'nineteenth', category: 'Steaks', name: 'Tomahawk Ribeye 45 oz', price: 155, description: 'Long-bone ribeye carved tableside. Serves two.', modifiers: ['temperature', 'steak-addons', 'allergies'] },
  { id: 'nineteenth-porterhouse-for-two', menu: 'nineteenth', category: 'Steaks', name: 'Porterhouse for Two 40 oz', price: 145, description: 'Strip and filet on the bone, sliced for sharing.', modifiers: ['temperature', 'steak-addons', 'allergies'] },
  { id: 'nineteenth-prime-sliced-steak', menu: 'nineteenth', category: 'Steaks', name: 'Prime Sliced Steak', price: 58, description: 'Sliced strip, sea salt, aged balsamic.', modifiers: ['temperature', 'steak-addons', 'allergies'] },
  { id: 'nineteenth-bone-in-strip', menu: 'nineteenth', category: 'Steaks', name: 'Bone-In Strip 20 oz', price: 78, description: 'Strip left on the bone for a heavier char.', modifiers: ['temperature', 'steak-addons', 'allergies'] },
  { id: 'nineteenth-steakhouse-trio', menu: 'nineteenth', category: 'Steaks', name: 'Steakhouse Trio', price: 89, description: 'Three filet medallions — oscar, scallop and shrimp.', modifiers: ['temperature', 'steak-addons', 'allergies'] },
  { id: 'nineteenth-filet-and-lobster', menu: 'nineteenth', category: 'Steaks', name: 'Filet & Lobster Tail', price: 98, description: 'Six-ounce filet with a cold-water tail and drawn butter.', modifiers: ['temperature', 'steak-addons', 'allergies'] },
  { id: 'nineteenth-filet-oscar', menu: 'nineteenth', category: 'Steaks', name: 'Filet Oscar', price: 74, description: 'Filet topped with lump crab, asparagus and béarnaise.', modifiers: ['temperature', 'steak-addons', 'allergies'] },
  { id: 'nineteenth-bone-in-ribeye-chop', menu: 'nineteenth', category: 'Chops & Seafood', name: 'Bone-In Ribeye 22 oz', price: 84, description: 'Frenched bone, prime ribeye, coarse pepper crust.', modifiers: ['temperature', 'steak-addons', 'allergies'] },
  { id: 'nineteenth-veal-chop', menu: 'nineteenth', category: 'Chops & Seafood', name: 'Veal Chop', price: 66, description: 'Thick-cut milk-fed chop, herb butter.', modifiers: ['temperature', 'steak-addons', 'allergies'] },
  { id: 'nineteenth-center-cut-pork-chop', menu: 'nineteenth', category: 'Chops & Seafood', name: 'Center-Cut Pork Chop', price: 42, description: 'Brined double chop, cider pan sauce.', modifiers: ['temperature', 'steak-addons', 'allergies'] },
  { id: 'nineteenth-blackened-salmon', menu: 'nineteenth', category: 'Chops & Seafood', name: 'Blackened Salmon', price: 42, description: 'Cajun-spiced fillet, chili-honey glaze.', modifiers: ['allergies'] },
  { id: 'nineteenth-chilean-sea-bass', menu: 'nineteenth', category: 'Chops & Seafood', name: 'Chilean Sea Bass', price: 52, description: 'Miso-glazed bass over creamed spinach.', modifiers: ['allergies'] },
  { id: 'nineteenth-seared-ahi-tuna', menu: 'nineteenth', category: 'Chops & Seafood', name: 'Seared Ahi Tuna', price: 46, description: 'Rare-seared ahi, wasabi crème, pickled carrot.', modifiers: ['allergies'] },
  { id: 'nineteenth-lobster-tail', menu: 'nineteenth', category: 'Chops & Seafood', name: 'Lobster Tail', price: 68, description: 'Cold-water tail, drawn butter, charred lemon.', modifiers: ['allergies'] },
  { id: 'nineteenth-lobster-shrimp-diavolo', menu: 'nineteenth', category: 'Chops & Seafood', name: 'Lobster & Shrimp Diavolo', price: 54, description: 'Lobster and shrimp in a spiced tomato cream.', modifiers: ['allergies'] },
  { id: 'nineteenth-grilled-jumbo-shrimp', menu: 'nineteenth', category: 'Chops & Seafood', name: 'Grilled Jumbo Shrimp', price: 26, description: 'Four shrimp, garlic butter, lemon.', modifiers: ['allergies'] },
  { id: 'nineteenth-crab-cake-napoleon', menu: 'nineteenth', category: 'Chops & Seafood', name: 'Crab Cake Napoleon', price: 34, description: 'Stacked crab cake, root vegetable slaw, demi.', modifiers: ['allergies'] },
  { id: 'nineteenth-creamed-spinach', menu: 'nineteenth', category: 'Sides', name: 'Creamed Spinach', price: 14, description: 'The steakhouse standard, nutmeg and cream.', modifiers: ['allergies'] },
  { id: 'nineteenth-skillet-corn', menu: 'nineteenth', category: 'Sides', name: 'Skillet Corn', price: 13, description: 'Sweet corn, jalapeño, cream, blistered shishitos.', modifiers: ['allergies'] },
  { id: 'nineteenth-lobster-mac-and-cheese', menu: 'nineteenth', category: 'Sides', name: 'Lobster Mac & Cheese', price: 26, description: 'Knuckle and claw meat, three cheeses, crumb top.', modifiers: ['allergies'] },
  { id: 'nineteenth-potatoes-au-gratin', menu: 'nineteenth', category: 'Sides', name: 'Potatoes Au Gratin', price: 14, description: 'Layered and baked in cream until the top sets.', modifiers: ['allergies'] },
  { id: 'nineteenth-whipped-potatoes', menu: 'nineteenth', category: 'Sides', name: 'Whipped Potatoes', price: 12, description: 'Butter-heavy, chive-finished.', modifiers: ['allergies'] },
  { id: 'nineteenth-loaded-smashed-potatoes', menu: 'nineteenth', category: 'Sides', name: 'Loaded Smashed Potatoes', price: 14, description: 'Skin-on, bacon, sharp cheddar, scallion.', modifiers: ['allergies'] },
  { id: 'nineteenth-loaded-baked-potato', menu: 'nineteenth', category: 'Sides', name: 'Loaded Baked Potato', price: 13, description: 'Sour cream, bacon, cheddar, chive.', modifiers: ['allergies'] },
  { id: 'nineteenth-grilled-asparagus', menu: 'nineteenth', category: 'Sides', name: 'Grilled Asparagus', price: 15, description: 'Charred spears, lemon and cracked pepper.', modifiers: ['allergies'] },
  { id: 'nineteenth-broccolini', menu: 'nineteenth', category: 'Sides', name: 'Broccolini', price: 13, description: 'Garlic, chili flake, olive oil.', modifiers: ['allergies'] },
  { id: 'nineteenth-steak-fries', menu: 'nineteenth', category: 'Sides', name: 'Steak Fries', price: 11, description: 'Thick-cut, twice-fried, sea salt.', modifiers: ['allergies'] },
  { id: 'nineteenth-wild-mushrooms', menu: 'nineteenth', category: 'Sides', name: 'Sautéed Wild Mushrooms', price: 14, description: 'Mixed mushrooms, thyme, sherry butter.', modifiers: ['allergies'] },
  { id: 'nineteenth-asparagus-oscar', menu: 'nineteenth', category: 'Sides', name: 'Asparagus Oscar', price: 24, description: 'Asparagus, jumbo lump crab, béarnaise.', modifiers: ['allergies'] },
  { id: 'nineteenth-bearnaise', menu: 'nineteenth', category: 'Sauces', name: 'Béarnaise', price: 4, description: 'Tarragon, shallot, clarified butter.' },
  { id: 'nineteenth-chimichurri', menu: 'nineteenth', category: 'Sauces', name: 'Chimichurri', price: 4, description: 'Parsley, oregano, garlic, red wine vinegar.' },
  { id: 'nineteenth-demi-glace', menu: 'nineteenth', category: 'Sauces', name: 'Steakhouse Demi-Glace', price: 4, description: 'Reduced veal stock, red wine.' },
  { id: 'nineteenth-horseradish-cream', menu: 'nineteenth', category: 'Sauces', name: 'Horseradish Cream', price: 4, description: 'Fresh-grated horseradish, crème fraîche.' },
  { id: 'nineteenth-peppercorn-cream', menu: 'nineteenth', category: 'Sauces', name: 'Peppercorn Cream', price: 4, description: 'Cracked green peppercorn, cognac.' },
  { id: 'nineteenth-whiskey-peppercorn', menu: 'nineteenth', category: 'Sauces', name: 'Whiskey Peppercorn', price: 4, description: 'Bourbon-laced pan sauce.' },
  { id: 'nineteenth-herb-butter', menu: 'nineteenth', category: 'Sauces', name: 'Herb Butter', price: 4, description: 'Compound butter, parsley and chive.' },
  { id: 'nineteenth-sauce-trio', menu: 'nineteenth', category: 'Sauces', name: 'Sauce Trio', price: 10, description: 'Béarnaise, chimichurri and peppercorn cream.' },
  { id: 'nineteenth-lemon-cake', menu: 'nineteenth', category: 'Desserts', name: 'Lemon Doberge Cake', price: 14, description: 'Six thin layers, lemon curd, cream cheese icing.', modifiers: ['allergies'] },
  { id: 'nineteenth-chocolate-layer-cake', menu: 'nineteenth', category: 'Desserts', name: 'Chocolate Layer Cake', price: 14, description: 'Dark chocolate ganache, whipped cream.', modifiers: ['allergies'] },
  { id: 'nineteenth-butter-cake', menu: 'nineteenth', category: 'Desserts', name: 'Butter Cake', price: 15, description: 'Warm from the oven with vanilla ice cream.', modifiers: ['allergies'] },
  { id: 'nineteenth-strawberries-and-cream', menu: 'nineteenth', category: 'Desserts', name: 'Strawberries & Cream', price: 13, description: 'Macerated berries, chantilly, shortbread.', modifiers: ['allergies'] },
];

export const menuItem = (id: string): MenuItem | undefined => MENU_ITEMS.find((i) => i.id === id);

export const menuItemsIn = (menu: MenuId, category: string): MenuItem[] =>
  MENU_ITEMS.filter((i) => i.menu === menu && i.category === category);

/** A modifier chosen for one line. Denormalised, so a ticket still reads right if the menu changes. */
export interface AppliedModifier {
  groupId: string;
  optionId: string;
  name: string;
  price: number;
  alert?: boolean;
}

/** An item's unit price with its modifiers, to the cent. */
export function priceWithModifiers(base: number, mods: AppliedModifier[]): number {
  return Math.round((base + mods.reduce((s, m) => s + m.price, 0)) * 100) / 100;
}

/**
 * The required groups an item's modifiers leave unanswered — what stops it being sent to the
 * kitchen. A burger with no temperature cannot be cooked, so it cannot be fired.
 */
export function missingRequired(item: MenuItem, mods: AppliedModifier[]): ModifierGroup[] {
  return (item.modifiers ?? [])
    .map(modifierGroup)
    .filter((g): g is ModifierGroup => Boolean(g?.required))
    .filter((g) => !mods.some((m) => m.groupId === g.id));
}
