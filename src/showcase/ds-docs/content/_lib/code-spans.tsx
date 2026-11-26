import { Fragment, isValidElement } from 'react';
import type { ReactNode } from 'react';
import type { DsDoc } from '../../types';

/**
 * Lets a content file write `code` in plain strings. Each backtick pair becomes a <code> span, so a
 * Behavior bullet can say "hidden at zero (`invisible={!count}`)" without being rewritten as JSX.
 *
 * Lives in a subfolder because DsDocsPage reads every `content/*.tsx` as a page.
 */
export function codeSpans(s: string): ReactNode {
  if (!s.includes('`')) return s;
  return s.split('`').map((part, i) => (i % 2 ? <code key={i}>{part}</code> : <Fragment key={i}>{part}</Fragment>));
}

/** Fields that are identifiers or source, not prose: left exactly as written. */
const VERBATIM = new Set(['import', 'snippet', 'storyId', 'shot', 'tabletHash', 'handheldRoute', 'file', 'id', 'name', 'frame', 'surface', 'status', 'mui']);

function walk(value: unknown, key?: string): unknown {
  if (key && VERBATIM.has(key)) return value;
  if (typeof value === 'string') return codeSpans(value);
  if (Array.isArray(value)) return value.map((v) => walk(v));
  if (value && typeof value === 'object' && !isValidElement(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, k)]));
  }
  return value;
}

/** A page's content with backtick spans in its prose rendered as code. */
export const withCodeSpans = (doc: DsDoc): DsDoc => walk(doc) as DsDoc;
