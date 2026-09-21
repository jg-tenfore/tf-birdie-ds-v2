/**
 * Pure helpers that turn a CSF story file into the ids and names Storybook gives it.
 *
 * `sanitize` and `storyNameFromExport` are ports of Storybook's own (`storybook/internal/csf`),
 * copied rather than imported so the prototype bundle doesn't pull in Storybook's runtime.
 * They must stay byte-identical: the prototype's "Open in Storybook" links and its hash
 * routes are Storybook story ids, and `story-meta.test.ts` pins the cases that matter here
 * (the middle dot in the section titles survives, digits split off words).
 */

/** Storybook's `sanitize`: lower-case, punctuation to `-`, runs collapsed, ends trimmed. */
export function sanitize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/** Storybook's `storyNameFromExport` (its `toStartCaseStr`): `DetailPlayers` → `Detail Players`. */
export function storyNameFromExport(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\./g, ' ')
    .replace(/([^\n])([A-Z])([a-z])/g, (_, a: string, b: string, c: string) => `${a} ${b}${c}`)
    .replace(/([a-z])([A-Z])/g, (_, a: string, b: string) => `${a} ${b}`)
    .replace(/([a-z])([0-9])/gi, (_, a: string, b: string) => `${a} ${b}`)
    .replace(/([0-9])([a-z])/gi, (_, a: string, b: string) => `${a} ${b}`)
    .replace(/(\s|^)(\w)/g, (_, a: string, b: string) => `${a}${b.toUpperCase()}`)
    .replace(/ +/g, ' ')
    .trim();
}

/** Storybook's `toId(title, name)`. */
export function storyId(title: string, exportName: string): string {
  return `${sanitize(title)}--${sanitize(storyNameFromExport(exportName))}`;
}

/**
 * The body of a `/** … *\/` comment as prose: leading ` * ` gutters stripped, wrapped lines
 * joined with spaces, blank lines kept as paragraph breaks.
 */
export function cleanJsDoc(body: string): string {
  const lines = body.split('\n').map((line) => line.replace(/^\s*\*?[ \t]?/, '').trimEnd());
  const paragraphs: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length) paragraphs.push(current.join(' '));
      current = [];
    } else {
      current.push(line.trim());
    }
  }
  if (current.length) paragraphs.push(current.join(' '));
  return paragraphs.join('\n\n');
}

export interface ParsedExport {
  exportName: string;
  /** The JSDoc directly above the export, cleaned; empty when there is none. */
  description: string;
}

/**
 * Every `export const Name` in a story file's source, in source order — the order Storybook
 * lists them in. (A module namespace object sorts its keys alphabetically, so the source is
 * the only place the authored order survives.) A JSDoc counts as the export's description
 * only when nothing but whitespace separates its `*\/` from the `export`.
 */
export function parseStoryExports(source: string): ParsedExport[] {
  const out: ParsedExport[] = [];
  const re = /(?:\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*)?^export\s+const\s+([A-Za-z_$][\w$]*)/gm;
  for (const m of source.matchAll(re)) {
    out.push({ exportName: m[2], description: m[1] ? cleanJsDoc(m[1]) : '' });
  }
  return out;
}
