import { useState } from 'react';
import { Box, Button, ButtonBase, TextField, Typography } from '@mui/material';
import Check from '@mui/icons-material/Check';
import LockOutlined from '@mui/icons-material/LockOutlined';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import { md3, mobile, noteColors, radius } from '../../../../theme/tokens';
import {
  menuItem,
  missingRequired,
  priceWithModifiers,
  type AppliedModifier,
  type ModifierGroup,
  type ModifierGroupColor,
} from '../../../data/menu';
import { menuImage } from '../../../data/menu-images';
import { money } from '../../../logic/cart';
import { chooseOption, groupsOf, isChosen, missingPrompt, ordered } from '../../../logic/dish-choice';
import { isSent } from '../../../logic/restaurant';
import { linesOf, tabById } from '../../../state/restaurant';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { DialogTopBar, MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { Callout } from '../register/parts';
import { Pill, Stepper } from './parts';
import { seatColor, seatLabel } from './restaurant-helpers';

/** Buck's modifier-group colours, on Birdie's palette — the tablet dish dialog's map. */
const GROUP_COLORS: Record<ModifierGroupColor, string> = {
  gray: md3.outline,
  brand: md3.primary,
  blue: noteColors.blue.dot,
  orange: noteColors.yellow.dot,
  error: md3.error,
  success: noteColors.green.dot,
};

/**
 * A dish's choices (V1 → V2, handheld) — the tablet's `DishDialog` as an MD3 full-screen dialog.
 *
 * Every group on one scrolling page, in the menu's order, each saying what it is before it is
 * tapped: **Choose one** is a radio list (a tap replaces), **Choose any** a checkbox list (a tap
 * toggles) — the rules are `chooseOption` in `logic/dish-choice.ts`, shared with the tablet.
 * Required groups say *Required* until answered, and the add button stays disabled while the
 * footer says, in words, what is still missing; so a dish is complete before it reaches the order,
 * and Send never has to refuse one. Allergies are a red-edged group, and a chosen allergy is
 * filled solid red, as it is on the line and on the kitchen's ticket.
 *
 * Quantity, the seat (on a tab), a note for the kitchen and the live price follow. Editing works
 * on unsent dishes only; a sent one is never opened here, and if it were, the dialog says so.
 */
export function DishScreen({ route }: ScreenProps<'dish'>) {
  const { state, dispatch, toast } = usePos();
  const nav = useMobileNav();
  const item = menuItem(route.menuItemId);
  const line = route.lineId ? linesOf(state, route.target).find((l) => l.dish?.lineId === route.lineId) : undefined;
  const tab = route.target === 'cart' ? undefined : tabById(state, route.target.tabId);

  const [mods, setMods] = useState<AppliedModifier[]>(line?.dish?.modifiers ?? []);
  const [qty, setQty] = useState(line?.qty ?? 1);
  const [seat, setSeat] = useState<number | undefined>(line ? line.dish?.seat : route.seat);
  const [note, setNote] = useState(line?.dish?.note ?? '');

  if (!item || (route.lineId && (!line || isSent(line)))) {
    return (
      <MobileScreen topBar={<DialogTopBar title={item?.name ?? 'Dish'} />}>
        <Box sx={{ p: 2 }}>
          <Callout tone="warning" icon={<LockOutlined fontSize="small" />}>
            {line && isSent(line)
              ? 'This dish has gone to the kitchen, so it can’t be changed. Void it and ring it again.'
              : 'This dish is no longer on the order.'}
          </Callout>
        </Box>
      </MobileScreen>
    );
  }

  const groups = groupsOf(item);
  const missing = missingRequired(item, mods);
  const unit = priceWithModifiers(item.price, mods);
  const editing = Boolean(line);
  const seatWord = tab ? seatLabel(seat) : null;
  const photo = menuImage(item);

  const confirm = () => {
    if (missing.length) return;
    const modifiers = ordered(item, mods);
    if (line?.dish) {
      dispatch({ type: 'editDish', target: route.target, lineId: line.dish.lineId, patch: { modifiers, seat: seat ?? null, note, qty } });
      toast(`Updated: ${item.name}`);
    } else {
      dispatch({ type: 'addDish', target: route.target, menuItemId: item.id, modifiers, seat, note, qty });
      toast(`Added: ${item.name}${seatWord ? ` · ${seatWord}` : ''}`);
    }
    nav.pop();
  };

  return (
    <MobileScreen
      topBar={<DialogTopBar title={editing ? `Change ${item.name}` : item.name} />}
      bottomBar={
        <Box sx={{ flexShrink: 0, px: 2, pt: 1.25, pb: 1.5, bgcolor: md3.surfaceContainer, borderTop: `1px solid ${md3.outlineVariant}` }}>
          <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1} sx={{ mb: 1 }}>
            <Typography
              variant="body2"
              data-dish-missing={missing.length || undefined}
              sx={{ color: missing.length ? md3.error : md3.onSurfaceVariant, fontWeight: missing.length ? 600 : 400, minWidth: 0 }}
            >
              {missing.length ? missingPrompt(missing) : qty > 1 ? `${money(unit)} each` : 'Ready for the kitchen'}
            </Typography>
            <Typography variant="h6" data-dish-price sx={{ fontWeight: 700, flexShrink: 0 }}>
              {money(unit * qty)}
            </Typography>
          </Stack>
          <Button variant="contained" size="large" fullWidth disabled={missing.length > 0} onClick={confirm} data-dish-confirm>
            {editing ? 'Save changes' : seatWord ? `Add to ${seatWord}` : 'Add to order'}
          </Button>
        </Box>
      }
    >
      <Stack direction="row" gap={2} sx={{ px: 2, pt: 1, pb: 2 }}>
        {photo && (
          <Box
            component="img"
            src={photo}
            alt=""
            data-dish-photo
            sx={{
              width: 96,
              height: 96,
              objectFit: 'contain',
              borderRadius: `${radius.md}px`,
              border: `1px solid ${md3.outlineVariant}`,
              bgcolor: '#fff',
              flexShrink: 0,
            }}
          />
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
            {item.description}
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 0.5, fontWeight: 700 }}>
            {money(item.price)}
          </Typography>
        </Box>
      </Stack>

      {groups.map((g) => (
        <GroupBlock key={g.id} group={g} mods={mods} onChoose={(o) => setMods((cur) => chooseOption(cur, g, o))} />
      ))}

      <Box sx={{ px: 2, pt: 1 }}>
        <Typography variant="subtitle2" sx={{ color: md3.primary, mb: 1 }}>
          Quantity
        </Typography>
        <Stepper label="Quantity" value={qty} max={99} onChange={setQty} />
      </Box>

      {tab && (
        <Box sx={{ px: 2, pt: 2.5 }}>
          <Typography variant="subtitle2" sx={{ color: md3.primary, mb: 1 }}>
            Seat
          </Typography>
          <Stack direction="row" gap={1} role="group" aria-label="Seat" sx={{ flexWrap: 'wrap' }}>
            {[...Array.from({ length: tab.guests }, (_, i) => (i + 1) as number | undefined), undefined].map((s) => (
              <Pill key={s ?? 'shared'} label={seatLabel(s)} swatch={seatColor(s)} active={s === seat} onClick={() => setSeat(s)} />
            ))}
          </Stack>
        </Box>
      )}

      <Box sx={{ px: 2, pt: 2.5, pb: 3 }}>
        <TextField
          label="Note for the kitchen"
          placeholder="Gluten-free bread, sauce on the side…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
      </Box>
    </MobileScreen>
  );
}

/**
 * One modifier group: a radio list for *Choose one*, a checkbox list for *Choose any*. The mark
 * says what a tap will do before it is tapped, and the roles match, so a screen reader hears the
 * same difference the eye sees.
 */
function GroupBlock({
  group,
  mods,
  onChoose,
}: {
  group: ModifierGroup;
  mods: AppliedModifier[];
  onChoose: (o: ModifierGroup['options'][number]) => void;
}) {
  const one = group.select === 'one';
  const answered = mods.some((m) => m.groupId === group.id);
  const alert = Boolean(group.alert);
  const accent = alert ? md3.error : md3.primary;

  return (
    <Box
      data-modifier-group={group.id}
      data-select={group.select}
      data-alert={alert || undefined}
      sx={{
        mx: alert ? 2 : 0,
        mb: 2,
        ...(alert && { borderRadius: `${radius.md}px`, border: `2px solid ${md3.error}`, bgcolor: '#fff5f4', overflow: 'hidden' }),
      }}
    >
      <Stack direction="row" alignItems="center" gap={1} sx={{ px: 2, pt: alert ? 1.25 : 0.5, pb: 0.5 }}>
        {alert && <WarningAmberRounded sx={{ color: md3.error, fontSize: 20 }} />}
        {group.color && !alert && (
          <Box
            data-group-color={group.color}
            sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: GROUP_COLORS[group.color], flexShrink: 0 }}
          />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: alert ? md3.error : md3.onSurface }}>
            {group.name}
          </Typography>
          <Typography variant="caption" data-select-hint>
            {one ? 'Choose one' : 'Choose any'}
            {alert ? ' · the kitchen sees these in red' : ''}
          </Typography>
        </Box>
        {group.required && (
          <Stack
            direction="row"
            alignItems="center"
            gap={0.375}
            data-required={answered ? 'answered' : 'missing'}
            sx={{
              px: 1,
              py: '3px',
              borderRadius: `${radius.xl}px`,
              fontSize: 12,
              fontWeight: 700,
              bgcolor: answered ? md3.primaryContainer : '#ffdad6',
              color: answered ? md3.onPrimaryContainer : md3.error,
            }}
          >
            {answered && <Check sx={{ fontSize: 14 }} />}
            Required
          </Stack>
        )}
      </Stack>
      <Box role={one ? 'radiogroup' : 'group'} aria-label={group.name}>
        {group.options.map((o) => {
          const on = isChosen(mods, o.id);
          const solid = alert && on;
          return (
            <ButtonBase
              key={o.id}
              role={one ? 'radio' : 'checkbox'}
              aria-checked={on}
              data-option={o.id}
              onClick={() => onChoose(o)}
              sx={{
                width: '100%',
                minHeight: mobile.touchTarget + 4,
                px: 2,
                gap: 2,
                justifyContent: 'flex-start',
                textAlign: 'left',
                bgcolor: solid ? md3.error : on ? `${accent}14` : 'transparent',
                color: solid ? '#fff' : md3.onSurface,
              }}
            >
              <Mark kind={one ? 'radio' : 'check'} on={on} color={solid ? '#fff' : accent} />
              <Typography variant="body1" sx={{ flex: 1, color: 'inherit', fontWeight: on ? 600 : 400 }}>
                {o.name}
              </Typography>
              {o.price ? (
                <Typography variant="body2" sx={{ color: solid ? '#fff' : md3.onSurfaceVariant }}>
                  +{money(o.price)}
                </Typography>
              ) : null}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}

/** A radio dot or a checkbox tick, drawn so the two cannot be confused. */
function Mark({ kind, on, color }: { kind: 'radio' | 'check'; on: boolean; color: string }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: 20,
        height: 20,
        flexShrink: 0,
        borderRadius: kind === 'radio' ? '50%' : '4px',
        border: `2px solid ${on ? color : md3.outline}`,
        bgcolor: kind === 'check' && on ? color : 'transparent',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {on && kind === 'radio' && <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />}
      {on && kind === 'check' && <Check sx={{ fontSize: 16, color: color === '#fff' ? md3.error : '#fff' }} />}
    </Box>
  );
}
