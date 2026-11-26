import { ITEM_IMAGES } from '../../../pos/data/item-images';
import { GENERIC_FOR, GENERIC_MENU_IMAGES, MENU_IMAGES } from '../../../pos/data/menu-images';
import { ArtNote } from '../styles-kit';
import type { DsDoc } from '../types';

const PRODUCTS = Object.keys(ITEM_IMAGES).length;
const DISHES = Object.keys(MENU_IMAGES).length;
const STAND_INS = Object.keys(GENERIC_MENU_IMAGES).length;
const BRANDED = Object.keys(GENERIC_FOR).length;

/**
 * Images — product photos, menu photos and their unbranded stand-ins, and the docs-only art:
 * where each comes from, where it shows, how it's sized, and the imagery rules. Counts are read
 * from item-images.ts and menu-images.ts. Reference sheets: src/showcase/foundations/Images.stories.tsx.
 */
const doc: DsDoc = {
  art: 'ds-images',
  summary: (
    <>
      Birdie shows pictures of <strong>things you can sell</strong>, and nothing else. {PRODUCTS} product photos sit on the register's
      tiles; {DISHES} menu photos sit on the restaurant's dish tiles, with {STAND_INS} unbranded stand-ins for the {BRANDED} branded
      snacks, sodas, beers and wines. Every photo is square, on white, matched to its item by file name. Rates, modifiers and
      memberships have no picture, on purpose. Scene art exists only in these docs.
      <ArtNote>Banner: frames of three proportions with crop marks, and a tiny contour picture inside one.</ArtNote>
    </>
  ),
  status: 'core',
  statusNote: <>Used on both surfaces: the tablet's register and restaurant tiles, and the handheld's register and menu. Counts on this page are read from the code.</>,
  useFor: [
    'A sellable good on a tile: a product photo (src/assets/items) or a menu photo (src/assets/menu).',
    'A branded menu item: its unbranded stand-in (src/assets/menu/generic), never its real packaging.',
    'Docs pages: the scene art in .storybook/static/docs and the captured screenshots in docs/screens.',
  ],
  dontUseFor: [
    'Rates, modifiers, memberships, services, promotions. They stay compact text tiles; a blank image panel would read as missing.',
    'Scene art, illustrations or stock photos inside the app.',
    'Scraped, hot-linked or third-party imagery that Birdie doesn\'t have the right to publish (see Decisions).',
    'Logos and brand packaging on menu items.',
  ],
  inBirdie: [
    {
      label: 'Product tiles, tablet',
      caption: (
        <>
          Golf balls on the register: each photo fills the top of a 12px tile on white, over the name and price. A stock badge
          ("2 left") sits on the photo's corner.
        </>
      ),
      shot: 'tablet-pro-shop',
      tabletHash: '#/register/GOLF%20BALLS',
      storyId: 'prototypes-tablet-pro-shop-register-order--category-and-items',
    },
    {
      label: 'Menu photos, tablet',
      caption: (
        <>
          A tab's menu: every dish photographed the same way, single serving, three-quarter overhead on white, so a grid of very
          different food reads as one set.
        </>
      ),
      shot: 'tablet-tabs',
      tabletHash: '#/tabs?tab=T-1003',
      storyId: 'prototypes-tablet-quick-order-menu-photography--photographed-dishes',
    },
    {
      label: 'The dish dialog, tablet',
      caption: (
        <>
          The same photo, larger, at the top of the dish's options. Branded drinks show their stand-in here too: an unlabelled can,
          a glass of red.
        </>
      ),
      shot: 'tablet-dish-dialog',
      storyId: 'prototypes-tablet-quick-order-menu-photography--the-dish-dialog',
    },
  ],
  birdie: [
    { name: 'itemImage · ITEM_IMAGES', file: 'src/pos/data/item-images.ts', use: "a catalog item's product photo, by its slugified name (Titleist Pro V1 Box → titleist-pro-v1-box.png); undefined means a text tile.", surface: 'both' },
    { name: 'menuImage · GENERIC_FOR', file: 'src/pos/data/menu-images.ts', use: "a dish's photo by its id, or a branded item's unbranded stand-in.", surface: 'both' },
    { name: 'import-item-images.mjs', file: 'scripts/import-item-images.mjs', use: 'downscales the product source folder (not committed) to 240px squares padded to white.', surface: 'both' },
    { name: 'capture-screens.mjs', file: 'scripts/capture-screens.mjs', use: "the docs' screenshots, taken from the running prototype on the Clover Mini and the Quest handheld.", surface: 'both' },
  ],
  variants: [
    { name: 'Product photo', use: `${PRODUCTS} PNGs, 240 × 240, padded to white: rentals, golf balls, apparel, accessories, snacks, drinks, alcohol.`, avoid: 'Anything without a physical product.' },
    { name: 'Menu photo', use: `${DISHES} WebPs, 480 × 480, generated for Birdie: one per prepared dish, named after its id in menu.ts.`, avoid: 'Branded items.' },
    { name: 'Unbranded stand-in', use: `${STAND_INS} WebPs in menu/generic: a plain candy bar, an unlabelled can, a glass of red, standing in for ${BRANDED} branded menu items.`, avoid: 'Dishes, which get their own photo.' },
    { name: 'Screenshot', use: 'Docs only: real screens from the prototype, framed as a device (docs/screens).', avoid: 'Anything the app shows.' },
    { name: 'Scene art', use: 'Docs only: 21:9 illustrations for Start Here and the Design System banners (docs/*.webp).', avoid: 'Anything the app shows.' },
  ],
  sizing: [
    { surface: 'Tablet', size: 'Image tiles ~210px tall with the photo at ~110–120px; the dish dialog larger', why: 'A 240px product file covers a 2× display at tile size; 480px menu files cover the dialog.' },
    { surface: 'Handheld', size: 'Menu and register tiles at the phone\'s grid width', why: 'The same files; the handheld shows fewer per row.' },
  ],
  behavior: [
    'An image finds its item by file name; there is no registry. Drop in a correctly named file and the tile becomes an image tile.',
    'Two tile shapes on the register: ~210px with a photo, ~64px text-only. Which one is decided by whether the item has a photo.',
    'Images load lazily (<img loading="lazy">), so the register downloads only the category on screen.',
    'Every image goes through Vite (?url), content-hashed and base-path aware, so the same link works locally and on Pages. Nothing is hot-linked.',
  ],
  content: [
    'Product photos show the product, its packaging and nothing else: no lifestyle shots, no people.',
    'Menu photos follow one prompt: realistic, single serving, centred, three-quarter overhead, pure white seamless background, soft shadow, daylight, no text, logos, hands, cutlery or props (src/assets/menu/README.md).',
    'Alt text is the item name; a tile\'s visible label already names it, so the image can be decorative where the label is adjacent.',
  ],
  dos: [
    'Name the file after the item: the slugified catalog name for products, the menu id for dishes.',
    'Keep every photo square on white, so tiles line up and the padding disappears into the tile.',
    'Map a branded menu item to a stand-in in GENERIC_FOR.',
    'Run npm run test:unit: it fails on a file that matches no item.',
  ],
  donts: [
    'Add a blank image panel to make tiles uniform.',
    'Use v1\'s or any third party\'s photos (the menu README: "v1\'s menu photos were not ours to publish").',
    'Show a real brand\'s packaging on a menu item.',
    'Commit the product source folder (pos-item-imagery/, ~130MB); commit the downscaled files only.',
  ],
  a11y: [
    'Images never carry information the tile\'s text doesn\'t: name and price are always printed.',
    'Product and dish images get the item name as alt text, or empty alt where the name is printed beside them and would be read twice.',
    'Docs screenshots and art are illustrations; the docs say in words what each one shows.',
  ],
  decisions: [
    { decision: 'Only sellable goods get photos', why: 'A photo helps find a product on a busy register. A rate or a modifier has nothing to photograph, and a placeholder would read as missing content (CLAUDE.md, Product imagery).' },
    { decision: 'Generated menu photos', why: "v1's menu photos were not Birdie's to publish. The dishes were generated with Higgsfield (gpt_image_2_6) on Nov 26, 2026, invented and unbranded, on white so they sit beside the product photos." },
    { decision: 'Stand-ins for brands', why: 'The counter menu sells real brands, but none is pictured in its real packaging. A generic image avoids publishing a brand\'s trade dress in a prototype.' },
    { decision: 'Scene art in the docs only', why: 'The Start Here hero and banners (five 21:9 illustrations) and the Design System banners (ten more, Higgsfield gpt_image_2_6, made for these pages) explain the product to people. Inside the app every pixel is the product.' },
    {
      decision: 'Open: the product photos are scraped and branded',
      why: (
        <>
          The {PRODUCTS} product photos came from screenshots and scraped retailer galleries (<code>scripts/import-item-images.mjs</code>), and
          most golf balls show real brand packaging. That is what a real pro shop's catalog looks like, but it breaks the rule the menu
          photos were regenerated to follow. Decide before this is published more widely: license them from the vendors, have clubs
          upload their own, or generate unbranded stand-ins as the menu did.
        </>
      ),
    },
    { decision: 'Open: one format', why: 'Products are PNG at 240px; dishes are WebP at 480px. Moving products to WebP would cut their weight and match the menu.' },
  ],
  engineering: {
    import: `import { itemImage } from '../data/item-images';
import { menuImage } from '../data/menu-images';`,
    notes: [
      <>
        <code>item-images.test.ts</code> asserts every product file maps to a real catalog item and lists goods without a photo;{' '}
        <code>menu-images.test.ts</code> fails on a dish photo that matches no dish.
      </>,
      <>
        Adding a product photo: drop a correctly named PNG into <code>src/assets/items/</code>, or add a line to the map in{' '}
        <code>scripts/import-item-images.mjs</code> and re-run it against the source folder.
      </>,
      <>
        Docs art lives in <code>.storybook/static/docs</code>, not <code>public/</code>, so the prototypes on Pages don't carry it.
        Use <code>art('name')</code> and <code>screen('name')</code> from the docs kit.
      </>,
    ],
    snippet: `const src = itemImage(item.n);
return src ? (
  <Box component="img" src={src} alt="" loading="lazy" sx={{ width: '100%', aspectRatio: '1', objectFit: 'contain' }} />
) : null; // a text tile, by design`,
  },
  related: [
    { name: 'Logos', id: 'foundations-logos' },
    { name: 'Radius', id: 'foundations-radius' },
    { name: 'Card', id: 'components-layout-structure-card' },
    { name: 'Carousel', id: 'components-media-visuals-carousel' },
  ],
};

export default doc;
