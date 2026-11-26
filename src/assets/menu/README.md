# Menu photography

Every restaurant menu item's tile photo, generated with Higgsfield (`gpt_image_2_6`, 1:1, medium)
on Nov 26, 2026 for the Birdie design system. Invented, unbranded food photography: no v1 or
third-party photos are used here (v1's menu photos were not ours to publish).

- `<menu-item-id>.webp` — one per prepared dish, named exactly after the item's `id` in
  `src/pos/data/menu.ts` (e.g. `nineteenth-filet-mignon-8oz.webp`). 480×480, white background,
  three-quarter overhead, so they sit alongside the product photos in `src/assets/items/`.
- `generic/<key>.webp` — unbranded stand-ins for branded snacks, sodas, beers and wines, which
  are never pictured with their real packaging. The item → key mapping lives with the code that
  reads this folder.

Prompt pattern: "Realistic professional food photograph for a restaurant point-of-sale menu tile.
Subject: <name> — <description>, <vessel>. Single serving, centered, three-quarter overhead angle,
isolated on a pure white seamless background with a soft natural shadow, bright even daylight
studio light, appetizing, generous white margin all around. No text, no logos, no hands, no
cutlery, no other props."
