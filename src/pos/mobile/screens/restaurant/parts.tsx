import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Button, ButtonBase, IconButton, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import Add from '@mui/icons-material/Add';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import NotesOutlined from '@mui/icons-material/NotesOutlined';
import Remove from '@mui/icons-material/Remove';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import { md3, mobile, radius } from '../../../../theme/tokens';
import { discountLabel, discountTypeById, discountTypesFor } from '../../../data/discount-types';
import { groupsOf, splitAlerts } from '../../../logic/dish-choice';
import { money } from '../../../logic/cart';
import { dishUnitPrice, isSent } from '../../../logic/restaurant';
import { menuImage } from '../../../data/menu-images';
import type { MenuItem } from '../../../data/menu';
import { canManageStaff } from '../../../state/settings';
import { tabById, type DishTarget } from '../../../state/restaurant';
import { usePos } from '../../../state/PosProvider';
import type { CartItem } from '../../../types';
import { Stack } from '../../../components/Stack';
import { BottomSheet } from '../../chrome';
import { useMobileNav } from '../../navigation';
import { Callout } from '../register/parts';
import { KITCHEN, seatColor, seatLabel } from './restaurant-helpers';

/**
 * Pieces the handheld restaurant screens share (V1 → V2).
 *
 * The tablet's restaurant components (`components/restaurant/*`) are dense, mouse-first and laid
 * out for a 1280px room; these are the same things at touch density — 48dp rows, 16px text — and
 * they dispatch exactly the same actions, so a dish rung on the phone is the dish the tablet shows.
 */


// ─── A dish on a tab or the counter order ───────────────────────────────────

/**
 * One dish line. The whole row is the button: tapping it opens the line's sheet, which offers
 * only what applies — Edit and Remove before it is sent, Void after, and Move / Split / Discount
 * either way (`DishLine` on the tablet, as a sheet instead of inline buttons, because a 360dp row
 * has no room for three 48dp icons beside a price).
 */
export function DishRow({
  line,
  target,
  readOnly,
  showSeat,
}: {
  line: CartItem;
  target: DishTarget;
  readOnly?: boolean;
  showSeat?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dish = line.dish!;
  const sent = isSent(line);
  const voided = Boolean(dish.voided);
  const state = voided ? 'voided' : sent ? 'sent' : 'unsent';
  const { alerts, rest } = splitAlerts(dish.modifiers);
  const discount = discountTypeById(dish.discountTypeId);

  return (
    <>
      <ButtonBase
        data-dish-line={dish.lineId}
        data-dish-state={state}
        aria-label={`${line.qty > 1 ? `${line.qty} ` : ''}${line.name}, ${state === 'unsent' ? 'not sent' : state}`}
        disabled={readOnly}
        onClick={() => setOpen(true)}
        sx={{
          width: '100%',
          display: 'block',
          textAlign: 'left',
          minHeight: mobile.touchTarget + 8,
          px: 2,
          py: 1.25,
          bgcolor: state === 'unsent' ? KITCHEN.tint : 'transparent',
          borderBottom: `1px solid ${md3.outlineVariant}`,
          '&.Mui-disabled': { color: 'inherit' },
        }}
      >
        <Stack direction="row" alignItems="baseline" gap={1}>
          <Typography
            variant="body1"
            sx={{
              flex: 1,
              minWidth: 0,
              fontWeight: 600,
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
          <Typography variant="body1" sx={{ fontWeight: 600, flexShrink: 0, color: voided ? md3.outline : md3.onSurface }}>
            {money(line.price * line.qty)}
          </Typography>
        </Stack>
        {rest.length > 0 && (
          <Typography variant="body2" data-dish-modifiers sx={{ color: md3.onSurfaceVariant, mt: 0.25 }}>
            {rest.map((m) => (m.price ? `${m.name} +${money(m.price)}` : m.name)).join(' · ')}
          </Typography>
        )}
        {alerts.length > 0 && (
          <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
            {alerts.map((m) => (
              <AllergyFlag key={m.optionId} name={m.name} />
            ))}
          </Stack>
        )}
        {dish.note && (
          <Stack direction="row" alignItems="flex-start" gap={0.5} sx={{ mt: 0.5 }}>
            <NotesOutlined sx={{ fontSize: 16, color: md3.outline, mt: '2px' }} />
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              {dish.note}
            </Typography>
          </Stack>
        )}
        <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
          <DishState line={line} />
          {showSeat && (
            <Typography variant="caption" sx={{ color: md3.outline }}>
              · {seatLabel(dish.seat)}
            </Typography>
          )}
          {dish.discountPct ? (
            <Typography variant="caption" data-dish-discount sx={{ color: md3.primary, fontWeight: 600 }}>
              · {discount ? discountLabel(discount) : `${dish.discountPct}% off`}
            </Typography>
          ) : null}
        </Stack>
      </ButtonBase>
      {!readOnly && <LineSheet open={open} onClose={() => setOpen(false)} line={line} target={target} />}
    </>
  );
}

/** Not sent (amber dot), sent at a time (lock), or voided — the line's one-word state. */
export function DishState({ line }: { line: CartItem }) {
  const dish = line.dish!;
  if (dish.voided)
    return (
      <Typography variant="caption" sx={{ color: md3.error, fontWeight: 600 }}>
        Voided · on the ticket as cancelled
      </Typography>
    );
  if (isSent(line))
    return (
      <Stack direction="row" alignItems="center" gap={0.5}>
        <LockOutlined sx={{ fontSize: 14, color: md3.outline }} />
        <Typography variant="caption" data-sent-at sx={{ fontWeight: 600 }}>
          Sent {dish.sentAt}
        </Typography>
      </Stack>
    );
  return (
    <Stack direction="row" alignItems="center" gap={0.75}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: KITCHEN.dot }} />
      <Typography variant="caption" sx={{ color: KITCHEN.text, fontWeight: 600 }}>
        Not sent
      </Typography>
    </Stack>
  );
}

export function AllergyFlag({ name }: { name: string }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.375}
      data-allergy={name}
      sx={{
        px: 0.875,
        py: '3px',
        borderRadius: `${radius.sm}px`,
        bgcolor: md3.error,
        color: '#fff',
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '.2px',
      }}
    >
      <WarningAmberRounded sx={{ fontSize: 14 }} />
      Allergy · {name}
    </Stack>
  );
}

/**
 * What can be done to one plate, as a bottom sheet.
 *
 * - **Not sent:** Edit (the dish dialog, with its choices) and Remove — one tap, no confirm,
 *   because nothing has happened yet.
 * - **Sent:** locked. The sheet says why and offers Void, behind a confirm, because the kitchen
 *   already has it. There is no Edit — that is the rule `editDish` enforces in the store.
 * - **Either:** Move, Split and Discount, which are seats and money, not food (`DishAdjust`).
 *   Each closes the sheet, because the line it was about has moved or changed price under it.
 *   Discount offers Buck's types for this line's category, and a type Buck flags for approval is
 *   shown to everyone but applied only by a manager.
 */
function LineSheet({ open, onClose, line, target }: { open: boolean; onClose: () => void; line: CartItem; target: DishTarget }) {
  const { state, dispatch, toast } = usePos();
  const nav = useMobileNav();
  const [confirmVoid, setConfirmVoid] = useState(false);
  const dish = line.dish!;
  const sent = isSent(line);
  const voided = Boolean(dish.voided);
  const tab = target === 'cart' ? undefined : tabById(state, target.tabId);
  const seats = tab ? [...Array.from({ length: tab.guests }, (_, i) => (i + 1) as number | null), null] : [];
  const types = discountTypesFor(line, canManageStaff(state));
  const full = dishUnitPrice({ ...dish, discountPct: 0 });
  const close = () => {
    setConfirmVoid(false);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={close} title={`${line.qty > 1 ? `${line.qty}× ` : ''}${line.name}`}>
      <Box data-line-sheet={dish.lineId} sx={{ px: 3, pb: 1 }}>
        <DishState line={line} />

        {!sent && !voided && (
          <Stack direction="row" gap={1} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<EditOutlined />}
              onClick={() => {
                close();
                nav.push({ name: 'dish', target, menuItemId: dish.menuItemId, lineId: dish.lineId, seat: dish.seat });
              }}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              startIcon={<DeleteOutline />}
              sx={{ color: md3.error, borderColor: md3.error }}
              onClick={() => {
                dispatch({ type: 'removeDish', target, lineId: dish.lineId });
                toast(`Removed: ${line.name}`);
                close();
              }}
            >
              Remove
            </Button>
          </Stack>
        )}

        {sent && !voided && !confirmVoid && (
          <Box sx={{ mt: 2 }}>
            <Callout tone="warning" icon={<LockOutlined fontSize="small" />}>
              Sent to the kitchen at {dish.sentAt}, so it can’t be changed. To change it, void it and ring it again.
            </Callout>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              startIcon={<BlockOutlined />}
              sx={{ mt: 1.5, color: md3.error, borderColor: md3.error }}
              onClick={() => setConfirmVoid(true)}
            >
              Void dish
            </Button>
          </Box>
        )}

        {confirmVoid && (
          <Box sx={{ mt: 2 }} data-void-confirm>
            <Typography variant="body2">The kitchen keeps it on the ticket, marked cancelled, and it comes off the bill.</Typography>
            <Stack direction="row" gap={1} sx={{ mt: 1.5 }}>
              <Button variant="outlined" fullWidth onClick={() => setConfirmVoid(false)}>
                Keep it
              </Button>
              <Button
                variant="contained"
                color="error"
                fullWidth
                sx={{ bgcolor: md3.error, '&:hover': { bgcolor: md3.error } }}
                onClick={() => {
                  dispatch({ type: 'voidDish', target, lineId: dish.lineId });
                  toast(`Voided: ${line.name}`);
                  close();
                }}
              >
                Void {line.name.length > 14 ? 'dish' : line.name}
              </Button>
            </Stack>
          </Box>
        )}

        {!voided && !confirmVoid && (
          <>
            {tab && (
              <SheetRow label="Move to">
                {seats.map((s) => (
                  <Pill
                    key={s ?? 'shared'}
                    label={seatLabel(s)}
                    swatch={seatColor(s)}
                    active={(dish.seat ?? null) === s}
                    onClick={() => {
                      dispatch({ type: 'moveDish', target, lineId: dish.lineId, seat: s });
                      toast(`${line.name} → ${seatLabel(s)}`);
                      close();
                    }}
                  />
                ))}
              </SheetRow>
            )}
            {tab && line.qty >= 2 && (
              <SheetRow label={`Split one of ${line.qty} to`}>
                {seats
                  .filter((s) => s !== (dish.seat ?? null))
                  .map((s) => (
                    <Pill
                      key={s ?? 'shared'}
                      label={seatLabel(s)}
                      swatch={seatColor(s)}
                      onClick={() => {
                        dispatch({ type: 'splitDish', target, lineId: dish.lineId, seat: s });
                        toast(`One ${line.name} → ${seatLabel(s)}`);
                        close();
                      }}
                    />
                  ))}
              </SheetRow>
            )}
            <SheetRow label="Discount" note={dish.discountPct ? `${money(full)} → ${money(line.price)}` : undefined}>
              <Pill
                label="None"
                active={!dish.discountPct}
                onClick={() => {
                  dispatch({ type: 'discountDish', target, lineId: dish.lineId, pct: 0 });
                  toast(`${line.name}: full price`);
                  close();
                }}
              />
              {types.map(({ type, needsManager }) => (
                <Pill
                  key={type.id}
                  label={`${type.description} · ${type.value}%`}
                  active={dish.discountTypeId === type.id}
                  locked={needsManager}
                  onClick={() => {
                    if (needsManager) {
                      toast(`${type.description} needs a manager — sign in as one to apply it`);
                      return;
                    }
                    dispatch({ type: 'discountDish', target, lineId: dish.lineId, pct: type.value, discountTypeId: type.id });
                    toast(`${line.name}: ${discountLabel(type)}`);
                    close();
                  }}
                />
              ))}
            </SheetRow>
          </>
        )}
      </Box>
    </BottomSheet>
  );
}

function SheetRow({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <Box sx={{ mt: 2.5 }}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: md3.primary }}>
          {label}
        </Typography>
        {note && <Typography variant="caption">{note}</Typography>}
      </Stack>
      <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
        {children}
      </Stack>
    </Box>
  );
}

/** An MD3 filter-chip-like choice: 40dp tall with 8dp gaps, so each has a 48dp touch area. */
export function Pill({
  label,
  active,
  locked,
  swatch,
  onClick,
  sx,
}: {
  label: ReactNode;
  active?: boolean;
  locked?: boolean;
  swatch?: string;
  onClick: () => void;
  sx?: SxProps<Theme>;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={active}
      data-locked={locked || undefined}
      aria-label={locked && typeof label === 'string' ? `${label}, needs a manager` : undefined}
      sx={{
        minHeight: 40,
        px: 1.75,
        gap: 0.75,
        flexShrink: 0,
        borderRadius: `${radius.sm}px`,
        border: `1px solid ${active ? (swatch ?? md3.primary) : md3.outlineVariant}`,
        bgcolor: active ? (swatch ? `${swatch}1f` : mobile.secondaryContainer) : md3.surface,
        color: locked ? md3.outline : md3.onSurface,
        fontSize: 14,
        fontWeight: active ? 700 : 500,
        whiteSpace: 'nowrap',
        ...sx,
      }}
    >
      {swatch && <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: swatch, flexShrink: 0 }} />}
      {label}
      {locked && <LockOutlined sx={{ fontSize: 16 }} />}
    </ButtonBase>
  );
}

// ─── Small controls ─────────────────────────────────────────────────────────

/** − n + at 48dp. */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 30,
  label,
  unit,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
  unit?: (n: number) => string;
}) {
  return (
    <Stack direction="row" alignItems="center" gap={1} role="group" aria-label={label}>
      <IconButton
        aria-label={`${label}: one fewer`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        sx={{ border: `1px solid ${md3.outlineVariant}`, width: 48, height: 48 }}
      >
        <Remove />
      </IconButton>
      <Typography variant="h6" data-stepper-value={value} sx={{ minWidth: 88, textAlign: 'center' }}>
        {unit ? unit(value) : value}
      </Typography>
      <IconButton
        aria-label={`${label}: one more`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        sx={{ border: `1px solid ${md3.outlineVariant}`, width: 48, height: 48 }}
      >
        <Add />
      </IconButton>
    </Stack>
  );
}

/** A row of pills that scrolls sideways inside itself, so the page never does. */
export function ScrollRow({ children, label, sx }: { children: ReactNode; label: string; sx?: SxProps<Theme> }) {
  return (
    <Stack
      direction="row"
      gap={1}
      role="group"
      aria-label={label}
      sx={{ px: 2, overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, ...sx }}
    >
      {children}
    </Stack>
  );
}

// ─── The menu ───────────────────────────────────────────────────────────────

/**
 * One item on the handheld menu: its photo, 1:1 on white (`menu-images.ts` — every dish has one,
 * branded snacks and drinks an unbranded stand-in), the name, the price, and what tapping will
 * do — *Choose* when there is a required choice to make first, *Options* when there are optional
 * ones. Two to a row at 360dp, so each tile is about 160dp square plus its text.
 */
export function MenuTile({ item, count, onClick }: { item: MenuItem; count?: number; onClick: () => void }) {
  const src = menuImage(item);
  const groups = groupsOf(item);
  const required = groups.some((g) => g.required);
  return (
    <ButtonBase
      data-menu-item={item.id}
      data-has-photo={src ? true : undefined}
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        textAlign: 'left',
        borderRadius: `${radius.md}px`,
        border: `1px solid ${md3.outlineVariant}`,
        bgcolor: '#fff',
        overflow: 'hidden',
        position: 'relative',
        '&:active': { borderColor: md3.primary },
      }}
    >
      {src ? (
        <Box
          component="img"
          src={src}
          alt=""
          loading="lazy"
          sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'contain', bgcolor: '#fff', display: 'block' }}
        />
      ) : null}
      {count ? (
        <Box
          data-tile-count={count}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            minWidth: 28,
            height: 28,
            px: 0.75,
            borderRadius: 14,
            bgcolor: md3.primary,
            color: md3.onPrimary,
            display: 'grid',
            placeItems: 'center',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {count}
        </Box>
      ) : null}
      <Box sx={{ px: 1.25, pt: 1, pb: 1.25, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: md3.onSurface,
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.6em',
          }}
        >
          {item.name}
        </Typography>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={0.5}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: md3.primary }}>
            {money(item.price)}
          </Typography>
          {groups.length > 0 && (
            <Typography variant="caption" sx={{ fontWeight: 600, color: required ? md3.onSurface : md3.outline }}>
              {required ? 'Choose' : 'Options'}
            </Typography>
          )}
        </Stack>
      </Box>
    </ButtonBase>
  );
}

/** A quiet empty state for a list with nothing in it — a tab with no orders, a day with no tips. */
export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <Stack alignItems="center" gap={1.5} sx={{ pt: 8, px: 4, textAlign: 'center', color: md3.outline }}>
      {icon}
      <Box>
        <Typography variant="h6" sx={{ color: md3.onSurface }}>
          {title}
        </Typography>
        {body && (
          <Typography variant="body2" sx={{ color: md3.onSurfaceVariant, mt: 0.5 }}>
            {body}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}
