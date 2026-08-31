import type { ReactNode } from 'react';

/**
 * Links from Storybook docs to the prototype and the reference HTML.
 *
 * These need a component rather than a plain Markdown link because the correct target
 * differs by environment, and a naive relative path is wrong in both:
 *
 *  - **Deployed**, MDX renders inside the preview iframe at `<base>/iframe.html`, so `../`
 *    climbs past the repo segment — `/tf-birdie-ds-v2/iframe.html` + `../prototype/` lands
 *    on `/prototype/`, which 404s. `./` is what resolves correctly.
 *  - **Locally**, the two surfaces are separate dev servers. Storybook is on :6006 and the
 *    prototype on :5173, so no relative path can reach it at all.
 *
 * They also open in a new tab: a same-frame link would load the whole POS *inside* the docs
 * iframe, which is a poor way to look at a 1366×840 terminal.
 */

/**
 * Where the sibling surfaces live, given where Storybook is being served from.
 *
 * Keyed on the **port**, not just the hostname: `storybook dev` runs on 6006, and that is
 * the only situation where the prototype is a separate server. A *built* site served from
 * localhost for verification still has `./prototype/` sitting next to it, and keying on
 * hostname alone would wrongly send that case to a dev server that may not be running.
 */
const STORYBOOK_DEV_PORT = '6006';

function siteUrl(surface: 'prototype' | 'reference', path = ''): string {
  const isDevServer =
    typeof window !== 'undefined' &&
    /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) &&
    window.location.port === STORYBOOK_DEV_PORT;

  // In dev the prototype is its own Vite server; the reference HTML is only assembled by
  // the site build, so locally it points at the source file the build copies.
  if (isDevServer) {
    return surface === 'prototype'
      ? `http://localhost:5173/${path}`
      : 'https://jg-tenfore.github.io/tf-birdie-ds-v2/reference/';
  }
  return `./${surface}/${path}`;
}

export function SiteLink({
  to,
  path = '',
  children,
}: {
  to: 'prototype' | 'reference';
  /** Appended to the surface root — e.g. a deep-link hash like `#/tee-sheet`. */
  path?: string;
  children: ReactNode;
}) {
  return (
    <a href={siteUrl(to, path)} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

/** A deep link into the prototype, e.g. `<DeepLink hash="#/tee-sheet?shift=peak">`. */
export function DeepLink({ hash, children }: { hash: string; children?: ReactNode }) {
  return (
    <SiteLink to="prototype" path={hash}>
      <code>{children ?? hash}</code>
    </SiteLink>
  );
}
