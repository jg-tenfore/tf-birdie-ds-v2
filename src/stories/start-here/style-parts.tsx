/**
 * Small live pieces for Start Here › Style guide, drawn from the app's own code so the guide can't
 * disagree with the screens: the tee-sheet chip styles come from `chipStyle` (the function the grid
 * and the list view use), the badges from `payBadges`, the swatches from `md3`.
 */
import type { Booking } from '../../pos/types';
import { chipStyle } from '../../pos/components/TeeSheetGrid';
import { md3, payBadges } from '../../theme/tokens';
import type { PayState } from '../../theme/tokens';
import { DOC, Swatch } from '../docs-kit/docs-kit';

/** One sample booking per payment state the grid draws. Only `pay` (and seats, for paid) matter. */
const CHIPS: { pay: PayState | 'unpaid'; name: string; meaning: string }[] = [
  { pay: 'paid', name: 'Paid', meaning: 'Solid green. Everyone on it has paid.' },
  { pay: 'unpaid', name: 'Unpaid', meaning: 'White with a green outline. Someone still owes.' },
  { pay: 'no_show', name: 'No show', meaning: 'Hatched grey, and the word.' },
  { pay: 'rain_chk', name: 'Rain check', meaning: 'Hatched grey, and the word.' },
  { pay: 'refund', name: 'Refunded', meaning: 'Orange, and the word.' },
  { pay: 'block', name: 'Block', meaning: 'Hatched slate: maintenance, a hold, a shift change.' },
  { pay: 'event', name: 'Event', meaning: 'Violet: a league or an outing.' },
];

const sample = (pay: PayState | 'unpaid') => ({ pay: pay === 'unpaid' ? 'open' : pay, playerStates: [] }) as unknown as Booking;

/** The tee sheet's chips, drawn by the grid's own `chipStyle`. */
export const StatusChips = () => (
  <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
    {CHIPS.map((c) => {
      const s = chipStyle(sample(c.pay));
      return (
        <div key={c.pay} style={{ display: 'flex', gap: 12, alignItems: 'center', borderRadius: 14, background: '#fff', padding: 10, boxShadow: `inset 0 0 0 1px ${DOC.line}` }}>
          <span style={{ width: 92, flexShrink: 0, borderRadius: 6, padding: '5px 8px', background: s.bg, border: `1.5px solid ${s.border}` }}>
            <span style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: 0.3, color: s.name, textTransform: 'uppercase' }}>Reed, M.</span>
            <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: s.meta }}>{s.status || '2P · 18H'}</span>
          </span>
          <span style={{ fontSize: 13, lineHeight: '18px' }}>
            <strong style={{ color: DOC.ink, fontWeight: 600 }}>{c.name}.</strong> {c.meaning}
          </span>
        </div>
      );
    })}
  </div>
);

/** The payment badges the panels and lists use beside a name. */
export const PayBadges = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {(Object.keys(payBadges) as PayState[]).map((k) => (
      <span key={k} style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 6, background: payBadges[k].bg, color: payBadges[k].text, fontSize: 11, fontWeight: 800, letterSpacing: 0.4 }}>
        {payBadges[k].label}
      </span>
    ))}
  </div>
);

/** The MD3 roles the counter is built from. */
export const RoleSwatches = () => (
  <div className="bd-grid bd-grid--4" style={{ gap: 12, marginBottom: 16 }}>
    <Swatch color={md3.primary} role="primary" value={md3.primary} use="The POS green: Check in & pay, selected tabs, paid chips." />
    <Swatch color={md3.primaryContainer} role="primary-container" value={md3.primaryContainer} use="Selected chips, the golf summary, a loaded customer." />
    <Swatch color={md3.surface} role="surface" value={md3.surface} use="The app's ground; cards and panels are white on it." ring />
    <Swatch color={md3.surfaceContainer} role="surface-container" value={md3.surfaceContainer} use="Rows, group fills, the rate editor's tiles." ring />
    <Swatch color={md3.onSurface} role="on-surface" value={md3.onSurface} use="Text, and the register's Pay button." />
    <Swatch color={md3.outlineVariant} role="outline-variant" value={md3.outlineVariant} use="1.5px control outlines and dividers." />
    <Swatch color={md3.error} role="error" value={md3.error} use="Delete, no-show, refusals." />
    <Swatch color={md3.scrim} role="scrim" value={md3.scrim} use="The ground behind the terminal, and the top bar's main button (Register, Tee sheet)." />
  </div>
);
