import type { CSSProperties, ReactNode } from 'react';
import { fontFamily, md3, radius } from '../../theme/tokens';

/**
 * Layout pieces shared by the Design System › Styles stories (Colors, Typography, Spacing…).
 *
 * Plain elements with inline styles, so a reference sheet reads the same in the docs page and on
 * its own canvas, and nothing in it depends on the theme it documents. Values come from
 * `src/theme/tokens.ts`; nothing here is a new colour.
 */

export const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

/** A reference sheet: padded, in the product font. */
export const Sheet = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 32, fontFamily, color: md3.onSurface, background: '#fff', ...style }}>
    {children}
  </div>
);

/** A titled group on a sheet, with a one-line intro. */
export const Group = ({ title, intro, children }: { title: ReactNode; intro?: ReactNode; children: ReactNode }) => (
  <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div>
      <h3 style={{ margin: 0, fontSize: 17, lineHeight: '24px', fontWeight: 700, color: md3.onSurface }}>{title}</h3>
      {intro && <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: '20px', color: md3.onSurfaceVariant, maxWidth: 760 }}>{intro}</p>}
    </div>
    {children}
  </section>
);

/** A wrapping row of cards. */
export const Row = ({ children, gap = 12, min = 170 }: { children: ReactNode; gap?: number; min?: number }) => (
  <div style={{ display: 'grid', gap, gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))` }}>{children}</div>
);

/** A white card with the 1.5px outline-variant hairline the product draws. */
export const Card = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ borderRadius: radius.md, border: `1.5px solid ${md3.outlineVariant}`, background: '#fff', overflow: 'hidden', ...style }}>{children}</div>
);

/** A colour chip with its token, value and the job it does. */
export function ColorCard({ token, value, use, fg }: { token: ReactNode; value: string; use?: ReactNode; fg?: string }) {
  return (
    <Card>
      <div style={{ height: 52, background: value, borderBottom: `1px solid ${md3.outlineVariant}`, display: 'flex', alignItems: 'center', paddingLeft: 10, color: fg, fontSize: 12, fontWeight: 800 }}>
        {fg ? 'Aa' : null}
      </div>
      <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, lineHeight: '17px' }}>{token}</span>
        <span style={{ fontFamily: mono, fontSize: 11.5, color: md3.onSurfaceVariant }}>{value}</span>
        {use && <span style={{ fontSize: 12, lineHeight: '17px', color: md3.onSurfaceVariant, marginTop: 2 }}>{use}</span>}
      </div>
    </Card>
  );
}

/** A small caps label over a value, for spec rows. */
export const Spec = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', color: md3.onSurfaceVariant }}>{label}</span>
    <span style={{ fontSize: 13 }}>{children}</span>
  </div>
);

/** A simple table: header row plus cells, hairline rules. */
export function Table({ head, rows, widths }: { head: ReactNode[]; rows: ReactNode[][]; widths?: (number | string)[] }) {
  const cell: CSSProperties = { padding: '9px 12px', borderTop: `1px solid ${md3.outlineVariant}`, verticalAlign: 'middle', fontSize: 13, textAlign: 'left' };
  return (
    <div style={{ overflowX: 'auto', borderRadius: radius.md, border: `1.5px solid ${md3.outlineVariant}` }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ background: md3.surface }}>
            {head.map((h, i) => (
              <th key={i} style={{ ...cell, borderTop: 'none', width: widths?.[i], fontSize: 11, fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', color: md3.onSurfaceVariant }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} style={cell}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
