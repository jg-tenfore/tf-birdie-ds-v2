import type { ReactNode } from 'react';
import { elevation, fontFamily, md3, radius } from '../theme/tokens';
import { ARCHIVED_EDITION, CURRENT_EDITION } from '../pos/edition';
import type { Edition } from '../pos/edition';
import type { VenueId } from '../pos/data/venues';

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
 * iframe, which is a poor way to look at a counter terminal.
 */

/**
 * The published surfaces: the **current** Birdie on the tablet and the phone, the original
 * port under `/archive/`, and the read-only original HTML. Paths and editions mirror
 * `scripts/build-site.mjs`; the editions come from `CURRENT_EDITION` / `ARCHIVED_EDITION`.
 */
export const SURFACES = {
  'current-tablet': {
    dir: 'prototype',
    app: 'tablet',
    edition: CURRENT_EDITION.tablet,
    venue: 'eighteen',
    label: 'Tablet · current',
    detail:
      'The counter terminal as the team works from it: Weston Edits plus every nav destination (V1 → V2), at the 18-hole club. Opens on the Clover Mini.',
  },
  'current-mobile': {
    dir: 'mobile',
    app: 'mobile',
    edition: CURRENT_EDITION.mobile,
    venue: 'eighteen',
    label: 'Phone · current',
    detail:
      'The phone with Weston’s edits — every phone story as a live, linked screen, plus a free-running app. Opens on the Quest handheld.',
  },
  'archive-tablet': {
    dir: 'archive/prototype',
    app: 'tablet',
    edition: ARCHIVED_EDITION,
    venue: 'three-nines',
    label: 'Tablet · archive',
    detail: 'The original port of the HTML prototype, before Weston’s rounds, at the original three-nines club.',
  },
  'archive-mobile': {
    dir: 'archive/mobile',
    app: 'mobile',
    edition: ARCHIVED_EDITION,
    venue: 'three-nines',
    label: 'Phone · archive',
    detail: 'The original phone screens, before Weston’s rounds.',
  },
  reference: {
    dir: 'reference',
    app: null,
    edition: null,
    venue: null,
    label: 'The original',
    detail: 'The single-file HTML prototype this port came from. Read-only.',
  },
} as const satisfies Record<
  string,
  {
    dir: string;
    app: 'tablet' | 'mobile' | null;
    edition: Edition | null;
    venue: VenueId | null;
    label: string;
    detail: string;
  }
>;

export type CanonicalSurfaceId = keyof typeof SURFACES;

/**
 * The ids this component used before the archive existed, one per published build. Each now
 * means what its old path redirects to — the current Birdie — at the club the old build was
 * for, so a deep link written against the three nines (`?summary=ponds`) still finds its
 * courses. Kept so existing docs pages keep working; new links should use the ids above.
 */
export const SURFACE_ALIASES = {
  prototype: { surface: 'current-tablet', venue: 'three-nines' },
  'prototype-18': { surface: 'current-tablet', venue: 'eighteen' },
  'prototype-9': { surface: 'current-tablet', venue: 'nine' },
  mobile: { surface: 'current-mobile', venue: 'three-nines' },
  'mobile-18': { surface: 'current-mobile', venue: 'eighteen' },
  'mobile-9': { surface: 'current-mobile', venue: 'nine' },
  'weston-edits': { surface: 'current-tablet', venue: null },
  'weston-edits-mobile': { surface: 'current-mobile', venue: null },
  'v1-v2': { surface: 'current-tablet', venue: null },
} as const satisfies Record<string, { surface: CanonicalSurfaceId; venue: VenueId | null }>;

export type SurfaceId = CanonicalSurfaceId | keyof typeof SURFACE_ALIASES;

/** An id, alias or not, as the surface it opens and the club it opens at. */
function resolveSurface(id: SurfaceId, venue?: VenueId): { surface: CanonicalSurfaceId; venue: VenueId | null } {
  if (id in SURFACE_ALIASES) {
    const alias = SURFACE_ALIASES[id as keyof typeof SURFACE_ALIASES];
    return { surface: alias.surface, venue: venue ?? alias.venue };
  }
  const surface = id as CanonicalSurfaceId;
  return { surface, venue: venue ?? null };
}

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
 * The prototype dev server's origin. One dev server serves both apps (the phone at
 * `/mobile/`) and every edition and club, chosen by `?edition=` and `?venue=`.
 */
const DEV_PROTOTYPE_ORIGIN =
  (import.meta.env?.VITE_PROTOTYPE_ORIGIN as string | undefined) ?? 'http://localhost:5173';

function surfaceUrl(id: SurfaceId, path = '', venueOverride?: VenueId): string {
  const { surface: sid, venue: wanted } = resolveSurface(id, venueOverride);
  const surface = SURFACES[sid];
  const venue = wanted ?? surface.venue;

  if (sid === 'reference') {
    // The reference HTML is only assembled by the site build, so in dev it points at the
    // deployed copy rather than a path that doesn't exist yet.
    return IS_DEV ? 'https://jg-tenfore.github.io/tf-birdie-ds-v2/reference/' : `./${surface.dir}/`;
  }

  if (IS_DEV) {
    const q = new URLSearchParams();
    if (surface.edition) q.set('edition', surface.edition);
    if (venue) q.set('venue', venue);
    return `${DEV_PROTOTYPE_ORIGIN}${surface.app === 'mobile' ? '/mobile/' : '/'}?${q.toString()}${path}`;
  }

  // Built: each surface is its own build with its edition and club baked in, so only a
  // different club needs saying. `./`, not `../` — docs render in `<base>/iframe.html`.
  const query = venue && venue !== surface.venue ? `?venue=${venue}` : '';
  return `./${surface.dir}/${query}${path}`;
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
  venue,
  children,
  tone = 'tonal',
  size = 'sm',
  plain = false,
}: {
  to: SurfaceId;
  /** Appended to the surface root — e.g. a deep-link hash like `#/tee-sheet`. */
  path?: string;
  /** Open at another club than the surface's own. */
  venue?: VenueId;
  children: ReactNode;
  tone?: LinkButtonTone;
  size?: 'sm' | 'md';
  /** A plain text link, for inline code-style deep links. */
  plain?: boolean;
}) {
  const href = surfaceUrl(to, path, venue);
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
  /** `path` opens the prototype somewhere other than its landing screen, e.g. `#/register`. */
  links: Array<{ to: SurfaceId; label: string; path?: string; venue?: VenueId }>;
}> = [
  {
    emoji: '🖥️',
    title: 'Tablet',
    spec: 'Counter terminal · Clover Mini 1280×800 · 21.5″ display 1920×1080',
    body: 'The current Birdie: Weston Edits plus every nav destination — register, tee sheet, courts and bays, the restaurant, operations and settings.',
    links: [
      { to: 'current-tablet', label: 'Open the tablet' },
      { to: 'current-tablet', label: 'Three nines', venue: 'three-nines' },
      { to: 'current-tablet', label: 'Single nine', venue: 'nine' },
    ],
  },
  {
    emoji: '📱',
    title: 'Phone',
    spec: 'Handheld · Quest 360×800 · Clover Flex 360×720 · MD3',
    body: 'Weston’s edits on the phone: every phone story as a live, linked screen, plus a free-running app from the Tee Sheet.',
    links: [
      { to: 'current-mobile', label: 'Open the phone' },
      { to: 'current-mobile', label: 'Three nines', venue: 'three-nines' },
      { to: 'current-mobile', label: 'Single nine', venue: 'nine' },
    ],
  },
  {
    emoji: '🗄️',
    title: 'Archive',
    spec: 'The original port · three nines',
    body: 'The port of the HTML prototype as it stood before Weston’s rounds — still running, for comparison.',
    links: [
      { to: 'archive-tablet', label: 'Tablet' },
      { to: 'archive-mobile', label: 'Phone' },
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
              <SiteLink
                key={`${l.to}:${l.venue ?? ''}`}
                to={l.to}
                path={l.path}
                venue={l.venue}
                size="md"
                // A prototype's first link is the filled one; only the read-only original is outlined.
                tone={l.to === 'reference' ? 'outlined' : i === 0 ? 'filled' : 'tonal'}
              >
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
 * Defaults to `prototype` — now the current tablet at the three-nines club, which is the one
 * the deep-link documentation's examples are written against.
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

/** The prototypes as a linked list — current first, then the archive. */
export function PrototypeLinks({ mobile = false }: { mobile?: boolean } = {}) {
  const ids: CanonicalSurfaceId[] = mobile ? ['current-mobile', 'archive-mobile'] : ['current-tablet', 'archive-tablet'];
  return (
    <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
      {ids.map((id) => (
        <li key={id} style={{ marginBottom: 10 }}>
          <SiteLink to={id}>{SURFACES[id].label}</SiteLink> {SURFACES[id].detail}
        </li>
      ))}
    </ul>
  );
}
