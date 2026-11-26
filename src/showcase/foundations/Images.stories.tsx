import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ITEM_IMAGES } from '../../pos/data/item-images';
import { GENERIC_FOR, GENERIC_MENU_IMAGES, MENU_IMAGES } from '../../pos/data/menu-images';
import { md3, radius } from '../../theme/tokens';
import { art } from '../../stories/docs-kit/docs-kit';
import { Group, Sheet, mono } from './foundation-parts';

/**
 * Design System › Styles › Images.
 *
 * Every image Birdie ships, read from the modules that ship it (`item-images.ts`,
 * `menu-images.ts`), so the counts and files are the product's own. Plus the docs-only art in
 * `.storybook/static/docs`, which the app never shows.
 *
 * The three single-set stories keep the ids they had when this file was copied from TF Fox
 * (`sagamore`, `kettle-hills`, `flo-golf`). Those club photo sets were never part of Birdie, so
 * the stories now show Birdie's own three sets; the ids stay because story ids are never renamed. The write-up is `src/showcase/ds-docs/content/foundations-images.tsx`.
 */

type SetKey = 'products' | 'menu' | 'docs';

const products = Object.entries(ITEM_IMAGES).sort(([a], [b]) => a.localeCompare(b));
const dishes = Object.entries(MENU_IMAGES).sort(([a], [b]) => a.localeCompare(b));
const standIns = Object.entries(GENERIC_MENU_IMAGES).sort(([a], [b]) => a.localeCompare(b));
const standInUses = (key: string) => Object.values(GENERIC_FOR).filter((k) => k === key).length;

/**
 * The docs art in .storybook/static/docs (served at `docs/<name>.webp`). Named here rather than
 * globbed: a glob would make Vite copy the files into the build a second time.
 */
const DOCS_ART = [
  'hero-overview',
  'banner-tablet',
  'banner-mobile',
  'banner-tee-sheet',
  'banner-restaurant',
  'ds-overview',
  'ds-colors',
  'ds-typography',
  'ds-spacing',
  'ds-radius',
  'ds-border',
  'ds-effect-styles',
  'ds-icons',
  'ds-logos',
  'ds-images',
];

function Thumb({ url, label, note, size = 132 }: { url: string; label: string; note?: string; size?: number }) {
  return (
    <figure style={{ margin: 0, width: size, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ width: size, height: size, borderRadius: radius.md, border: `1.5px solid ${md3.outlineVariant}`, background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={url} alt={label} loading="lazy" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
      <figcaption style={{ fontFamily: mono, fontSize: 10, color: md3.onSurfaceVariant, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>
        {label}
      </figcaption>
      {note && <span style={{ fontSize: 11, color: md3.onSurfaceVariant }}>{note}</span>}
    </figure>
  );
}

const Wall = ({ children }: { children: ReactNode }) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{children}</div>;

/** Without `only`, a sample of each set (the overview); with it, the whole set. */
const SAMPLE = 10;

function Gallery({ only }: { only?: SetKey }) {
  const show = (k: SetKey) => !only || only === k;
  const cut = <T,>(xs: T[]) => (only ? xs : xs.slice(0, SAMPLE));
  const more = (n: number, story: string) =>
    !only && n > SAMPLE ? <span style={{ alignSelf: 'center', fontSize: 12.5, color: md3.onSurfaceVariant }}>and {n - SAMPLE} more in {story}</span> : null;
  return (
    <Sheet>
      {show('products') && (
        <Group
          title={`Product photos · ${products.length} in src/assets/items`}
          intro="One per sellable good, square, 240px, padded to white. Matched to a catalog item by file name (the slugified item name), by item-images.ts. Rates, modifiers and memberships have none, by design."
        >
          <Wall>
            {cut(products).map(([slug, url]) => (
              <Thumb key={slug} url={url} label={`${slug}.png`} size={112} />
            ))}
            {more(products.length, 'Product photos')}
          </Wall>
        </Group>
      )}
      {show('menu') && (
        <>
          <Group
            title={`Menu photos · ${dishes.length} in src/assets/menu`}
            intro="One per prepared dish, 480×480 WebP, named after the dish id in menu.ts. Generated for Birdie (Higgsfield gpt_image_2_6): single serving, three-quarter overhead, on white, with no logos, hands, cutlery or props."
          >
            <Wall>
              {cut(dishes).map(([id, url]) => (
                <Thumb key={id} url={url} label={id} size={112} />
              ))}
              {more(dishes.length, 'Menu photos')}
            </Wall>
          </Group>
          <Group
            title={`Unbranded stand-ins · ${standIns.length} in src/assets/menu/generic`}
            intro="Branded snacks, sodas, beers and wines are never pictured in their real packaging. Each maps to one of these (GENERIC_FOR in menu-images.ts)."
          >
            <Wall>
              {standIns.map(([key, url]) => (
                <Thumb key={key} url={url} label={key} note={`${standInUses(key)} menu item${standInUses(key) === 1 ? '' : 's'}`} size={112} />
              ))}
            </Wall>
          </Group>
        </>
      )}
      {show('docs') && (
        <Group
          title="Docs art · .storybook/static/docs"
          intro="Scene art for these pages only: the Start Here hero and banners, and the Design System banners (Higgsfield gpt_image_2_6, 21:9). Never inside the app."
        >
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {cut(DOCS_ART).map((n) => (
              <figure key={n} style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <img src={art(n)} alt={n} loading="lazy" style={{ width: '100%', aspectRatio: '21 / 9', objectFit: 'cover', borderRadius: radius.md, border: `1.5px solid ${md3.outlineVariant}` }} />
                <figcaption style={{ fontFamily: mono, fontSize: 10.5, color: md3.onSurfaceVariant }}>{n}.webp</figcaption>
              </figure>
            ))}
          </div>
          {more(DOCS_ART.length, 'Docs art')}
        </Group>
      )}
    </Sheet>
  );
}

const meta = {
  title: 'Design System/Styles/Images',
  id: 'foundations-images',
  component: Gallery,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Gallery>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AllImages: Story = {
  name: 'All Images',
  parameters: { docs: { description: { story: 'Each set Birdie ships, sampled, with its count, source and rules; plus the docs-only art. The stories below show each set whole.' } } },
};
/** Id kept from the TF Fox port (see the header); shows the product photos. */
export const Sagamore: Story = {
  name: 'Product photos',
  args: { only: 'products' },
  parameters: { docs: { description: { story: 'The register tiles\' product photos.' } } },
};
/** Id kept from the TF Fox port; shows the menu photos and stand-ins. */
export const KettleHills: Story = {
  name: 'Menu photos',
  args: { only: 'menu' },
  parameters: { docs: { description: { story: 'The restaurant\'s dish photos and the unbranded stand-ins.' } } },
};
/** Id kept from the TF Fox port; shows the docs art. */
export const FloGolf: Story = {
  name: 'Docs art',
  args: { only: 'docs' },
  parameters: { docs: { description: { story: 'Scene art for the documentation, never shown in the app.' } } },
};
