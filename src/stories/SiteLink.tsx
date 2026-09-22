import type { ReactNode } from 'react';
import { elevation, fontFamily, md3, radius } from '../theme/tokens';

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

/** The published prototypes — three terminal clubs and the phone — and the read-only original. */
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
  mobile: {
    dir: 'mobile',
    venue: 'three-nines',
    label: 'Mobile · Three nines',
    detail:
      'The phone app at 402×797 — every Mobile Screens story as a live, linked screen, plus a free-running app.',
  },
  'mobile-18': {
    dir: 'mobile-18',
    venue: 'eighteen',
    label: 'Mobile · 18-hole course',
    detail: 'The same phone screens against the championship course and its two nines.',
  },
  'mobile-9': {
    dir: 'mobile-9',
    venue: 'nine',
    label: 'Mobile · Single nine',
    detail: 'The same phone screens against one nine-hole course.',
  },
  'weston-edits': {
    dir: 'weston-edits',
    venue: 'eighteen',
    label: 'Weston Edits · Tablet',
    detail: 'The 18-hole terminal with the golf-first reservation flow: click a tee time, adjust the golf in a slide-over, then check in and pay.',
  },
  'weston-edits-mobile': {
    dir: 'weston-edits-mobile',
    venue: 'eighteen',
    label: 'Weston Edits · Mobile',
    detail: 'The same edits on the phone, at the 18-hole club.',
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

    // Weston's edits: the same dev server with `?edition=weston`, at the 18-hole club.
    if (id === 'weston-edits') {
      return `${DEV_PROTOTYPE_ORIGIN}/?edition=weston${path || '#/tee-sheet'}${path.includes('?') ? '&' : '?'}venue=eighteen`;
    }
    if (id === 'weston-edits-mobile') {
      return `${DEV_PROTOTYPE_ORIGIN}/mobile/?edition=weston&venue=eighteen${path}`;
    }

    // The mobile prototypes are the same dev server on its own path; `?venue=` picks the club.
    if (id === 'mobile' || id === 'mobile-18' || id === 'mobile-9') {
      return `${DEV_PROTOTYPE_ORIGIN}/mobile/?venue=${surface.venue}${path}`;
    }

    // One dev server serves whichever venue it was started with; `?venue=` picks another.
    const hash = path.startsWith('#') ? path : '';
    const sep = hash.includes('?') ? '&' : '?';
    return `${DEV_PROTOTYPE_ORIGIN}/${hash}${hash ? sep : '#/register?'}venue=${surface.venue}`;
  }

  return `./${surface.dir}/${path}`;
}

// ─── Button styling ─────────────────────────────────────────────────────────

/**
 * Docs pages render outside the MUI theme (MDX isn't wrapped by the story decorators), so
 * these links style themselves from the token layer. One `<style>` block, injected once,
 * carries the hover and focus states inline styles can't express.
 */
const BUTTON_CSS = `
.birdie-link-btn {
  display: inline-flex; align-items: center; gap: 6px;
  border-radius: ${radius.xl}px; font-family: ${fontFamily};
  font-weight: 600; text-decoration: none !important; white-space: nowrap;
  transition: background-color 100ms linear, box-shadow 100ms linear, border-color 100ms linear;
  border: 1.5px solid transparent; line-height: 1.2; vertical-align: middle;
}
.birdie-link-btn:focus-visible { outline: 2px solid ${md3.primary}; outline-offset: 2px; }
.birdie-link-btn--md { padding: 10px 18px; font-size: 14px; }
.birdie-link-btn--sm { padding: 5px 12px; font-size: 13px; }
.birdie-link-btn--filled { background: ${md3.primary}; color: ${md3.onPrimary} !important; }
.birdie-link-btn--filled:hover { background: #0f7a36; box-shadow: ${elevation.e1}; }
.birdie-link-btn--tonal { background: ${md3.primaryContainer}; color: ${md3.onPrimaryContainer} !important; }
.birdie-link-btn--tonal:hover { box-shadow: ${elevation.e1}; border-color: ${md3.primary}; }
.birdie-link-btn--outlined { background: #fff; color: ${md3.onSurface} !important; border-color: ${md3.outlineVariant}; }
.birdie-link-btn--outlined:hover { background: ${md3.surfaceContainer}; border-color: ${md3.outline}; }
.birdie-link-btn svg { flex-shrink: 0; }
`;

function ButtonStyles() {
  // React 19 hoists and dedupes <style> with `href` + `precedence`, so this renders once
  // however many buttons a page has.
  return (
    <style href="birdie-link-btn" precedence="default">
      {BUTTON_CSS}
    </style>
  );
}

/** The ↗ that marks a link as opening another app in a new tab. */
function OpenInNewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
    </svg>
  );
}

export type LinkButtonTone = 'filled' | 'tonal' | 'outlined';

/**
 * A link to a published prototype, styled as a pill button so the way out of the docs is
 * unmistakable. `tone` sets emphasis; `size="md"` is for the launchpad, `sm` for inline use in
 * tables and lists.
 */
export function SiteLink({
  to,
  path = '',
  children,
  tone = 'tonal',
  size = 'sm',
  plain = false,
}: {
  to: SurfaceId;
  /** Appended to the surface root — e.g. a deep-link hash like `#/tee-sheet`. */
  path?: string;
  children: ReactNode;
  tone?: LinkButtonTone;
  size?: 'sm' | 'md';
  /** A plain text link, for inline code-style deep links. */
  plain?: boolean;
}) {
  const href = surfaceUrl(to, path);
  if (plain) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <>
      <ButtonStyles />
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`birdie-link-btn birdie-link-btn--${tone} birdie-link-btn--${size}`}
      >
        {children}
        <OpenInNewIcon />
      </a>
    </>
  );
}

// ─── Launchpad ──────────────────────────────────────────────────────────────

const GROUPS: Array<{
  emoji: string;
  title: string;
  spec: string;
  body: string;
  links: Array<{ to: SurfaceId; label: string }>;
}> = [
  {
    emoji: '🖥️',
    title: 'Tablet prototypes',
    spec: 'Counter terminal · 1366×840',
    body: 'The full pro-shop POS: register, tee sheet, check-in and payments, with a persistent order panel.',
    links: [
      { to: 'prototype', label: 'Three nines' },
      { to: 'prototype-18', label: '18-hole course' },
      { to: 'prototype-9', label: 'Single nine' },
    ],
  },
  {
    emoji: '📱',
    title: 'Mobile prototypes',
    spec: 'Phone · 402×797 · MD3',
    body: 'Every Mobile Screens story as a live, linked screen, plus a free-running app from the Tee Sheet.',
    links: [
      { to: 'mobile', label: 'Three nines' },
      { to: 'mobile-18', label: '18-hole course' },
      { to: 'mobile-9', label: 'Single nine' },
    ],
  },
  {
    emoji: '✏️',
    title: 'Weston Edits',
    spec: '18-hole club · tablet + phone',
    body: 'Golf first, order second: a tee time opens its reservation, and only Check in & pay sends it to the register.',
    links: [
      { to: 'weston-edits', label: 'Tablet' },
      { to: 'weston-edits-mobile', label: 'Mobile' },
    ],
  },
  {
    emoji: '📄',
    title: 'The original',
    spec: 'Single-file HTML · read-only',
    body: 'The prototype this port came from, unmodified. The answer to "is this what the original did".',
    links: [{ to: 'reference', label: 'Open the original' }],
  },
];

/**
 * Every published prototype as a card of buttons: the first thing on the Introduction, so
 * nobody has to find a link inside a table to leave the docs.
 */
export function PrototypeLaunchpad() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
        margin: '24px 0 32px',
      }}
    >
      {GROUPS.map((g) => (
        <section
          key={g.title}
          style={{
            border: `1.5px solid ${md3.outlineVariant}`,
            borderRadius: radius.lg,
            padding: 20,
            background: md3.surface,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            fontFamily,
          }}
        >
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: md3.onSurface }}>
              {g.emoji} {g.title}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: md3.primary, marginTop: 2 }}>{g.spec}</div>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: md3.onSurfaceVariant, flex: 1 }}>{g.body}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
            {g.links.map((l, i) => (
              <SiteLink key={l.to} to={l.to} size="md" tone={i === 0 && g.links.length > 1 ? 'filled' : g.links.length === 1 ? 'outlined' : 'tonal'}>
                <span style={{ flex: 1 }}>{l.label}</span>
              </SiteLink>
            ))}
          </div>
        </section>
      ))}
    </div>
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
    <SiteLink to={to} path={hash} plain>
      <code>{children ?? hash}</code>
    </SiteLink>
  );
}

/** The prototypes as a linked list — used by the Introduction and Deep Links pages. */
export function PrototypeLinks({ mobile = false }: { mobile?: boolean } = {}) {
  const ids: SurfaceId[] = mobile
    ? ['mobile', 'mobile-18', 'mobile-9']
    : ['prototype', 'prototype-18', 'prototype-9'];
  return (
    <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
      {ids.map((id) => (
        <li key={id} style={{ marginBottom: 10 }}>
          <SiteLink to={id}>
            {SURFACES[id].label}
          </SiteLink>{' '}
          {SURFACES[id].detail}
        </li>
      ))}
    </ul>
  );
}
