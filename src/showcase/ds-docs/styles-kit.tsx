import type { ReactNode } from 'react';
import { DOC } from '../../stories/docs-kit/docs-kit';

/**
 * Small inline pieces for the Design System › Styles write-ups (`content/foundations-*.tsx`).
 * Kept out of `content/`, whose every file is read as a page.
 */

/** An inline colour chip with its value: for token tables and running text. */
export const Hex = ({ c, children }: { c: string; children?: ReactNode }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, verticalAlign: 'middle' }}>
    <span style={{ width: 14, height: 14, borderRadius: 4, background: c, boxShadow: `inset 0 0 0 1px ${DOC.line}`, flexShrink: 0 }} />
    <code style={{ fontFamily: DOC.mono, fontSize: 12.5 }}>{children ?? c}</code>
  </span>
);

/** The banner art's caption: one muted line naming the picture's metaphor. */
export const ArtNote = ({ children }: { children: ReactNode }) => (
  <span style={{ display: 'block', marginTop: 10, fontSize: 12.5, fontStyle: 'italic', color: DOC.body }}>{children}</span>
);
