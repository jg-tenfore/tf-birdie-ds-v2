import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { COMBOS, COMBOS_CATEGORY } from '../data/combos';
import { REGISTER_CATEGORIES } from '../data/register-extras';
import { money } from '../logic/cart';
import { comboComponents, comboSaving, comboSavings } from '../logic/register-extras';
import { canHold } from '../state/register-extras';
import { usePos } from '../state/PosProvider';
import type { CartItem } from '../types';
import { CategoryButton } from './CategoryButton';
import { Icon, SectionLabel } from './primitives';
import { Stack } from './Stack';

/**
 * The register's V1 → V2 pieces that sit in the catalog and on the order rail: the Combos and
 * Gift card buttons, the combo grid, the combo and gift-card lines, Hold, and the held-orders
 * bar. Their dialogs are in `modals/RegisterDialogs.tsx`, their state in
 * `state/register-extras.ts`.
 *
 * Every one of these is rendered only behind `useV1V2()` by its caller, so the base and Weston
 * editions never draw them.
 *
 * ## Touch
 *
 * This is a tablet at a counter. Every control here is at least 40px on its short side, and
 * nothing depends on hover — the rail's older merchandise line has a 22px stepper, which is
 * not a thing to copy.
 */

// ─── Catalog ────────────────────────────────────────────────────────────────

/** The V1 → V2 category row: Combos (a category) and Gift card (a dialog). */
export function RegisterCategoryRow() {
  const { state, dispatch } = usePos();
  return (
    <Box
      data-register-categories
      sx={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '7px', mt: '5px' }}
    >
      {REGISTER_CATEGORIES.map((c) => {
        const active = !c.opens && state.currentCategory === c.key;
        return (
          <CategoryButton
            key={c.key}
            label={c.label}
            icon={c.icon}
            color={c.color}
            tc={c.tc}
            active={active}
            onClick={() =>
              c.opens
                ? dispatch({ type: 'openModal', modal: { kind: 'giftCard' } })
                : dispatch({ type: 'setCategory', category: active ? null : c.key })
            }
          />
        );
      })}
    </Box>
  );
}

/**
 * The combo tiles.
 *
 * Wider than item tiles — three to a row, not five — because a combo is only legible with its
 * contents and its saving on it. v1's tiles showed a name and a price over the company logo,
 * which told staff nothing about what they were about to ring.
 */
export function ComboGrid() {
  const { dispatch, toast } = usePos();
  const color = REGISTER_CATEGORIES.find((c) => c.key === COMBOS_CATEGORY)!.color;

  return (
    <>
      <SectionLabel color={color} rule sx={{ mb: 1 }}>
        Combos
        <Box component="span" sx={{ fontWeight: 400, opacity: 0.6, fontSize: 9, textTransform: 'none', letterSpacing: 0 }}>
          {COMBOS.length} combos
        </Box>
      </SectionLabel>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
        {COMBOS.map((combo) => {
          const saving = comboSaving(combo);
          return (
            <ButtonBase
              key={combo.id}
              data-combo-tile={combo.id}
              onClick={() => {
                dispatch({ type: 'addCombo', comboId: combo.id });
                toast(`Added: ${combo.name}`);
              }}
              sx={{
                minHeight: 112,
                p: '12px 14px',
                borderRadius: `${radius.md}px`,
                // Hex-alpha washes (30% / 8%), as `ModalFrame` tints its icon — no import back into PosView.
                border: `1.5px solid ${color}4d`,
                bgcolor: `${color}14`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'flex-start',
                textAlign: 'left',
                gap: 0.5,
              }}
            >
              <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1}>
                <Typography sx={{ fontSize: 14, fontWeight: 800, lineHeight: 1.25 }}>{combo.name}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color }}>{money(combo.price)}</Typography>
              </Stack>
              <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, lineHeight: 1.35 }}>
                {comboComponents(combo)
                  .map((c) => (c.qty > 1 ? `${c.qty} × ${c.name}` : c.name))
                  .join(' · ')}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <SavingChip amount={saving} />
            </ButtonBase>
          );
        })}
      </Box>
    </>
  );
}

/** "Save $3.50" — the reason a combo exists, so it is on the tile and on the line. */
function SavingChip({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <Stack
      data-combo-saving
      direction="row"
      alignItems="center"
      gap={0.5}
      sx={{
        alignSelf: 'flex-start',
        px: 1,
        py: '3px',
        borderRadius: `${radius.xl}px`,
        bgcolor: md3.primaryContainer,
        color: md3.onPrimaryContainer,
        fontSize: 11,
        fontWeight: 800,
      }}
    >
      <Icon name="savings" size={13} />
      Save {money(amount)}
    </Stack>
  );
}

// ─── Order lines ────────────────────────────────────────────────────────────

/** A 40px round button — the rail's steppers and remove, sized for a finger. */
function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <ButtonBase
      aria-label={label}
      onClick={onClick}
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: '50%',
        border: `1px solid ${md3.outlineVariant}`,
        bgcolor: '#fff',
        color: md3.onSurfaceVariant,
        fontSize: 18,
        lineHeight: 1,
      }}
    >
      {children}
    </ButtonBase>
  );
}

const lineShell = {
  p: '10px 10px 10px 12px',
  borderRadius: `${radius.md}px`,
  bgcolor: md3.surfaceContainer,
  mb: 0.75,
} as const;

/**
 * A combo on the order: one line at the combo price, its components beneath it.
 *
 * The components are read-only sub-lines — no price, no remove, no stepper of their own.
 * Quantity applies to the whole combo and removing it removes the whole group. That is the
 * difference from v1, where each component was its own `[c]` line: removing the beer from a
 * "Balls and Beers" left the balls at the bundle's price, and nothing on the order said so.
 *
 * Not `isSubItem` lines. The cart already has that idea, for tax rows hanging off a round, but
 * the rail hides `isSubItem` rows and the totals charge them — components are neither hidden
 * nor charged, so they are carried on the line (`CartItem.combo`) and drawn here.
 */
export function ComboLine({ item, index }: { item: CartItem; index: number }) {
  const { dispatch } = usePos();
  const combo = item.combo!;
  const saving = comboSavings(item);

  return (
    <Box data-combo-line={combo.id} sx={lineShell}>
      <Stack direction="row" alignItems="center" gap={1}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{item.name}</Typography>
          <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>
            {money(item.price)} each · combo
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: md3.primary }}>{money(item.price * item.qty)}</Typography>
        <RoundButton label={`Remove ${item.name}`} onClick={() => dispatch({ type: 'removeItem', index })}>
          <Icon name="close" size={16} />
        </RoundButton>
      </Stack>

      <Box sx={{ mt: 0.75, pl: 1.25, borderLeft: `2px solid ${md3.outlineVariant}` }}>
        {combo.components.map((c) => (
          <Typography key={c.name} data-combo-component sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, py: '1px' }}>
            {c.qty * item.qty} × {c.name}
          </Typography>
        ))}
      </Box>

      <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.75 }}>
        <RoundButton label="One fewer" onClick={() => dispatch({ type: 'changeQty', index, delta: -1 })}>
          −
        </RoundButton>
        <Box data-combo-qty sx={{ minWidth: 20, textAlign: 'center', fontSize: 14, fontWeight: 800 }}>
          {item.qty}
        </Box>
        <RoundButton label="One more" onClick={() => dispatch({ type: 'changeQty', index, delta: 1 })}>
          +
        </RoundButton>
        <Box sx={{ flex: 1 }} />
        <SavingChip amount={saving} />
      </Stack>
    </Box>
  );
}

/**
 * A gift card waiting on the order.
 *
 * One card per line and no quantity: each card belongs to one person, and "2 × $50 → Scott"
 * would be two cards pretending to be one. The line says plainly that nothing has been issued
 * yet — the card exists when the order is paid, and removing the line (or never paying) issues
 * nothing.
 */
export function GiftCardLine({ item, index }: { item: CartItem; index: number }) {
  const { dispatch } = usePos();
  const card = item.giftCard!;
  return (
    <Box data-gift-card-line={card.id} sx={lineShell}>
      <Stack direction="row" alignItems="center" gap={1}>
        <Icon name="redeem" size={18} color={md3.onSurfaceVariant} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{item.name}</Typography>
          <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant, lineHeight: 1.35 }}>
            {card.recipient.customerId ? 'To their customer record' : card.recipient.email || 'Not on the roster'}
            {card.from ? ` · from ${card.from}` : ''}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: md3.primary }}>{money(item.price)}</Typography>
        <RoundButton label={`Remove ${item.name}`} onClick={() => dispatch({ type: 'removeItem', index })}>
          <Icon name="close" size={16} />
        </RoundButton>
      </Stack>
      {card.message && (
        <Typography sx={{ mt: 0.5, fontSize: 11.5, fontStyle: 'italic', color: md3.onSurfaceVariant }}>
          “{card.message}”
        </Typography>
      )}
      <Typography sx={{ mt: 0.5, fontSize: 10.5, color: md3.outline }}>Issued when this order is paid · no tax</Typography>
    </Box>
  );
}

// ─── Hold ───────────────────────────────────────────────────────────────────

/**
 * **Hold**, beside Check-in and Rain check at the foot of the rail.
 *
 * On the rail rather than in the cog because it is the thing staff reach for when the next
 * golfer steps up before this one has found their card — it has to be one tap from the order,
 * not two. It asks for a name (pre-filled) and parks the order; see `holdOrder`.
 */
export function HoldButton() {
  const { state, dispatch } = usePos();
  const enabled = canHold(state);
  return (
    <ButtonBase
      data-hold-order
      disabled={!enabled}
      onClick={() => dispatch({ type: 'openModal', modal: { kind: 'holdOrder' } })}
      sx={{
        flex: 1,
        gap: 0.625,
        py: 1.125,
        borderRadius: `${radius.md}px`,
        border: `1.5px solid ${md3.outlineVariant}`,
        fontSize: 12,
        fontWeight: 500,
        color: md3.onSurfaceVariant,
        '&.Mui-disabled': { opacity: 0.45 },
      }}
    >
      <Icon name="pause_circle" size={15} />
      Hold
    </ButtonBase>
  );
}

/**
 * **Held · N**, under the rail's header — only while something is held.
 *
 * Visible whatever is on the rail, including nothing, because an empty rail is exactly when
 * someone comes back for their order. Hidden at zero so it never takes space to say "none".
 */
export function HeldOrdersBar() {
  const { state, dispatch } = usePos();
  const n = state.heldOrders.length;
  if (n === 0) return null;
  const latest = state.heldOrders[n - 1];
  return (
    <ButtonBase
      data-held-orders={n}
      aria-label={`Held orders · ${n}`}
      onClick={() => dispatch({ type: 'openModal', modal: { kind: 'heldOrders' } })}
      sx={{
        width: '100%',
        minHeight: 44,
        gap: 0.875,
        px: 1.75,
        justifyContent: 'flex-start',
        flexShrink: 0,
        bgcolor: '#fff8e1',
        color: '#7a5b00',
        borderBottom: `1px solid ${md3.outlineVariant}`,
        fontSize: 12.5,
        fontWeight: 700,
      }}
    >
      <Icon name="pause_circle" size={17} />
      Held · {n}
      <Box component="span" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
        {n === 1 ? latest.name : `latest ${latest.name}`}
      </Box>
      <Icon name="chevron_right" size={16} />
    </ButtonBase>
  );
}
