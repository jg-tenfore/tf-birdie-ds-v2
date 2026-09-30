import { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { money } from '../../logic/cart';
import { splitAlerts } from '../../logic/dish-choice';
import { isSent } from '../../logic/restaurant';
import { FilledButton, ModalFrame, OutlineButton } from '../../modals/ModalFrame';
import type { DishTarget } from '../../state/restaurant';
import { usePos } from '../../state/PosProvider';
import type { CartItem } from '../../types';
import { Icon } from '../primitives';
import { Stack } from '../Stack';

/**
 * One dish on an order (V1 → V2, Wave 2) — on a tab's seat, or on the register's rail.
 *
 * ## What v1 did
 *
 * v1's seat line stacked four things under the name and labelled one: an unexplained stock pair
 * with the second figure in orange, the modifiers as a run of text, the note, and a tiny green
 * "FIRED". Every action — Fire, Move, Split, Edit, Discount, Delete — sat behind a ⋮ on every
 * line, whether or not it could apply; Delete on a fired plate deleted it, and the kitchen never
 * heard.
 *
 * ## What this does
 *
 * - **Allergies are flags, not words.** A red chip with a warning mark, apart from the other
 *   modifiers — "Shellfish" in a run of "Medium rare · Truffle butter" reads like an ingredient.
 * - **Sent or not, always.** A sent line says when, with a lock; an unsent one says so in amber.
 * - **Only what applies is offered.** Unsent: **Edit** and **Remove**, one tap each, no confirm —
 *   nothing has happened yet. Sent: **Void**, behind a confirm, because the kitchen already has it.
 *   A voided line stays, struck through at $0, so the check shows what was cancelled.
 *
 * `readOnly` draws the line with no actions — the rail uses it while a tab is being paid, because
 * those lines are the tab's and are changed on the tab.
 */
export function DishLine({
  line,
  target,
  readOnly,
  showSeat,
  dense,
}: {
  line: CartItem;
  target: DishTarget;
  readOnly?: boolean;
  showSeat?: boolean;
  /** The rail's narrower treatment. */
  dense?: boolean;
}) {
  const { dispatch, toast } = usePos();
  const [confirmVoid, setConfirmVoid] = useState(false);
  const dish = line.dish!;
  const sent = isSent(line);
  const voided = Boolean(dish.voided);
  const state = voided ? 'voided' : sent ? 'sent' : 'unsent';
  const { alerts, rest } = splitAlerts(dish.modifiers);

  return (
    <Box
      data-dish-line={dish.lineId}
      data-dish-state={state}
      sx={{
        p: dense ? '10px 10px 8px 12px' : '10px 10px 8px 14px',
        borderRadius: `${radius.md}px`,
        bgcolor: voided ? 'transparent' : state === 'unsent' ? '#fffaf0' : md3.surfaceContainer,
        border: `1px solid ${voided ? md3.outlineVariant : state === 'unsent' ? '#f5d9a6' : 'transparent'}`,
        mb: 0.75,
      }}
    >
      <Stack direction="row" alignItems="baseline" gap={1}>
        <Typography
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: 13.5,
            fontWeight: 700,
            lineHeight: 1.25,
            textDecoration: voided ? 'line-through' : 'none',
            color: voided ? md3.outline : md3.onSurface,
          }}
        >
          {line.qty > 1 && (
            <Box component="span" sx={{ color: md3.primary, mr: 0.5 }}>
              {line.qty}×
            </Box>
          )}
          {line.name}
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: voided ? md3.outline : md3.primary, flexShrink: 0 }}>
          {money(line.price * line.qty)}
        </Typography>
      </Stack>

      {rest.length > 0 && (
        <Typography data-dish-modifiers sx={{ fontSize: 12, color: md3.onSurfaceVariant, lineHeight: 1.4, mt: 0.25 }}>
          {rest.map((m) => (m.price ? `${m.name} +${money(m.price)}` : m.name)).join(' · ')}
        </Typography>
      )}

      {alerts.length > 0 && (
        <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
          {alerts.map((m) => (
            <Stack
              key={m.optionId}
              data-allergy={m.name}
              direction="row"
              alignItems="center"
              gap={0.375}
              sx={{
                px: 0.875,
                py: '3px',
                borderRadius: `${radius.sm}px`,
                bgcolor: md3.error,
                color: '#fff',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.2px',
                textTransform: 'uppercase',
              }}
            >
              <Icon name="warning_amber" size={13} />
              Allergy · {m.name}
            </Stack>
          ))}
        </Stack>
      )}

      {dish.note && (
        <Stack direction="row" alignItems="flex-start" gap={0.5} sx={{ mt: 0.5, color: md3.onSurface }}>
          <Icon name="notes" size={14} color={md3.outline} sx={{ mt: '1px' }} />
          <Typography sx={{ fontSize: 12, fontStyle: 'italic', lineHeight: 1.35 }}>{dish.note}</Typography>
        </Stack>
      )}

      <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.5, minHeight: readOnly || voided ? 0 : 44 }}>
        <Stack direction="row" alignItems="center" gap={0.5} sx={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 700 }}>
          {state === 'unsent' && (
            <>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#d97706', flexShrink: 0 }} />
              <Box component="span" sx={{ color: '#92400e' }}>Not sent</Box>
            </>
          )}
          {state === 'sent' && (
            <>
              <Icon name="lock" size={13} color={md3.outline} />
              <Box component="span" data-sent-at sx={{ color: md3.onSurfaceVariant }}>Sent {dish.sentAt}</Box>
            </>
          )}
          {state === 'voided' && <Box component="span" sx={{ color: md3.error }}>Voided · on the ticket as cancelled</Box>}
          {showSeat && (
            <Box component="span" sx={{ color: md3.outline, fontWeight: 600, ml: 0.5 }}>
              · {dish.seat ? `Seat ${dish.seat}` : 'Shared'}
            </Box>
          )}
        </Stack>

        {!readOnly && state === 'unsent' && (
          <>
            <LineButton
              label={`Edit ${line.name}`}
              icon="edit"
              onClick={() =>
                dispatch({
                  type: 'openModal',
                  modal: { kind: 'dish', target, menuItemId: dish.menuItemId, lineId: dish.lineId, seat: dish.seat },
                })
              }
            />
            <LineButton
              label={`Remove ${line.name}`}
              icon="delete"
              onClick={() => {
                dispatch({ type: 'removeDish', target, lineId: dish.lineId });
                toast(`Removed: ${line.name}`);
              }}
            />
          </>
        )}
        {!readOnly && state === 'sent' && (
          <ButtonBase
            aria-label={`Void ${line.name}`}
            onClick={() => setConfirmVoid(true)}
            sx={{
              minHeight: 44,
              px: 1.75,
              gap: 0.5,
              borderRadius: `${radius.xl}px`,
              border: `1.5px solid ${md3.outlineVariant}`,
              color: md3.error,
              fontSize: 12.5,
              fontWeight: 700,
              bgcolor: '#fff',
            }}
          >
            <Icon name="block" size={15} />
            Void
          </ButtonBase>
        )}
      </Stack>

      {confirmVoid && (
        <ModalFrame
          title={`Void ${line.name}?`}
          subtitle={`Sent to the kitchen at ${dish.sentAt}`}
          icon="block"
          iconColor={md3.error}
          width={440}
          onClose={() => setConfirmVoid(false)}
          actions={
            <>
              <OutlineButton onClick={() => setConfirmVoid(false)}>Keep it</OutlineButton>
              <FilledButton
                destructive
                onClick={() => {
                  dispatch({ type: 'voidDish', target, lineId: dish.lineId });
                  setConfirmVoid(false);
                  toast(`Voided: ${line.name}`);
                }}
              >
                Void dish
              </FilledButton>
            </>
          }
        >
          <Typography sx={{ fontSize: 13, lineHeight: 1.5 }}>
            The kitchen already has this plate, so it cannot be changed or removed. Voiding keeps it on the ticket
            marked cancelled and takes it off the bill. To change it, void it and ring it again.
          </Typography>
        </ModalFrame>
      )}
    </Box>
  );
}

function LineButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <ButtonBase
      aria-label={label}
      onClick={onClick}
      sx={{
        width: 44,
        height: 44,
        flexShrink: 0,
        borderRadius: '50%',
        border: `1px solid ${md3.outlineVariant}`,
        bgcolor: '#fff',
        color: md3.onSurfaceVariant,
      }}
    >
      <Icon name={icon} size={18} />
    </ButtonBase>
  );
}

/**
 * A dish on the register's rail — Quick Order's counter order, or a tab loaded to be paid.
 *
 * While a tab is on the register its lines are copies of the tab's, and changing a copy would
 * leave the tab saying something else if the payment were abandoned (`clearOrder` leaves the tab
 * open, untouched). So the rail shows them read-only, with their seats, exactly as the tab has
 * them; they are changed on the tab.
 */
export function RailDishLine({ item }: { item: CartItem }) {
  const { state } = usePos();
  const payingTab = Boolean(state.payingTabId);
  return (
    <Box data-rail-dish-line={item.dish?.lineId}>
      <DishLine line={item} target="cart" readOnly={payingTab} showSeat={payingTab} dense />
    </Box>
  );
}
