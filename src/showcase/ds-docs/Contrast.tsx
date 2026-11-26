import { DOC } from '../../stories/docs-kit/docs-kit';

/**
 * WCAG 2.x contrast, computed — never typed. A Design System page that says "passes AA" has to be
 * checkable, so pages render `<Contrast fg bg />` and the ratio comes from the colours themselves.
 *
 * Large text, per WCAG: 18.66px bold or 24px regular and up. Under that, AA needs 4.5:1; large text
 * needs 3:1. Non-text (an outline, an icon) needs 3:1 against what's next to it.
 */

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

export type TextSize = 'small' | 'large' | 'non-text';

/** The WCAG level a pair reaches at a size: 'AAA', 'AA', or 'Fail'. */
export function wcagLevel(ratio: number, size: TextSize = 'small'): 'AAA' | 'AA' | 'Fail' {
  if (size === 'non-text') return ratio >= 3 ? 'AA' : 'Fail';
  const [aa, aaa] = size === 'large' ? [3, 4.5] : [4.5, 7];
  return ratio >= aaa ? 'AAA' : ratio >= aa ? 'AA' : 'Fail';
}

/** A swatch pair with its ratio and level — "4.6:1 · AA". */
export function Contrast({ fg, bg, size = 'small', label }: { fg: string; bg: string; size?: TextSize; label?: string }) {
  const ratio = contrastRatio(fg, bg);
  const level = wcagLevel(ratio, size);
  const pass = level !== 'Fail';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, verticalAlign: 'middle' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 34,
          height: 24,
          padding: '0 6px',
          borderRadius: 6,
          background: bg,
          color: fg,
          fontSize: 12,
          fontWeight: 800,
          boxShadow: `inset 0 0 0 1px ${DOC.line}`,
        }}
      >
        {label ?? 'Aa'}
      </span>
      <span style={{ fontFamily: DOC.mono, fontSize: 12.5, color: DOC.ink }}>{ratio.toFixed(1)}:1</span>
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 800,
          padding: '1px 7px',
          borderRadius: 999,
          background: pass ? DOC.mint : DOC.rose,
          color: pass ? DOC.brandDeep : DOC.roseText,
        }}
      >
        {level}
        {size === 'large' ? ' large' : size === 'non-text' ? ' non-text' : ''}
      </span>
    </span>
  );
}
