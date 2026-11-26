import type { ReactNode } from 'react';

/**
 * The content of one Design System page — a style (Colors, Typography…) or a component (Button,
 * Text Field…) — written once, rendered by `DsDocsPage` in a fixed order.
 *
 * ## Who reads these pages
 *
 * Two audiences at once, and every section is written for both:
 * - **Stakeholders and designers** read the top: what it is, whether Birdie really uses it, where
 *   it shows up in the product, when to reach for it and when not to, and the decisions behind it.
 * - **Engineers** read the bottom: what to import, which Birdie wrapper to use instead of the raw
 *   MUI component, the theme override and tokens, a snippet, and the files that use it today.
 *
 * ## The rule for content
 *
 * Describe Birdie, not MUI. A page about Button that only restates MUI's API is useless here: the
 * tablet barely uses MUI's Button (it uses Birdie's own pills on `ButtonBase`), and that *is* the
 * thing to explain. Every claim about the product should be checkable in `src/pos`; usage counts
 * are generated (`scripts/gen-ds-usage.mjs`), never typed.
 */

/** How settled a component is in Birdie. Defaults from the usage scan; set it to say more. */
export type DsStatus =
  /** Used on both surfaces, or the backbone of one — the default choice. */
  | 'core'
  /** Used in the product, on one surface or a few screens. */
  | 'in-use'
  /** In the theme and documented, but no Birdie screen uses it yet. Fine to adopt. */
  | 'available'
  /** Documented so nobody reaches for it: Birdie does this another way. */
  | 'avoid';

export type DsSurface = 'tablet' | 'handheld';

export interface DsExample {
  /** Short label for the card ("Check in & pay, reservation panel"). */
  label: ReactNode;
  /** What to notice — one or two sentences. */
  caption: ReactNode;
  /** A screenshot in .storybook/static/docs/screens (name without extension), shown framed. */
  shot?: string;
  frame?: 'terminal' | 'handheld';
  /** A story id to open (in place). */
  storyId?: string;
  /** A prototype deep link (a hash for the tablet like '#/tabs?tab=T-1003', or a phone story id). */
  tabletHash?: string;
  handheldRoute?: string;
}

export interface DsBirdieComponent {
  /** The Birdie component or composition ("ToolbarButton", "HostButton", "PayBadge"). */
  name: string;
  /** Its file, from the repo root. */
  file: string;
  /** When to use it rather than the raw MUI component. */
  use: ReactNode;
  surface?: DsSurface | 'both';
}

export interface DsDoc {
  /** One or two sentences: what it is and the job it does in Birdie. Read first by everyone. */
  summary: ReactNode;
  /**
   * Banner illustration, a name in .storybook/static/docs without the extension ('ds-colors').
   * Foundation pages and the overview have Higgsfield art in the Start Here style; component pages
   * show the product instead (In Birdie), so they usually leave this out.
   */
  art?: string;
  /** Overrides the status the usage scan implies. Give a reason in `statusNote`. */
  status?: DsStatus;
  statusNote?: ReactNode;
  /** MUI component names this page documents, for the usage scan ("Button", "IconButton"). */
  mui?: string[];
  /** Use it for… (2–4 short lines). */
  useFor?: ReactNode[];
  /** Don't use it for… — and what to use instead (2–4 short lines). */
  dontUseFor?: ReactNode[];
  /** Where it lives in the real product: screenshots and links. The most persuasive section. */
  inBirdie?: DsExample[];
  /** Birdie's own components built on it, or used instead of it. */
  birdie?: DsBirdieComponent[];
  /** Numbered parts. */
  anatomy?: { part: ReactNode; description: ReactNode }[];
  /** Variants and when each is right. */
  variants?: { name: ReactNode; use: ReactNode; avoid?: ReactNode }[];
  /** States, per surface where they differ. */
  states?: { state: ReactNode; tablet: ReactNode; handheld?: ReactNode }[];
  /** Sizes and density: the counter terminal is dense and mouse-first; the handheld is touch. */
  sizing?: { surface: ReactNode; size: ReactNode; why: ReactNode }[];
  /** Interaction rules. */
  behavior?: ReactNode[];
  /** Writing guidance: labels, tone, numbers, money. */
  content?: ReactNode[];
  dos?: ReactNode[];
  donts?: ReactNode[];
  /** Keyboard, roles, labels, contrast, target size. */
  a11y?: ReactNode[];
  /** Decisions and their reasons — what a stakeholder asks "why?" about. */
  decisions?: { decision: ReactNode; why: ReactNode }[];
  /** Design tokens it consumes, from src/theme/tokens.ts. */
  tokens?: { token: ReactNode; value: ReactNode; role: ReactNode }[];
  engineering?: {
    /** The import line. */
    import?: string;
    /** Where the theme overrides it ("src/theme/theme.ts → MuiButton"). */
    themeOverride?: ReactNode;
    notes?: ReactNode[];
    /** A short, real-looking snippet. */
    snippet?: string;
  };
  /** Other Design System pages (component ids, e.g. 'components-actions-button'). */
  related?: { name: string; id: string }[];
}
