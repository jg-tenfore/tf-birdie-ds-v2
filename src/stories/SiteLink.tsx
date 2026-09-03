import type { ReactNode } from 'react';

/**
 * Links from Storybook docs to the published prototypes and the reference HTML.
 *
 * These need a component rather than a plain Markdown link because the correct target
 * differs by environment, and a naive relative path is wrong in both:
 *
 *  - **Deployed**, MDX renders inside the preview iframe at `<base>/iframe.html`, so `../`
 *    climbs past the repo segment — `/tf-birdie-ds-v2/iframe.html` + `../prototype/` lands
 *    on `/prototype/`, which 404s. `./` is what resolves correctly.
 *  - **Locally**, the surfaces are separate dev servers. Storybook and the prototype run on
 *    different ports, so no relative path can reach one from the other.
 *
 * They also open in a new tab: a same-frame link would load the whole POS *inside* the docs
 * iframe, which is a poor way to look at a 1366×840 terminal.
 */

/** The three published prototypes, and the read-only original. */
export const SURFACES = {
  prototype: {
    dir: 'prototype',
    venue: 'three-nines',
    label: 'Three nines',
    detail: 'Ponds, Valley and Rolling as independent nine-hole tracks — twelve cells a row.',
  },
  'prototype-18': {
    dir: 'prototype-18',
    venue: 'eighteen',
    label: '18-hole course',
    detail: 'One championship course split into front and back nines — eight cells a row.',
  },
  'prototype-9': {
    dir: 'prototype-9',
    venue: 'nine',
    label: 'Single nine',
    detail: 'One nine-hole course — four cells a row, the sparsest of the three.',
  },
  reference: {
    dir: 'reference',
    venue: null,
    label: 'The original',
    detail: 'The single-file HTML prototype this port came from. Read-only.',
  },
} as const;

export type SurfaceId = keyof typeof SURFACES;

/**
 * Whether Storybook is running from its dev server rather than a built site.
 *
 * A built site always has the prototype directories sitting next to it; a dev server never
 * does, because the prototype is a separate Vite process. Detected by the absence of a file
 * extension is unreliable, so this keys on the dev server's own marker: Vite injects
 * `import.meta.env.DEV`, which is true in `storybook dev` and false in `storybook build`.
 */
const IS_DEV = Boolean(import.meta.env?.DEV);

/**
 * The prototype dev server's port.
 *
 * Only one venue runs at a time in dev (whichever `VITE_VENUE` was set), so dev links carry
 * `?venue=` to switch — the app honours it regardless of which build it is.
 */
const DEV_PROTOTYPE_ORIGIN =
  (import.meta.env?.VITE_PROTOTYPE_ORIGIN as string | undefined) ?? 'http://localhost:5173';

function surfaceUrl(id: SurfaceId, path = ''): string {
  const surface = SURFACES[id];

  if (IS_DEV) {
    // The reference HTML is only assembled by the site build, so in dev it points at the
    // deployed copy rather than a path that doesn't exist yet.
    if (id === 'reference') return 'https://jg-tenfore.github.io/tf-birdie-ds-v2/reference/';

    // One dev server serves whichever venue it was started with; `?venue=` picks another.
    const hash = path.startsWith('#') ? path : '';
    const sep = hash.includes('?') ? '&' : '?';
    return `${DEV_PROTOTYPE_ORIGIN}/${hash}${hash ? sep : '#/register?'}venue=${surface.venue}`;
  }

  return `./${surface.dir}/${path}`;
}

export function SiteLink({
  to,
  path = '',
  children,
}: {
  to: SurfaceId;
  /** Appended to the surface root — e.g. a deep-link hash like `#/tee-sheet`. */
  path?: string;
  children: ReactNode;
}) {
  return (
    <a href={surfaceUrl(to, path)} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

/**
 * A deep link into a prototype, e.g. `<DeepLink hash="#/tee-sheet?shift=peak">`.
 *
 * Defaults to the three-nines club, which is the one the deep-link documentation's examples
 * are written against.
 */
export function DeepLink({
  hash,
  to = 'prototype',
  children,
}: {
  hash: string;
  to?: SurfaceId;
  children?: ReactNode;
}) {
  return (
    <SiteLink to={to} path={hash}>
      <code>{children ?? hash}</code>
    </SiteLink>
  );
}

/** The three prototypes as a linked list — used by the Introduction and Deep Links pages. */
export function PrototypeLinks() {
  const ids: SurfaceId[] = ['prototype', 'prototype-18', 'prototype-9'];
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          <SiteLink to={id}>
            <strong>{SURFACES[id].label} →</strong>
          </SiteLink>{' '}
          {SURFACES[id].detail}
        </li>
      ))}
    </ul>
  );
}
