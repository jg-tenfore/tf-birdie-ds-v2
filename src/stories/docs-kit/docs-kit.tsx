/**
 * Docs kit: the building blocks for Birdie's documentation pages (Start Here, the two Screen
 * indexes, the Review summaries, the Archive). Ported from TF Crane's kit so the two Storybooks
 * read the same way (hero, pills, nav cards, screen cards, sections, tables, rule cards, banners,
 * status pills), in Birdie's own colours: the MD3 roles in `src/theme/tokens.ts` and the POS green.
 *
 * ## Styling
 *
 * Birdie has no Tailwind, and Storybook's docs CSS restyles plain elements (`p`, `h2`, `a`, `ul`,
 * `table`) inside MDX. So every kit root carries `sb-unstyled`, which opts its subtree out of those
 * styles, and the kit styles itself with inline styles plus one injected `<style>` block for what
 * inline styles can't say: responsive grids, hover and focus, and `Prose`, which gives Markdown
 * written inside a kit page the kit's own look.
 *
 * ## Links
 *
 * - **Into Storybook**: `<DocLink to="<story or docs id>">`. Inside Storybook it emits
 *   `SELECT_STORY` on the preview channel, so the page switches in place without a reload and
 *   without knowing the site's base path. Opened in a new tab (or outside Storybook) it falls back
 *   to a normal `?path=` URL. Never hand-write a `?path=` anchor in MDX: it breaks under the Pages
 *   base path, and `scripts/check-doc-links.mjs` can't see it.
 * - **Into a prototype**: `tabletPrototype('#/tee-sheet')` / `mobilePrototype('<story id>')`,
 *   which go through `surfaceUrl` in `SiteLink.tsx`, so dev servers, Pages and Netlify all resolve
 *   the same way they do for every other prototype link.
 * - **Out**: `href`, opens in a new tab.
 *
 * ## Images
 *
 * `screen('tablet-tee-sheet')` is a screenshot captured by `scripts/capture-screens.mjs` into
 * `public/docs/screens/`. Art is `docs/<name>.webp`. Both are **relative** URLs: `public/docs` is a
 * Storybook static dir served at `/docs`, and docs render in `<base>/iframe.html`, so the same
 * string works on `storybook dev` and under `/tf-birdie-ds-v2/` on Pages.
 */
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { addons } from 'storybook/preview-api';
import { SELECT_STORY } from 'storybook/internal/core-events';
import { fontFamily, md3, radius } from '../../theme/tokens';
import { surfaceUrl } from '../SiteLink';
import { HandheldFrame, TerminalFrame } from './frames';
import type { FrameSize } from './frames';

/* ------------------------------------------------------------------ tokens */

/**
 * The kit's palette, from Birdie's MD3 tokens. `brandText` is the theme's `primary.dark`: the POS
 * green itself is 3.2:1 on white, fine for a filled button's large label but too light for 14px
 * link text, so text links and eyebrows use the darker step.
 */
export const DOC = {
  font: fontFamily,
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  ink: md3.onSurface,
  body: md3.onSurfaceVariant,
  muted: md3.outline,
  brand: md3.primary,
  brandText: '#0f7a36',
  brandDeep: md3.onPrimaryContainer,
  mint: md3.primaryContainer,
  mintSoft: '#e4f7ec',
  surface: md3.surface,
  container: md3.surfaceContainer,
  line: md3.surfaceHighest,
  /** The hero's hairline, as Justin asked for it on TF Crane. */
  frame: '#dfe3de',
  amber: '#fef3c7',
  amberText: '#92400e',
  rose: '#ffdad6',
  roseText: md3.error,
  scrim: md3.scrim,
} as const;

/* ------------------------------------------------------------- one stylesheet */

const KIT_CSS = `
.bd-page { font-family: ${fontFamily}; color: ${DOC.body}; font-size: 14px; line-height: 22px; -webkit-font-smoothing: antialiased; }
.bd-page *, .bd-page *::before, .bd-page *::after { box-sizing: border-box; }
.bd-page img { max-width: 100%; }
/* MDX wraps text inside a component in <p>; inside the kit that paragraph takes the component's spacing. */
.bd-page p { margin: 0; }
.bd-grid { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 720px) {
  .bd-grid--2, .bd-grid--3, .bd-grid--4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bd-split { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .bd-split--flip > :first-child { order: 2; }
}
@media (min-width: 1100px) {
  .bd-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .bd-grid--4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .bd-steps { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
}
.bd-link { color: ${DOC.brandText} !important; text-decoration: none !important; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; font-size: 14px; line-height: 20px; }
.bd-link:hover { text-decoration: underline !important; }
.bd-link:focus-visible, .bd-btn:focus-visible, .bd-card-link:focus-visible { outline: 2px solid ${DOC.brand}; outline-offset: 2px; border-radius: 6px; }
.bd-btn { display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 20px; border-radius: 999px; font-weight: 600; font-size: 15px; text-decoration: none !important; transition: filter 100ms linear, box-shadow 100ms linear; white-space: nowrap; }
.bd-btn:hover { filter: brightness(0.95); }
.bd-btn--primary { background: ${DOC.brand}; color: #fff !important; box-shadow: 0 1px 2px rgba(25,29,25,.2); }
.bd-btn--secondary { background: #fff; color: ${DOC.ink} !important; box-shadow: inset 0 0 0 1px ${DOC.frame}; }
.bd-card-link { text-decoration: none !important; color: inherit !important; display: block; }
.bd-card-link:hover .bd-card-title { text-decoration: underline; }
.bd-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; margin: 0; }
.bd-table th, .bd-table td { border: none; padding: 12px 16px; vertical-align: top; }
.bd-table tr { background: transparent; border: none; }

/* Prose: Markdown written inside a kit page, given the kit's look. */
.bd-prose { color: ${DOC.body}; font-size: 14px; line-height: 22px; }
.bd-prose > :first-child { margin-top: 0; }
.bd-prose h2 { font-size: 22px; line-height: 28px; font-weight: 600; color: ${DOC.ink}; margin: 36px 0 12px; padding-bottom: 10px; border-bottom: 1px solid ${DOC.line}; }
.bd-prose h3 { font-size: 17px; line-height: 24px; font-weight: 600; color: ${DOC.ink}; margin: 28px 0 8px; }
.bd-prose h4 { font-size: 15px; font-weight: 600; color: ${DOC.ink}; margin: 20px 0 6px; }
.bd-prose p { margin: 10px 0; }
.bd-prose ul, .bd-prose ol { margin: 10px 0; padding-left: 22px; }
.bd-prose li { margin: 4px 0; }
.bd-prose strong { color: ${DOC.ink}; font-weight: 600; }
.bd-prose a { color: ${DOC.brandText}; font-weight: 600; text-decoration: none; }
.bd-prose a:hover { text-decoration: underline; }
.bd-prose code { font-family: ${DOC.mono}; font-size: 12.5px; background: ${DOC.container}; color: ${DOC.ink}; padding: 1px 5px; border-radius: 5px; }
.bd-prose pre { background: ${DOC.container}; border-radius: 12px; padding: 14px 16px; overflow-x: auto; }
.bd-prose pre code { background: none; padding: 0; }
.bd-prose blockquote { margin: 16px 0; padding: 2px 0 2px 16px; border-left: 3px solid ${DOC.mint}; color: ${DOC.body}; font-style: italic; }
.bd-prose table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 14px 0 18px; font-size: 13.5px; line-height: 20px; border-radius: 12px; overflow: hidden; box-shadow: inset 0 0 0 1px ${DOC.line}; }
.bd-prose th { background: ${DOC.surface}; color: ${DOC.ink}; font-weight: 600; text-align: left; padding: 10px 14px; border: none; }
.bd-prose td { padding: 10px 14px; border: none; border-top: 1px solid ${DOC.line}; vertical-align: top; }
.bd-prose tr:nth-child(even) td { background: #fbfcfb; }
`;

/** The kit's stylesheet. React 19 hoists and dedupes it by `href`, so it renders once per page. */
export const KitStyles = () => (
  <style href="birdie-docs-kit" precedence="default">
    {KIT_CSS}
  </style>
);

/* ------------------------------------------------------------------- links */

/** Docs pages end in `--overview` (Birdie's `docs.defaultName`); anything else is a story. */
const isDocsId = (id: string) => id.endsWith('--overview') || id.endsWith('--navigation-map');

/** A Storybook id → its `?path=` query, relative to the manager. */
export const storyPath = (id: string) => `?path=/${isDocsId(id) ? 'docs' : 'story'}/${id}`;

const managerBase = () => {
  try {
    return (window.top ?? window).location.href.split('?')[0];
  } catch {
    return '';
  }
};

const go = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  try {
    e.preventDefault();
    addons.getChannel().emit(SELECT_STORY, { storyId: id, viewMode: isDocsId(id) ? 'docs' : 'story' });
  } catch {
    window.top?.location.assign(`${managerBase()}${storyPath(id)}`);
  }
};

export interface LinkTarget {
  /** Storybook id of a docs page or a story: an in-place link. */
  to?: string;
  /** Any other URL (a prototype, GitHub, a Loom): opens in a new tab. */
  href?: string;
}

export const linkProps = ({ to, href }: LinkTarget) =>
  to
    ? { href: `${managerBase()}${storyPath(to)}`, onClick: go(to), target: '_top' as const }
    : { href, target: '_blank' as const, rel: 'noreferrer' };

/* ------------------------------------------------------- prototype URLs */

/**
 * The current tablet prototype, at a hash route (`#/tee-sheet`, `#/register?order=walkin`).
 * Through `surfaceUrl`, so this is the same URL every other prototype link on the site uses.
 */
export const tabletPrototype = (hash = '#/register') => surfaceUrl('current-tablet', hash);

/**
 * The current phone prototype. `route` is a screen's story id (the phone prototype routes by
 * them: `#/<story id>`); empty opens the free-running app on the Tee Sheet.
 */
export const mobilePrototype = (route = '') => surfaceUrl('current-mobile', route ? `#/${encodeURI(route)}` : '');

/** The original port, kept running under `/archive/`. */
export const archivePrototype = (app: 'tablet' | 'mobile', path = '') => surfaceUrl(app === 'tablet' ? 'archive-tablet' : 'archive-mobile', path);

/** The original HTML prototype, read-only. */
export const referencePrototype = () => surfaceUrl('reference');

/** A screenshot from `scripts/capture-screens.mjs` (`public/docs/screens/<name>.webp`). */
export const screen = (name: string) => `docs/screens/${name}.webp`;

/** A piece of Start Here art (`public/docs/<name>.webp`). */
export const art = (name: string) => `docs/${name}.webp`;

/* ----------------------------------------------------------------- icons */

const Arrow = ({ external }: { external?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {external ? <path d="M7 17 17 7M8 7h9v9" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
  </svg>
);

/** Inline text link with an arrow: → inside Storybook, ↗ out of it. */
export const DocLink = ({ children, style, ...t }: LinkTarget & { children: ReactNode; style?: CSSProperties }) => (
  <a {...linkProps(t)} className="bd-link" style={style}>
    {children}
    <Arrow external={!t.to} />
  </a>
);

/** Filled (primary) or outlined (secondary) button-link. */
export const DocButton = ({ children, variant = 'primary', ...t }: LinkTarget & { children: ReactNode; variant?: 'primary' | 'secondary' }) => (
  <a {...linkProps(t)} className={`bd-btn bd-btn--${variant}`}>
    {children}
    <Arrow external={!t.to} />
  </a>
);

/* -------------------------------------------------------------- primitives */

/** Caps eyebrow in Birdie green. */
export const Eyebrow = ({ children, color = DOC.brandText }: { children: ReactNode; color?: string }) => (
  <span style={{ display: 'block', fontSize: 12, lineHeight: '16px', fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color }}>{children}</span>
);

export type PillTone = 'plain' | 'brand' | 'mint' | 'amber';

/** Small fact pill ("184 stories"). Prefer a computed count to a typed one: typed counts go stale. */
export const Pill = ({ children, tone = 'plain' }: { children: ReactNode; tone?: PillTone }) => {
  const tones: Record<PillTone, CSSProperties> = {
    plain: { background: '#fff', color: DOC.ink, boxShadow: `inset 0 0 0 1px ${DOC.frame}` },
    brand: { background: DOC.brand, color: '#fff' },
    mint: { background: DOC.mint, color: DOC.brandDeep },
    amber: { background: DOC.amber, color: DOC.amberText },
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 13px', borderRadius: 999, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', ...tones[tone] }}>
      {children}
    </span>
  );
};

export const Pills = ({ children }: { children: ReactNode }) => <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</span>;

export type StatusTone = 'done' | 'now' | 'next' | 'open' | 'parked' | 'dropped';

const STATUS_STYLE: Record<StatusTone, CSSProperties> = {
  done: { background: DOC.mint, color: DOC.brandDeep },
  now: { background: DOC.ink, color: '#fff' },
  next: { background: '#fff', color: DOC.body, boxShadow: `inset 0 0 0 1px ${DOC.frame}` },
  open: { background: DOC.amber, color: DOC.amberText },
  parked: { background: DOC.container, color: DOC.body },
  dropped: { background: DOC.rose, color: DOC.roseText },
};

const STATUS_LABEL: Record<StatusTone, string> = {
  done: 'Done',
  now: 'Now',
  next: 'Next',
  open: 'Open',
  parked: 'Parked',
  dropped: 'Dropped',
};

/** Status pill for decisions, steps and timelines. The label defaults to the tone's name. */
export const StatusPill = ({ tone, children }: { tone: StatusTone; children?: ReactNode }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', ...STATUS_STYLE[tone] }}>
    {children ?? STATUS_LABEL[tone]}
  </span>
);

/** Root wrapper for a docs page: opts out of Storybook's docs styles and loads the kit's. */
export const DocPage = ({ children }: { children: ReactNode }) => (
  <div className="sb-unstyled bd-page">
    <KitStyles />
    {children}
  </div>
);

/** Markdown inside a kit page, styled like the kit (headings, tables, quotes, code). */
export const Prose = ({ children }: { children: ReactNode }) => <div className="bd-prose">{children}</div>;

/**
 * A paragraph with docs spacing. A `div`, because MDX already wraps the text inside it in a `<p>`,
 * and a `<p>` in a `<p>` is invalid HTML.
 */
export const P = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ margin: '12px 0 0', fontSize: 15, lineHeight: '24px', color: DOC.body, maxWidth: 860, ...style }}>{children}</div>
);

/** Inline code chip. */
export const Code = ({ children }: { children: ReactNode }) => (
  <code style={{ fontFamily: DOC.mono, fontSize: 12.5, background: DOC.container, color: DOC.ink, padding: '1px 6px', borderRadius: 6, whiteSpace: 'nowrap' }}>{children}</code>
);

/* ------------------------------------------------------------------- heroes */

export interface HeroProps {
  eyebrow: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  pills?: ReactNode;
  actions?: ReactNode;
  /** Art on the right (a relative image URL), behind a white fade so the copy reads on the left. */
  art?: string;
  /** Screens in their own band under the hero. */
  screens?: ReactNode;
  footnote?: ReactNode;
}

/**
 * The landing hero (Start Here › Overview), laid out like TF Crane's and TF Buck's: a white card
 * with a 1px hairline, the art as a cover background anchored right, a white left-to-right fade
 * so the copy sits on open sky, then the live screens in their own band, then a caption.
 */
export const Hero = ({ eyebrow, title, children, pills, actions, art, screens, footnote }: HeroProps) => (
  <section style={{ overflow: 'hidden', borderRadius: 20, background: '#fff', border: `1px solid ${DOC.frame}`, margin: '8px 0 32px' }}>
    <div style={{ position: 'relative', ...(art ? { backgroundImage: `url(${art})`, backgroundSize: 'cover', backgroundPosition: 'right center' } : {}) }}>
      {art && (
        <div
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.94) 40%, rgba(255,255,255,0) 68%)' }}
        />
      )}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16, padding: '40px 36px 36px', maxWidth: 540 }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 style={{ margin: 0, fontSize: 36, lineHeight: '42px', fontWeight: 700, letterSpacing: -0.6, color: DOC.ink }}>{title}</h1>
        {children && <div style={{ fontSize: 17, lineHeight: '27px', color: DOC.body }}>{children}</div>}
        {pills && <Pills>{pills}</Pills>}
        {actions && <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingTop: 4 }}>{actions}</div>}
      </div>
    </div>
    {screens && (
      <div className="bd-grid bd-grid--3" style={{ alignItems: 'end', gap: 20, padding: '24px 28px 20px', borderTop: `1px solid ${DOC.frame}`, background: DOC.surface }}>
        {screens}
      </div>
    )}
    {footnote && <div style={{ padding: '12px 36px', borderTop: `1px solid ${DOC.frame}`, background: '#fff', fontSize: 13, color: DOC.muted }}>{footnote}</div>}
  </section>
);

/**
 * Compact page banner with a green left rule (Style guide, How to review, review summaries).
 * `art` puts a picture on the right, faded like the hero's.
 */
export const Banner = ({ eyebrow, title, children, pills, actions, art }: Omit<HeroProps, 'screens' | 'footnote'>) => (
  <section
    style={{
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 20,
      background: '#fff',
      boxShadow: `inset 0 0 0 1px ${DOC.frame}`,
      borderLeft: `5px solid ${DOC.brand}`,
      margin: '8px 0 32px',
      ...(art ? { backgroundImage: `url(${art})`, backgroundSize: 'cover', backgroundPosition: 'right center' } : {}),
    }}
  >
    {art && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.95) 46%, rgba(255,255,255,0.15) 80%)' }} />}
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, padding: '28px 32px', maxWidth: art ? 620 : 780 }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 style={{ margin: 0, fontSize: 29, lineHeight: '36px', fontWeight: 700, letterSpacing: -0.4, color: DOC.ink }}>{title}</h1>
      {children && <div style={{ fontSize: 15, lineHeight: '25px' }}>{children}</div>}
      {pills && <Pills>{pills}</Pills>}
      {actions && <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 20, rowGap: 12, paddingTop: 6 }}>{actions}</div>}
    </div>
  </section>
);

/* ----------------------------------------------------------------- sections */

/** Section heading with a hairline rule and an optional one-line intro. */
export const Section = ({ title, intro, children, id }: { title: ReactNode; intro?: ReactNode; children?: ReactNode; id?: string }) => (
  <section id={id} style={{ margin: '44px 0 0' }}>
    <h2 style={{ margin: 0, paddingBottom: 12, borderBottom: `1px solid ${DOC.line}`, fontSize: 23, lineHeight: '30px', fontWeight: 600, color: DOC.ink }}>{title}</h2>
    {intro && <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: '22px', color: DOC.body }}>{intro}</p>}
    <div style={{ marginTop: 18 }}>{children}</div>
  </section>
);

/** A small heading inside a Section, to split its cards into groups. */
export const SubHead = ({ children, art }: { children: ReactNode; art?: string }) =>
  art ? (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        margin: '28px 0 14px',
        minHeight: 84,
        display: 'flex',
        alignItems: 'center',
        backgroundImage: `url(${art})`,
        backgroundSize: 'cover',
        backgroundPosition: 'right center',
        boxShadow: `inset 0 0 0 1px ${DOC.frame}`,
      }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.92) 38%, rgba(255,255,255,0) 72%)' }} />
      <h3 style={{ position: 'relative', margin: 0, padding: '0 22px', fontSize: 18, lineHeight: '24px', fontWeight: 600, color: DOC.ink }}>{children}</h3>
    </div>
  ) : (
    <h3 style={{ margin: '28px 0 12px', fontSize: 16, lineHeight: '22px', fontWeight: 600, color: DOC.ink }}>{children}</h3>
  );

/** Responsive card grid: one column, then two, then `cols`. */
export const Grid = ({ cols = 3, children, style }: { cols?: 2 | 3 | 4; children: ReactNode; style?: CSSProperties }) => (
  <div className={`bd-grid bd-grid--${cols}`} style={style}>
    {children}
  </div>
);

const card: CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 18, background: '#fff', boxShadow: `inset 0 0 0 1px ${DOC.line}` };

/** A card that points somewhere: eyebrow, title, a few lines, and a link at the bottom. */
export const NavCard = ({ eyebrow, title, children, cta, ...t }: LinkTarget & { eyebrow?: ReactNode; title: ReactNode; children?: ReactNode; cta?: ReactNode }) => (
  <div style={{ ...card, gap: 8, padding: 20 }}>
    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
    <h3 style={{ margin: 0, fontSize: 17, lineHeight: '24px', fontWeight: 600, color: DOC.ink }}>{title}</h3>
    {children && <div style={{ fontSize: 14, lineHeight: '22px' }}>{children}</div>}
    {cta && (t.to || t.href) && (
      <div style={{ marginTop: 'auto', paddingTop: 10 }}>
        <DocLink {...t}>{cta}</DocLink>
      </div>
    )}
  </div>
);

/** Tinted note. `mint` = context, `amber` = caution. */
export const Callout = ({ children, tone = 'mint', title }: { children: ReactNode; tone?: 'mint' | 'amber'; title?: ReactNode }) => {
  const t = tone === 'amber' ? { bg: DOC.amber, rule: '#d6a046' } : { bg: DOC.mintSoft, rule: DOC.brand };
  return (
    <div style={{ background: t.bg, borderLeft: `4px solid ${t.rule}`, borderRadius: 14, padding: '16px 20px', fontSize: 14, lineHeight: '22px', margin: '20px 0' }}>
      {title && <strong style={{ color: DOC.ink }}>{title} </strong>}
      {children}
    </div>
  );
};

/** A quote with attribution. */
export const Quote = ({ children, cite }: { children: ReactNode; cite?: ReactNode }) => (
  <blockquote style={{ margin: '18px 0', padding: '2px 0 2px 16px', borderLeft: `3px solid ${DOC.mint}`, fontSize: 15, lineHeight: '24px', fontStyle: 'italic', color: DOC.body }}>
    {children}
    {cite && <div style={{ marginTop: 6, fontSize: 13, fontStyle: 'normal', color: DOC.muted }}>{cite}</div>}
  </blockquote>
);

/** Plain data table (decisions, left open, devices). Rows are arrays of cells. */
export const DocTable = ({ columns, rows, widths }: { columns: ReactNode[]; rows: ReactNode[][]; widths?: (string | number)[] }) => (
  <div style={{ overflowX: 'auto', borderRadius: 14, boxShadow: `inset 0 0 0 1px ${DOC.line}` }}>
    <table className="bd-table">
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th key={i} style={{ width: widths?.[i], background: DOC.surface, color: DOC.ink, fontWeight: 600 }}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td key={j} style={{ lineHeight: '21px', borderTop: `1px solid ${DOC.line}`, background: i % 2 ? '#fbfcfb' : '#fff', color: j === 0 ? DOC.ink : DOC.body }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/** Open-decision card: what's built against the alternative. */
export const Choice = ({ title, built, alternative, ...t }: LinkTarget & { title: ReactNode; built: ReactNode; alternative: ReactNode }) => (
  <div style={{ ...card, gap: 12, padding: 20 }}>
    <h3 style={{ margin: 0, fontSize: 16, lineHeight: '22px', fontWeight: 600, color: DOC.ink }}>{title}</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <div style={{ background: DOC.mintSoft, borderRadius: 12, padding: 12, fontSize: 13.5, lineHeight: '20px' }}>
        <Eyebrow color={DOC.brandText}>Built as</Eyebrow>
        <div style={{ marginTop: 4, color: DOC.ink }}>{built}</div>
      </div>
      <div style={{ background: DOC.surface, borderRadius: 12, padding: 12, fontSize: 13.5, lineHeight: '20px', boxShadow: `inset 0 0 0 1px ${DOC.line}` }}>
        <Eyebrow color={DOC.muted}>Or</Eyebrow>
        <div style={{ marginTop: 4 }}>{alternative}</div>
      </div>
    </div>
    {(t.to || t.href) && (
      <div style={{ marginTop: 'auto' }}>
        <DocLink {...t}>See it</DocLink>
      </div>
    )}
  </div>
);

/** Bullet list with green dots and a bold lead-in per item. */
export const Bullets = ({ items }: { items: [lead: ReactNode, rest: ReactNode][] }) => (
  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
    {items.map(([lead, rest], i) => (
      <li key={i} style={{ position: 'relative', paddingLeft: 16, margin: 0 }}>
        <span aria-hidden="true" style={{ position: 'absolute', top: 8, left: 0, width: 6, height: 6, borderRadius: 999, background: DOC.brand }} />
        <strong style={{ color: DOC.ink, fontWeight: 600 }}>{lead}</strong> {rest}
      </li>
    ))}
  </ul>
);

/* ------------------------------------------------------------------ screens */

export type FrameKind = 'terminal' | 'handheld';

/** The two simulated sizes the screenshots are captured at (Clover Mini, Quest handheld). */
export const SHOT_SIZE: Record<FrameKind, FrameSize> = {
  terminal: { width: 1280, height: 800 },
  handheld: { width: 360, height: 800 },
};

/**
 * A screenshot in its flat device frame, on a soft panel. A terminal shows whole; a handheld
 * shows its top part (`peek`), which is where every phone screen says what it is.
 */
export const ScreenThumb = ({ src, frame = 'terminal', alt = '', badge, size, peek = 230 }: { src: string; frame?: FrameKind; alt?: string; badge?: ReactNode; size?: FrameSize; peek?: number }) => (
  <div
    style={{
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      overflow: 'hidden',
      borderRadius: 14,
      background: DOC.container,
      padding: frame === 'terminal' ? '16px 18px 12px' : '16px 0 0',
      ...(frame === 'handheld' ? { height: peek } : {}),
    }}
  >
    {frame === 'terminal' ? (
      <TerminalFrame src={src} alt={alt} size={size ?? SHOT_SIZE.terminal} width="100%" />
    ) : (
      <HandheldFrame src={src} alt={alt} size={size ?? SHOT_SIZE.handheld} width={Math.round(peek * 0.62)} />
    )}
    {badge && (
      <span style={{ position: 'absolute', top: 10, right: 10, display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 11px', borderRadius: 999, background: DOC.brand, color: '#fff', fontSize: 12, fontWeight: 700 }}>
        {badge}
      </span>
    )}
  </div>
);

export interface ScreenCardProps {
  src: string;
  frame?: FrameKind;
  badge?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  /** "Look at:" what a reviewer should judge on this screen. */
  lookAt?: ReactNode;
  links?: (LinkTarget & { label: ReactNode })[];
}

/** Screenshot card: framed screen, eyebrow, title, description, "Look at:", links. */
export const ScreenCard = ({ src, frame, badge, eyebrow, title, children, lookAt, links }: ScreenCardProps) => (
  <div style={{ ...card, overflow: 'hidden', padding: 12 }}>
    <ScreenThumb src={src} frame={frame} badge={badge} />
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 8, padding: '16px 8px 8px' }}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h3 className="bd-card-title" style={{ margin: 0, fontSize: 17, lineHeight: '24px', fontWeight: 600, color: DOC.ink }}>{title}</h3>
      {children && <div style={{ fontSize: 14, lineHeight: '22px' }}>{children}</div>}
      {lookAt && (
        <div style={{ fontSize: 14, lineHeight: '22px' }}>
          <strong style={{ color: DOC.ink, fontWeight: 600 }}>Look at:</strong> {lookAt}
        </div>
      )}
      {links && links.length > 0 && (
        <div style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', flexWrap: 'wrap', columnGap: 16, rowGap: 4 }}>
          {links.map(({ label, ...t }, i) => (
            <DocLink key={i} {...t}>
              {label}
            </DocLink>
          ))}
        </div>
      )}
    </div>
  </div>
);

/** A screen in the hero's band, with a caption, optionally a link. */
export const HeroScreen = ({ src, label, frame = 'terminal', ...t }: LinkTarget & { src: string; label: ReactNode; frame?: FrameKind }) => {
  const body = (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {frame === 'terminal' ? (
        <TerminalFrame src={src} size={SHOT_SIZE.terminal} width="100%" />
      ) : (
        <span style={{ display: 'block', height: 196, overflow: 'hidden' }}>
          <HandheldFrame src={src} size={SHOT_SIZE.handheld} width={120} />
        </span>
      )}
      <span style={{ fontSize: 13, fontWeight: 600, color: DOC.body }}>{label}</span>
    </span>
  );
  return t.to || t.href ? (
    <a {...linkProps(t)} className="bd-card-link">
      {body}
    </a>
  ) : (
    body
  );
};

/* ----------------------------------------------------------- process / time */

export interface Step {
  label: ReactNode;
  status: 'now' | 'next' | 'done';
  title: ReactNode;
  body?: ReactNode;
  owner?: ReactNode;
}

/** Numbered steps in a row; the current one is tinted. */
export const Steps = ({ steps }: { steps: Step[] }) => (
  <div className="bd-grid bd-steps" style={{ gap: 0, overflow: 'hidden', borderRadius: 18, boxShadow: `inset 0 0 0 1px ${DOC.line}` }}>
    {steps.map((s, i) => (
      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 20, background: s.status === 'now' ? DOC.mintSoft : '#fff', borderLeft: i ? `1px solid ${DOC.line}` : undefined }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Eyebrow color={s.status === 'now' ? DOC.brandText : DOC.muted}>{s.label}</Eyebrow>
          <StatusPill tone={s.status} />
        </span>
        <h3 style={{ margin: 0, fontSize: 17, lineHeight: '24px', fontWeight: 600, color: DOC.ink }}>{s.title}</h3>
        {s.body && <div style={{ fontSize: 14, lineHeight: '22px' }}>{s.body}</div>}
        {s.owner && <div style={{ marginTop: 'auto', paddingTop: 4, fontSize: 13, color: DOC.muted }}>{s.owner}</div>}
      </div>
    ))}
  </div>
);

export interface Milestone {
  date: ReactNode;
  status: 'done' | 'now' | 'next';
  title: ReactNode;
  body?: ReactNode;
  img?: string;
  frame?: FrameKind;
  link?: LinkTarget & { label: ReactNode };
}

/** Vertical milestone timeline, with a screen per item where there is one. */
export const Timeline = ({ items }: { items: Milestone[] }) => (
  <ol style={{ position: 'relative', margin: 0, padding: '0 0 0 40px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
    <span aria-hidden="true" style={{ position: 'absolute', top: 12, bottom: 12, left: 15, width: 2, background: `linear-gradient(${DOC.brand}, ${DOC.line})` }} />
    {items.map((m, i) => (
      <li key={i} style={{ position: 'relative', margin: 0 }}>
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 22,
            left: -33,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: m.status === 'next' ? '#fff' : DOC.brand,
            boxShadow: m.status === 'next' ? `inset 0 0 0 2px ${DOC.muted}` : m.status === 'now' ? `0 0 0 4px ${DOC.mint}` : undefined,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, borderRadius: 18, padding: 20, background: m.status === 'now' ? DOC.mintSoft : '#fff', boxShadow: `inset 0 0 0 1px ${m.status === 'now' ? '#bfe6cd' : DOC.line}` }}>
          <div style={{ display: 'flex', flex: 1, minWidth: 0, flexDirection: 'column', gap: 6 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eyebrow color={DOC.brandText}>{m.date}</Eyebrow>
              <StatusPill tone={m.status} />
            </span>
            <h3 style={{ margin: 0, fontSize: 16, lineHeight: '22px', fontWeight: 600, color: DOC.ink }}>{m.title}</h3>
            {m.body && <div style={{ fontSize: 14, lineHeight: '22px' }}>{m.body}</div>}
            {m.link && (
              <div style={{ paddingTop: 4 }}>
                <DocLink {...m.link}>{m.link.label}</DocLink>
              </div>
            )}
          </div>
          {m.img && (
            <div style={{ width: 210, flexShrink: 0 }}>
              <ScreenThumb src={m.img} frame={m.frame} peek={170} />
            </div>
          )}
        </div>
      </li>
    ))}
  </ol>
);

/** A row of numbered cells (set-up steps). */
export const NumberedRow = ({ items }: { items: { title: ReactNode; body: ReactNode }[] }) => (
  <div className="bd-grid bd-grid--3" style={{ gap: 0, overflow: 'hidden', borderRadius: 18, boxShadow: `inset 0 0 0 1px ${DOC.line}` }}>
    {items.map((s, i) => (
      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 20, background: '#fff', borderLeft: i ? `1px solid ${DOC.line}` : undefined }}>
        <Eyebrow color={DOC.muted}>{i + 1}</Eyebrow>
        <h3 style={{ margin: 0, fontSize: 17, lineHeight: '24px', fontWeight: 600, color: DOC.ink }}>{s.title}</h3>
        <div style={{ fontSize: 14, lineHeight: '22px' }}>{s.body}</div>
      </div>
    ))}
  </div>
);

/** A colour chip with its name, value and use. */
export const Swatch = ({ color, name, value, use, ring }: { color: string; name: ReactNode; value: ReactNode; use: ReactNode; ring?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 16, background: '#fff', padding: 12, boxShadow: `inset 0 0 0 1px ${DOC.line}` }}>
    <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: radius.md, background: color, boxShadow: ring ? `inset 0 0 0 1px ${DOC.line}` : undefined }} />
    <span style={{ display: 'flex', minWidth: 0, flexDirection: 'column', fontSize: 13.5, lineHeight: '20px' }}>
      <span>
        <strong style={{ color: DOC.ink, fontWeight: 600 }}>{name}</strong> <span style={{ color: DOC.muted }}>· {value}</span>
      </span>
      <span>{use}</span>
    </span>
  </div>
);

/* ------------------------------------------------------------- style guide */

/** A bigger framed screen than `ScreenThumb`, for rule cards. A handheld peeks at `height`. */
export const BigThumb = ({ src, frame = 'terminal', alt = '', height = 330, size }: { src: string; frame?: FrameKind; alt?: string; height?: number; size?: FrameSize }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      overflow: 'hidden',
      borderRadius: 14,
      background: DOC.container,
      padding: frame === 'terminal' ? '20px 20px 14px' : '20px 0 0',
      ...(frame === 'handheld' ? { height } : {}),
    }}
  >
    {frame === 'terminal' ? (
      <TerminalFrame src={src} alt={alt} size={size ?? SHOT_SIZE.terminal} width="100%" />
    ) : (
      <HandheldFrame src={src} alt={alt} size={size ?? SHOT_SIZE.handheld} width={210} />
    )}
  </div>
);

export interface RuleProps {
  /** Rule number, in a dark circle. Omit for a follow-on card. */
  n?: number;
  eyebrow: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  /** A muted line under the body ("Settled in round 4 …"). */
  note?: ReactNode;
  links?: (LinkTarget & { label: ReactNode })[];
  img?: string;
  frame?: FrameKind;
  caption?: ReactNode;
  /** Screen on the left. */
  flip?: boolean;
}

/** Style-guide rule: the rule on one side, a real screen that follows it on the other. */
export const Rule = ({ n, eyebrow, title, children, note, links, img, frame = 'terminal', caption, flip }: RuleProps) => (
  <div className={`bd-split${flip ? ' bd-split--flip' : ''}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', alignItems: 'center', gap: 24, marginBottom: 16, borderRadius: 20, background: '#fff', padding: 24, boxShadow: `inset 0 0 0 1px ${DOC.line}` }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {n !== undefined && (
          <span style={{ display: 'inline-flex', width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: DOC.ink, color: '#fff', fontSize: 13, fontWeight: 700 }}>{n}</span>
        )}
        <Eyebrow>{eyebrow}</Eyebrow>
      </span>
      <h3 style={{ margin: 0, fontSize: 20, lineHeight: '28px', fontWeight: 600, color: DOC.ink }}>{title}</h3>
      {children && <div style={{ fontSize: 14, lineHeight: '22px' }}>{children}</div>}
      {note && <div style={{ fontSize: 13, lineHeight: '20px', color: DOC.muted }}>{note}</div>}
      {links && links.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 16, rowGap: 4, paddingTop: 2 }}>
          {links.map(({ label, ...t }, i) => (
            <DocLink key={i} {...t}>
              {label}
            </DocLink>
          ))}
        </div>
      )}
    </div>
    {img ? (
      <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <BigThumb src={img} frame={frame} />
        {caption && <figcaption style={{ textAlign: 'center', fontSize: 13, color: DOC.muted }}>{caption}</figcaption>}
      </figure>
    ) : (
      <div />
    )}
  </div>
);
